import json
import logging
import time
from typing import Optional, Tuple, List, Dict, Any
import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# List of resilient free-tier models on OpenRouter (zero-balance eligible)
OPENROUTER_FREE_MODELS: List[str] = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemini-2.0-flash-exp:free",
    "qwen/qwen-2.5-72b-instruct:free",
    "mistralai/mistral-7b-instruct:free",
    "deepseek/deepseek-chat:free",
]

MODEL_MAP: Dict[str, str] = {
    "openrouter/llama-3.3-70b": "meta-llama/llama-3.3-70b-instruct:free",
    "openrouter/gemini-2.0-flash": "google/gemini-2.0-flash-exp:free",
    "openrouter/qwen-2.5-72b": "qwen/qwen-2.5-72b-instruct:free",
    "openrouter/mistral-7b": "mistralai/mistral-7b-instruct:free",
    "openrouter/free-auto": "meta-llama/llama-3.3-70b-instruct:free",
}


class FallbackLLMClient:
    """
    Resilient Multi-Tier LLM Client:
    - Tier 1: OpenRouter Free Models (Llama 3.3 70B, Gemini 2.0 Flash, Qwen 2.5 72B)
    - Tier 2: Offline Local Ollama (http://localhost:11434/v1)
    - Tier 3: Deterministic Rule Safety Engine (Zero crash guarantee)
    """

    def __init__(self):
        self.openrouter_api_key = settings.OPENROUTER_API_KEY
        self.openrouter_base_url = settings.OPENROUTER_BASE_URL.rstrip("/")
        self.ollama_base_url = settings.OLLAMA_BASE_URL.rstrip("/")
        self.default_ollama_model = settings.DEFAULT_OLLAMA_MODEL
        self.timeout_seconds = settings.LLM_TIMEOUT_SECONDS
        self._ollama_offline_until: float = 0.0

    async def _call_openai_compatible_api(
        self,
        base_url: str,
        model_name: str,
        messages: List[Dict[str, str]],
        api_key: Optional[str] = None,
        extra_headers: Optional[Dict[str, str]] = None,
        timeout: Optional[float] = None,
    ) -> Optional[str]:
        """Calls any OpenAI-compatible /chat/completions endpoint."""
        url = f"{base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
        }
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        elif "ollama" in base_url.lower() or "11434" in base_url:
            headers["Authorization"] = "Bearer ollama"

        if extra_headers:
            headers.update(extra_headers)

        calc_tokens = 280 if ("11434" in base_url or "localhost" in base_url or "127.0.0.1" in base_url) else 600
        payload = {
            "model": model_name,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": calc_tokens,
        }

        # Fast connection timeout for local services so offline checks fail almost instantly (<0.6s)
        connect_t = 0.6 if ("11434" in base_url or "localhost" in base_url or "127.0.0.1" in base_url) else 2.5
        total_t = timeout or self.timeout_seconds
        call_timeout = httpx.Timeout(total_t, connect=connect_t)

        try:
            async with httpx.AsyncClient(timeout=call_timeout) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices and "message" in choices[0]:
                        # Ollama is confirmed online
                        if "11434" in base_url:
                            self._ollama_offline_until = 0.0
                        return choices[0]["message"].get("content", "").strip()
                elif res.status_code == 429:
                    logger.warning("Rate limit (429) encountered for model %s on %s", model_name, base_url)
                else:
                    logger.warning("API call to %s (%s) returned HTTP %s: %s", base_url, model_name, res.status_code, res.text[:200])
        except (httpx.ConnectError, httpx.ConnectTimeout) as conn_err:
            logger.debug("Connection refused/timed out to %s: %s", base_url, conn_err)
            if "11434" in base_url or "ollama" in base_url.lower():
                self._ollama_offline_until = time.time() + 60.0
        except httpx.TimeoutException:
            logger.warning("Timeout calling %s for model %s", base_url, model_name)
        except Exception as exc:
            logger.warning("Error calling %s for model %s: %s", base_url, model_name, exc)

        return None

    async def _call_openrouter_model(
        self,
        model_name: str,
        messages: List[Dict[str, str]],
        timeout: Optional[float] = None,
    ) -> Optional[str]:
        """Invokes a specific model on OpenRouter."""
        if not self.openrouter_api_key or not self.openrouter_api_key.strip():
            logger.debug("No OPENROUTER_API_KEY set; skipping OpenRouter call.")
            return None

        extra_headers = {
            "HTTP-Referer": "https://github.com/sandeshpagar/ORCA",
            "X-Title": "ORCA Marine AI",
        }
        return await self._call_openai_compatible_api(
            base_url=self.openrouter_base_url,
            model_name=model_name,
            messages=messages,
            api_key=self.openrouter_api_key.strip(),
            extra_headers=extra_headers,
            timeout=timeout or 8.0,
        )

    async def _call_ollama(
        self,
        messages: List[Dict[str, str]],
        model_name: Optional[str] = None,
        timeout: Optional[float] = None,
        force_check: bool = False,
    ) -> Optional[str]:
        """Invokes local Ollama server."""
        if not force_check and time.time() < self._ollama_offline_until:
            logger.debug("Ollama is cached as offline; skipping call.")
            return None

        ollama_model = model_name or self.default_ollama_model
        return await self._call_openai_compatible_api(
            base_url=self.ollama_base_url,
            model_name=ollama_model,
            messages=messages,
            api_key=None,
            timeout=timeout or 50.0,
        )

    async def generate_synthesis(
        self,
        grounded_context: str,
        user_query: str,
        role: str = "tourist",
        selected_model: str = "auto",
        language: str = "en",
    ) -> Tuple[Optional[str], str]:
        """
        Synthesizes natural language advisory using the selected model or resilient auto-fallback.
        Returns (synthesized_text, model_used_id).
        If all LLM options fail or if selected_model == 'deterministic', returns (None, 'deterministic').
        """
        sel = (selected_model or "auto").strip().lower()

        # Pure deterministic bypass requested
        if sel in ["deterministic", "none", "rule_engine"]:
            return None, "deterministic"

        lang_directive = ""
        target_lang_name = "English"
        if language == "hi":
            target_lang_name = "Hindi (हिंदी)"
            lang_directive = (
                "\nMANDATORY MULTILINGUAL INSTRUCTION:\n"
                "- You MUST synthesize and write the ENTIRE response in Hindi (हिंदी).\n"
                "- Translate all safety advice, operational summaries, and oceanographic explanations into fluent Hindi.\n"
                "- STRICTLY PRESERVE all numerical measurements (e.g. 2.8m, 22.0 km/h, 28.5°C), physical units, and uppercase safety tags (SAFE, CAUTION, DANGER, MODERATE, HIGH, LOW, UNSUITABLE, LIVE, CACHED, DEMO).\n"
            )
        elif language == "mr":
            target_lang_name = "Marathi (मराठी)"
            lang_directive = (
                "\nMANDATORY MULTILINGUAL INSTRUCTION:\n"
                "- You MUST synthesize and write the ENTIRE response in Marathi (मराठी).\n"
                "- Translate all safety advice, operational summaries, and oceanographic explanations into fluent Marathi.\n"
                "- STRICTLY PRESERVE all numerical measurements (e.g. 2.8m, 22.0 km/h, 28.5°C), physical units, and uppercase safety tags (SAFE, CAUTION, DANGER, MODERATE, HIGH, LOW, UNSUITABLE, LIVE, CACHED, DEMO).\n"
            )

        system_prompt = (
            "You are ORCA Marine Intelligence Core, an authoritative AI oceanographer and coastal safety advisory system.\n"
            "STRICT DATA HONESTY INVARIANT (PRD §8):\n"
            "- You are provided with pre-computed, deterministic maritime evaluation data and live sensor measurements.\n"
            "- You MUST retain all numbers, scores, wave heights, wind speeds, and safety ratings EXACTLY as provided.\n"
            "- DO NOT invent or alter any oceanographic measurements.\n"
            f"- Format your response tailored specifically to the user's role: {role.upper()}.\n"
            "- Deliver a clear, concise, actionable advisory formatted in GitHub markdown with bullet points and bold highlights.\n"
            "- If official warnings exist, prominently feature them."
            f"{lang_directive}"
        )

        user_content = (
            f"User Query: {user_query}\n\n"
            f"Verified Grounded Context:\n{grounded_context}\n\n"
            f"Synthesize an authoritative, clear response answering the user's query while strictly honoring the data above in {target_lang_name}."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]

        # Case 1: User explicitly requested Local Ollama
        if sel.startswith("ollama"):
            local_model = sel.split("/")[-1] if "/" in sel and sel != "ollama/local" else self.default_ollama_model
            output = await self._call_ollama(messages, model_name=local_model, force_check=True)
            if output:
                return output, f"ollama/{local_model}"
            # Ollama failed: fallback to deterministic
            return None, "deterministic"

        # Case 2: User explicitly requested a specific OpenRouter model
        if sel in MODEL_MAP:
            target_model = MODEL_MAP[sel]
            output = await self._call_openrouter_model(target_model, messages, timeout=10.0)
            if output:
                return output, sel

            # Fallback to other free models before giving up
            logger.info("Explicit model %s failed, attempting secondary free models...", target_model)
            for alt_model in OPENROUTER_FREE_MODELS:
                if alt_model == target_model:
                    continue
                output = await self._call_openrouter_model(alt_model, messages, timeout=6.0)
                if output:
                    return output, f"openrouter/{alt_model.split('/')[1].split(':')[0]}"

            # Fallback to local Ollama
            output = await self._call_ollama(messages, force_check=False)
            if output:
                return output, f"ollama/{self.default_ollama_model}"

            return None, "deterministic"

        # Case 3: Auto Mode (default)
        # Sequence: OpenRouter Free Models -> Ollama Local -> Deterministic
        if self.openrouter_api_key and self.openrouter_api_key.strip():
            for free_model in OPENROUTER_FREE_MODELS[:3]:
                output = await self._call_openrouter_model(free_model, messages, timeout=6.0)
                if output:
                    short_name = free_model.split("/")[1].split(":")[0]
                    return output, f"openrouter/{short_name}"

        # Tier 2: Try local Ollama
        output = await self._call_ollama(messages, timeout=45.0, force_check=False)
        if output:
            return output, f"ollama/{self.default_ollama_model}"

        # Tier 3: Deterministic rule engine safety net
        return None, "deterministic"


fallback_client = FallbackLLMClient()


async def generate_synthesis(
    grounded_context: str,
    user_query: str,
    role: str = "tourist",
    selected_model: str = "auto",
    language: str = "en",
) -> Tuple[Optional[str], str]:
    """Convenience functional wrapper around FallbackLLMClient."""
    return await fallback_client.generate_synthesis(
        grounded_context=grounded_context,
        user_query=user_query,
        role=role,
        selected_model=selected_model,
        language=language,
    )
