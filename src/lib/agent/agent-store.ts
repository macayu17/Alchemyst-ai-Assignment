import { SequenceBuffer } from "../protocol/sequence-buffer";
import type { ServerMessage } from "../protocol/types";
import {
  projectChatEvent,
  type ChatStream,
} from "../state/chat-projector";
import { diffJson, type JsonDiff } from "../state/context-diff";
import {
  appendClientTrace,
  appendTraceEvent,
  type TraceRow,
} from "../state/trace-projector";
import type { ClientMessage } from "../protocol/types";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

export interface ContextSnapshot {
  seq: number;
  data: Record<string, unknown>;
  diff: JsonDiff[];
}

export interface ContextHistory {
  contextId: string;
  snapshots: ContextSnapshot[];
}

export interface AgentState {
  connectionStatus: ConnectionStatus;
  reconnectAttempt: number;
  lastReceivedSeq: number;
  lastProcessedSeq: number;
  lastCommittedSeq: number;
  malformedMessages: number;
  userMessages: string[];
  streams: Record<string, ChatStream>;
  streamOrder: string[];
  trace: TraceRow[];
  contexts: Record<string, ContextHistory>;
  selectedTraceId: string | null;
  selectedChatId: string | null;
}

type Listener = () => void;

const initialState = (): AgentState => ({
  connectionStatus: "connecting",
  reconnectAttempt: 0,
  lastReceivedSeq: 0,
  lastProcessedSeq: 0,
  lastCommittedSeq: 0,
  malformedMessages: 0,
  userMessages: [],
  streams: {},
  streamOrder: [],
  trace: [],
  contexts: {},
  selectedTraceId: null,
  selectedChatId: null,
});

export class AgentStore {
  private state = initialState();
  private sequenceBuffer = new SequenceBuffer(0);
  private readonly listeners = new Set<Listener>();

  getSnapshot = (): AgentState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private publish(next: AgentState): void {
    this.state = next;
    for (const listener of this.listeners) {
      listener();
    }
  }

  setConnectionStatus(
    connectionStatus: ConnectionStatus,
    reconnectAttempt = this.state.reconnectAttempt,
  ): void {
    this.publish({ ...this.state, connectionStatus, reconnectAttempt });
  }

  noteMalformedMessage(): void {
    this.publish({
      ...this.state,
      malformedMessages: this.state.malformedMessages + 1,
    });
  }

  beginTurn(content: string): void {
    this.sequenceBuffer = new SequenceBuffer(0);
    this.publish({
      ...this.state,
      lastReceivedSeq: 0,
      lastProcessedSeq: 0,
      lastCommittedSeq: 0,
      userMessages: [...this.state.userMessages, content],
      trace: [],
      contexts: {},
      selectedTraceId: null,
      selectedChatId: null,
    });
  }

  receive(message: ServerMessage): void {
    const ready = this.sequenceBuffer.push(message);
    let next = {
      ...this.state,
      lastReceivedSeq: Math.max(this.state.lastReceivedSeq, message.seq),
    };

    for (const event of ready) {
      next = this.consume(next, event);
    }

    this.publish(next);
  }

  commitProcessed(): void {
    if (this.state.lastCommittedSeq === this.state.lastProcessedSeq) {
      return;
    }
    this.publish({
      ...this.state,
      lastCommittedSeq: this.state.lastProcessedSeq,
    });
  }

  selectTrace(id: string | null): void {
    this.publish({ ...this.state, selectedTraceId: id });
  }

  selectChat(id: string | null): void {
    this.publish({ ...this.state, selectedChatId: id });
  }

  recordClientMessage(message: ClientMessage): void {
    this.publish({
      ...this.state,
      trace: appendClientTrace(this.state.trace, message),
    });
  }

  private consume(state: AgentState, event: ServerMessage): AgentState {
    let streams = state.streams;
    let streamOrder = state.streamOrder;
    const streamId =
      "stream_id" in event
        ? event.stream_id
        : event.type === "ERROR"
          ? streamOrder.at(-1)
          : undefined;

    if (streamId) {
      const current = streams[streamId] ?? {
        streamId,
        segments: [],
        status: "streaming",
      };
      const projected = projectChatEvent(current, event);
      streams = { ...streams, [streamId]: projected };
      if (!state.streams[streamId]) {
        streamOrder = [...streamOrder, streamId];
      }
    }

    let contexts = state.contexts;
    if (event.type === "CONTEXT_SNAPSHOT") {
      const current = contexts[event.context_id] ?? {
        contextId: event.context_id,
        snapshots: [],
      };
      const previous = current.snapshots.at(-1);
      const snapshot: ContextSnapshot = {
        seq: event.seq,
        data: event.data,
        diff: previous ? diffJson(previous.data, event.data) : [],
      };
      contexts = {
        ...contexts,
        [event.context_id]: {
          ...current,
          snapshots: [...current.snapshots, snapshot],
        },
      };
    }

    return {
      ...state,
      streams,
      streamOrder,
      contexts,
      trace: appendTraceEvent(state.trace, event),
      lastProcessedSeq: event.seq,
    };
  }
}

export const agentStore = new AgentStore();
