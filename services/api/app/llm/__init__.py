"""
ORCA Marine AI - Resilient LLM Synthesis Module
Integrates OpenRouter Free Tier models and Offline Ollama with automatic fallback.
"""

from app.llm.fallback_client import generate_synthesis, fallback_client

__all__ = ["generate_synthesis", "fallback_client"]
