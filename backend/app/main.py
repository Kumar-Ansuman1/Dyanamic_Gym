
import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI

from backend.app.api.routes.auth import router as auth_router
from backend.app.api.routes.members import router as members_router
from backend.app.api.routes.membership_plans import (
    router as membership_plans_router,
)
from backend.app.api.routes.subscriptions import (
    router as subscriptions_router,
)
from backend.app.api.routes.payments import router as payments_router
from backend.app.api.routes.notifications import router as notifications_router
from backend.app.core.config import settings
from backend.app.services.notification_scheduler import (
    notification_scheduler,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler_task = asyncio.create_task(notification_scheduler())

    try:
        yield
    finally:
        scheduler_task.cancel()
        with suppress(asyncio.CancelledError):
            await scheduler_task


app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

app.include_router(auth_router, prefix="/api")
app.include_router(members_router, prefix="/api")
app.include_router(membership_plans_router, prefix="/api")
app.include_router(subscriptions_router, prefix="/api")
app.include_router(payments_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "message": "Gym Management API is running",
    }
