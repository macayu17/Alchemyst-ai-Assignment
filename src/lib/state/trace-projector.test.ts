import { describe, expect, it } from "vitest";
import { appendTraceEvent } from "./trace-projector";

describe("appendTraceEvent", () => {
  it("groups consecutive tokens from the same stream", () => {
    const first = appendTraceEvent([], {
      type: "TOKEN",
      seq: 1,
      stream_id: "s_1",
      text: "Hello ",
    }, 100);
    const second = appendTraceEvent(first, {
      type: "TOKEN",
      seq: 2,
      stream_id: "s_1",
      text: "world",
    }, 240);

    expect(second).toEqual([
      {
        kind: "tokens",
        id: "tokens-1",
        eventType: "TOKEN",
        streamId: "s_1",
        fromSeq: 1,
        toSeq: 2,
        startedAt: 100,
        endedAt: 240,
        tokenCount: 2,
        text: "Hello world",
      },
    ]);
  });

  it("starts a new token group after another event", () => {
    const rows = appendTraceEvent(
      appendTraceEvent(
        appendTraceEvent([], {
          type: "TOKEN",
          seq: 1,
          stream_id: "s_1",
          text: "Before",
        }, 10),
        {
          type: "PING",
          seq: 2,
          challenge: "abc",
        },
        20,
      ),
      {
        type: "TOKEN",
        seq: 3,
        stream_id: "s_1",
        text: "After",
      },
      30,
    );

    expect(rows.map((row) => row.kind)).toEqual(["tokens", "event", "tokens"]);
  });
});
