"""Persistent user authentication and signed bearer-token services."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import sqlite3
import time
from pathlib import Path
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, JsonValue, ValidationError

_PASSWORD_ITERATIONS = 310_000
_TOKEN_LIFETIME_SECONDS = 7 * 24 * 60 * 60


class AuthError(ValueError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class AuthUser(BaseModel):
    model_config = ConfigDict(frozen=True, strict=True, extra="forbid")

    id: str
    display_name: str
    is_guest: bool
    is_admin: bool
    wins: int = Field(ge=0)
    losses: int = Field(ge=0)
    draws: int = Field(ge=0)


class TokenClaims(BaseModel):
    model_config = ConfigDict(frozen=True, strict=True, extra="forbid")

    sub: str
    exp: int


class AuthStore:
    """Small SQLite repository used by the local development application."""

    def __init__(self, database_path: Path) -> None:
        self._database_path = database_path
        self._database_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def create_guest(self, display_name: str) -> AuthUser:
        user = AuthUser(
            id=str(uuid4()),
            display_name=display_name,
            is_guest=True,
            is_admin=False,
            wins=0,
            losses=0,
            draws=0,
        )
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO users (
                    id, username, password_hash, display_name, is_guest,
                    wins, losses, draws
                ) VALUES (?, NULL, NULL, ?, 1, 0, 0, 0)
                """,
                (user.id, user.display_name),
            )
        return user

    def create_member(
        self,
        username: str,
        password: str,
        display_name: str,
    ) -> AuthUser:
        user = AuthUser(
            id=str(uuid4()),
            display_name=display_name,
            is_guest=False,
            is_admin=False,
            wins=0,
            losses=0,
            draws=0,
        )
        try:
            with self._connect() as connection:
                connection.execute(
                    """
                    INSERT INTO users (
                        id, username, password_hash, display_name, is_guest,
                        wins, losses, draws
                    ) VALUES (?, ?, ?, ?, 0, 0, 0, 0)
                    """,
                    (
                        user.id,
                        username.casefold(),
                        _hash_password(password),
                        user.display_name,
                    ),
                )
        except sqlite3.IntegrityError as error:
            raise AuthError(
                "USERNAME_TAKEN",
                "That username is already registered.",
            ) from error
        return user

    def authenticate(self, username: str, password: str) -> AuthUser:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM users WHERE username = ? AND is_guest = 0",
                (username.casefold(),),
            ).fetchone()
        if row is None:
            raise AuthError("INVALID_CREDENTIALS", "Invalid username or password.")
        password_hash = row["password_hash"]
        if not isinstance(password_hash, str) or not _verify_password(
            password,
            password_hash,
        ):
            raise AuthError("INVALID_CREDENTIALS", "Invalid username or password.")
        return _row_to_user(row)

    def get_user(self, user_id: str) -> AuthUser:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()
        if row is None:
            raise AuthError("USER_NOT_FOUND", "The token user no longer exists.")
        return _row_to_user(row)

    def save_match_history(
        self,
        *,
        match_id: str,
        room_code: str,
        game_type: str,
        started_at: str,
        finished_at: str,
        action_logs: list[dict[str, JsonValue]],
    ) -> None:
        """Persist a completed match once; retries are idempotent by match id."""
        with self._connect() as connection:
            connection.execute(
                """
                INSERT OR IGNORE INTO match_history (
                    id, room_code, game_type, started_at, finished_at,
                    action_logs_json
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    match_id,
                    room_code,
                    game_type,
                    started_at,
                    finished_at,
                    json.dumps(action_logs, separators=(",", ":"), ensure_ascii=False),
                ),
            )

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._database_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT UNIQUE,
                    password_hash TEXT,
                    display_name TEXT NOT NULL,
                    is_guest INTEGER NOT NULL CHECK (is_guest IN (0, 1)),
                    is_admin INTEGER NOT NULL DEFAULT 0 CHECK (is_admin IN (0, 1)),
                    wins INTEGER NOT NULL DEFAULT 0 CHECK (wins >= 0),
                    losses INTEGER NOT NULL DEFAULT 0 CHECK (losses >= 0),
                    draws INTEGER NOT NULL DEFAULT 0 CHECK (draws >= 0),
                    CHECK (
                        (is_guest = 1 AND username IS NULL AND password_hash IS NULL)
                        OR
                        (is_guest = 0 AND username IS NOT NULL AND password_hash IS NOT NULL)
                    )
                )
                """
            )
            columns = {
                str(row["name"])
                for row in connection.execute("PRAGMA table_info(users)").fetchall()
            }
            if "is_admin" not in columns:
                connection.execute(
                    "ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0"
                )
            existing_admin = connection.execute(
                "SELECT id FROM users WHERE username = ?",
                ("admin",),
            ).fetchone()
            if existing_admin is None:
                connection.execute(
                    """
                    INSERT INTO users (
                        id, username, password_hash, display_name, is_guest,
                        is_admin, wins, losses, draws
                    ) VALUES (?, ?, ?, ?, 0, 1, 0, 0, 0)
                    """,
                    (
                        "system-admin",
                        "admin",
                        _hash_password("admin123"),
                        "Admin",
                    ),
                )
            else:
                connection.execute(
                    "UPDATE users SET is_admin = 1 WHERE username = ?",
                    ("admin",),
                )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS match_history (
                    id TEXT PRIMARY KEY,
                    room_code TEXT NOT NULL,
                    game_type TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    finished_at TEXT NOT NULL,
                    action_logs_json TEXT NOT NULL
                )
                """
            )


class AuthService:
    def __init__(self, store: AuthStore, secret: str) -> None:
        if len(secret) < 16:
            raise ValueError("authentication secret must contain at least 16 characters")
        self._store = store
        self._secret = secret.encode("utf-8")

    def create_guest(self, display_name: str) -> tuple[str, AuthUser]:
        normalized_name = display_name.strip()
        if not normalized_name:
            normalized_name = f"Guest_{secrets.randbelow(10_000):04d}"
        user = self._store.create_guest(normalized_name)
        return self.issue_token(user), user

    def register(
        self,
        username: str,
        password: str,
        display_name: str,
    ) -> tuple[str, AuthUser]:
        normalized_username = username.strip().casefold()
        normalized_name = display_name.strip() or normalized_username
        user = self._store.create_member(
            normalized_username,
            password,
            normalized_name,
        )
        return self.issue_token(user), user

    def login(self, username: str, password: str) -> tuple[str, AuthUser]:
        user = self._store.authenticate(username.strip(), password)
        return self.issue_token(user), user

    def current_user(self, token: str) -> AuthUser:
        claims = self._decode_token(token)
        return self._store.get_user(claims.sub)

    def save_match_history(
        self,
        *,
        match_id: str,
        room_code: str,
        game_type: str,
        started_at: str,
        finished_at: str,
        action_logs: list[dict[str, JsonValue]],
    ) -> None:
        self._store.save_match_history(
            match_id=match_id,
            room_code=room_code,
            game_type=game_type,
            started_at=started_at,
            finished_at=finished_at,
            action_logs=action_logs,
        )

    def issue_token(self, user: AuthUser) -> str:
        header = {"alg": "HS256", "typ": "JWT"}
        claims = TokenClaims(
            sub=user.id,
            exp=int(time.time()) + _TOKEN_LIFETIME_SECONDS,
        )
        header_segment = _encode_json(header)
        payload_segment = _encode_json(claims.model_dump(mode="json"))
        signing_input = f"{header_segment}.{payload_segment}".encode("ascii")
        signature = hmac.new(self._secret, signing_input, hashlib.sha256).digest()
        return f"{header_segment}.{payload_segment}.{_base64url_encode(signature)}"

    def _decode_token(self, token: str) -> TokenClaims:
        try:
            header_segment, payload_segment, signature_segment = token.split(".")
            signing_input = f"{header_segment}.{payload_segment}".encode("ascii")
            expected_signature = hmac.new(
                self._secret,
                signing_input,
                hashlib.sha256,
            ).digest()
            provided_signature = _base64url_decode(signature_segment)
            if not hmac.compare_digest(expected_signature, provided_signature):
                raise AuthError("INVALID_TOKEN", "The bearer token is invalid.")
            header = json.loads(_base64url_decode(header_segment))
            if not isinstance(header, dict) or header.get("alg") != "HS256":
                raise AuthError("INVALID_TOKEN", "The bearer token is invalid.")
            claims = TokenClaims.model_validate_json(
                _base64url_decode(payload_segment)
            )
        except (UnicodeDecodeError, ValueError, ValidationError, json.JSONDecodeError) as error:
            if isinstance(error, AuthError):
                raise
            raise AuthError("INVALID_TOKEN", "The bearer token is invalid.") from error
        if claims.exp <= int(time.time()):
            raise AuthError("TOKEN_EXPIRED", "The bearer token has expired.")
        return claims


def _hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        _PASSWORD_ITERATIONS,
    )
    return "$".join(
        (
            "pbkdf2_sha256",
            str(_PASSWORD_ITERATIONS),
            _base64url_encode(salt),
            _base64url_encode(digest),
        )
    )


def _verify_password(password: str, encoded_password: str) -> bool:
    try:
        algorithm, iterations_text, salt_text, expected_text = encoded_password.split(
            "$"
        )
        if algorithm != "pbkdf2_sha256":
            return False
        iterations = int(iterations_text)
        salt = _base64url_decode(salt_text)
        expected = _base64url_decode(expected_text)
    except (TypeError, ValueError):
        return False
    actual = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations,
    )
    return hmac.compare_digest(actual, expected)


def _row_to_user(row: sqlite3.Row) -> AuthUser:
    return AuthUser(
        id=str(row["id"]),
        display_name=str(row["display_name"]),
        is_guest=bool(row["is_guest"]),
        is_admin=bool(row["is_admin"]),
        wins=int(row["wins"]),
        losses=int(row["losses"]),
        draws=int(row["draws"]),
    )


def _encode_json(value: object) -> str:
    encoded = json.dumps(
        value,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    return _base64url_encode(encoded)


def _base64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _base64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)
