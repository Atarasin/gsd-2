import test from "node:test";
import assert from "node:assert/strict";
import { convertMessages } from "./openai-completions.ts";
import type { Context, Model } from "../types.ts";

const baseModel: Model<"openai-completions"> = {
	id: "local/reasoning-model",
	name: "Local Reasoning Model",
	api: "openai-completions",
	provider: "openai",
	baseUrl: "http://localhost:8000/v1",
	reasoning: false,
	input: ["text"],
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	contextWindow: 128000,
	maxTokens: 4096,
};

test("convertMessages strips reasoning_content replay when compat.stripReasoningContent is enabled", () => {
	const context: Context = {
		messages: [
			{ role: "user", content: "hello", timestamp: 1 },
			{
				role: "assistant",
				content: [
					{ type: "thinking", thinking: "internal chain", thinkingSignature: "reasoning_content" },
					{ type: "text", text: "Hi" },
				],
				api: "openai-completions",
				provider: "openai",
				model: "local/reasoning-model",
				usage: {
					input: 0,
					output: 0,
					cacheRead: 0,
					cacheWrite: 0,
					totalTokens: 0,
					cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
				},
				stopReason: "stop",
				timestamp: 2,
			},
		],
	};

	const disabledCompat = {
		supportsStore: false,
		supportsDeveloperRole: true,
		supportsReasoningEffort: true,
		reasoningEffortMap: {},
		supportsUsageInStreaming: true,
		maxTokensField: "max_completion_tokens" as const,
		requiresToolResultName: false,
		requiresAssistantAfterToolResult: false,
		requiresThinkingAsText: false,
		stripReasoningContent: true,
		thinkingFormat: "openai" as const,
		openRouterRouting: {},
		vercelGatewayRouting: {},
		supportsStrictMode: true,
	};
	const enabledCompat = { ...disabledCompat, stripReasoningContent: false };

	const stripped = convertMessages(baseModel, context, disabledCompat);
	const replayedAssistant = stripped.find((m) => m.role === "assistant") as Record<string, unknown>;
	assert.equal(replayedAssistant.reasoning_content, undefined);

	const passthrough = convertMessages(baseModel, context, enabledCompat);
	const replayedAssistantWithReasoning = passthrough.find((m) => m.role === "assistant") as Record<string, unknown>;
	assert.equal(replayedAssistantWithReasoning.reasoning_content, "internal chain");
});
