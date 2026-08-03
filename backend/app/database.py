"""
数据库连接与初始化。
使用 SQLAlchemy + SQLite，单用户场景下同步引擎即可。
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from pathlib import Path
import uuid


class Base(DeclarativeBase):
    pass


def get_engine(database_url: str = ""):
    """创建数据库引擎"""
    if not database_url:
        from .config import settings
        database_url = settings.database_url

    # 确保数据库文件目录存在
    url_path = database_url.replace("sqlite:///", "")
    db_file = Path(url_path)
    if not db_file.is_absolute():
        db_file = Path(__file__).parent.parent / db_file
    db_file.parent.mkdir(parents=True, exist_ok=True)

    engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False},  # SQLite 需要
        echo=False,
    )
    return engine


engine = get_engine()
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def init_db():
    """初始化数据库表"""
    Base.metadata.create_all(bind=engine)


def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def generate_uuid() -> str:
    return str(uuid.uuid4())
