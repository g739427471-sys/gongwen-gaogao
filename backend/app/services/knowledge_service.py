"""
知识库服务。
负责 ChromaDB 向量检索和 SQLite 关键词检索。
"""
import os
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


# 全局变量（懒加载）
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
    top_k: int = 5,
) -> List[dict]:
    """
    搜索知识库，返回相关段落列表。
    先尝试 ChromaDB 语义搜索，失败则回退到 SQLite 关键词搜索。
    """
    results = []

    # 尝试 ChromaDB 语义搜索
    collection = _get_collection()
    model = _get_embedding_model()

    if collection and model:
        try:
            query_embedding = model.encode(query).tolist()
            where_filter = None
            if category:
                where_filter = {"category": category}

            chroma_results = collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=where_filter,
                include=["documents", "metadatas", "distances"],
            )

            if chroma_results and chroma_results["ids"] and chroma_results["ids"][0]:
                ids = chroma_results["ids"][0]
                documents = chroma_results["documents"][0] if chroma_results["documents"] else []
                metadatas = chroma_results["metadatas"][0] if chroma_results["metadatas"] else []
                distances = chroma_results["distances"][0] if chroma_results["distances"] else []

                for i, doc_id in enumerate(ids):
                    meta = metadatas[i] if i < len(metadatas) else {}
                    distance = distances[i] if i < len(distances) else 0.0
                    results.append({
                        "id": doc_id,
                        "category": meta.get("category", ""),
                        "title": meta.get("title", ""),
                        "content": documents[i] if i < len(documents) else "",
                        "source": meta.get("source", ""),
                        "score": round(1.0 - distance, 4) if distance else 0.0,
                    })
                return results
        except Exception:
            # ChromaDB 搜索失败，回退到 SQLite
            pass

    # 回退：SQLite 关键词搜索
    return _sqlite_keyword_search(query, category, top_k)


def _sqlite_keyword_search(query: str, category: Optional[str] = None, top_k: int = 5) -> List[dict]:
    """SQLite 关键词搜索（回退方案）"""
    from ..database import SessionLocal
    from ..models import KnowledgeChunk

    db = SessionLocal()
    try:
        q = db.query(KnowledgeChunk)
        if category:
            q = q.filter(KnowledgeChunk.category == category)

        # 简单关键词匹配
        chunks = q.all()
        scored = []
        for c in chunks:
            score = 0
            content_lower = c.content.lower()
            title_lower = c.title.lower()
            for term in query.split():
                term_lower = term.lower()
                if term_lower in title_lower:
                    score += 3
                if term_lower in content_lower:
                    score += 1

            if score > 0:
                scored.append({
                    "id": c.id,
                    "category": c.category,
                    "title": c.title,
                    "content": c.content[:500],
                    "source": c.source,
                    "score": float(score),
                })

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]
    finally:
        db.close()


def get_categories_stats() -> dict:
    """获取知识库分类统计"""
    from ..database import SessionLocal
    from ..models import KnowledgeChunk
    from sqlalchemy import func

    db = SessionLocal()
    try:
        results = db.query(
            KnowledgeChunk.category,
            func.count(KnowledgeChunk.id)
        ).group_by(KnowledgeChunk.category).all()

        categories = {}
        for cat, count in results:
            categories[cat] = count

        total = sum(categories.values())
        return {"categories": categories, "total_chunks": total}
    finally:
        db.close()


def init_chromadb():
    """初始化 ChromaDB（预热客户端和模型）"""
    try:
        _get_chroma_client()
        _get_embedding_model()
        _get_collection()
        return True
    except Exception:
        return False
