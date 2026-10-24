
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.models.member import Member
from backend.app.models.user import User
from backend.app.schemas.member import MemberCreate, MemberUpdate


def create_member(
    db: Session,
    member_data: MemberCreate,
    current_user: User,
) -> Member:
    """Create a member with a unique, database-generated member code."""

    sequence_value = db.scalar(
        text("SELECT nextval('member_code_seq')")
    )

    member_code = f"GYM-{sequence_value:04d}"

    member = Member(
        member_code=member_code,
        full_name=member_data.full_name,
        phone=member_data.phone,
        email=str(member_data.email) if member_data.email else None,
        joined_on=member_data.joined_on,
        is_active=True,
        created_by=current_user.id,
    )

    db.add(member)
    db.commit()
    db.refresh(member)

    return member


def update_member(
    db: Session,
    member_id: UUID,
    member_data: MemberUpdate,
) -> Member | None:
    """Update permitted fields of an existing member."""

    member = db.get(Member, member_id)

    if member is None:
        return None

    update_data = member_data.model_dump(exclude_unset=True)

    if not update_data:
        raise ValueError("At least one field must be provided.")

    for field in ("full_name", "phone", "joined_on", "is_active"):
        if field in update_data and update_data[field] is None:
            raise ValueError(f"{field} cannot be null.")

    if "email" in update_data and update_data["email"] is not None:
        update_data["email"] = str(update_data["email"])

    for field, value in update_data.items():
        setattr(member, field, value)

    db.commit()
    db.refresh(member)

    return member



def set_member_status(
    db: Session,
    member_id: UUID,
    is_active: bool,
) -> Member | None:
    """Activate or deactivate a member without deleting their record."""

    member = db.get(Member, member_id)

    if member is None:
        return None

    member.is_active = is_active

    db.commit()
    db.refresh(member)

    return member

