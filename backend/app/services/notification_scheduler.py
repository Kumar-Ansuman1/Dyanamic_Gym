
import asyncio
import logging

from backend.app.db.session import SessionLocal
from backend.app.services.notification_service import (
    generate_expiry_notifications,
)


logger = logging.getLogger(__name__)
INTERVAL_SECONDS = 24 * 60 * 60


def run_expiry_notification_job() -> None:
    db = SessionLocal()

    try:
        created = generate_expiry_notifications(db)
        logger.info(
            "Expiry notification job completed. Created %s reminders.",
            created,
        )
    except Exception:
        logger.exception("Expiry notification job failed.")
    finally:
        db.close()


async def notification_scheduler() -> None:
    while True:
        await asyncio.to_thread(run_expiry_notification_job)
        await asyncio.sleep(INTERVAL_SECONDS)
