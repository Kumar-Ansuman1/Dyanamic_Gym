
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.db.session import count_rows
from backend.app.models.enums import PaymentStatus, SubscriptionStatus
from backend.app.models.member import Member
from backend.app.models.payment import Payment
from backend.app.models.payment_allocation import PaymentAllocation
from backend.app.models.subscription import Subscription
from backend.app.models.user import User
from backend.app.schemas.payment import PaymentCreate


def create_payment(
    db: Session,
    payment_data: PaymentCreate,
    current_user: User,
) -> Payment:
    member = db.get(Member, payment_data.member_id)

    if member is None:
        raise LookupError("Member not found.")

    if not member.is_active:
        raise ValueError("Cannot record a payment for an inactive member.")

    amount = Decimal(payment_data.amount).quantize(Decimal("0.01"))
    allocation_total = sum(
        (Decimal(item.amount).quantize(Decimal("0.01"))
         for item in payment_data.allocations),
        Decimal("0.00"),
    )

    if allocation_total > amount:
        raise ValueError(
            "The total allocated amount cannot exceed the payment amount."
        )

    # Aggregate duplicate subscription allocations before validating them.
    requested_by_subscription: dict[UUID, Decimal] = {}

    for item in payment_data.allocations:
        requested_by_subscription[item.subscription_id] = (
            requested_by_subscription.get(
                item.subscription_id, Decimal("0.00")
            )
            + Decimal(item.amount).quantize(Decimal("0.01"))
        )

    for subscription_id, requested_amount in requested_by_subscription.items():
        subscription = db.scalar(
            select(Subscription)
            .where(Subscription.id == subscription_id)
            .with_for_update()
        )

        if subscription is None:
            raise LookupError(
                f"Subscription '{subscription_id}' not found."
            )

        if subscription.member_id != member.id:
            raise ValueError(
                "A payment can only be allocated to subscriptions "
                "belonging to the same member."
            )

        if subscription.status == SubscriptionStatus.CANCELLED:
            raise ValueError(
                "Payments cannot be allocated to a cancelled subscription."
            )

        already_allocated = db.scalar(
            select(func.coalesce(func.sum(PaymentAllocation.amount), 0))
            .join(
                Payment,
                Payment.id == PaymentAllocation.payment_id,
            )
            .where(
                PaymentAllocation.subscription_id == subscription_id,
                Payment.status == PaymentStatus.RECORDED,
            )
        )
        already_allocated = Decimal(already_allocated or 0)

        if already_allocated + requested_amount > Decimal(subscription.price):
            raise ValueError(
                f"Allocation exceeds the remaining balance for subscription "
                f"'{subscription_id}'. Subscription price: "
                f"{subscription.price}; already allocated: "
                f"{already_allocated}."
            )

    payment = Payment(
        member_id=member.id,
        amount=amount,
        method=payment_data.method,
        status=PaymentStatus.RECORDED,
        reference=payment_data.reference,
        paid_at=payment_data.paid_at,
        recorded_by=current_user.id,
        notes=payment_data.notes,
    )

    try:
        db.add(payment)
        db.flush()

        for item in payment_data.allocations:
            db.add(
                PaymentAllocation(
                    payment_id=payment.id,
                    subscription_id=item.subscription_id,
                    amount=Decimal(item.amount).quantize(Decimal("0.01")),
                )
            )

        db.commit()
        db.refresh(payment)
        return payment

    except Exception:
        db.rollback()
        raise


def list_payments(
    db: Session,
    member_id: UUID | None = None,
    payment_status: PaymentStatus | None = None,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[Payment], int]:
    """One page of payments, plus how many match the filters in total."""
    statement = select(Payment)

    if member_id is not None:
        statement = statement.where(Payment.member_id == member_id)

    if payment_status is not None:
        statement = statement.where(Payment.status == payment_status)

    total = count_rows(db, statement)

    statement = (
        statement
        .order_by(Payment.paid_at.desc(), Payment.id)
        .offset(skip)
        .limit(limit)
    )

    return list(db.scalars(statement).all()), total


def attach_member_fields(db: Session, payments: list[Payment]) -> list[Payment]:
    """Attach member name/code read by PaymentResponse."""
    member_ids = {payment.member_id for payment in payments}
    members = {
        member.id: member
        for member in db.scalars(
            select(Member).where(Member.id.in_(member_ids))
        )
    } if member_ids else {}

    for payment in payments:
        member = members.get(payment.member_id)
        payment.member_name = member.full_name if member else ""
        payment.member_code = member.member_code if member else ""

    return payments


def get_payment(db: Session, payment_id: UUID) -> Payment | None:
    return db.get(Payment, payment_id)


def list_payment_allocations(
    db: Session,
    payment_id: UUID,
) -> list[PaymentAllocation]:
    statement = (
        select(PaymentAllocation)
        .where(PaymentAllocation.payment_id == payment_id)
        .order_by(PaymentAllocation.id)
    )
    return list(db.scalars(statement).all())
