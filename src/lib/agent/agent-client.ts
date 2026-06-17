import { parseServerMessage } from "../protocol/parse-message";
import { reconnectDelay } from "../protocol/reconnect";
import type { ClientMessage } from "../protocol/types";
import { agentStore, type AgentStore } from "./agent-store";

export interface SocketLike {
  readyState: number;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  send(data: string): void;
  close(): void;
}

interface AgentClientOptions {
  store?: AgentStore;
  url?: string;
  socketFactory?: (url: string) => SocketLike;
  schedule?: (callback: () => void, delay: number) => unknown;
  cancelSchedule?: (handle: unknown) => void;
}

const defaultSocketFactory = (url: string): SocketLike => {
  const socket = new WebSocket(url);
  return socket as unknown as SocketLike;
};

export class AgentClient {
  private readonly store: AgentStore;
  private readonly url: string;
  private readonly socketFactory: (url: string) => SocketLike;
  private readonly schedule: (callback: () => void, delay: number) => unknown;
  private readonly cancelSchedule: (handle: unknown) => void;
  private socket: SocketLike | null = null;
  private reconnectHandle: unknown = null;
  private reconnectAttempt = 0;
  private hasConnected = false;
  private manuallyClosed = false;
  private queuedUserMessages: string[] = [];
  private readonly acknowledgedToolCalls = new Set<string>();

  constructor(options: AgentClientOptions = {}) {
    this.store = options.store ?? agentStore;
    this.url = options.url ?? "ws://localhost:4747/ws";
    this.socketFactory = options.socketFactory ?? defaultSocketFactory;
    this.schedule =
      options.schedule ??
      ((callback, delay) => window.setTimeout(callback, delay));
    this.cancelSchedule =
      options.cancelSchedule ??
      ((handle) => window.clearTimeout(handle as number));
  }

  connect(): void {
    this.manuallyClosed = false;
    this.openSocket();
  }

  disconnect(): void {
    this.manuallyClosed = true;
    if (this.reconnectHandle !== null) {
      this.cancelSchedule(this.reconnectHandle);
      this.reconnectHandle = null;
    }
    this.socket?.close();
    this.socket = null;
    this.store.setConnectionStatus("disconnected");
  }

  sendUserMessage(content: string): void {
    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }

    if (!this.isOpen()) {
      this.queuedUserMessages.push(trimmed);
      return;
    }

    this.acknowledgedToolCalls.clear();
    this.store.beginTurn(trimmed);
    this.send({ type: "USER_MESSAGE", content: trimmed });
  }

  acknowledgeTool(callId: string): void {
    this.acknowledgeToolOnce(callId);
  }

  private openSocket(): void {
    this.store.setConnectionStatus(
      this.hasConnected ? "reconnecting" : "connecting",
      this.reconnectAttempt,
    );

    const socket = this.socketFactory(this.url);
    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket) {
        return;
      }

      if (this.hasConnected) {
        this.send({
          type: "RESUME",
          last_seq: this.store.getSnapshot().lastCommittedSeq,
        });
      }

      this.hasConnected = true;
      this.reconnectAttempt = 0;
      this.store.setConnectionStatus("connected", 0);
      this.flushQueuedMessages();
    };

    socket.onmessage = (event) => {
      const message = parseServerMessage(event.data);
      if (!message) {
        this.store.noteMalformedMessage();
        return;
      }

      if (message.type === "PING") {
        this.send({ type: "PONG", echo: message.challenge });
      }
      if (message.type === "TOOL_CALL") {
        this.acknowledgeToolOnce(message.call_id);
      }

      this.store.receive(message);
    };

    socket.onerror = () => {
      // The close event owns reconnection so an error cannot schedule twice.
    };

    socket.onclose = () => {
      if (this.socket !== socket) {
        return;
      }
      this.socket = null;
      if (!this.manuallyClosed) {
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect(): void {
    const delay = reconnectDelay(this.reconnectAttempt);
    this.store.setConnectionStatus("reconnecting", this.reconnectAttempt + 1);
    this.reconnectAttempt += 1;
    this.reconnectHandle = this.schedule(() => {
      this.reconnectHandle = null;
      this.openSocket();
    }, delay);
  }

  private flushQueuedMessages(): void {
    const queued = this.queuedUserMessages;
    this.queuedUserMessages = [];
    for (const content of queued) {
      this.acknowledgedToolCalls.clear();
      this.store.beginTurn(content);
      this.send({ type: "USER_MESSAGE", content });
    }
  }

  private acknowledgeToolOnce(callId: string): void {
    if (this.acknowledgedToolCalls.has(callId)) {
      return;
    }
    this.acknowledgedToolCalls.add(callId);
    this.send({ type: "TOOL_ACK", call_id: callId });
  }

  private isOpen(): boolean {
    return this.socket?.readyState === 1;
  }

  private send(message: ClientMessage): void {
    if (this.isOpen()) {
      this.socket?.send(JSON.stringify(message));
      this.store.recordClientMessage(message);
    }
  }
}
