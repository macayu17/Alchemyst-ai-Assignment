import type { AgentState } from "@/lib/agent/agent-store";

export function ConnectionStatus({
  status,
  reconnectAttempt,
}: {
  status: AgentState["connectionStatus"];
  reconnectAttempt: number;
}) {
  const label =
    status === "reconnecting" ? `reconnecting / ${reconnectAttempt}` : status;

  return (
    <div className="connection-status" data-status={status} role="status">
      <span className="status-dot" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
