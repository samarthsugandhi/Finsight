import { AppError } from "@/middlewares/error.middleware";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/chat";
const MODEL = process.env.OLLAMA_MODEL || "qwen3:8b";

async function fetchWithTimeout(url: string, options: any, timeoutMs = 25000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === "AbortError") {
      throw new AppError("AI assistant request timed out — local model is taking too long to respond", 504);
    }
    throw new AppError("AI assistant is unavailable — make sure Ollama is running locally with the correct model (e.g. `ollama run qwen3:8b`)", 503);
  }
}

export async function askOllama(prompt: string) {
  const response = await fetchWithTimeout(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new AppError(`Ollama returned status ${response.status}`, 500);
  }

  const data = (await response.json()) as any;
  return data.message.content;
}

export async function chatOllama(messages: { role: string; content: string }[], jsonMode: boolean = false) {
  const response = await fetchWithTimeout(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: false,
      ...(jsonMode ? { format: "json" } : {}),
      options: {
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    throw new AppError(`Ollama returned status ${response.status}`, 500);
  }

  const data = (await response.json()) as any;
  return data.message.content;
}