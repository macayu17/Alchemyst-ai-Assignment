"use client";

import { useState } from "react";
import type { JsonDiff } from "@/lib/state/context-diff";

function typeName(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === "object") return `Object(${Object.keys(value).length})`;
  return "";
}

function primitive(value: unknown) {
  if (value === null) return <span className="json-null">null</span>;
  if (typeof value === "string") {
    return <span className="json-string">&quot;{value}&quot;</span>;
  }
  if (typeof value === "number") {
    return <span className="json-number">{value}</span>;
  }
  if (typeof value === "boolean") {
    return <span className="json-boolean">{String(value)}</span>;
  }
  return <span>{String(value)}</span>;
}

function childPath(parent: string, key: string, array: boolean): string {
  if (array) return `${parent}[${key}]`;
  return parent ? `${parent}.${key}` : key;
}

function JsonNode({
  name,
  value,
  path,
  depth,
  changes,
}: {
  name: string;
  value: unknown;
  path: string;
  depth: number;
  changes: Map<string, JsonDiff["kind"]>;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const composite = value !== null && typeof value === "object";
  const entries = composite
    ? Object.entries(value as Record<string, unknown>)
    : [];
  const array = Array.isArray(value);
  const change = changes.get(path);

  return (
    <div>
      <div
        className="json-row"
        data-change={change}
        style={{ paddingLeft: 6 + depth * 14 }}
      >
        {composite ? (
          <button
            className="tree-toggle"
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${name}`}
          >
            {expanded ? "-" : "+"}
          </button>
        ) : (
          <span className="tree-toggle" />
        )}
        <span className="json-key">{name}</span>
        <span>:</span>
        {composite ? <span>{typeName(value)}</span> : primitive(value)}
      </div>
      {expanded
        ? entries.map(([key, child]) => (
            <JsonNode
              key={key}
              name={array ? `[${key}]` : key}
              value={child}
              path={childPath(path, key, array)}
              depth={depth + 1}
              changes={changes}
            />
          ))
        : null}
    </div>
  );
}

export function JsonTree({
  value,
  diff,
}: {
  value: Record<string, unknown>;
  diff: JsonDiff[];
}) {
  const changes = new Map(diff.map((change) => [change.path, change.kind]));

  return (
    <div className="json-tree">
      <JsonNode name="context" value={value} path="" depth={0} changes={changes} />
    </div>
  );
}
