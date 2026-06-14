# Agent Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a buildable, tested Agent Console for the June 2026 Full Stack AI assignment.

**Architecture:** A framework-independent protocol core validates and orders WebSocket events, while a small external store projects ordered events into chat, trace, and context state. React components subscribe to focused snapshots and render a responsive three-panel operations console.

**Tech Stack:** Next.js App Router, React, strict TypeScript, CSS Modules/global CSS, Vitest, Testing Library.

---

### Task 1: Scaffold and test harness

**Files:**
- Create: `June-2026_FullStackAI/agent-console/*`
- Modify: `June-2026_FullStackAI/agent-console/package.json`

- [ ] Scaffold a strict Next.js App Router project.
- [ ] Add Vitest, jsdom, and Testing Library.
- [ ] Add `test`, `test:watch`, and `typecheck` scripts.
- [ ] Run the empty test suite and production build.

### Task 2: Protocol contracts and validation

**Files:**
- Create: `src/lib/protocol/types.ts`
- Create: `src/lib/protocol/parse-message.ts`
- Test: `src/lib/protocol/parse-message.test.ts`

- [ ] Write failing tests for every server message type and malformed payloads.
- [ ] Run the focused test and confirm failure.
- [ ] Implement discriminated unions and unknown-payload validation without `any`.
- [ ] Run the focused test and confirm success.

### Task 3: Ordering, deduplication, and backoff

**Files:**
- Create: `src/lib/protocol/sequence-buffer.ts`
- Create: `src/lib/protocol/reconnect.ts`
- Test: `src/lib/protocol/sequence-buffer.test.ts`
- Test: `src/lib/protocol/reconnect.test.ts`

- [ ] Write failing tests for contiguous delivery, gaps, duplicates, and reversed input.
- [ ] Implement a `Map<number, ServerMessage>` contiguous-drain buffer.
- [ ] Write failing tests for the required reconnect delays.
- [ ] Implement capped exponential backoff.
- [ ] Run all protocol tests.

### Task 4: Event projections

**Files:**
- Create: `src/lib/state/chat-projector.ts`
- Create: `src/lib/state/trace-projector.ts`
- Create: `src/lib/state/context-diff.ts`
- Test: matching `*.test.ts` files

- [ ] Test token/tool/token segmentation and multiple tool calls.
- [ ] Implement immutable chat segment projection.
- [ ] Test consecutive-token grouping and event linking.
- [ ] Implement trace grouping.
- [ ] Test nested JSON additions, removals, and changes.
- [ ] Implement structural context diffing.
- [ ] Run all projector tests.

### Task 5: Connection client and external store

**Files:**
- Create: `src/lib/agent/agent-store.ts`
- Create: `src/lib/agent/agent-client.ts`
- Create: `src/hooks/use-agent-store.ts`
- Test: `src/lib/agent/agent-store.test.ts`

- [ ] Test ordered event consumption and committed sequence tracking.
- [ ] Implement the store and focused subscriptions.
- [ ] Implement WebSocket lifecycle, immediate PONG, TOOL_ACK, RESUME-first reconnect, and queued user messages.
- [ ] Expose connection and protocol diagnostics.
- [ ] Run unit tests and typecheck.

### Task 6: Operational console UI

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Create: `src/components/agent-console.tsx`
- Create: `src/components/chat-panel.tsx`
- Create: `src/components/trace-panel.tsx`
- Create: `src/components/context-panel.tsx`
- Create: `src/components/json-tree.tsx`
- Create: `src/components/connection-status.tsx`

- [ ] Build the responsive three-panel shell.
- [ ] Render immutable chat segments and linked tool cards.
- [ ] Render grouped, searchable, filterable trace rows.
- [ ] Render lazy JSON trees, context history, and diff markers.
- [ ] Add keyboard focus, accessible labels, empty states, and reduced-motion handling.
- [ ] Verify the page at desktop and mobile widths.

### Task 7: Integration and submission documents

**Files:**
- Create: `June-2026_FullStackAI/agent-console/DECISIONS.md`
- Modify: `June-2026_FullStackAI/agent-console/README.md`

- [ ] Run the supplied server in normal mode and exercise greeting, report, analysis, lookup, and large-context scripts.
- [ ] Inspect `/log` for successful PONG and TOOL_ACK entries.
- [ ] Run chaos mode and verify reconnect, ordering, duplicates, corrupt heartbeat, and large context behavior.
- [ ] Document architecture, state machine, setup, fixture limitations, scaling decisions, and recording instructions.
- [ ] Run tests, lint, typecheck, and production build.
