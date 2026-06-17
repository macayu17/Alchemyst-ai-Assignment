import type { ServerMessage } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasBaseMessage(value: Record<string, unknown>): boolean {
  return (
    typeof value.type === "string" &&
    Number.isInteger(value.seq) &&
    typeof value.seq === "number" &&
    value.seq > 0
  );
}

function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === "string";
}

export function parseServerMessage(payload: string): ServerMessage | null {
  let value: unknown;

  try {
    value = JSON.parse(payload);
  } catch {
    return null;
  }

  if (!isRecord(value) || !hasBaseMessage(value)) {
    return null;
  }

  switch (value.type) {
    case "TOKEN":
      return hasString(value, "text") && hasString(value, "stream_id")
        ? (value as unknown as ServerMessage)
        : null;
    case "TOOL_CALL":
      return (
        hasString(value, "call_id") &&
        hasString(value, "tool_name") &&
        isRecord(value.args) &&
        hasString(value, "stream_id")
      )
        ? (value as unknown as ServerMessage)
        : null;
    case "TOOL_RESULT":
      return (
        hasString(value, "call_id") &&
        isRecord(value.result) &&
        hasString(value, "stream_id")
      )
        ? (value as unknown as ServerMessage)
        : null;
    case "CONTEXT_SNAPSHOT":
      return hasString(value, "context_id") && isRecord(value.data)
        ? (value as unknown as ServerMessage)
        : null;
    case "PING":
      return hasString(value, "challenge")
        ? (value as unknown as ServerMessage)
        : null;
    case "STREAM_END":
      return hasString(value, "stream_id")
        ? (value as unknown as ServerMessage)
        : null;
    case "ERROR":
      return hasString(value, "code") && hasString(value, "message")
        ? (value as unknown as ServerMessage)
        : null;
    default:
      return null;
  }
}
