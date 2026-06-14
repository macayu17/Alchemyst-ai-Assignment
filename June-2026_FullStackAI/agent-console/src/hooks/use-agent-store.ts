"use client";

import { useSyncExternalStore } from "react";
import { agentStore, type AgentState } from "@/lib/agent/agent-store";

export function useAgentStore(): AgentState {
  return useSyncExternalStore(
    agentStore.subscribe,
    agentStore.getSnapshot,
    agentStore.getSnapshot,
  );
}
