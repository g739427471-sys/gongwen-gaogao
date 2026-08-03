"""
Claude API 调用封装。
统一使用流式调用，避免长时间请求超时。
"""
from typing import AsyncGenerator, Optional
import anthropic

from ..config import settings


def get_client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


async def stream_generate(
    system_prompt: str,
    user_message: str,
    model: Optional[str] = None,
    max_tokens: Optional[int] = None,
    temperature: Optional[float] = None,
) -> AsyncGenerator[str, None]:
    """流式调用 Claude API，异步生成器逐块返回文本。"""
    client = get_client()
    model = model or settings.default_model
    max_tokens = max_tokens or settings.default_max_tokens
    temperature = temperature or settings.default_temperature

    with client.messages.stream(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    ) as stream:
        for text in stream.text_stream:
            yield text


async def generate_full(
    system_prompt: str,
    user_message: str,
    model: Optional[str] = None,
    max_tokens: Optional[int] = None,
    temperature: Optional[float] = None,
) -> str:
    """流式调用后返回完整文本（统一用流式，避免超时）。"""
    full_text = ""
    async for chunk in stream_generate(
        system_prompt=system_prompt,
        user_message=user_message,
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
    ):
        full_text += chunk
    return full_text
