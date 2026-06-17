import { describe, expect, it } from "vitest";
import { AgentClient, type SocketLike } from "./agent-client";
import { AgentStore } from "./agent-store";

class FakeSocket implements SocketLike {
  static readonly OPEN = 1;
  readyState = FakeSocket.OPEN;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
  }

  open(): void {
    this.onopen?.();
  }

  message(data: object): void {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  disconnect(): void {
    this.readyState = 3;
    this.onclose?.();
  }
}

describe("AgentClient", () => {
  it("responds immediately to an empty heartbeat challenge", () => {
    const sockets: FakeSocket[] = [];
    const client = new AgentClient({
      store: new AgentStore(),
      socketFactory: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
    });

    client.connect();
    sockets[0].open();
    sockets[0].message({ type: "PING", seq: 1, challenge: "" });

    expect(sockets[0].sent).toEqual([
      JSON.stringify({ type: "PONG", echo: "" }),
    ]);
  });

  it("sends RESUME before queued frames after reconnecting", () => {
    const sockets: FakeSocket[] = [];
    const scheduled: Array<() => void> = [];
    const store = new AgentStore();
    for (let seq = 1; seq <= 3; seq += 1) {
      store.receive({ type: "PING", seq, challenge: String(seq) });
    }
    store.commitProcessed();

    const client = new AgentClient({
      store,
      socketFactory: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
      schedule: (callback) => {
        scheduled.push(callback);
        return 1;
      },
    });

    client.connect();
    sockets[0].open();
    sockets[0].disconnect();
    client.sendUserMessage("queued while reconnecting");
    scheduled[0]();
    sockets[1].open();

    expect(JSON.parse(sockets[1].sent[0])).toEqual({
      type: "RESUME",
      last_seq: 3,
    });
    expect(JSON.parse(sockets[1].sent[1])).toEqual({
      type: "USER_MESSAGE",
      content: "queued while reconnecting",
    });
  });

  it("sends a tool acknowledgement on demand", () => {
    const socket = new FakeSocket();
    const client = new AgentClient({
      store: new AgentStore(),
      socketFactory: () => socket,
    });

    client.connect();
    socket.open();
    client.acknowledgeTool("tc_1");

    expect(JSON.parse(socket.sent[0])).toEqual({
      type: "TOOL_ACK",
      call_id: "tc_1",
    });
  });

  it("acknowledges a tool call at ingress before sequence gaps drain", () => {
    const socket = new FakeSocket();
    const store = new AgentStore();
    const client = new AgentClient({
      store,
      socketFactory: () => socket,
    });

    client.connect();
    socket.open();
    socket.message({
      type: "TOOL_CALL",
      seq: 4,
      stream_id: "s_1",
      call_id: "tc_gap",
      tool_name: "lookup",
      args: {},
    });

    expect(JSON.parse(socket.sent[0])).toEqual({
      type: "TOOL_ACK",
      call_id: "tc_gap",
    });
    expect(store.getSnapshot().lastProcessedSeq).toBe(0);
  });

  it("does not acknowledge the same replayed tool call twice", () => {
    const socket = new FakeSocket();
    const client = new AgentClient({
      store: new AgentStore(),
      socketFactory: () => socket,
    });
    const toolCall = {
      type: "TOOL_CALL",
      seq: 1,
      stream_id: "s_1",
      call_id: "tc_replayed",
      tool_name: "lookup",
      args: {},
    };

    client.connect();
    socket.open();
    socket.message(toolCall);
    socket.message(toolCall);

    expect(socket.sent.map((message) => JSON.parse(message))).toEqual([
      { type: "TOOL_ACK", call_id: "tc_replayed" },
    ]);
  });
});
