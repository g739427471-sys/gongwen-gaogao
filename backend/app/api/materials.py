"""
素材库 API — 范文库 + 金句库 + 标题库。
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from ..database import SessionLocal
from ..models import ModelEssay, GoldenPhrase, TitleTemplate
from ..utils.auth import get_current_user_id

router = APIRouter(prefix="/api/materials", tags=["素材库"])


# ========== 范文库 ==========

@router.get("/essays")
async def list_essays(
    doc_type: str = None, theme: str = None,
    q: str = None, limit: int = 20, offset: int = 0,
    user_id: str = Depends(get_current_user_id),
):
    db = SessionLocal()
    try:
        query = db.query(ModelEssay)
        if doc_type: query = query.filter(ModelEssay.doc_type == doc_type)
        if theme: query = query.filter(ModelEssay.theme == theme)
        if q: query = query.filter(ModelEssay.title.contains(q) | ModelEssay.content.contains(q))
        total = query.count()
        items = query.order_by(ModelEssay.created_at.desc()).offset(offset).limit(limit).all()
        return {
            "items": [{"id": e.id, "title": e.title, "doc_type": e.doc_type, "theme": e.theme,
                        "content": e.content, "framework": e.framework, "source": e.source,
                        "usage_note": e.usage_note} for e in items],
            "total": total,
            "doc_types": list(set(e.doc_type for e in db.query(ModelEssay.doc_type).distinct())),
            "themes": list(set(e.theme for e in db.query(ModelEssay.theme).distinct())),
        }
    finally: db.close()


@router.get("/essays/{essay_id}")
async def get_essay(essay_id: str, user_id: str = Depends(get_current_user_id)):
    db = SessionLocal()
    try:
        e = db.query(ModelEssay).filter(ModelEssay.id == essay_id).first()
        if not e: raise HTTPException(404, "范文不存在")
        return {"id": e.id, "title": e.title, "doc_type": e.doc_type, "theme": e.theme,
                "content": e.content, "framework": e.framework, "source": e.source}
    finally: db.close()


# ========== 金句库 ==========

@router.get("/phrases")
async def list_phrases(
    scene: str = None, doc_type: str = None, q: str = None,
    limit: int = 50, offset: int = 0,
    user_id: str = Depends(get_current_user_id),
):
    db = SessionLocal()
    try:
        query = db.query(GoldenPhrase)
        if scene: query = query.filter(GoldenPhrase.scene == scene)
        if doc_type: query = query.filter(GoldenPhrase.doc_type == doc_type)
        if q: query = query.filter(GoldenPhrase.content.contains(q))
        total = query.count()
        items = query.offset(offset).limit(limit).all()
        return {
            "items": [{"id": p.id, "content": p.content, "scene": p.scene, "doc_type": p.doc_type,
                        "context": p.context, "source": p.source} for p in items],
            "total": total,
            "scenes": list(set(p.scene for p in db.query(GoldenPhrase.scene).distinct())),
        }
    finally: db.close()


# ========== 标题库 ==========

@router.get("/titles")
async def list_titles(
    theme: str = None, doc_type: str = None,
    user_id: str = Depends(get_current_user_id),
):
    db = SessionLocal()
    try:
        query = db.query(TitleTemplate)
        if theme: query = query.filter(TitleTemplate.theme == theme)
        if doc_type: query = query.filter(TitleTemplate.doc_type == doc_type)
        items = query.all()
        return {"items": [{"id": t.id, "template": t.template, "theme": t.theme, "doc_type": t.doc_type} for t in items]}
    finally: db.close()
