import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENV } from "./env";
import { invokeLLM, type Message, type Tool } from "./llm";

const fetchMock = vi.fn();

const tool: Tool = {
  type: "function",
  function: { name: "lookup", description: "look something up" },
};

function okResponse() {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({
      id: "res-1",
      created: 1,
      model: "gemini-2.5-flash",
      choices: [],
    }),
    text: async () => "",
  };
}

function lastPayload() {
  return JSON.parse(fetchMock.mock.calls.at(-1)![1].body);
}

async function invoke(params: Parameters<typeof invokeLLM>[0]) {
  fetchMock.mockResolvedValue(okResponse());
  return invokeLLM(params);
}

const userMessage: Message[] = [{ role: "user", content: "hi" }];

describe("invokeLLM", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    ENV.forgeApiUrl = "https://forge.example.com/";
    ENV.forgeApiKey = "forge-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requires an api key", async () => {
    ENV.forgeApiKey = "";

    await expect(invokeLLM({ messages: userMessage })).rejects.toThrow(
      "OPENAI_API_KEY is not configured"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to the configured forge completions endpoint", async () => {
    const result = await invoke({ messages: userMessage });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://forge.example.com/v1/chat/completions");
    expect(init.headers.authorization).toBe("Bearer forge-key");
    expect(result.id).toBe("res-1");
    expect(lastPayload()).toMatchObject({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: "hi" }],
      max_tokens: 32768,
      thinking: { budget_tokens: 128 },
    });
  });

  it("falls back to the hosted forge endpoint when no url is configured", async () => {
    ENV.forgeApiUrl = "   ";

    await invoke({ messages: userMessage });

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://forge.manus.im/v1/chat/completions"
    );
  });

  describe("message normalization", () => {
    it("collapses a lone text part to a plain string", async () => {
      await invoke({
        messages: [{ role: "user", content: [{ type: "text", text: "yo" }] }],
      });

      expect(lastPayload().messages).toEqual([{ role: "user", content: "yo" }]);
    });

    it("keeps multimodal content as an array of parts", async () => {
      await invoke({
        messages: [
          {
            role: "user",
            content: [
              "describe this",
              {
                type: "image_url",
                image_url: { url: "https://img", detail: "low" },
              },
              {
                type: "file_url",
                file_url: { url: "https://doc", mime_type: "application/pdf" },
              },
            ],
          },
        ],
      });

      expect(lastPayload().messages[0].content).toEqual([
        { type: "text", text: "describe this" },
        { type: "image_url", image_url: { url: "https://img", detail: "low" } },
        {
          type: "file_url",
          file_url: { url: "https://doc", mime_type: "application/pdf" },
        },
      ]);
    });

    it("stringifies tool message parts into a single newline joined string", async () => {
      await invoke({
        messages: [
          {
            role: "tool",
            name: "lookup",
            tool_call_id: "call-1",
            content: ["plain", { type: "text", text: "structured" }],
          },
        ],
      });

      expect(lastPayload().messages[0]).toEqual({
        role: "tool",
        name: "lookup",
        tool_call_id: "call-1",
        content: 'plain\n{"type":"text","text":"structured"}',
      });
    });

    it("rejects unsupported content parts", async () => {
      await expect(
        invokeLLM({
          messages: [{ role: "user", content: [{ type: "audio" } as never] }],
        })
      ).rejects.toThrow("Unsupported message content part");
    });
  });

  describe("tool choice normalization", () => {
    it("omits tools and tool_choice when none are provided", async () => {
      await invoke({ messages: userMessage, tools: [] });

      const payload = lastPayload();
      expect(payload.tools).toBeUndefined();
      expect(payload.tool_choice).toBeUndefined();
    });

    it("passes through the primitive none and auto choices", async () => {
      await invoke({
        messages: userMessage,
        tools: [tool],
        toolChoice: "auto",
      });

      expect(lastPayload()).toMatchObject({
        tools: [tool],
        tool_choice: "auto",
      });
    });

    it("expands 'required' to the single configured tool", async () => {
      await invoke({
        messages: userMessage,
        tools: [tool],
        tool_choice: "required",
      });

      expect(lastPayload().tool_choice).toEqual({
        type: "function",
        function: { name: "lookup" },
      });
    });

    it("rejects 'required' without tools", async () => {
      await expect(
        invokeLLM({ messages: userMessage, toolChoice: "required" })
      ).rejects.toThrow("no tools were configured");
    });

    it("rejects 'required' when the tool is ambiguous", async () => {
      await expect(
        invokeLLM({
          messages: userMessage,
          tools: [tool, { type: "function", function: { name: "other" } }],
          toolChoice: "required",
        })
      ).rejects.toThrow("needs a single tool");
    });

    it("expands a tool choice given by name", async () => {
      await invoke({
        messages: userMessage,
        tools: [tool],
        toolChoice: { name: "lookup" },
      });

      expect(lastPayload().tool_choice).toEqual({
        type: "function",
        function: { name: "lookup" },
      });
    });

    it("passes an explicit tool choice through untouched", async () => {
      const explicit = {
        type: "function",
        function: { name: "lookup" },
      } as const;
      await invoke({
        messages: userMessage,
        tools: [tool],
        toolChoice: explicit,
      });

      expect(lastPayload().tool_choice).toEqual(explicit);
    });
  });

  describe("response format normalization", () => {
    it("prefers an explicit response format", async () => {
      await invoke({
        messages: userMessage,
        responseFormat: { type: "json_object" },
      });

      expect(lastPayload().response_format).toEqual({ type: "json_object" });
    });

    it("rejects a json_schema format without a schema", async () => {
      await expect(
        invokeLLM({
          messages: userMessage,
          response_format: {
            type: "json_schema",
            json_schema: { name: "x" } as never,
          },
        })
      ).rejects.toThrow("requires a defined schema object");
    });

    it("converts an output schema into a json_schema response format", async () => {
      await invoke({
        messages: userMessage,
        output_schema: {
          name: "verdict",
          schema: { type: "object" },
          strict: true,
        },
      });

      expect(lastPayload().response_format).toEqual({
        type: "json_schema",
        json_schema: {
          name: "verdict",
          schema: { type: "object" },
          strict: true,
        },
      });
    });

    it("omits strict when it is not a boolean", async () => {
      await invoke({
        messages: userMessage,
        outputSchema: { name: "verdict", schema: { type: "object" } },
      });

      expect(lastPayload().response_format.json_schema).toEqual({
        name: "verdict",
        schema: { type: "object" },
      });
    });

    it("rejects an output schema missing its name", async () => {
      await expect(
        invokeLLM({
          messages: userMessage,
          outputSchema: { schema: { type: "object" } } as never,
        })
      ).rejects.toThrow("outputSchema requires both name and schema");
    });

    it("sends no response format when neither is provided", async () => {
      await invoke({ messages: userMessage });

      expect(lastPayload().response_format).toBeUndefined();
    });
  });

  it("throws with status and body when the api call fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      text: async () => "slow down",
    });

    await expect(invokeLLM({ messages: userMessage })).rejects.toThrow(
      "LLM invoke failed: 429 Too Many Requests – slow down"
    );
  });
});
