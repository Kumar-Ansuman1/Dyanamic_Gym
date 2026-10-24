
from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class MemberCreate(BaseModel):
    """Fields the owner must provide when registering a member."""

    full_name: str = Field(min_length=2, max_length=150)
    phone: str = Field(min_length=7, max_length=20)
    email: EmailStr | None = None
    joined_on: date


class MemberUpdate(BaseModel):
    """Fields the owner can update for an existing member."""

    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    phone: str | None = Field(default=None, min_length=7, max_length=20)
    email: EmailStr | None = None
    joined_on: date | None = None
    is_active: bool | None = None


class MemberStatusUpdate(BaseModel):
    """Request body for activating or deactivating a member."""

    is_active: bool


class MemberResponse(BaseModel):
    """Fields returned by the API after retrieving a member."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    member_code: str
    full_name: str
    phone: str
    email: EmailStr | None
    joined_on: date
    is_active: bool
    created_by: UUID
    created_at: datetime
    updated_at: datetime
