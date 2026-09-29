import time
import threading
from typing import Dict, List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class OpenRouterDailyUsageGuard:
    """
    Thread-safe daily spending and quota guard for OpenRouter cloud LLM calls.
    Prevents budget overruns by limiting requests per user/session within a 24-hour sliding window.
    When a user's daily budget is exhausted, requests seamlessly cascade to Tier 2 (local Ollama)
    or Tier 3 (deterministic rules) without disrupting coastal safety advisories.
    """

    def __init__(self, default_daily_limit: int = 50, window_seconds: int = 86400):
        self.default_daily_limit = default_daily_limit
        self.window_seconds = window_seconds
        self._lock = threading.Lock()
        self._usage: Dict[str, List[float]] = {}

    def is_allowed(self, user_key: str, limit: Optional[int] = None) -> Tuple[bool, int, int]:
        """
        Check if user_key has remaining OpenRouter quota without consuming it.
        Returns: (is_allowed: bool, retry_after_seconds: int, remaining_calls: int)
        """
        effective_limit = limit if limit is not None else self.default_daily_limit
        now = time.time()
        window_start = now - self.window_seconds

        with self._lock:
            timestamps = self._usage.get(user_key, [])
            valid_timestamps = [t for t in timestamps if t > window_start]
            self._usage[user_key] = valid_timestamps

            if len(valid_timestamps) >= effective_limit:
                oldest_in_window = valid_timestamps[0]
                retry_after = max(1, int(oldest_in_window + self.window_seconds - now) + 1)
                return False, retry_after, 0

            remaining = effective_limit - len(valid_timestamps)
            return True, 0, remaining

    def check_and_consume(self, user_key: str, limit: Optional[int] = None) -> Tuple[bool, int, int]:
        """
        Atomically check and consume 1 OpenRouter call if within quota.
        Returns: (is_allowed: bool, retry_after_seconds: int, remaining_calls: int)
        """
        effective_limit = limit if limit is not None else self.default_daily_limit
        now = time.time()
        window_start = now - self.window_seconds

        with self._lock:
            timestamps = self._usage.get(user_key, [])
            valid_timestamps = [t for t in timestamps if t > window_start]

            if len(valid_timestamps) >= effective_limit:
                self._usage[user_key] = valid_timestamps
                oldest_in_window = valid_timestamps[0]
                retry_after = max(1, int(oldest_in_window + self.window_seconds - now) + 1)
                return False, retry_after, 0

            valid_timestamps.append(now)
            self._usage[user_key] = valid_timestamps
            remaining = effective_limit - len(valid_timestamps)
            return True, 0, remaining

    def get_usage_count(self, user_key: str) -> int:
        """Returns the number of active requests in the 24-hour window for user_key."""
        now = time.time()
        window_start = now - self.window_seconds
        with self._lock:
            timestamps = self._usage.get(user_key, [])
            valid = [t for t in timestamps if t > window_start]
            self._usage[user_key] = valid
            return len(valid)

    def reset(self):
        """Clears all usage records (primarily for testing)."""
        with self._lock:
            self._usage.clear()


# Global singleton instance
openrouter_usage_guard = OpenRouterDailyUsageGuard()
