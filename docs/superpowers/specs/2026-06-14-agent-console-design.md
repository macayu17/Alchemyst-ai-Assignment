# Agent Console Design

## Goal

Build a Next.js App Router application that renders an agent stream faithfully, exposes the underlying protocol as a useful trace, inspects changing context, and remains usable when the WebSocket delivers duplicates, gaps, reordering, malformed heartbeats, or disconnects.

## Architecture

The browser client is split into a protocol engine and a React projection. The protocol engine owns parsing, immediate heartbeat responses, sequence ordering, deduplication, reconnection, and outbound protocol messages. React receives ordered events and projects them into chat segments, trace groups, and context history.

The server fixture remains unchanged. The client is designed against the documented protocol, including cases the current fixture cannot produce reliably.

## Protocol Processing

- Validate unknown WebSocket payloads before treating them as server messages.
- Reply to every valid `PING` immediately, including an empty challenge.
- Store non-heartbeat messages in a `Map<number, ServerMessage>`.
- Drain contiguous sequence numbers from `nextExpectedSeq`.
- Ignore sequence numbers already processed or already buffered.
- Track received, processed, and committed sequence numbers separately.
- Send `RESUME` as the first message on every reconnection.
- Use 500ms, 1s, 2s, 4s, 8s, then 10s reconnection delays.

Heartbeat messages are answered at ingress so an ordering gap cannot delay a required `PONG`. They still appear in the trace.

## Chat Projection

Each response is an ordered list of immutable segments:

- text segment
- pending or completed tool-call segment
- error segment

Consecutive tokens append to the current text segment. A tool call closes that segment and inserts a card. Tokens after a tool result start a new text segment, preventing prior text from reflowing or being reconstructed.

## Trace Timeline

The timeline stores protocol events separately from the chat projection. Consecutive token events for the same stream are grouped into one row. Rows contain stable IDs that link chat segments and tool cards to timeline entries in both directions. Filtering operates on normalized row metadata.

## Context Inspector

Snapshots are retained by `context_id`. A structural JSON diff records added, removed, and changed paths. The tree starts collapsed and only materializes children for expanded nodes, so a large snapshot does not create thousands of DOM nodes at once. Diff computation is isolated behind a pure function and can move to a worker without changing UI contracts.

## Interface

The visual direction is an operational console rather than a decorative chat product: warm off-white surfaces, near-black typography, restrained status colors, compact monospace metadata, and a three-panel desktop workspace. The chat remains the widest panel; trace and context panels collapse independently. Mobile uses tabs rather than squeezing all three panels together.

## Testing

Unit tests cover:

- message validation
- sequence buffering and deduplication
- fully reversed delivery
- heartbeat ingress behavior
- chat segment projection across multiple tool calls
- nested JSON additions, removals, and changes
- trace token grouping
- reconnection backoff

Integration verification uses the supplied server in normal and chaos modes, the `/log` endpoint, a production build, and browser interaction.

## Known Fixture Limitations

- The server aborts the script when a connection is replaced, so replay cannot truly continue an unfinished response.
- The supplied scripts serialize tool calls and cannot emit two calls before either result.
- Sequence numbers reset for every new user message.
- Heartbeats do not pass through the chaos reorder pipeline.

The client will tolerate these behaviors and document them in `DECISIONS.md`.
