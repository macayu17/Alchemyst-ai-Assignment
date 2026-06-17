import { describe, expect, it } from "vitest";
import { SequenceBuffer } from "./sequence-buffer";
import type { TokenMessage } from "./types";

function token(seq: number, text = String(seq)): TokenMessage {
  return { type: "TOKEN", seq, text, stream_id: "s_1" };
}

describe("SequenceBuffer", () => {
  it("drains contiguous messages immediately", () => {
    const buffer = new SequenceBuffer(0);

    expect(buffer.push(token(1))).toEqual([token(1)]);
    expect(buffer.push(token(2))).toEqual([token(2)]);
    expect(buffer.lastProcessedSeq).toBe(2);
  });

  it("holds a gap and drains it once the missing message arrives", () => {
    const buffer = new SequenceBuffer(0);

    expect(buffer.push(token(2))).toEqual([]);
    expect(buffer.push(token(1))).toEqual([token(1), token(2)]);
  });

  it("deduplicates processed and buffered sequence numbers", () => {
    const buffer = new SequenceBuffer(0);

    expect(buffer.push(token(2))).toEqual([]);
    expect(buffer.push(token(2, "duplicate buffered"))).toEqual([]);
    expect(buffer.push(token(1))).toEqual([token(1), token(2)]);
    expect(buffer.push(token(1, "duplicate processed"))).toEqual([]);
  });

  it("reconstructs fully reversed delivery", () => {
    const buffer = new SequenceBuffer(0);
    const delivered = [5, 4, 3, 2, 1].flatMap((seq) =>
      buffer.push(token(seq)),
    );

    expect(delivered.map((message) => message.seq)).toEqual([1, 2, 3, 4, 5]);
    expect(buffer.lastProcessedSeq).toBe(5);
    expect(buffer.size).toBe(0);
  });

  it("can resume from an already committed sequence", () => {
    const buffer = new SequenceBuffer(12);

    expect(buffer.push(token(13))).toEqual([token(13)]);
    expect(buffer.lastProcessedSeq).toBe(13);
  });
});
