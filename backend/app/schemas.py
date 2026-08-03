"""
Pydantic 请求/响应模型。
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime


# ========== 用户认证 ==========

class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    email: str = Field(..., max_length=200)
    password: str = Field(..., min_length=6, max_length=100)


class UserLoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str = ""
    user_id: str = ""


class UserInfoResponse(BaseModel):
    user_id: str
    username: str
    email: str


# ========== 写作相关 ==========

class GenerateFrameworkRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=500)
    doc_type: str = Field(...)
    keywords: List[str] = Field(default_factory=list)


class GenerateContentRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=500)
    doc_type: str = Field(...)
    keywords: List[str] = Field(default_factory=list)
    framework: List[dict] = Field(default_factory=list)
    custom_instructions: Optional[str] = Field(default=None)


class RefineRequest(BaseModel):
    content: str = Field(..., min_length=1)
    doc_type: str = Field(default="通知")
    instructions: Optional[str] = Field(default=None)


class FrameworkResponse(BaseModel):
    title_suggestion: str = ""
    framework: List[dict] = Field(default_factory=list)


class GenerateResponse(BaseModel):
    document_id: str = ""
    title: str = ""
    framework: List[dict] = Field(default_factory=list)
    content: str = ""
    references: List[str] = Field(default_factory=list)


# ========== 知识库相关 ==========

class KnowledgeChunkResponse(BaseModel):
    id: str
    category: str
    title: str
    content: str
    source: str
    score: float = 0.0


class KnowledgeSearchResponse(BaseModel):
    results: List[KnowledgeChunkResponse] = Field(default_factory=list)
    total: int = 0


class KnowledgeCategoriesResponse(BaseModel):
    categories: dict = Field(default_factory=dict)
    total_chunks: int = 0


# ========== 文稿管理 ==========

class DocumentResponse(BaseModel):
    id: str
    title: str
    doc_type: str
    keywords: List[str] = Field(default_factory=list)
    framework: List[dict] = Field(default_factory=list)
    content: str = ""
    status: str = "draft"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse] = Field(default_factory=list)
    total: int = 0
