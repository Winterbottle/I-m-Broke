"""
Admin endpoints for manually triggering scrapers.
Protected by a simple secret key.
"""
import os
from fastapi import APIRouter, HTTPException, Header
from typing import Optional

router = APIRouter(prefix="/admin", tags=["admin"])


def _check_key(x_admin_key: Optional[str]):
    secret = os.getenv("ADMIN_SECRET_KEY", "")
    if not secret or x_admin_key != secret:
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.post("/scrape/web")
async def trigger_web_scraper(x_admin_key: Optional[str] = Header(None)):
    _check_key(x_admin_key)
    try:
        from app.scrapers.web_scraper import run_web_scraper
        await run_web_scraper()
        return {"status": "ok", "message": "Web scraper completed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scrape/telegram")
async def trigger_telegram_scraper(x_admin_key: Optional[str] = Header(None)):
    _check_key(x_admin_key)
    try:
        from app.scrapers.telegram_scraper import run_telegram_scraper
        await run_telegram_scraper()
        return {"status": "ok", "message": "Telegram scraper completed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
