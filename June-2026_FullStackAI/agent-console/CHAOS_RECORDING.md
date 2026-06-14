# Chaos Recording Runbook

Record the browser, terminal running the chaos server, and the `/log` response.
Keep the connection badge and sequence readout visible.

## Suggested 3-5 minute sequence

1. Start `agent-server --mode chaos` and open Relay.
2. Send `Write a long detailed document`.
3. When the connection badge changes, call out the reconnect and show the
   `RESUME` entry in `/log`.
4. Open the trace and point out grouped tokens whose sequence range arrived out
   of order.
5. Send `Analyze the correlation` and show both tool cards and results.
6. Send `Show the full database schema`, open the context panel, and expand one
   table while chat remains responsive.
7. Leave the session open until an empty-challenge PING appears, then show its
   successful PONG entry in `/log`.

Chaos profiles are random. Restart the container if a run does not include a
connection drop. The server prints `dropAfterMessages` in its startup log for
each connection.
