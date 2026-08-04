"""
SQLAlchemy ORM 模型定义。
"""
import json
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from .database import Base, generate_uuid


def _default_uuid():
    return generate_uuid()


class User(Base):
    """用户"""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=_default_uuid)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(200), unique=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Document(Base):
    """公文文稿"""
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=_default_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False, default="")
    doc_type = Column(String(50), nullable=False, default="通知", index=True)
    keywords = Column(Text, default="")
    framework = Column(Text, default="")      # JSON 格式的框架
    content = Column(Text, default="")         # Markdown 正文
    status = Column(String(20), default="draft", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def get_keywords(self) -> list:
        try:
            return json.loads(self.keywords) if self.keywords else []
        except json.JSONDecodeError:
            return []

    def set_keywords(self, kw_list: list):
        self.keywords = json.dumps(kw_list, ensure_ascii=False)

    def get_framework(self) -> list:
        try:
            return json.loads(self.framework) if self.framework else []
        except json.JSONDecodeError:
            return []

    def set_framework(self, fw_list: list):
        self.framework = json.dumps(fw_list, ensure_ascii=False)


class KnowledgeChunk(Base):
    """知识库块"""
    __tablename__ = "knowledge_chunks"

    id = Column(String(36), primary_key=True, default=_default_uuid)
    category = Column(String(50), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    source = Column(String(500), default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class NewsItem(Base):
    """近期简讯"""
    __tablename__ = "news_items"

    id = Column(String(36), primary_key=True, default=_default_uuid)
    title = Column(String(500), nullable=False)
    source = Column(String(50), nullable=False)
    url = Column(String(500), default="")
    date = Column(String(20), nullable=False)
    snippet = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
