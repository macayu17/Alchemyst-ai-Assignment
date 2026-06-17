"use client";

import { memo, useCallback, useDeferredValue, useMemo, useState } from "react";
import { agentStore, type AgentState } from "@/lib/agent/agent-store";
import type { TraceRow } from "@/lib/state/trace-projector";

function rowText(row: TraceRow): string {
  return row.kind === "tokens" ? row.text : JSON.stringify(row.event);
}

function relatedChatId(row: TraceRow): string | null {
  if (row.kind === "tokens") return `text-${row.fromSeq}`;
  if (row.event.type === "TOOL_CALL" || row.event.type === "TOOL_RESULT") {
    return `tool-${row.event.call_id}`;
  }
  return null;
}

const TraceRowView = memo(function TraceRowView({
  row,
  selected,
  onSelect,
}: {
  row: TraceRow;
  selected: boolean;
  onSelect: (row: TraceRow) => void;
}) {
  const sequence =
    row.kind === "tokens" ? `${row.fromSeq}-${row.toSeq}` : row.seq || "client";
  const summary =
    row.kind === "tokens"
      ? `Streamed ${row.tokenCount} tokens (${row.endedAt - row.startedAt}ms)`
      : rowText(row);
  const direction = row.kind === "event" ? row.direction : "in";
  const isTool =
    row.eventType === "TOOL_CALL" || row.eventType === "TOOL_RESULT";

  return (
    <article
      id={`trace-${row.id}`}
      className="trace-row"
      data-selected={selected}
      data-tool={isTool}
    >
      <button
        className="trace-row-button"
        type="button"
        onClick={() => onSelect(row)}
      >
        <span className="trace-seq">#{sequence}</span>
        <span className="trace-main">
          <span className="trace-type">
            {row.eventType}
            <span className="direction">
              {direction === "in" ? "IN" : "OUT"}
            </span>
          </span>
          <span className="trace-summary">{summary}</span>
        </span>
      </button>
      <details>
        <summary>{row.kind === "tokens" ? "Full streamed text" : "Payload"}</summary>
        <pre>{rowText(row)}</pre>
      </details>
    </article>
  );
});

export function TracePanel({
  state,
  mobileHidden,
}: {
  state: AgentState;
  mobileHidden: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const deferredQuery = useDeferredValue(query.toLowerCase());

  const rows = useMemo(
    () =>
      state.trace.filter((row) => {
        const matchesType = filter === "ALL" || row.eventType === filter;
        const matchesQuery =
          !deferredQuery ||
          rowText(row).toLowerCase().includes(deferredQuery) ||
          row.eventType.toLowerCase().includes(deferredQuery);
        return matchesType && matchesQuery;
      }),
    [deferredQuery, filter, state.trace],
  );

  const eventTypes = Array.from(new Set(state.trace.map((row) => row.eventType)));

  const select = useCallback((row: TraceRow) => {
    agentStore.selectTrace(row.id);
    const chatId = relatedChatId(row);
    if (chatId) {
      agentStore.selectChat(chatId);
      document
        .getElementById(`chat-${chatId}`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, []);

  return (
    <section
      className="panel trace-panel"
      data-mobile-hidden={mobileHidden}
      aria-label="Agent trace"
    >
      <header className="panel-header">
        <div className="panel-title">
          <h2>Trace</h2>
          <span className="count">{state.trace.length} rows</span>
        </div>
        <span className="eyebrow">ordered events</span>
      </header>

      <div className="panel-body">
        <div className="trace-tools">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search event content"
            aria-label="Search trace"
          />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter trace by event type"
          >
            <option value="ALL">All events</option>
            {eventTypes.map((type) => (
              <option value={type} key={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="trace-list">
          {rows.map((row) => (
            <TraceRowView
              key={row.id}
              row={row}
              selected={state.selectedTraceId === row.id}
              onSelect={select}
            />
          ))}
          {rows.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <span className="eyebrow">No matching events</span>
              <p>The ordered protocol trace will appear here.</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
