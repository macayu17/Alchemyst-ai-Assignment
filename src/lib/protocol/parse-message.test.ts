import { describe, expect, it } from "vitest";
import { parseServerMessage } from "./parse-message";

describe("parseServerMessage", () => {
  it.each([
    { type: "TOKEN", seq: 1, text: "hello", stream_id: "s_1" },
    {
      type: "TOOL_CALL",
      seq: 2,
      call_id: "tc_1",
      tool_name: "lookup",
      args: { query: "revenue" },
      stream_id: "s_1",
    },
    {
      type: "TOOL_RESULT",
      seq: 3,
      call_id: "tc_1",
      result: { value: 42 },
      stream_id: "s_1",
    },
    {
      type: "CONTEXT_SNAPSHOT",
      seq: 4,
      context_id: "ctx_1",
      data: { report: "Q3" },
    },
    { type: "PING", seq: 5, challenge: "" },
    { type: "STREAM_END", seq: 6, stream_id: "s_1" },
    { type: "ERROR", seq: 7, code: "failed", message: "No result" },
  ])("accepts a valid $type message", (message) => {
    expect(parseServerMessage(JSON.stringify(message))).toEqual(message);
  });

  it.each([
    "not json",
    "null",
    "{}",
    JSON.stringify({ type: "TOKEN", seq: 0, text: "x", stream_id: "s_1" }),
    JSON.stringify({ type: "TOKEN", seq: 1, text: 4, stream_id: "s_1" }),
    JSON.stringify({ type: "PING", seq: 1 }),
    JSON.stringify({ type: "UNKNOWN", seq: 1 }),
  ])("rejects malformed payload %s", (payload) => {
    expect(parseServerMessage(payload)).toBeNull();
  });
});
