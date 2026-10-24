
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.membership_plan import MembershipPlan
from backend.app.models.user import User
from backend.app.schemas.membership_plan import (
    MembershipPlanCreate,
    MembershipPlanResponse,
    MembershipPlanStatusUpdate,
    MembershipPlanUpdate,
)
from backend.app.services.membership_plan_service import (
    create_membership_plan,
    get_membership_plan,
    list_membership_plans,
    set_membership_plan_status,
    update_membership_plan,
)


router = APIRouter(
    prefix="/membership-plans",
    tags=["Membership Plans"],
)


@router.post(
    "",
    response_model=MembershipPlanResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_plan(
    plan_data: MembershipPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MembershipPlan:
    """Create a membership plan. Requires authentication."""

    try:
        return create_membership_plan(db, plan_data)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A membership plan with this name may already exist.",
        ) from exc


@router.get("", response_model=list[MembershipPlanResponse])
def list_plans(
    search: str | None = Query(
        default=None,
        min_length=1,
        max_length=50,
    ),
    is_active: bool | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MembershipPlan]:
    """Search, filter and paginate membership plans."""

    return list_membership_plans(
        db=db,
        search=search,
        is_active=is_active,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{plan_id}",
    response_model=MembershipPlanResponse,
)
def get_plan(
    plan_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MembershipPlan:
    """Retrieve a single membership plan."""

    plan = get_membership_plan(db, plan_id)

    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership plan not found",
        )

    return plan


@router.patch(
    "/{plan_id}",
    response_model=MembershipPlanResponse,
)
def edit_plan(
    plan_id: UUID,
    plan_data: MembershipPlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MembershipPlan:
    """Partially update a membership plan."""

    try:
        plan = update_membership_plan(
            db=db,
            plan_id=plan_id,
            plan_data=plan_data,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The plan name conflicts with an existing plan.",
        ) from exc

    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership plan not found",
        )

    return plan


@router.patch(
    "/{plan_id}/status",
    response_model=MembershipPlanResponse,
)
def change_plan_status(
    plan_id: UUID,
    status_data: MembershipPlanStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MembershipPlan:
    """Activate or deactivate a plan without deleting its record."""

    plan = set_membership_plan_status(
        db=db,
        plan_id=plan_id,
        is_active=status_data.is_active,
    )

    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership plan not found",
        )

    return plan
