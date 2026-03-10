import { streamText, stepCountIs } from "ai";
import { tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod/v4";
import { ENV } from "~server/_core/env";
import { createPatchedFetch } from "~server/_core/patchedFetch";

function createLLMProvider() {
  const baseURL = ENV.forgeApiUrl.endsWith("/v1")
    ? ENV.forgeApiUrl
    : `${ENV.forgeApiUrl}/v1`;

  return createOpenAI({
    baseURL,
    apiKey: ENV.forgeApiKey,
    fetch: createPatchedFetch(fetch),
  });
}

const tools = {
  getWeather: tool({
    description: "Get the current weather for a location",
    inputSchema: z.object({
      location: z
        .string()
        .describe("The city and country, e.g. 'Tokyo, Japan'"),
      unit: z.enum(["celsius", "fahrenheit"]).optional().default("celsius"),
    }),
    execute: async ({ location, unit }: { location: string; unit: string }) => {
      const temp = Math.floor(Math.random() * 30) + 5;
      const conditions = ["sunny", "cloudy", "rainy", "partly cloudy"][
        Math.floor(Math.random() * 4)
      ] as string;
      return {
        location,
        temperature: unit === "fahrenheit" ? Math.round(temp * 1.8 + 32) : temp,
        unit,
        conditions,
        humidity: Math.floor(Math.random() * 50) + 30,
      };
    },
  }),

  calculate: tool({
    description: "Perform a mathematical calculation",
    inputSchema: z.object({
      expression: z
        .string()
        .describe("The math expression to evaluate, e.g. '2 + 2'"),
    }),
    execute: async ({ expression }: { expression: string }) => {
      try {
        const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, "");
        const result = Function(
          `"use strict"; return (${sanitized})`
        )() as number;
        return { expression, result };
      } catch {
        return { expression, error: "Invalid expression" };
      }
    },
  }),
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages } = body as { messages?: unknown[] };

    if (!messages || !Array.isArray(messages)) {
      return Response.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    const openai = createLLMProvider();
    const result = streamText({
      model: openai.chat("gpt-4o"),
      system:
        "You are a helpful assistant. You have access to tools for getting weather and doing calculations. Use them when appropriate.",
      messages: messages as never,
      tools,
      stopWhen: stepCountIs(5),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[/api/chat] Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
