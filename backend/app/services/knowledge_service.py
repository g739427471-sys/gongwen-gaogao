"""
知识库服务 — 带缓存的语义+关键词混合检索。
"""
import os
import time
from typing import List, Optional

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

# ========== 检索缓存（大幅提速） ==========

_cache: dict = {}          # key -> (results, timestamp)
CACHE_TTL = 300            # 5分钟缓存


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
    # 限制缓存大小
    if len(_cache) > 200:
        oldest = min(_cache, key=lambda k: _cache[k][1])
        del _cache[oldest]


# ========== ChromaDB 客户端（懒加载） ==========

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


def search_knowledge(
    query: str,
    category: Optional[str] = None,
    top_k: int = 10,
) -> List[dict]:
    """搜索知识库 — 先查缓存，再查ChromaDB/SQLite"""
    ck = _cache_key(query, category, top_k)
    cached = _cache_get(ck)
    if cached:
        return cached

    results = []

    # 尝试 ChromaDB 语义搜索
    collection = _get_collection()
    model = _get_embedding_model()

    if collection and model:
        try:
            query_embedding = model.encode(query).tolist()
            where_filter = {"category": category} if category else None

            chroma_results = collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=where_filter,
                include=["documents", "metadatas", "distances"],
            )

            if chroma_results and chroma_results["ids"] and chroma_results["ids"][0]:
                ids = chroma_results["ids"][0]
                documents = chroma_results["documents"][0]
                metadatas = chroma_results["metadatas"][0]
                distances = chroma_results["distances"][0]

                for i, doc_id in enumerate(ids):
                    meta = metadatas[i] if i < len(metadatas) else {}
                    distance = distances[i] if i < len(distances) else 0.0
                    results.append({
                        "id": doc_id,
                        "category": meta.get("category", ""),
                        "title": meta.get("title", ""),
                        "content": documents[i] if i < len(documents) else "",
                        "source": meta.get("source", ""),
                        "score": round(1.0 - distance, 4),
                    })

                _cache_set(ck, results)
                return results
        except Exception:
            pass

    # 回退 SQLite
    results = _sqlite_keyword_search(query, category, top_k)
    _cache_set(ck, results)
    return results


def _sqlite_keyword_search(query: str, category: Optional[str] = None, top_k: int = 10) -> List[dict]:
    """SQLite 关键词搜索 — 增强中文分词"""
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
            cl = c.content
            tl = c.title

            # 单字匹配（适合中文）
            for ch in query:
                if ch in tl: score += 3
                if ch in cl: score += 1
            # 完整词匹配
            if query in tl: score += 10
            if query in cl: score += 5

            if score > 0:
                scored.append({
                    "id": c.id, "category": c.category,
                    "title": c.title, "content": c.content,  # 完整内容
                    "source": c.source, "score": float(score),
                })

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]
    finally:
        db.close()


def get_categories_stats() -> dict:
    from ..database import SessionLocal
    from ..models import KnowledgeChunk
    from sqlalchemy import func

    db = SessionLocal()
    try:
        results = db.query(
            KnowledgeChunk.category,
            func.count(KnowledgeChunk.id)
        ).group_by(KnowledgeChunk.category).all()
        cats = {cat: count for cat, count in results}
        return {"categories": cats, "total_chunks": sum(cats.values())}
    finally:
        db.close()


def init_chromadb():
    try:
        _get_chroma_client()
        _get_embedding_model()
        _get_collection()
        return True
    except Exception:
        return False
