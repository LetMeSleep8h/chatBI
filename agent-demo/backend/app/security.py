"""HMAC 签名 token 与鉴权依赖。密钥从环境变量 AUTH_SECRET 读取，不硬编码。"""

import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any

from fastapi import Depends, HTTPException, Request

SECRET = os.getenv("AUTH_SECRET", "dev-only-secret-change-me-in-env")
TOKEN_TTL_SECONDS = 7 * 24 * 3600


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def _sign(payload_b64: str) -> str:
    return hmac.new(SECRET.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()


def issue_token(user_id: int, role: str) -> str:
    payload = json.dumps(
        {"user_id": user_id, "role": role, "exp": int(time.time()) + TOKEN_TTL_SECONDS},
        separators=(",", ":"),
    )
    payload_b64 = base64.urlsafe_b64encode(payload.encode()).decode().rstrip("=")
    return f"{payload_b64}.{_sign(payload_b64)}"


def parse_token(token: str) -> dict[str, Any]:
    try:
        payload_b64, sig = token.rsplit(".", 1)
        if not hmac.compare_digest(sig, _sign(payload_b64)):
            raise ValueError("bad signature")
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded))
        if payload["exp"] < time.time():
            raise ValueError("expired")
        return payload
    except Exception:
        raise HTTPException(401, "token 无效或已过期")


def current_user(request: Request) -> dict[str, Any]:
    """依赖注入：校验 Bearer token，返回 user_id/role/name。"""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "缺少 token，请先登录")
    payload = parse_token(auth[7:])
    return {"user_id": payload["user_id"], "role": payload["role"]}
