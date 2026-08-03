"""
应用配置管理，使用 pydantic-settings 从 .env 文件读取配置。
"""
from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # Anthropic Claude API
    anthropic_api_key: str = ""
    default_model: str = "claude-sonnet-4-20250514"
    default_max_tokens: int = 32000
    default_temperature: float = 0.3

    # Database
    database_url: str = "sqlite:///./app.db"

    # ChromaDB
    chroma_persist_dir: str = "./chroma_data"

    # Embedding Model
    embedding_model: str = "BAAI/bge-small-zh-v1.5"

    # Server
    host: str = "127.0.0.1"
    port: int = 8000

    # JWT 认证
    jwt_secret_key: str = "gongwen-gaogao-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24小时

    # 前端地址（用于 CORS）
    frontend_url: str = "http://localhost:5173"

    @property
    def cors_origins(self) -> list:
        return [o.strip() for o in self.frontend_url.split(",") if o.strip()]

    @property
    def db_path(self) -> Path:
        url = self.database_url.replace("sqlite:///", "")
        p = Path(url)
        if not p.is_absolute():
            p = Path(__file__).parent.parent / p
        return p

    @property
    def chroma_path(self) -> Path:
        p = Path(self.chroma_persist_dir)
        if not p.is_absolute():
            p = Path(__file__).parent.parent / p
        return p

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
