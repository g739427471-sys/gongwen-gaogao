"""
全局缓存层 — 大幅减少API延迟。
"""
import time
from typing import Any, Optional
from collections import OrderedDict

# LRU缓存
_cache: OrderedDict = OrderedDict()
MAX_CACHE_SIZE = 500


def get(key: str) -> Optional[Any]:
    """获取缓存，过期返回None"""
    if key in _cache:
        value, expiry = _cache[key]
        if time.time() < expiry:
            # 移到末尾（最近使用）
            _cache.move_to_end(key)
            return value
        del _cache[key]
    return None


def set(key: str, value: Any, ttl: int = 300):
    """设置缓存，默认5分钟"""
    if len(_cache) >= MAX_CACHE_SIZE:
        _cache.popitem(last=False)  # 删除最旧的
    _cache[key] = (value, time.time() + ttl)


def invalidate(pattern: str = ""):
    """清除匹配的缓存"""
    if not pattern:
        _cache.clear()
        return
    keys = [k for k in _cache if pattern in k]
    for k in keys:
        del _cache[k]
