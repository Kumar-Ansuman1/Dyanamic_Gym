
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.member import Member
from backend.app.models.user import User
from backend.app.schemas.member import (
    MemberCreate,
    MemberResponse,
    MemberStatusUpdate,
    MemberUpdate,
)
from backend.app.services.member_service import (
    create_member,
    set_member_status,
    update_member,
)


router = APIRouter(prefix="/members", tags=["Members"])


@router.post(
    "",
    response_model=MemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_member(
    member_data: MemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Member:
    """Register a new gym member. Requires owner authentication."""

    return create_member(
        db=db,
        member_data=member_data,
        current_user=current_user,
    )


@router.get("", response_model=list[MemberResponse])
def list_members(
    search: str | None = Query(default=None, min_length=1, max_length=100),
    is_active: bool | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Member]:
    """Search and filter members with pagination. Requires owner authentication."""

    statement = select(Member)

    if search is not None:
        search_term = f"%{search.strip()}%"

        statement = statement.where(
            or_(
                Member.full_name.ilike(search_term),
                Member.phone.ilike(search_term),
                Member.member_code.ilike(search_term),
            )
        )

    if is_active is not None:
        statement = statement.where(Member.is_active.is_(is_active))

    statement = (
        statement
        .order_by(Member.created_at.desc(), Member.id)
        .offset(skip)
        .limit(limit)
    )

    return list(db.scalars(statement).all())


@router.get("/{member_id}", response_model=MemberResponse)
def get_member(
    member_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Member:
    """Retrieve one member by UUID. Requires owner authentication."""

    member = db.get(Member, member_id)

    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )

    return member


@router.put("/{member_id}", response_model=MemberResponse)
def edit_member(
    member_id: UUID,
    member_data: MemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Member:
    """Update an existing member. Requires owner authentication."""

    try:
        member = update_member(
            db=db,
            member_id=member_id,
            member_data=member_data,
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
            detail="The update conflicts with existing database data.",
        ) from exc

    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )

    return member


@router.patch(
    "/{member_id}/status",
    response_model=MemberResponse,
)
def change_member_status(
    member_id: UUID,
    status_data: MemberStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Member:
    """Activate or deactivate a member. Requires owner authentication."""

    member = set_member_status(
        db=db,
        member_id=member_id,
        is_active=status_data.is_active,
    )

    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )

    return member
