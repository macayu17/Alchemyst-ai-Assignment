"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useAgentStore } from "@/hooks/use-agent-store";
import { AgentClient } from "@/lib/agent/agent-client";
import { agentStore } from "@/lib/agent/agent-store";
import { ChatPanel } from "./chat-panel";
import { ConnectionStatus } from "./connection-status";
import { ContextPanel } from "./context-panel";
import { TracePanel } from "./trace-panel";

type MobilePanel = "chat" | "trace" | "context";

export function AgentConsole() {
  const state = useAgentStore();
  const [client] = useState(() => new AgentClient());
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("chat");

  useEffect(() => {
    client.connect();
    return () => client.disconnect();
  }, [client]);

  useLayoutEffect(() => {
    agentStore.commitProcessed();
  }, [state.lastProcessedSeq]);

  return (
    <main className="console">
      <header className="masthead">
        <div className="brand">
          <span className="brand-mark">R</span>
          <div>
            <h1>Relay</h1>
            <p>Agent operations console / protocol v1</p>
          </div>
        </div>
        <div className="status-cluster">
          <span className="sequence-readout">
            rx {state.lastReceivedSeq} / processed {state.lastProcessedSeq} / dom{" "}
            {state.lastCommittedSeq}
          </span>
          <ConnectionStatus
            status={state.connectionStatus}
            reconnectAttempt={state.reconnectAttempt}
          />
        </div>
      </header>

      <nav className="mobile-tabs" aria-label="Console panels">
        {(["chat", "trace", "context"] as MobilePanel[]).map((panel) => (
          <button
            type="button"
            key={panel}
            data-active={mobilePanel === panel}
            onClick={() => setMobilePanel(panel)}
          >
            {panel}
          </button>
        ))}
      </nav>

      <div className="workspace">
        <ChatPanel
          state={state}
          client={client}
          mobileHidden={mobilePanel !== "chat"}
        />
        <TracePanel state={state} mobileHidden={mobilePanel !== "trace"} />
        <ContextPanel state={state} mobileHidden={mobilePanel !== "context"} />
      </div>
    </main>
  );
}
