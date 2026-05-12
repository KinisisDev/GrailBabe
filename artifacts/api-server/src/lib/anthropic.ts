import { anthropic } from "@workspace/integrations-anthropic-ai";

const MODEL = "claude-sonnet-4-6";

export async function generateText(opts: {
  system?: string;
  prompt: string;
}): Promise<string> {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
  });
  const text = msg.content
    .map((c) => (c.type === "text" ? c.text : ""))
    .join("\n")
    .trim();
  return text;
}

export async function generateJson<T = unknown>(opts: {
  system?: string;
  prompt: string;
}): Promise<T | null> {
  const text = await generateText({
    system:
      (opts.system ?? "") +
      "\n\nRespond ONLY with valid minified JSON. No markdown, no code fences, no commentary.",
    prompt: opts.prompt,
  });
  try {
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}
