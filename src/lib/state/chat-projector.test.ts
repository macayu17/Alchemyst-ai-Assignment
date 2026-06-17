import { describe, expect, it } from "vitest";
import { projectChatEvent, type ChatStream } from "./chat-projector";
import type { ServerMessage } from "../protocol/types";

function apply(events: ServerMessage[]): ChatStream {
  return events.reduce<ChatStream>(
    (stream, event) => projectChatEvent(stream, event),
    { streamId: "s_1", segments: [], status: "streaming" },
  );
}

describe("projectChatEvent", () => {
  it("keeps text boundaries stable across a tool interruption", () => {
    const stream = apply([
      { type: "TOKEN", seq: 1, stream_id: "s_1", text: "Revenue grew " },
      {
        type: "TOOL_CALL",
        seq: 2,
        stream_id: "s_1",
        call_id: "tc_1",
        tool_name: "lookup_metric",
        args: { metric: "revenue" },
      },
      {
        type: "TOOL_RESULT",
        seq: 3,
        stream_id: "s_1",
        call_id: "tc_1",
        result: { value: "23.4%" },
      },
      { type: "TOKEN", seq: 4, stream_id: "s_1", text: "23.4% YoY." },
    ]);

    expect(stream.segments).toEqual([
      {
        kind: "text",
        id: "text-1",
        fromSeq: 1,
        toSeq: 1,
        tokenCount: 1,
        text: "Revenue grew ",
      },
      {
        kind: "tool",
        id: "tool-tc_1",
        callSeq: 2,
        resultSeq: 3,
        callId: "tc_1",
        toolName: "lookup_metric",
        args: { metric: "revenue" },
        result: { value: "23.4%" },
        status: "complete",
      },
      {
        kind: "text",
        id: "text-4",
        fromSeq: 4,
        toSeq: 4,
        tokenCount: 1,
        text: "23.4% YoY.",
      },
    ]);
  });

  it("stacks multiple tool calls without overwriting them", () => {
    const stream = apply([
      {
        type: "TOOL_CALL",
        seq: 1,
        stream_id: "s_1",
        call_id: "tc_1",
        tool_name: "first",
        args: {},
      },
      {
        type: "TOOL_CALL",
        seq: 2,
        stream_id: "s_1",
        call_id: "tc_2",
        tool_name: "second",
        args: {},
      },
      {
        type: "TOOL_RESULT",
        seq: 3,
        stream_id: "s_1",
        call_id: "tc_2",
        result: { ok: true },
      },
    ]);

    expect(stream.segments).toHaveLength(2);
    expect(stream.segments[0]).toMatchObject({ callId: "tc_1", status: "waiting" });
    expect(stream.segments[1]).toMatchObject({ callId: "tc_2", status: "complete" });
  });
});
