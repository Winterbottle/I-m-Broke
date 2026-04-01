import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.api import deals, events, search, submit, admin

app = FastAPI(
    title="I'm Broke API",
    description="Singapore geo-spatial deal aggregation platform",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
PREFIX = "/api/v1"
app.include_router(deals.router, prefix=PREFIX)
app.include_router(events.router, prefix=PREFIX)
app.include_router(search.router, prefix=PREFIX)
app.include_router(submit.router, prefix=PREFIX)
app.include_router(admin.router, prefix=PREFIX)


@app.get(f"{PREFIX}/stats")
async def platform_stats():
    return await submit.get_stats()


@app.get("/health")
async def health():
    return {"status": "ok", "service": "im-broke-api"}


# ── Scheduler (starts with the app) ───────────────────────────────────────────
@app.on_event("startup")
async def startup():
    try:
        from app.scrapers.scheduler import start_scheduler
        start_scheduler()
        print("[scheduler] started")
    except Exception as e:
        print(f"[scheduler] failed to start: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
