
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from backend.app.models.enums import (
    NotificationChannel,
    NotificationStatus,
    ReminderType,
    SubscriptionStatus,
)
from backend.app.models.member import Member
from backend.app.models.notification import Notification
from backend.app.models.subscription import Subscription


INDIA_TZ = ZoneInfo("Asia/Kolkata")

REMINDERS = (
    (7, ReminderType.SEVEN_DAY),
    (3, ReminderType.THREE_DAY),
    (0, ReminderType.EXPIRY_DAY),
)


def generate_expiry_notifications(
    db: Session,
    today=None,
) -> int:
    """Create dashboard reminders for subscriptions nearing expiry."""
    today = today or datetime.now(INDIA_TZ).date()
    now = datetime.now(INDIA_TZ)
    created_count = 0

    try:
        for days_before, reminder_type in REMINDERS:
            target_date = today.fromordinal(
                today.toordinal() + days_before
            )

            subscriptions = db.execute(
                select(
                    Subscription.id,
                    Subscription.member_id,
                ).where(
                    Subscription.end_date == target_date,
                    Subscription.status != SubscriptionStatus.CANCELLED,
                )
            ).all()

            for subscription_id, member_id in subscriptions:
                statement = (
                    insert(Notification)
                    .values(
                        subscription_id=subscription_id,
                        member_id=member_id,
                        channel=NotificationChannel.DASHBOARD,
                        reminder_type=reminder_type,
                        scheduled_for=now,
                        status=NotificationStatus.DELIVERED,
                        sent_at=now,
                    )
                    .on_conflict_do_nothing(
                        constraint=(
                            "uq_notifications_subscription_reminder_channel"
                        )
                    )
                )

                result = db.execute(statement)
                created_count += result.rowcount or 0

        db.commit()
        return created_count

    except Exception:
        db.rollback()
        raise


def list_notifications(
    db: Session,
    unread_only: bool = False,
    skip: int = 0,
    limit: int = 20,
) -> list[dict]:
    statement = (
        select(
            Notification,
            Member.full_name,
            Member.member_code,
            Subscription.end_date,
        )
        .join(Member, Member.id == Notification.member_id)
        .join(
            Subscription,
            Subscription.id == Notification.subscription_id,
        )
        .where(
            Notification.channel == NotificationChannel.DASHBOARD
        )
    )

    if unread_only:
        statement = statement.where(Notification.read_at.is_(None))

    rows = db.execute(
        statement
        .order_by(
            Notification.created_at.desc(),
            Notification.id.desc(),
        )
        .offset(skip)
        .limit(limit)
    ).all()

    items = []

    for notification, member_name, member_code, end_date in rows:
        days_left = (end_date - notification.created_at.date()).days

        if notification.reminder_type == ReminderType.SEVEN_DAY:
            message = f"{member_name}'s membership expires in 7 days."
        elif notification.reminder_type == ReminderType.THREE_DAY:
            message = f"{member_name}'s membership expires in 3 days."
        else:
            message = f"{member_name}'s membership expires today."

        items.append(
            {
                "id": notification.id,
                "subscription_id": notification.subscription_id,
                "member_id": notification.member_id,
                "member_name": member_name,
                "member_code": member_code,
                "end_date": end_date,
                "reminder_type": notification.reminder_type,
                "status": notification.status,
                "message": message,
                "read_at": notification.read_at,
                "created_at": notification.created_at,
            }
        )

    return items


def get_unread_notification_count(db: Session) -> int:
    count = db.scalar(
        select(func.count(Notification.id)).where(
            Notification.channel == NotificationChannel.DASHBOARD,
            Notification.read_at.is_(None),
        )
    )

    return count or 0


def mark_notification_as_read(
    db: Session,
    notification_id: UUID,
) -> Notification | None:
    notification = db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.channel == NotificationChannel.DASHBOARD,
        )
    )

    if notification is None:
        return None

    if notification.read_at is None:
        notification.read_at = datetime.now(INDIA_TZ)
        db.commit()
        db.refresh(notification)

    return notification
