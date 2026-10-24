
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.membership_plan import MembershipPlan
from backend.app.schemas.membership_plan import (
    MembershipPlanCreate,
    MembershipPlanUpdate,
)


def create_membership_plan(
    db: Session,
    plan_data: MembershipPlanCreate,
) -> MembershipPlan:
    plan = MembershipPlan(
        name=plan_data.name,
        duration_months=plan_data.duration_months,
        price=plan_data.price,
        is_active=True,
    )

    db.add(plan)
    db.commit()
    db.refresh(plan)

    return plan


def list_membership_plans(
    db: Session,
    search: str | None = None,
    is_active: bool | None = None,
    skip: int = 0,
    limit: int = 20,
) -> list[MembershipPlan]:
    statement = select(MembershipPlan)

    if search is not None:
        search_term = f"%{search.strip()}%"
        statement = statement.where(
            MembershipPlan.name.ilike(search_term)
        )

    if is_active is not None:
        statement = statement.where(
            MembershipPlan.is_active.is_(is_active)
        )

    statement = (
        statement
        .order_by(
            MembershipPlan.created_at.desc(),
            MembershipPlan.id,
        )
        .offset(skip)
        .limit(limit)
    )

    return list(db.scalars(statement).all())


def get_membership_plan(
    db: Session,
    plan_id: UUID,
) -> MembershipPlan | None:
    return db.get(MembershipPlan, plan_id)


def update_membership_plan(
    db: Session,
    plan_id: UUID,
    plan_data: MembershipPlanUpdate,
) -> MembershipPlan | None:
    plan = db.get(MembershipPlan, plan_id)

    if plan is None:
        return None

    update_data = plan_data.model_dump(exclude_unset=True)

    if not update_data:
        raise ValueError("At least one field must be provided.")

    for field, value in update_data.items():
        if value is None:
            raise ValueError(f"{field} cannot be null.")

        setattr(plan, field, value)

    db.commit()
    db.refresh(plan)

    return plan


def set_membership_plan_status(
    db: Session,
    plan_id: UUID,
    is_active: bool,
) -> MembershipPlan | None:
    plan = db.get(MembershipPlan, plan_id)

    if plan is None:
        return None

    plan.is_active = is_active

    db.commit()
    db.refresh(plan)

    return plan
