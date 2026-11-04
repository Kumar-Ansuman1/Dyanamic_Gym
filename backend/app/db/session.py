
from sqlalchemy import Select, create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker

from backend.app.core.config import settings
from backend.app.models.base import Base


engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def count_rows(db: Session, statement: Select) -> int:
    """Rows a filtered SELECT matches before paging; sent as X-Total-Count."""
    return db.scalar(
        select(func.count()).select_from(
            statement.order_by(None).limit(None).offset(None).subquery()
        )
    ) or 0
