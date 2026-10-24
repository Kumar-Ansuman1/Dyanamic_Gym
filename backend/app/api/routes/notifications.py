
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.enums import NotificationChannel
from backend.app.models.member import Member
from backend.app.models.notification import Notification
from backend.app.models.subscription import Subscription
from backend.app.models.user import User
from backend.app.schemas.notification import (
    NotificationResponse,
    UnreadNotificationCount,
)
from backend.app.services.notification_service import (
    generate_expiry_notifications,
    get_unread_notification_count,
    list_notifications,
    mark_notification_as_read,
)


router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.post("/generate")
def generate_notifications_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Manually run the expiry reminder check."""
    created = generate_expiry_notifications(db)

    return {
        "message": "Expiry notification check completed.",
        "created": created,
    }


@router.get("", response_model=list[NotificationResponse])
def list_notifications_endpoint(
    unread_only: bool = Query(default=False),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    return list_notifications(
        db=db,
        unread_only=unread_only,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/unread-count",
    response_model=UnreadNotificationCount,
)
def unread_notification_count_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return {"count": get_unread_notification_count(db)}


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
)
def mark_notification_read_endpoint(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    notification = mark_notification_as_read(
        db=db,
        notification_id=notification_id,
    )

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )

    member = db.get(Member, notification.member_id)
    subscription = db.get(Subscription, notification.subscription_id)

    if member is None or subscription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification member or subscription not found.",
        )

    if notification.reminder_type.value == "seven_day":
        message = f"{member.full_name}'s membership expires in 7 days."
    elif notification.reminder_type.value == "three_day":
        message = f"{member.full_name}'s membership expires in 3 days."
    else:
        message = f"{member.full_name}'s membership expires today."

    return {
        "id": notification.id,
        "subscription_id": notification.subscription_id,
        "member_id": notification.member_id,
        "member_name": member.full_name,
        "member_code": member.member_code,
        "end_date": subscription.end_date,
        "reminder_type": notification.reminder_type,
        "status": notification.status,
        "message": message,
        "read_at": notification.read_at,
        "created_at": notification.created_at,
    }
