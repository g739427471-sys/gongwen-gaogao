"""
RAG引擎 — 混合检索 + 重排序 + 引用溯源。

检索策略：
1. 语义检索（ChromaDB + bge-small-zh）→ 候选集
2. 关键词检索（SQLite 中文分词）→ 候选集
3. 融合排序（加权分数合并 + 去重）→ Top-K
4. 引用溯源——每条结果记录来源URL和原文片段
"""
import os
import json
import re
import time
import httpx
from typing import List, Optional, Dict, Any

try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    HAS_CHROMADB = True
except ImportError:
    HAS_CHROMADB = False

try:
    from sentence_transformers import SentenceTransformer
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False

from ..config import settings

# ========== 缓存 ==========
_cache: dict = {}
CACHE_TTL = 300

def _cache_key(query: str, category: str = None, top_k: int = 5) -> str:
    return f"{query}|{category or ''}|{top_k}"

def _cache_get(key: str) -> Optional[List[dict]]:
    if key in _cache:
        results, ts = _cache[key]
        if time.time() - ts < CACHE_TTL:
            return results
        del _cache[key]
    return None

def _cache_set(key: str, results: List[dict]):
    _cache[key] = (results, time.time())
    if len(_cache) > 200:
        oldest = min(_cache, key=lambda k: _cache[k][1])
        del _cache[oldest]


# ========== ChromaDB ==========
_chroma_client = None
_embedding_model = None
_collection = None

def _get_chroma_client():
    global _chroma_client
    if _chroma_client is None and HAS_CHROMADB:
        persist_dir = str(settings.chroma_path)
        os.makedirs(persist_dir, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(
            path=persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return _chroma_client

def _get_embedding_model():
    global _embedding_model
    if _embedding_model is None and HAS_SENTENCE_TRANSFORMERS:
        _embedding_model = SentenceTransformer(settings.embedding_model)
    return _embedding_model

def _get_collection():
    global _collection
    if _collection is None:
        client = _get_chroma_client()
        if client:
            _collection = client.get_or_create_collection(
                name="knowledge_vectors",
                metadata={"hnsw:space": "cosine"},
            )
    return _collection


# ========== 混合检索 + 重排序 ==========

def search_knowledge(
    query: str,
    category: Optional[str] = None,
    top_k: int = 10,
    source: Optional[str] = None,
) -> List[dict]:
    """混合检索：语义 + 关键词 → 融合排序 → Top-K"""
    ck = _cache_key(query, category, top_k)
    cached = _cache_get(ck)
    if cached:
        return _apply_source_filter(cached, source)

    # 1. 语义检索（ChromaDB）
    semantic_results = _semantic_search(query, category, top_k=top_k * 2)

    # 2. 关键词检索（SQLite）
    keyword_results = _keyword_search(query, category, top_k=top_k * 2)

    # 3. 融合排序
    merged = _merge_and_rerank(semantic_results, keyword_results, query, top_k)

    _cache_set(ck, merged)
    return _apply_source_filter(merged, source)


def _semantic_search(query: str, category: Optional[str] = None, top_k: int = 20) -> List[dict]:
    """ChromaDB语义检索"""
    collection = _get_collection()
    model = _get_embedding_model()
    if not collection or not model:
        return []
    try:
        query_embedding = model.encode(query).tolist()
        where = {"category": category} if category else None
        results = collection.query(
            query_embeddings=[query_embedding], n_results=top_k,
            where=where, include=["documents", "metadatas", "distances"],
        )
        if not results or not results.get("ids") or not results["ids"][0]:
            return []
        items = []
        for i, doc_id in enumerate(results["ids"][0]):
            meta = results["metadatas"][0][i] if i < len(results["metadatas"][0]) else {}
            distance = results["distances"][0][i] if i < len(results["distances"][0]) else 0.0
            items.append(_format_result(doc_id, meta, results["documents"][0][i], 1.0 - distance))
        return items
    except Exception:
        return []


def _keyword_search(query: str, category: Optional[str] = None, top_k: int = 20) -> List[dict]:
    """SQLite关键词搜索 + 中文分词增强"""
    from ..database import SessionLocal
    from ..models import KnowledgeChunk
    db = SessionLocal()
    try:
        q = db.query(KnowledgeChunk)
        if category:
            q = q.filter(KnowledgeChunk.category == category)
        chunks = q.all()
        scored = []
        for c in chunks:
            score = 0
            # 完整词组匹配
            if query in c.title: score += 10
            if query in c.content: score += 5
            # 字符级匹配
            for ch in query:
                if ch in c.title: score += 3
                if ch in c.content: score += 1
            # 标题中包含查询词→高权重
            query_chars = set(query.replace(' ', ''))
            title_chars = set(c.title.replace(' ', ''))
            overlap = query_chars & title_chars
            score += len(overlap) * 2
            if score > 0:
                scored.append(_format_result(c.id, {"category": c.category, "title": c.title, "source": c.source}, c.content, score / 30.0))
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]
    finally:
        db.close()


def _merge_and_rerank(semantic: List[dict], keyword: List[dict], query: str, top_k: int) -> List[dict]:
    """融合排序：语义结果权重0.6 + 关键词结果权重0.4 → 去重"""
    merged: Dict[str, dict] = {}
    # 语义结果（高权重）
    for item in semantic:
        merged[item["id"]] = item
        item["score"] = item.get("score", 0.5) * 0.6
    # 关键词结果（补充）
    for item in keyword:
        if item["id"] in merged:
            merged[item["id"]]["score"] += item.get("score", 0.3) * 0.4
        else:
            item["score"] = item.get("score", 0.3) * 0.4
            merged[item["id"]] = item
    # 排序 → Top-K
    ranked = sorted(merged.values(), key=lambda x: x["score"], reverse=True)
    for i, item in enumerate(ranked):
        item["rank"] = i + 1
    return ranked[:top_k]


def _format_result(doc_id: str, meta: dict, content: str, score: float) -> dict:
    return {
        "id": doc_id,
        "category": meta.get("category", ""),
        "title": meta.get("title", ""),
        "content": content,
        "source": meta.get("source", ""),
        "source_url": meta.get("source_url", meta.get("url", "")),
        "date": meta.get("date", ""),
        "score": round(min(max(score, 0), 1), 4),
        "match_percent": round(min(max(score, 0), 1) * 100),
    }


def _apply_source_filter(results: List[dict], source: Optional[str]) -> List[dict]:
    if not source:
        return results
    return [r for r in results if source in (r.get("source", ""))]


# ========== 引用溯源 ==========

def extract_citations(content: str, knowledge_results: List[dict]) -> List[dict]:
    """
    从生成内容中提取引用，匹配知识库来源。
    返回引用列表供前端展示。
    """
    citations = []
    for kr in knowledge_results:
        title = kr.get("title", "")
        source = kr.get("source", "")
        source_url = kr.get("source_url", "")
        # 检查生成内容中是否引用了此来源
        if title and (title[:10] in content or source in content):
            citations.append({
                "title": title,
                "source": source or "知识库",
                "url": source_url or "",
                "snippet": kr.get("content", "")[:200] + "...",
                "relevance": kr.get("match_percent", 0),
            })
    # 去重（按title）
    seen = set()
    unique = []
    for c in citations:
        if c["title"] not in seen:
            seen.add(c["title"])
            unique.append(c)
    return unique[:10]


# ========== 知识库管理 ==========

def add_to_knowledge(title: str, content: str, category: str, source: str = "", source_url: str = "") -> bool:
    """添加文档到知识库（向量化 + SQLite双写）"""
    from ..database import SessionLocal
    from ..models import KnowledgeChunk
    import uuid

    chunk_id = str(uuid.uuid4())

    # 1. 写SQLite
    db = SessionLocal()
    try:
        chunk = KnowledgeChunk(
            id=chunk_id, category=category, title=title,
            content=content, source=source,
        )
        db.add(chunk); db.commit()
    finally:
        db.close()

    # 2. 写ChromaDB
    collection = _get_collection()
    model = _get_embedding_model()
    if collection and model:
        try:
            embedding = model.encode(content).tolist()
            collection.add(
                ids=[chunk_id], embeddings=[embedding],
                documents=[content],
                metadatas=[{"category": category, "title": title, "source": source, "source_url": source_url}],
            )
        except Exception:
            pass

    # 清缓存
    _cache.clear()
    return True


def get_categories_stats() -> dict:
    from ..database import SessionLocal
    from ..models import KnowledgeChunk
    from sqlalchemy import func
    db = SessionLocal()
    try:
        results = db.query(KnowledgeChunk.category, func.count(KnowledgeChunk.id)).group_by(KnowledgeChunk.category).all()
        return {"categories": {cat: cnt for cat, cnt in results}, "total_chunks": sum(c for _, c in results)}
    finally:
        db.close()


def init_chromadb():
    try: _get_chroma_client(); _get_embedding_model(); _get_collection(); return True
    except Exception: return False
