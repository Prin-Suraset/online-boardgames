"""Authentication HTTP endpoints."""

from __future__ import annotations

from typing import NoReturn

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import Field

from app.auth import AuthError, AuthService, AuthUser
from app.schemas import StrictModel


class GuestRequest(StrictModel):
    display_name: str = Field(default="", max_length=24)


class RegisterRequest(StrictModel):
    username: str = Field(
        min_length=3,
        max_length=32,
        pattern=r"^[A-Za-z0-9_]+$",
    )
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(default="", max_length=24)


class LoginRequest(StrictModel):
    username: str = Field(min_length=3, max_length=32)
    password: str = Field(min_length=8, max_length=128)


class AuthResponse(StrictModel):
    token: str
    user: AuthUser


def create_auth_router(auth: AuthService) -> APIRouter:
    router = APIRouter(prefix="/api/auth", tags=["authentication"])
    bearer = HTTPBearer(auto_error=False)

    @router.post("/guest", response_model=AuthResponse)
    async def create_guest(request: GuestRequest) -> AuthResponse:
        token, user = auth.create_guest(request.display_name)
        return AuthResponse(token=token, user=user)

    @router.post(
        "/register",
        response_model=AuthResponse,
        status_code=status.HTTP_201_CREATED,
    )
    async def register(request: RegisterRequest) -> AuthResponse:
        try:
            token, user = auth.register(
                request.username,
                request.password,
                request.display_name,
            )
        except AuthError as error:
            _raise_auth_error(error, status.HTTP_409_CONFLICT)
        return AuthResponse(token=token, user=user)

    @router.post("/login", response_model=AuthResponse)
    async def login(request: LoginRequest) -> AuthResponse:
        try:
            token, user = auth.login(request.username, request.password)
        except AuthError as error:
            _raise_auth_error(error, status.HTTP_401_UNAUTHORIZED)
        return AuthResponse(token=token, user=user)

    @router.get("/me", response_model=AuthUser)
    async def current_user(
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    ) -> AuthUser:
        if credentials is None or credentials.scheme.casefold() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "AUTH_REQUIRED",
                    "message": "A bearer token is required.",
                },
            )
        try:
            return auth.current_user(credentials.credentials)
        except AuthError as error:
            _raise_auth_error(error, status.HTTP_401_UNAUTHORIZED)

    return router


def _raise_auth_error(error: AuthError, status_code: int) -> NoReturn:
    raise HTTPException(
        status_code=status_code,
        detail={"code": error.code, "message": error.message},
    ) from error
