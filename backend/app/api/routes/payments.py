
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.enums import PaymentStatus
from backend.app.models.payment import Payment
from backend.app.models.user import User
from backend.app.schemas.payment import (
    PaymentCreate,
    PaymentDetailResponse,
    PaymentResponse,
)
from backend.app.services.payment_service import (
    create_payment,
    get_payment,
    list_payment_allocations,
    list_payments,
)


router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post(
    "",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_payment_endpoint(
    payment_data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Payment:
    try:
        return create_payment(
            db=db,
            payment_data=payment_data,
            current_user=current_user,
        )
    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc


@router.get("", response_model=list[PaymentResponse])
def list_payments_endpoint(
    member_id: UUID | None = Query(default=None),
    payment_status: PaymentStatus | None = Query(
        default=None,
        alias="status",
    ),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Payment]:
    return list_payments(
        db=db,
        member_id=member_id,
        payment_status=payment_status,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{payment_id}",
    response_model=PaymentDetailResponse,
)
def get_payment_endpoint(
    payment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    payment = get_payment(db, payment_id)

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found.",
        )

    response = PaymentResponse.model_validate(payment).model_dump()
    response["allocations"] = list_payment_allocations(db, payment.id)

    return response
