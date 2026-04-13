import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routes import generate, health, lyrics, search, sound

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")


async def _background_init() -> None:
    from app.retrieval import _get_embedder, warm_cache

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _get_embedder)
    asyncio.create_task(warm_cache())


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.retrieval import close_tpuf_client, init_tpuf_client

    init_tpuf_client()
    asyncio.create_task(_background_init())
    yield
    await close_tpuf_client()


app = FastAPI(title="GrooveForge API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:4173",
        "https://groove-forge.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = Path(__file__).parent.parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

app.include_router(health.router)           # /health  (Railway healthcheck)
app.include_router(health.router, prefix="/api")  # /api/health
app.include_router(search.router, prefix="/api")
app.include_router(generate.router, prefix="/api")
app.include_router(lyrics.router, prefix="/api")
app.include_router(sound.router, prefix="/api")
