
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from backend.app.models.enums import PaymentMethod, PaymentStatus


class PaymentAllocationCreate(BaseModel):
    subscription_id: UUID
    amount: Decimal = Field(gt=0, max_digits=10, decimal_places=2)


class PaymentCreate(BaseModel):
    member_id: UUID
    amount: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    method: PaymentMethod = PaymentMethod.CASH
    paid_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    reference: str | None = Field(default=None, max_length=255)
    notes: str | None = None
    allocations: list[PaymentAllocationCreate] = Field(default_factory=list)


class PaymentAllocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    payment_id: UUID
    subscription_id: UUID
    amount: Decimal


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    member_id: UUID
    amount: Decimal
    method: PaymentMethod
    status: PaymentStatus
    reference: str | None
    paid_at: datetime
    recorded_by: UUID
    notes: str | None


class PaymentDetailResponse(PaymentResponse):
    allocations: list[PaymentAllocationResponse] = Field(default_factory=list)
