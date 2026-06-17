# Decisions

## Sequence ordering and deduplication

The socket and the UI do not share one idea of "latest sequence." I keep three
values:

- `lastReceivedSeq`: the highest number seen on the wire. This is diagnostic.
- `lastProcessedSeq`: the highest contiguous event projected into application state.
- `lastCommittedSeq`: the processed sequence confirmed after React's layout commit.

Only `lastCommittedSeq` is sent in `RESUME`.

Incoming messages go into a `Map<number, ServerMessage>`. The map gives cheap
duplicate checks and direct lookup of the next expected number. When the
expected sequence arrives, the buffer drains consecutive entries until it finds
another gap. A fully reversed batch therefore costs one insertion per event and
one later removal per event; it does not repeatedly sort the whole batch.

Heartbeats are the exception to ordered side effects. A `PING` is validated and
answered immediately at socket ingress, including an empty challenge. It still
enters the sequence buffer for the trace, but a missing lower sequence cannot
delay the required `PONG`.

## Tool acknowledgement race

The written protocol says `TOOL_ACK` means the card has rendered. That guarantee
cannot always be met together with strict sequence ordering. In chaos mode a
`TOOL_CALL` can arrive behind a missing sequence, while the server starts its
five-second ACK timeout as soon as it sends the frame. A latency spike or reorder
buffer can consume that entire window before the client is allowed to place the
card correctly.

Relay treats `TOOL_ACK` as transport-level acceptance and sends it once at
ingress. Rendering still waits for sequence order. A `Set<call_id>` prevents a
replayed call from producing a second ACK after reconnect. This is a deliberate
choice: it keeps the stream moving without corrupting the ordered chat.

In a protocol I controlled, I would split this into `TOOL_RECEIVED` and
`TOOL_RENDERED`, or start the server timeout only after all preceding sequences
were known to be deliverable.

## Preventing layout shift

An assistant response is not rebuilt from one large string. It is an ordered
array of immutable segments:

```text
text -> tool -> text -> tool -> text
```

Consecutive tokens only extend the final text segment. A tool call closes the
current text segment and inserts a card after it. The result updates that card
by `call_id`; subsequent tokens create or extend the following text segment.
Earlier text nodes are left in place, so tool interruptions do not cause the
whole response to reflow or duplicate content.

## Reconnection and recovery

The client changes to `reconnecting` as soon as the close event fires. Attempts
use 500ms, 1s, 2s, 4s, 8s, then 10s. Existing chat state is never cleared.

After a reconnect, `RESUME` is sent before queued user messages or any other
frame. Replayed events use the same sequence buffer as live events, so already
processed numbers are ignored and future numbers wait for their gaps. Pending
tool cards remain in the store and can receive a replayed result.

The supplied fixture aborts its script when a socket is replaced. It can replay
events recorded before the drop, but it cannot continue producing the unfinished
response. Relay preserves and recovers everything the server makes available;
the fixture itself may leave a stream in a waiting state after a drop.

## Trace performance

Token frames are grouped as they enter the trace projection. A run of tokens for
one stream becomes one row containing the count, elapsed time, sequence range,
and combined text. Tool, context, heartbeat, error, and outbound client frames
remain individual rows.

Filtering uses `useDeferredValue`, so typing in the search field does not block
incoming stream updates. Chat and trace entries use stable IDs for two-way
selection and scrolling.

## Large context objects

Context snapshots are stored by `context_id`, with a structural diff against the
previous snapshot. The tree is lazy: only expanded branches create child React
nodes. A 500KB object can therefore be received and inspected without mounting
thousands of rows immediately.

The fixture regenerates random statistics for its second schema snapshot, so a
single update can report thousands of changed leaves. The diff remains useful,
but a production version would move diff calculation to a Web Worker and stream
large snapshots into persistent storage rather than retaining every full copy
in memory.

## Fifty concurrent streams

For an operations dashboard I would make each stream an isolated store with its
own sequence buffer, connection state, and bounded trace. A supervisor would
schedule visible streams at high priority and background streams at lower
priority. The list would be virtualized, inactive context trees would not be
mounted, and trace data would be capped or persisted outside React.

I would also avoid one WebSocket per card if the backend supported multiplexing.
Messages would include a session key and feed per-session buffers behind one
connection.

## Responses 100 times longer

The current segment model still works, but retaining a complete text node and
full trace in memory would eventually become expensive. I would:

- coalesce old text segments into immutable blocks;
- virtualize message blocks above and below the viewport;
- persist completed blocks in IndexedDB;
- keep only a rolling trace window in memory;
- move search indexing to a worker;
- render plain text first and parse expensive formatting in background chunks.

## Fixture behavior observed

Live testing found several backend behaviors worth accounting for:

- sequence numbers reset for each user turn;
- rapid tool calls before any result are described but not generated;
- a disconnect aborts the active script;
- a chaos-delayed `STREAM_END` can remain in the server reorder buffer because
  the buffer is flushed before, rather than after, the end event is processed;
- context snapshots are regenerated with random values, creating very large diffs.

The client does not depend on those quirks, but they explain why some chaos runs
can end with a complete-looking response still marked as streaming.
