import type { ClientMessage, ServerMessage } from "../protocol/types";

export interface TokenTraceRow {
  kind: "tokens";
  id: string;
  eventType: "TOKEN";
  streamId: string;
  fromSeq: number;
  toSeq: number;
  startedAt: number;
  endedAt: number;
  tokenCount: number;
  text: string;
}

export interface EventTraceRow {
  kind: "event";
  id: string;
  eventType: Exclude<ServerMessage["type"], "TOKEN"> | ClientMessage["type"];
  seq: number;
  timestamp: number;
  direction: "in" | "out";
  event: Exclude<ServerMessage, { type: "TOKEN" }> | ClientMessage;
}

export type TraceRow = TokenTraceRow | EventTraceRow;

export function appendTraceEvent(
  rows: TraceRow[],
  event: ServerMessage,
  timestamp = Date.now(),
): TraceRow[] {
  if (event.type !== "TOKEN") {
    return [
      ...rows,
      {
        kind: "event",
        id: `${event.type.toLowerCase()}-${event.seq}`,
        eventType: event.type,
        seq: event.seq,
        timestamp,
        direction: "in",
        event,
      },
    ];
  }

  const last = rows.at(-1);
  if (last?.kind === "tokens" && last.streamId === event.stream_id) {
    return [
      ...rows.slice(0, -1),
      {
        ...last,
        toSeq: event.seq,
        endedAt: timestamp,
        tokenCount: last.tokenCount + 1,
        text: last.text + event.text,
      },
    ];
  }

  return [
    ...rows,
    {
      kind: "tokens",
      id: `tokens-${event.seq}`,
      eventType: "TOKEN",
      streamId: event.stream_id,
      fromSeq: event.seq,
      toSeq: event.seq,
      startedAt: timestamp,
      endedAt: timestamp,
      tokenCount: 1,
      text: event.text,
    },
  ];
}

export function appendClientTrace(
  rows: TraceRow[],
  event: ClientMessage,
  timestamp = Date.now(),
): TraceRow[] {
  return [
    ...rows,
    {
      kind: "event",
      id: `client-${event.type.toLowerCase()}-${timestamp}`,
      eventType: event.type,
      seq: 0,
      timestamp,
      direction: "out",
      event,
    },
  ];
}
