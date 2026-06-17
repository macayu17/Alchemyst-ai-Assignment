import { describe, expect, it } from "vitest";
import { diffJson } from "./context-diff";

describe("diffJson", () => {
  it("reports nested additions, removals, and changes", () => {
    const changes = diffJson(
      {
        report: "Q2",
        metrics: { revenue: 12, margin: 28 },
        stale: true,
      },
      {
        report: "Q3",
        metrics: { revenue: 18, margin: 28, churn: 3 },
      },
    );

    expect(changes).toEqual([
      { kind: "changed", path: "report", before: "Q2", after: "Q3" },
      { kind: "changed", path: "metrics.revenue", before: 12, after: 18 },
      { kind: "added", path: "metrics.churn", after: 3 },
      { kind: "removed", path: "stale", before: true },
    ]);
  });

  it("treats array changes as changes at their indices", () => {
    expect(diffJson({ tags: ["a", "b"] }, { tags: ["a", "c", "d"] })).toEqual([
      { kind: "changed", path: "tags[1]", before: "b", after: "c" },
      { kind: "added", path: "tags[2]", after: "d" },
    ]);
  });
});
