
from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from backend.app.models.enums import (
    NotificationStatus,
    ReminderType,
)


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    subscription_id: UUID
    member_id: UUID
    member_name: str
    member_code: str
    end_date: date
    reminder_type: ReminderType
    status: NotificationStatus
    message: str
    read_at: datetime | None
    created_at: datetime


class UnreadNotificationCount(BaseModel):
    count: int
