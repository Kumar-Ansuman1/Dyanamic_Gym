
import uuid

from sqlalchemy import Boolean, CheckConstraint, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base, TimestampMixin


class MembershipPlan(TimestampMixin, Base):
    __tablename__ = "membership_plans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    name: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
    )

    duration_months: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "duration_months IN (1, 3, 6, 12)",
            name="ck_membership_plans_allowed_duration",
        ),
        CheckConstraint(
            "price >= 0",
            name="ck_membership_plans_nonnegative_price",
        ),
    )
