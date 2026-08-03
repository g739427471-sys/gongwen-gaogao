"""
Claude API 调用封装。
支持同步调用和 SSE 流式输出。
"""
import json
from typing import AsyncGenerator, Optional
import anthropic

from ..config import settings


def get_client() -> anthropic.Anthropic:
    """获取 Anthropic 客户端"""
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


async def stream_generate(
    system_prompt: str,
    user_message: str,
    model: Optional[str] = None,
    max_tokens: Optional[int] = None,
    temperature: Optional[float] = None,
) -> AsyncGenerator[str, None]:
    """
    流式调用 Claude API，异步生成器逐块返回文本。
    """
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


def generate_sync(
    system_prompt: str,
    user_message: str,
    model: Optional[str] = None,
    max_tokens: Optional[int] = None,
    temperature: Optional[float] = None,
) -> str:
    """
    同步调用 Claude API，返回完整文本。
    """
    client = get_client()
    model = model or settings.default_model
    max_tokens = max_tokens or settings.default_max_tokens
    temperature = temperature or settings.default_temperature

    message = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )

    return message.content[0].text
