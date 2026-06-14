"use client";

import { useMemo, useState } from "react";
import type { AgentState } from "@/lib/agent/agent-store";
import { JsonTree } from "./json-tree";

export function ContextPanel({
  state,
  mobileHidden,
}: {
  state: AgentState;
  mobileHidden: boolean;
}) {
  const contextIds = Object.keys(state.contexts);
  const [contextId, setContextId] = useState("");
  const [snapshotIndex, setSnapshotIndex] = useState<number | null>(null);

  const activeId = contextIds.includes(contextId) ? contextId : contextIds[0];
  const history = activeId ? state.contexts[activeId] : undefined;
  const maxIndex = Math.max(0, (history?.snapshots.length ?? 1) - 1);
  const safeIndex =
    snapshotIndex === null ? maxIndex : Math.min(snapshotIndex, maxIndex);
  const snapshot = history?.snapshots[safeIndex];

  const counts = useMemo(() => {
    const result = { added: 0, removed: 0, changed: 0 };
    for (const change of snapshot?.diff ?? []) result[change.kind] += 1;
    return result;
  }, [snapshot]);

  return (
    <section
      className="panel context-panel"
      data-mobile-hidden={mobileHidden}
      aria-label="Context inspector"
    >
      <header className="panel-header">
        <div className="panel-title">
          <h2>Context</h2>
          <span className="count">{contextIds.length} sources</span>
        </div>
        {contextIds.length ? (
          <select
            className="context-selector"
            value={activeId}
            onChange={(event) => {
              setContextId(event.target.value);
              setSnapshotIndex(null);
            }}
            aria-label="Select context"
          >
            {contextIds.map((id) => (
              <option value={id} key={id}>
                {id}
              </option>
            ))}
          </select>
        ) : (
          <span className="eyebrow">snapshot diff</span>
        )}
      </header>

      <div className="panel-body">
        {snapshot && history ? (
          <>
            <div className="snapshot-nav">
              <button
                type="button"
                disabled={safeIndex === 0}
                onClick={() =>
                  setSnapshotIndex(Math.max(0, safeIndex - 1))
                }
                aria-label="Previous context snapshot"
              >
                {"<"}
              </button>
              <div className="snapshot-meta">
                snapshot {safeIndex + 1} / {history.snapshots.length}
                <br />
                seq #{snapshot.seq}
              </div>
              <button
                type="button"
                disabled={safeIndex === maxIndex}
                onClick={() =>
                  setSnapshotIndex(
                    safeIndex + 1 >= maxIndex ? null : safeIndex + 1,
                  )
                }
                aria-label="Next context snapshot"
              >
                {">"}
              </button>
            </div>
            <div className="diff-summary">
              <span className="diff-pill" data-kind="added">
                +{counts.added} added
              </span>
              <span className="diff-pill" data-kind="changed">
                ~{counts.changed} changed
              </span>
              <span className="diff-pill" data-kind="removed">
                -{counts.removed} removed
              </span>
            </div>
            {snapshot.diff.length ? (
              <details className="diff-details">
                <summary>Changed paths ({snapshot.diff.length})</summary>
                <ul>
                  {snapshot.diff.slice(0, 100).map((change) => (
                    <li key={`${change.kind}-${change.path}`} data-kind={change.kind}>
                      <span>{change.kind}</span>
                      <code>{change.path || "context"}</code>
                    </li>
                  ))}
                </ul>
                {snapshot.diff.length > 100 ? (
                  <p>Showing the first 100 paths.</p>
                ) : null}
              </details>
            ) : null}
            <JsonTree value={snapshot.data} diff={snapshot.diff} />
          </>
        ) : (
          <div className="empty-state" style={{ padding: 24 }}>
            <span className="eyebrow">Waiting for context</span>
            <p>
              Context snapshots and structural changes will appear here without
              expanding the full object into the DOM.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
