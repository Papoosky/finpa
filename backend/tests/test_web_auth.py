import os
import unittest

os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-long-enough-for-finpa")
os.environ.setdefault("ENV", "development")

from fastapi import HTTPException, Request, Response

from app.routers.auth import (
    REFRESH_COOKIE_NAME,
    _token_response,
    _validate_cookie_origin,
)


def request(*, origin: str | None = None, web_client: bool = False) -> Request:
    headers: list[tuple[bytes, bytes]] = []
    if origin:
        headers.append((b"origin", origin.encode()))
    if web_client:
        headers.append((b"x-finpa-client", b"web"))
    return Request({"type": "http", "method": "POST", "headers": headers})


class WebAuthTests(unittest.TestCase):
    def test_web_client_uses_http_only_cookie(self) -> None:
        response = Response()

        tokens = _token_response(
            request(web_client=True), response, "access-token", "refresh-token"
        )

        assert tokens.access_token == "access-token"
        assert tokens.refresh_token is None
        cookie = response.headers["set-cookie"]
        assert f"{REFRESH_COOKIE_NAME}=refresh-token" in cookie
        assert "HttpOnly" in cookie
        assert "SameSite=lax" in cookie

    def test_native_client_keeps_refresh_token_in_body(self) -> None:
        tokens = _token_response(request(), Response(), "access-token", "refresh-token")
        assert tokens.refresh_token == "refresh-token"

    def test_cookie_request_rejects_unknown_origin(self) -> None:
        try:
            _validate_cookie_origin(request(origin="https://evil.example"))
        except HTTPException as exc:
            assert exc.status_code == 403
        else:
            self.fail("Unknown origin was accepted")

    def test_cookie_request_accepts_local_web_origin(self) -> None:
        _validate_cookie_origin(request(origin="http://localhost:5173"))


if __name__ == "__main__":
    unittest.main()
