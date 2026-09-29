import time
import threading
from typing import Dict, List, Tuple, Optional
from fastapi import Request, HTTPException, status, Depends
import logging

logger = logging.getLogger(__name__)

"""
ORCA Marine AI API - Rate Limiting Architecture (Phase 3 Hardening)

Single-Worker Behavior:
- In a single Uvicorn/FastAPI process, this in-memory sliding-window limiter
  is 100% thread-safe via `threading.Lock`. It incurs zero external I/O overhead
  and cleans up expired timestamps lazily during requests.

Multi-Worker / Multi-Instance Scaling Notes (Production Consideration):
- If scaling to multiple Uvicorn workers (`--workers N`) or multiple container instances,
  each worker process maintains its own independent in-memory window. This multiplies
  the effective burst ceiling by N.
- For horizontally scaled deployments across multiple instances, swap the internal
  storage adapter with Redis / Dragonfly (`INCR` + `EXPIRE` or Redis Sorted Sets `ZADD` + `ZREMRANGEBYSCORE`)
  or enforce rate limits at the API Gateway / Reverse Proxy layer (e.g. Cloudflare / NGINX / Caddy).
"""


class SlidingWindowRateLimiter:
    def __init__(self, requests_limit: int = 30, window_seconds: int = 60):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self._lock = threading.Lock()
        self._clients: Dict[str, List[float]] = {}

    def is_allowed(self, client_id: str) -> Tuple[bool, int, int]:
        """
        Evaluates if a request from client_id is allowed under the sliding window.
        Returns:
            (is_allowed: bool, retry_after_seconds: int, remaining_quota: int)
        """
        now = time.time()
        window_start = now - self.window_seconds

        with self._lock:
            # Retrieve and clean client timestamps older than sliding window
            timestamps = self._clients.get(client_id, [])
            valid_timestamps = [t for t in timestamps if t > window_start]

            if len(valid_timestamps) >= self.requests_limit:
                # Quota exceeded; calculate time until oldest timestamp in window drops off
                oldest_in_window = valid_timestamps[0]
                retry_after = max(1, int(oldest_in_window + self.window_seconds - now) + 1)
                self._clients[client_id] = valid_timestamps
                return False, retry_after, 0

            # Record current request timestamp
            valid_timestamps.append(now)
            self._clients[client_id] = valid_timestamps
            remaining = self.requests_limit - len(valid_timestamps)
            return True, 0, remaining

    def reset_for_test(self):
        """Helper to clear rate limit state during test suites."""
        with self._lock:
            self._clients.clear()


# Global rate limiter instances:
# 30 requests / minute for conversational AI queries (protects LLM quota)
chat_rate_limiter = SlidingWindowRateLimiter(requests_limit=30, window_seconds=60)


async def rate_limit_chat(request: Request):
    """
    FastAPI dependency that enforces rate limits per IP address or authorization bearer.
    Returns HTTP 429 with standard RFC 6585 'Retry-After' header if exceeded.
    """
    # Prefer client IP; fallback to forwarded header
    forwarded = request.headers.get("x-forwarded-for")
    client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown-client")
    
    # If user provides authorization header, include hash/prefix for per-user isolation
    auth_header = request.headers.get("authorization", "")
    client_key = f"{client_ip}:{auth_header[-16:]}" if auth_header else client_ip

    allowed, retry_after, remaining = chat_rate_limiter.is_allowed(client_key)
    if not allowed:
        logger.warning("Rate limit exceeded for client: %s (Retry-After: %ds)", client_ip, retry_after)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many advisory requests. Please wait a moment before sending another query.",
            headers={"Retry-After": str(retry_after)},
        )
