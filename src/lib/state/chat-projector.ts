import type { ServerMessage } from "../protocol/types";

export interface TextSegment {
  kind: "text";
  id: string;
  fromSeq: number;
  toSeq: number;
  tokenCount: number;
  text: string;
}

export interface ToolSegment {
  kind: "tool";
  id: string;
  callSeq: number;
  resultSeq?: number;
  callId: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: "waiting" | "complete";
}

export interface ErrorSegment {
  kind: "error";
  id: string;
  seq: number;
  code: string;
  message: string;
}

export type ChatSegment = TextSegment | ToolSegment | ErrorSegment;

export interface ChatStream {
  streamId: string;
  segments: ChatSegment[];
  status: "streaming" | "complete" | "error";
}

export function projectChatEvent(
  stream: ChatStream,
  event: ServerMessage,
): ChatStream {
  if ("stream_id" in event && event.stream_id !== stream.streamId) {
    return stream;
  }

  if (event.type === "TOKEN") {
    const last = stream.segments.at(-1);
    if (last?.kind === "text") {
      return {
        ...stream,
        segments: [
          ...stream.segments.slice(0, -1),
          {
            ...last,
            toSeq: event.seq,
            tokenCount: last.tokenCount + 1,
            text: last.text + event.text,
          },
        ],
      };
    }

    return {
      ...stream,
      segments: [
        ...stream.segments,
        {
          kind: "text",
          id: `text-${event.seq}`,
          fromSeq: event.seq,
          toSeq: event.seq,
          tokenCount: 1,
          text: event.text,
        },
      ],
    };
  }

  if (event.type === "TOOL_CALL") {
    return {
      ...stream,
      segments: [
        ...stream.segments,
        {
          kind: "tool",
          id: `tool-${event.call_id}`,
          callSeq: event.seq,
          callId: event.call_id,
          toolName: event.tool_name,
          args: event.args,
          status: "waiting",
        },
      ],
    };
  }

  if (event.type === "TOOL_RESULT") {
    return {
      ...stream,
      segments: stream.segments.map((segment) =>
        segment.kind === "tool" && segment.callId === event.call_id
          ? {
              ...segment,
              resultSeq: event.seq,
              result: event.result,
              status: "complete",
            }
          : segment,
      ),
    };
  }

  if (event.type === "STREAM_END") {
    return { ...stream, status: "complete" };
  }

  if (event.type === "ERROR") {
    return {
      ...stream,
      status: "error",
      segments: [
        ...stream.segments,
        {
          kind: "error",
          id: `error-${event.seq}`,
          seq: event.seq,
          code: event.code,
          message: event.message,
        },
      ],
    };
  }

  return stream;
}
