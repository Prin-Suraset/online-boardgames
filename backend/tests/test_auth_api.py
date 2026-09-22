"""Integration tests for guest and persistent member authentication."""

from __future__ import annotations

import sqlite3
from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI
from pydantic import JsonValue, TypeAdapter

from app.api.auth import AuthResponse
from app.auth import AuthUser
from app.main import create_app

_json_object_adapter = TypeAdapter(dict[str, JsonValue])
_TEST_SECRET = "test-authentication-secret"


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


def auth_app(database_path: Path) -> FastAPI:
    return create_app(
        auth_database_path=database_path,
        auth_secret=_TEST_SECRET,
    )


@pytest.mark.anyio
async def test_guest_default_name_and_authenticated_profile(tmp_path: Path) -> None:
    transport = httpx.ASGITransport(app=auth_app(tmp_path / "guest.db"))
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as client:
        response = await client.post("/api/auth/guest", json={"display_name": ""})
        assert response.status_code == 200
        authentication = AuthResponse.model_validate(response.json())
        assert authentication.user.display_name.startswith("Guest_")
        assert len(authentication.user.display_name) == 10
        assert authentication.user.is_guest is True
        assert authentication.user.is_admin is False
        assert authentication.user.wins == 0

        profile_response = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {authentication.token}"},
        )
        assert profile_response.status_code == 200
        assert AuthUser.model_validate(profile_response.json()) == authentication.user


@pytest.mark.anyio
async def test_registration_login_and_password_hash_persistence(
    tmp_path: Path,
) -> None:
    database_path = tmp_path / "members.db"
    transport = httpx.ASGITransport(app=auth_app(database_path))
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as client:
        registration_response = await client.post(
            "/api/auth/register",
            json={
                "username": "TableMaster",
                "password": "correct-horse-battery",
                "display_name": "Table Master",
            },
        )
        assert registration_response.status_code == 201
        registration = AuthResponse.model_validate(registration_response.json())
        assert registration.user.display_name == "Table Master"
        assert registration.user.is_guest is False

        duplicate_response = await client.post(
            "/api/auth/register",
            json={
                "username": "tablemaster",
                "password": "another-password",
                "display_name": "Duplicate",
            },
        )
        assert duplicate_response.status_code == 409
        duplicate_body = _json_object_adapter.validate_python(
            duplicate_response.json()
        )
        duplicate_detail = duplicate_body["detail"]
        assert isinstance(duplicate_detail, dict)
        assert duplicate_detail["code"] == "USERNAME_TAKEN"

        invalid_login = await client.post(
            "/api/auth/login",
            json={"username": "tablemaster", "password": "wrong-password"},
        )
        assert invalid_login.status_code == 401

    with sqlite3.connect(database_path) as connection:
        password_row = connection.execute(
            "SELECT password_hash FROM users WHERE username = ?",
            ("tablemaster",),
        ).fetchone()
    assert password_row is not None
    stored_password = str(password_row[0])
    assert stored_password != "correct-horse-battery"
    assert stored_password.startswith("pbkdf2_sha256$")

    restarted_transport = httpx.ASGITransport(app=auth_app(database_path))
    async with httpx.AsyncClient(
        transport=restarted_transport,
        base_url="http://testserver",
    ) as restarted_client:
        login_response = await restarted_client.post(
            "/api/auth/login",
            json={
                "username": "TABLEMASTER",
                "password": "correct-horse-battery",
            },
        )
        assert login_response.status_code == 200
        login = AuthResponse.model_validate(login_response.json())
        assert login.user.id == registration.user.id


@pytest.mark.anyio
async def test_seeded_admin_can_login(tmp_path: Path) -> None:
    transport = httpx.ASGITransport(app=auth_app(tmp_path / "admin.db"))
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as client:
        response = await client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "admin123"},
        )

    assert response.status_code == 200
    authentication = AuthResponse.model_validate(response.json())
    assert authentication.user.display_name == "Admin"
    assert authentication.user.is_guest is False
    assert authentication.user.is_admin is True


@pytest.mark.anyio
async def test_me_rejects_missing_and_tampered_tokens(tmp_path: Path) -> None:
    transport = httpx.ASGITransport(app=auth_app(tmp_path / "tokens.db"))
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as client:
        missing_response = await client.get("/api/auth/me")
        assert missing_response.status_code == 401

        guest_response = await client.post(
            "/api/auth/guest",
            json={"display_name": "Token Tester"},
        )
        authentication = AuthResponse.model_validate(guest_response.json())
        replacement = "A" if not authentication.token.endswith("A") else "B"
        tampered_token = f"{authentication.token[:-1]}{replacement}"
        tampered_response = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {tampered_token}"},
        )
        assert tampered_response.status_code == 401
