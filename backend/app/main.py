"""
公文高高 — 智能公文写作辅助工具 Backend
FastAPI 应用入口。
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db
from .api.writing import router as writing_router
from .api.knowledge import router as knowledge_router
from .api.documents import router as documents_router
from .api.auth import router as auth_router
from .api.materials import router as materials_router
from .api.style_api import router as style_router
from .api.deai_api import router as deai_router
from .api.secretary_api import router as secretary_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    init_db()
    print("✓ 数据库初始化完成")

    try:
        from .services.knowledge_service import init_chromadb
        init_chromadb()
        print("✓ ChromaDB 初始化完成")
    except Exception as e:
        print(f"⚠ ChromaDB 初始化失败（将使用 SQLite 回退搜索）: {e}")

    yield
    print("应用关闭")


app = FastAPI(
    title="公文高高 API",
    description="智能公文写作辅助工具 — 后端 API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — 允许前端域名
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth_router)
app.include_router(writing_router)
app.include_router(knowledge_router)
app.include_router(documents_router)
app.include_router(materials_router)
app.include_router(style_router)
app.include_router(deai_router)
app.include_router(secretary_router)


@app.get("/")
async def root():
    return {
        "name": "公文高高 API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "公文高高"}
