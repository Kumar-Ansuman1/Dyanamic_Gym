
import calendar
from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, aliased

from backend.app.db.session import count_rows
from backend.app.models.enums import PaymentStatus, SubscriptionStatus
from backend.app.models.member import Member
from backend.app.models.membership_plan import MembershipPlan
from backend.app.models.payment import Payment
from backend.app.models.payment_allocation import PaymentAllocation
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


def _amount_paid():
    """Sum of recorded-payment allocations for the enclosing Subscription row."""
    return (
        select(func.coalesce(func.sum(PaymentAllocation.amount), 0))
        .join(Payment, Payment.id == PaymentAllocation.payment_id)
        .where(
            PaymentAllocation.subscription_id == Subscription.id,
            Payment.status == PaymentStatus.RECORDED,
        )
        .correlate(Subscription)
        .scalar_subquery()
    )


def attach_display_fields(
    db: Session,
    subscriptions: list[Subscription],
) -> list[Subscription]:
    """Attach member name/code and paid/balance figures read by SubscriptionResponse."""
    if not subscriptions:
        return subscriptions

    member_ids = {subscription.member_id for subscription in subscriptions}
    members = {
        member.id: member
        for member in db.scalars(
            select(Member).where(Member.id.in_(member_ids))
        )
    }
    paid = dict(
        db.execute(
            select(
                PaymentAllocation.subscription_id,
                func.sum(PaymentAllocation.amount),
            )
            .join(Payment, Payment.id == PaymentAllocation.payment_id)
            .where(
                PaymentAllocation.subscription_id.in_(
                    [subscription.id for subscription in subscriptions]
                ),
                Payment.status == PaymentStatus.RECORDED,
            )
            .group_by(PaymentAllocation.subscription_id)
        ).all()
    )

    for subscription in subscriptions:
        member = members.get(subscription.member_id)
        amount_paid = Decimal(paid.get(subscription.id) or 0)
        subscription.member_name = member.full_name if member else ""
        subscription.member_code = member.member_code if member else ""
        subscription.amount_paid = amount_paid
        # A cancelled subscription can't take payments, so nothing is owed on it.
        subscription.balance_due = (
            Decimal("0")
            if subscription.status == SubscriptionStatus.CANCELLED
            else max(Decimal(subscription.price) - amount_paid, Decimal("0"))
        )

    return subscriptions


def list_subscriptions(
    db: Session,
    member_id: UUID | None = None,
    subscription_status: SubscriptionStatus | None = None,
    ends_from: date | None = None,
    ends_to: date | None = None,
    not_renewed: bool = False,
    has_balance: bool = False,
    sort: str = "recent",
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[Subscription], int]:
    """One page of subscriptions, plus how many match the filters in total."""
    synchronize_statuses(db)

    statement = select(Subscription)

    if member_id is not None:
        statement = statement.where(Subscription.member_id == member_id)

    if subscription_status is not None:
        statement = statement.where(
            Subscription.status == subscription_status
        )

    if ends_from is not None:
        statement = statement.where(Subscription.end_date >= ends_from)

    if ends_to is not None:
        statement = statement.where(Subscription.end_date <= ends_to)

    if not_renewed:
        # Drop subscriptions the member has already moved past: a renewal
        # or any other current subscription that ends later.
        later = aliased(Subscription)
        statement = statement.where(
            ~select(later.id)
            .where(
                later.member_id == Subscription.member_id,
                later.id != Subscription.id,
                later.status.in_(
                    (SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING)
                ),
                later.end_date > Subscription.end_date,
            )
            .exists()
        )

    if has_balance:
        statement = statement.where(
            Subscription.status != SubscriptionStatus.CANCELLED,
            Subscription.price > _amount_paid(),
        )

    total = count_rows(db, statement)

    if sort == "ending":
        statement = statement.order_by(
            Subscription.end_date.asc(),
            Subscription.id,
        )
    else:
        statement = statement.order_by(
            Subscription.created_at.desc(),
            Subscription.id,
        )

    statement = statement.offset(skip).limit(limit)

    return list(db.scalars(statement).all()), total


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
