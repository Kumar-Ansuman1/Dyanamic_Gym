
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from backend.app.models.enums import SubscriptionStatus


class SubscriptionCreate(BaseModel):
    member_id: UUID
    plan_id: UUID
    start_date: date


class SubscriptionRenew(BaseModel):
    # If omitted, the previous subscription's plan is reused
    # when that plan is still active.
    plan_id: UUID | None = None
    # If omitted, the next start date is chosen automatically.
    start_date: date | None = None


class SubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    member_id: UUID
    plan_id: UUID
    start_date: date
    end_date: date
    plan_name_snapshot: str
    duration_months_snapshot: int
    price: Decimal
    status: SubscriptionStatus
    renewed_from_id: UUID | None
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    # Display fields attached by the service (not columns), so the UI
    # never has to look members up by UUID or add up allocations itself.
    member_name: str = ""
    member_code: str = ""
    amount_paid: Decimal = Decimal("0")
    balance_due: Decimal = Decimal("0")
