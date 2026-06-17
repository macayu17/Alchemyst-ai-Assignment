import { describe, expect, it } from "vitest";
import { AgentStore } from "./agent-store";

describe("AgentStore", () => {
  it("projects out-of-order events only after the gap is filled", () => {
    const store = new AgentStore();

    store.receive({
      type: "TOKEN",
      seq: 2,
      stream_id: "s_1",
      text: "world",
    });
    expect(store.getSnapshot().trace).toHaveLength(0);
    expect(store.getSnapshot().lastReceivedSeq).toBe(2);
    expect(store.getSnapshot().lastProcessedSeq).toBe(0);

    store.receive({
      type: "TOKEN",
      seq: 1,
      stream_id: "s_1",
      text: "Hello ",
    });

    const state = store.getSnapshot();
    expect(state.lastProcessedSeq).toBe(2);
    expect(state.trace).toHaveLength(1);
    expect(state.streams.s_1.segments[0]).toMatchObject({
      kind: "text",
      text: "Hello world",
    });
  });

  it("tracks committed sequence separately from processed sequence", () => {
    const store = new AgentStore();
    store.receive({
      type: "TOKEN",
      seq: 1,
      stream_id: "s_1",
      text: "Hello",
    });

    expect(store.getSnapshot().lastProcessedSeq).toBe(1);
    expect(store.getSnapshot().lastCommittedSeq).toBe(0);

    store.commitProcessed();
    expect(store.getSnapshot().lastCommittedSeq).toBe(1);
  });

  it("retains context history and computes the current diff", () => {
    const store = new AgentStore();
    store.receive({
      type: "CONTEXT_SNAPSHOT",
      seq: 1,
      context_id: "ctx_1",
      data: { report: "Q2", value: 10 },
    });
    store.receive({
      type: "CONTEXT_SNAPSHOT",
      seq: 2,
      context_id: "ctx_1",
      data: { report: "Q3", value: 10, ready: true },
    });

    const history = store.getSnapshot().contexts.ctx_1;
    expect(history.snapshots).toHaveLength(2);
    expect(history.snapshots[1].diff).toEqual([
      { kind: "changed", path: "report", before: "Q2", after: "Q3" },
      { kind: "added", path: "ready", after: true },
    ]);
  });

  it("resets sequence handling when a new turn starts", () => {
    const store = new AgentStore();
    store.receive({
      type: "TOKEN",
      seq: 1,
      stream_id: "s_1",
      text: "First",
    });
    store.beginTurn("Second question");
    store.receive({
      type: "TOKEN",
      seq: 1,
      stream_id: "s_2",
      text: "Second",
    });

    expect(store.getSnapshot().lastProcessedSeq).toBe(1);
    expect(store.getSnapshot().streamOrder).toEqual(["s_1", "s_2"]);
    expect(store.getSnapshot().userMessages).toEqual(["Second question"]);
  });
});
