
from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


AllowedDuration = Literal[1, 3, 6, 12]


class MembershipPlanCreate(BaseModel):
    name: str = Field(min_length=2, max_length=50)
    duration_months: AllowedDuration
    price: Decimal = Field(
        ge=0,
        max_digits=10,
        decimal_places=2,
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()

        if len(value) < 2:
            raise ValueError("Plan name must contain at least 2 characters.")

        return value


class MembershipPlanUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=50)
    duration_months: AllowedDuration | None = None
    price: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=10,
        decimal_places=2,
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return value

        value = value.strip()

        if len(value) < 2:
            raise ValueError("Plan name must contain at least 2 characters.")

        return value


class MembershipPlanStatusUpdate(BaseModel):
    is_active: bool


class MembershipPlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    duration_months: int
    price: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime
