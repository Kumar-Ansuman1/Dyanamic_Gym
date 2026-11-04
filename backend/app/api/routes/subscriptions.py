
from datetime import date
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.enums import SubscriptionStatus
from backend.app.models.subscription import Subscription
from backend.app.models.user import User
from backend.app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionRenew,
    SubscriptionResponse,
)
from backend.app.services.subscription_service import (
    attach_display_fields,
    cancel_subscription,
    create_subscription,
    get_subscription,
    list_subscriptions,
    renew_subscription,
)


router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


@router.post(
    "",
    response_model=SubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_subscription_endpoint(
    subscription_data: SubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Subscription:
    try:
        subscription = create_subscription(
            db=db,
            subscription_data=subscription_data,
            current_user=current_user,
        )
        return attach_display_fields(db, [subscription])[0]
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


@router.get("", response_model=list[SubscriptionResponse])
def list_subscriptions_endpoint(
    response: Response,
    member_id: UUID | None = Query(default=None),
    subscription_status: SubscriptionStatus | None = Query(
        default=None,
        alias="status",
    ),
    ends_from: date | None = Query(default=None),
    ends_to: date | None = Query(default=None),
    not_renewed: bool = Query(
        default=False,
        description="Hide subscriptions the member has already renewed or replaced.",
    ),
    has_balance: bool = Query(
        default=False,
        description="Only subscriptions with money still due.",
    ),
    sort: Literal["recent", "ending"] = Query(default="recent"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Subscription]:
    subscriptions, total = list_subscriptions(
        db=db,
        member_id=member_id,
        subscription_status=subscription_status,
        ends_from=ends_from,
        ends_to=ends_to,
        not_renewed=not_renewed,
        has_balance=has_balance,
        sort=sort,
        skip=skip,
        limit=limit,
    )
    response.headers["X-Total-Count"] = str(total)

    return attach_display_fields(db, subscriptions)


@router.get(
    "/{subscription_id}",
    response_model=SubscriptionResponse,
)
def get_subscription_endpoint(
    subscription_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Subscription:
    subscription = get_subscription(db, subscription_id)

    if subscription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found.",
        )

    return attach_display_fields(db, [subscription])[0]


@router.post(
    "/{subscription_id}/renew",
    response_model=SubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
)
def renew_subscription_endpoint(
    subscription_id: UUID,
    renewal_data: SubscriptionRenew,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Subscription:
    try:
        subscription = renew_subscription(
            db=db,
            subscription_id=subscription_id,
            renewal_data=renewal_data,
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

    if subscription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found.",
        )

    return attach_display_fields(db, [subscription])[0]


@router.patch(
    "/{subscription_id}/cancel",
    response_model=SubscriptionResponse,
)
def cancel_subscription_endpoint(
    subscription_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Subscription:
    try:
        subscription = cancel_subscription(
            db=db,
            subscription_id=subscription_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    if subscription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found.",
        )

    return attach_display_fields(db, [subscription])[0]
