import type { ServerMessage } from "./types";

export class SequenceBuffer {
  private readonly pending = new Map<number, ServerMessage>();
  private nextExpectedSeq: number;

  constructor(lastProcessedSeq: number) {
    this.nextExpectedSeq = lastProcessedSeq + 1;
  }

  get lastProcessedSeq(): number {
    return this.nextExpectedSeq - 1;
  }

  get size(): number {
    return this.pending.size;
  }

  push(message: ServerMessage): ServerMessage[] {
    if (
      message.seq < this.nextExpectedSeq ||
      this.pending.has(message.seq)
    ) {
      return [];
    }

    this.pending.set(message.seq, message);

    const ready: ServerMessage[] = [];
    while (this.pending.has(this.nextExpectedSeq)) {
      const next = this.pending.get(this.nextExpectedSeq);
      if (!next) {
        break;
      }
      this.pending.delete(this.nextExpectedSeq);
      ready.push(next);
      this.nextExpectedSeq += 1;
    }

    return ready;
  }
}
