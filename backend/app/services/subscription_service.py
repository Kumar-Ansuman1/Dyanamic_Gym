
import calendar
from datetime import date, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.enums import SubscriptionStatus
from backend.app.models.member import Member
from backend.app.models.membership_plan import MembershipPlan
from backend.app.models.subscription import Subscription
from backend.app.models.user import User
from backend.app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionRenew,
)


def add_calendar_months(start_date: date, months: int) -> date:
    """Add calendar months, clipping to the last valid day of the target month."""
    month_index = start_date.month - 1 + months
    year = start_date.year + month_index // 12
    month = month_index % 12 + 1
    day = min(start_date.day, calendar.monthrange(year, month)[1])

    return date(year, month, day)


def calculate_status(start_date: date, end_date: date) -> SubscriptionStatus:
    today = date.today()

    if start_date > today:
        return SubscriptionStatus.PENDING

    if end_date < today:
        return SubscriptionStatus.EXPIRED

    return SubscriptionStatus.ACTIVE


def synchronize_statuses(db: Session) -> None:
    """Keep pending, active, and expired statuses aligned with subscription dates."""
    subscriptions = db.scalars(
        select(Subscription).where(
            Subscription.status != SubscriptionStatus.CANCELLED
        )
    ).all()

    changed = False

    for subscription in subscriptions:
        new_status = calculate_status(
            subscription.start_date,
            subscription.end_date,
        )

        if subscription.status != new_status:
            subscription.status = new_status
            changed = True

    if changed:
        db.commit()


def _get_active_member(db: Session, member_id: UUID) -> Member:
    member = db.get(Member, member_id)

    if member is None:
        raise LookupError("Member not found.")

    if not member.is_active:
        raise ValueError("Cannot create a subscription for an inactive member.")

    return member


def _get_active_plan(db: Session, plan_id: UUID) -> MembershipPlan:
    plan = db.get(MembershipPlan, plan_id)

    if plan is None:
        raise LookupError("Membership plan not found.")

    if not plan.is_active:
        raise ValueError("Cannot use an inactive membership plan.")

    return plan


def _build_subscription(
    *,
    member: Member,
    plan: MembershipPlan,
    start_date: date,
    created_by: User,
    renewed_from_id: UUID | None = None,
) -> Subscription:
    end_date = add_calendar_months(
        start_date,
        plan.duration_months,
    )

    return Subscription(
        member_id=member.id,
        plan_id=plan.id,
        start_date=start_date,
        end_date=end_date,
        plan_name_snapshot=plan.name,
        duration_months_snapshot=plan.duration_months,
        price=plan.price,
        status=calculate_status(start_date, end_date),
        renewed_from_id=renewed_from_id,
        created_by=created_by.id,
    )


def create_subscription(
    db: Session,
    subscription_data: SubscriptionCreate,
    current_user: User,
) -> Subscription:
    member = _get_active_member(db, subscription_data.member_id)
    plan = _get_active_plan(db, subscription_data.plan_id)

    subscription = _build_subscription(
        member=member,
        plan=plan,
        start_date=subscription_data.start_date,
        created_by=current_user,
    )

    db.add(subscription)
    db.commit()
    db.refresh(subscription)

    return subscription


def list_subscriptions(
    db: Session,
    member_id: UUID | None = None,
    subscription_status: SubscriptionStatus | None = None,
    skip: int = 0,
    limit: int = 20,
) -> list[Subscription]:
    synchronize_statuses(db)

    statement = select(Subscription)

    if member_id is not None:
        statement = statement.where(Subscription.member_id == member_id)

    if subscription_status is not None:
        statement = statement.where(
            Subscription.status == subscription_status
        )

    statement = (
        statement
        .order_by(Subscription.created_at.desc(), Subscription.id)
        .offset(skip)
        .limit(limit)
    )

    return list(db.scalars(statement).all())


def get_subscription(
    db: Session,
    subscription_id: UUID,
) -> Subscription | None:
    synchronize_statuses(db)
    return db.get(Subscription, subscription_id)


def cancel_subscription(
    db: Session,
    subscription_id: UUID,
) -> Subscription | None:
    subscription = db.get(Subscription, subscription_id)

    if subscription is None:
        return None

    if subscription.status in (
        SubscriptionStatus.CANCELLED,
        SubscriptionStatus.EXPIRED,
    ):
        raise ValueError(
            f"Cannot cancel a subscription with status '{subscription.status.value}'."
        )

    subscription.status = SubscriptionStatus.CANCELLED

    db.commit()
    db.refresh(subscription)

    return subscription


def renew_subscription(
    db: Session,
    subscription_id: UUID,
    renewal_data: SubscriptionRenew,
    current_user: User,
) -> Subscription | None:
    synchronize_statuses(db)

    previous = db.get(Subscription, subscription_id)

    if previous is None:
        return None

    if previous.status == SubscriptionStatus.CANCELLED:
        raise ValueError("A cancelled subscription cannot be renewed.")

    existing_renewal = db.scalar(
        select(Subscription.id).where(
            Subscription.renewed_from_id == previous.id
        ).limit(1)
    )

    if existing_renewal is not None:
        raise ValueError(
            "This subscription has already been renewed."
        )

    member = _get_active_member(db, previous.member_id)

    if renewal_data.plan_id is not None:
        plan_id = renewal_data.plan_id
    else:
        plan_id = previous.plan_id

    plan = _get_active_plan(db, plan_id)

    if renewal_data.start_date is not None:
        start_date = renewal_data.start_date
    else:
        start_date = max(
            date.today(),
            previous.end_date + timedelta(days=1),
        )

    renewed = _build_subscription(
        member=member,
        plan=plan,
        start_date=start_date,
        created_by=current_user,
        renewed_from_id=previous.id,
    )

    db.add(renewed)
    db.commit()
    db.refresh(renewed)

    return renewed
