"""JWT token creation / verification and password hashing utilities."""

from datetime import UTC, datetime, timedelta

import bcrypt
from jose import JWTError, jwt

from app.config import settings


# ── Password helpers ──────────────────────────────────────────────────────


def hash_password(plain: str) -> str:
    """Return a bcrypt hash of *plain*."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Return ``True`` if *plain* matches *hashed*."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ── JWT helpers ───────────────────────────────────────────────────────────


def create_access_token(subject: str, extra: dict | None = None) -> str:
    """Create a signed JWT for *subject* (typically user-id)."""
    now = datetime.now(UTC)
    expire = now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload: dict = {
        "sub": subject,
        "iat": now,
        "exp": expire,
        **(extra or {}),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT.  Raises ``JWTError`` on any failure."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError:
        raise
    return payload
