"""
Background scheduler that runs scrapers on a cron schedule.
"""
import logging
import asyncio
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)
_scheduler: BackgroundScheduler | None = None


def _run_async(coro):
    """Run an async function in a new event loop (for APScheduler jobs)."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(coro)
    finally:
        loop.close()


def job_telegram():
    from app.scrapers.telegram_scraper import run_telegram_scraper
    logger.info("[scheduler] running telegram scraper")
    _run_async(run_telegram_scraper())


def job_web():
    from app.scrapers.web_scraper import run_web_scraper
    logger.info("[scheduler] running web scraper")
    _run_async(run_web_scraper())


def job_instagram():
    from app.scrapers.instagram_scraper import run_instagram_scraper
    logger.info("[scheduler] running instagram scraper")
    _run_async(run_instagram_scraper())


def job_deactivate_expired():
    """Mark expired deals as inactive."""
    from app.db.client import get_supabase
    from datetime import datetime, timezone
    sb = get_supabase()
    sb.table("deals").update({"is_active": False}).lt(
        "expires_at", datetime.now(timezone.utc).isoformat()
    ).execute()
    logger.info("[scheduler] deactivated expired deals")


def start_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        return

    _scheduler = BackgroundScheduler(timezone="Asia/Singapore")

    # Telegram: every 2 hours
    _scheduler.add_job(job_telegram, CronTrigger(hour="*/2"), id="telegram", replace_existing=True)

    # Web: every 4 hours
    _scheduler.add_job(job_web, CronTrigger(hour="*/4"), id="web", replace_existing=True)

    # Instagram: every 3 hours
    _scheduler.add_job(job_instagram, CronTrigger(hour="*/3"), id="instagram", replace_existing=True)

    # Deactivate expired: every hour
    _scheduler.add_job(job_deactivate_expired, CronTrigger(minute=0), id="expire", replace_existing=True)

    _scheduler.start()
    logger.info("[scheduler] started — Telegram(2h), Web(4h), Instagram(3h), Expire(1h)")


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown()
