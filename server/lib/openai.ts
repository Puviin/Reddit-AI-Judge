// Shared OpenAI chat-completions client used by the drama, gemini and scout routers.

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

export type ChatCompletionOptions = {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
  /** Request `response_format: json_object` from the API. */
  json?: boolean;
  model?: string;
};

export async function chatCompletion({
  systemPrompt,
  userPrompt,
  temperature,
  maxTokens,
  json = false,
  model = "gpt-4o",
}: ChatCompletionOptions): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");

  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data?.choices?.[0]?.message?.content ?? "";
}

/** Parse a model response as JSON, tolerating ```json fenced output. */
export function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned) as T;
}
