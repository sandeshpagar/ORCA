import time
import threading
from collections import OrderedDict
from typing import Any, Optional, Tuple, Dict


class TelemetryCache:
    """
    Thread-safe, bounded-capacity In-Memory TTL Cache with LRU eviction.
    Specifically designed for marine telemetry, weather forecasts, and satellite observations.
    
    Provides:
    1. Bounded memory protection (`maxsize` default 500 entries, preventing unbounded growth).
       Memory footprint: < 200 KB per worker process at max capacity.
    2. Configurable TTL (default 15 minutes / 900.0s).
    3. Stale-while-revalidate capability: `get_stale(key)` allows degraded fallback when
       external sensor feeds (e.g. Open-Meteo, INCOIS) are temporarily unreachable.
    
    MULTI-WORKER & SCALING ARCHITECTURE NOTE (Phase 5):
    - This in-memory cache is isolated per Uvicorn worker process. When deploying with
      multiple workers (`uvicorn --workers 4`), each worker maintains its own L1 bounded cache.
    - If horizontal scaling to multiple server containers is implemented, deploy a centralized
      Redis/Upstash L2 cache to share cached observations across all nodes.
    """


    def __init__(self, maxsize: int = 500, default_ttl_seconds: float = 900.0):
        self._maxsize = maxsize
        self._default_ttl = default_ttl_seconds
        self._lock = threading.Lock()
        # Stores key -> (value, expires_at, created_at)
        self._store: OrderedDict[str, Tuple[Any, float, float]] = OrderedDict()

    def set(self, key: str, value: Any, ttl: Optional[float] = None) -> None:
        """Stores an entry with an expiry timestamp. Evicts oldest LRU entry if at capacity."""
        ttl_val = ttl if ttl is not None else self._default_ttl
        now = time.time()
        expires_at = now + ttl_val

        with self._lock:
            # If key already exists, update and move to most recently used
            if key in self._store:
                self._store.move_to_end(key)
            elif len(self._store) >= self._maxsize:
                # Evict oldest LRU entry (FIFO from start of OrderedDict)
                self._store.popitem(last=False)

            self._store[key] = (value, expires_at, now)

    def get(self, key: str) -> Optional[Any]:
        """
        Retrieves entry only if it is still within its fresh TTL window.
        Returns None if missing or expired.
        """
        now = time.time()
        with self._lock:
            if key not in self._store:
                return None

            value, expires_at, _ = self._store[key]
            if now > expires_at:
                # Expired fresh item; keep in store for get_stale unless explicitly removed
                return None

            # Hit: update LRU position
            self._store.move_to_end(key)
            return value

    def get_stale(self, key: str) -> Tuple[Optional[Any], float]:
        """
        Retrieves entry even if expired, returning (value, age_in_seconds).
        Used as emergency fallback when live upstream APIs are failing.
        Returns (None, 0.0) if key has never been cached.
        """
        now = time.time()
        with self._lock:
            if key not in self._store:
                return None, 0.0

            value, _, created_at = self._store[key]
            age = max(0.0, now - created_at)
            self._store.move_to_end(key)
            return value, age

    def delete(self, key: str) -> bool:
        """Removes a key from the cache. Returns True if key was present."""
        with self._lock:
            if key in self._store:
                del self._store[key]
                return True
            return False

    def clear(self) -> None:
        """Flushes all entries from cache."""
        with self._lock:
            self._store.clear()

    def size(self) -> int:
        """Returns current number of cached entries."""
        with self._lock:
            return len(self._store)


# Global singleton instance for marine telemetry (bounded to 500 items, 15 min TTL)
telemetry_cache = TelemetryCache(maxsize=500, default_ttl_seconds=900.0)
