import { spawn } from "child_process";
import { LocalModel } from "../types";

/**
 * Runs the given prompt through the local LLM using Ollama and streams output.
 */
export async function runModelWithPromptStream(
  model: LocalModel,
  prompt: string,
  onData: (chunk: string) => void
): Promise<void> {
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model.name,
      prompt,
      stream: true,
    }),
  });

  if (!res.body) throw new Error("No response body from Ollama");

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    for (const line of text.trim().split("\n")) {
      if (!line) continue;
      const json = JSON.parse(line);
      if (json.response) onData(json.response);
    }
  }
}
