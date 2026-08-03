"""
文稿管理 API 路由 — 需登录。
"""
from fastapi import APIRouter, HTTPException, Depends
from ..database import SessionLocal, get_db
from sqlalchemy.orm import Session
from ..models import Document
from ..schemas import DocumentResponse, DocumentListResponse
from ..utils.auth import get_current_user_id

router = APIRouter(prefix="/api/documents", tags=["文稿管理"])


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    user_id: str = Depends(get_current_user_id),
    doc_type: str = None,
    status: str = None,
    limit: int = 20,
    offset: int = 0,
):
    """获取当前用户的文稿列表"""
    db = next(get_db())
    try:
        q = db.query(Document).filter(Document.user_id == user_id)
        if doc_type:
            q = q.filter(Document.doc_type == doc_type)
        if status:
            q = q.filter(Document.status == status)
        total = q.count()
        docs = q.order_by(Document.updated_at.desc()).offset(offset).limit(limit).all()

        items = []
        for d in docs:
            items.append(DocumentResponse(
                id=d.id,
                title=d.title,
                doc_type=d.doc_type,
                keywords=d.get_keywords(),
                framework=d.get_framework(),
                content=d.content[:500] if d.content else "",
                status=d.status,
                created_at=d.created_at,
                updated_at=d.updated_at,
            ))
        return DocumentListResponse(documents=items, total=total)
    finally:
        db.close()


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """获取单个文稿"""
    db = next(get_db())
    try:
        doc = db.query(Document).filter(
            Document.id == doc_id,
            Document.user_id == user_id,
        ).first()
        if not doc:
            raise HTTPException(status_code=404, detail="文稿不存在")
        return DocumentResponse(
            id=doc.id,
            title=doc.title,
            doc_type=doc.doc_type,
            keywords=doc.get_keywords(),
            framework=doc.get_framework(),
            content=doc.content,
            status=doc.status,
            created_at=doc.created_at,
            updated_at=doc.updated_at,
        )
    finally:
        db.close()


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """删除文稿"""
    db = next(get_db())
    try:
        doc = db.query(Document).filter(
            Document.id == doc_id,
            Document.user_id == user_id,
        ).first()
        if not doc:
            raise HTTPException(status_code=404, detail="文稿不存在")
        db.delete(doc)
        db.commit()
        return {"message": "删除成功"}
    finally:
        db.close()
