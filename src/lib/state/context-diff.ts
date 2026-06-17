export type JsonDiff =
  | { kind: "added"; path: string; after: unknown }
  | { kind: "removed"; path: string; before: unknown }
  | { kind: "changed"; path: string; before: unknown; after: unknown };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pathFor(parent: string, key: string, array: boolean): string {
  if (array) {
    return `${parent}[${key}]`;
  }
  return parent ? `${parent}.${key}` : key;
}

function visit(
  before: unknown,
  after: unknown,
  path: string,
  changes: JsonDiff[],
): void {
  if (Object.is(before, after)) {
    return;
  }

  const beforeArray = Array.isArray(before);
  const afterArray = Array.isArray(after);
  if (beforeArray && afterArray) {
    const length = Math.max(before.length, after.length);
    for (let index = 0; index < length; index += 1) {
      const childPath = pathFor(path, String(index), true);
      if (index >= before.length) {
        changes.push({ kind: "added", path: childPath, after: after[index] });
      } else if (index >= after.length) {
        changes.push({ kind: "removed", path: childPath, before: before[index] });
      } else {
        visit(before[index], after[index], childPath, changes);
      }
    }
    return;
  }

  if (isObject(before) && isObject(after)) {
    for (const key of Object.keys(after)) {
      const childPath = pathFor(path, key, false);
      if (!(key in before)) {
        changes.push({ kind: "added", path: childPath, after: after[key] });
      } else {
        visit(before[key], after[key], childPath, changes);
      }
    }
    for (const key of Object.keys(before)) {
      if (!(key in after)) {
        changes.push({
          kind: "removed",
          path: pathFor(path, key, false),
          before: before[key],
        });
      }
    }
    return;
  }

  changes.push({ kind: "changed", path, before, after });
}

export function diffJson(before: unknown, after: unknown): JsonDiff[] {
  const changes: JsonDiff[] = [];
  visit(before, after, "", changes);
  return changes;
}
