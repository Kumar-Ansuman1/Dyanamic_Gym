
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.security import verify_password
from backend.app.models.user import User


def authenticate_user(
    db: Session,
    email: str,
    password: str,
) -> User | None:
    """Return the active user if the supplied credentials are valid."""

    statement = select(User).where(User.email == email)
    user = db.scalar(statement)

    if user is None:
        return None

    if not verify_password(password, user.password_hash):
        return None

    if not user.is_active:
        return None

    return user
