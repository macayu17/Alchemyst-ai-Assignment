"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import type { AgentClient } from "@/lib/agent/agent-client";
import { agentStore, type AgentState } from "@/lib/agent/agent-store";
import type { ToolSegment } from "@/lib/state/chat-projector";

const prompts = [
  "Summarize the Q3 report",
  "Analyze the correlation",
  "Find the deployment SLA",
  "Show the full database schema",
];

function ToolCard({
  segment,
  selected,
}: {
  segment: ToolSegment;
  selected: boolean;
}) {
  const select = () => {
    agentStore.selectChat(segment.id);
    agentStore.selectTrace(`tool_call-${segment.callSeq}`);
    document
      .getElementById(`trace-tool_call-${segment.callSeq}`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  return (
    <article
      id={`chat-${segment.id}`}
      className="tool-card"
      data-complete={segment.status === "complete"}
      data-selected={selected}
    >
      <button type="button" onClick={select}>
        <span className="tool-name">{segment.toolName}</span>
        <span className="tool-status">
          {segment.status === "complete" ? "result received" : "running"}
        </span>
      </button>
      <pre>{JSON.stringify(segment.args, null, 2)}</pre>
      {segment.result ? <pre>{JSON.stringify(segment.result, null, 2)}</pre> : null}
    </article>
  );
}

export function ChatPanel({
  state,
  client,
  mobileHidden,
}: {
  state: AgentState;
  client: AgentClient;
  mobileHidden: boolean;
}) {
  const [content, setContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasConversation =
    state.streamOrder.length > 0 || state.userMessages.length > 0;
  const latestUserMessage = state.userMessages.at(-1);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [state.lastProcessedSeq, state.userMessages.length]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const next = content.trim();
    if (!next) return;
    client.sendUserMessage(next);
    setContent("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <section
      className="panel chat-panel"
      data-mobile-hidden={mobileHidden}
      aria-label="Agent chat"
    >
      <header className="panel-header">
        <div className="panel-title">
          <h2>Conversation</h2>
          <span className="count">{state.streamOrder.length} streams</span>
        </div>
        <span className="eyebrow">live projection</span>
      </header>

      <div className="panel-body chat-scroll" ref={scrollRef}>
        {!hasConversation ? (
          <div className="empty-state">
            <span className="eyebrow">WebSocket / localhost:4747</span>
            <h2>See what the agent is doing, not just what it says.</h2>
            <p>
              Stream responses, inspect tool interruptions, and follow context
              changes while the protocol recovers from unreliable delivery.
            </p>
            <div className="prompt-list" aria-label="Example prompts">
              {prompts.map((prompt) => (
                <button
                  className="prompt-chip"
                  type="button"
                  key={prompt}
                  onClick={() => client.sendUserMessage(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {latestUserMessage ? (
              <div className="message">
                <div className="message-label">You</div>
                <div className="user-message">{latestUserMessage}</div>
              </div>
            ) : null}

            {state.streamOrder.map((streamId) => {
              const stream = state.streams[streamId];
              return (
                <div className="message assistant-message" key={streamId}>
                  <div className="message-label">
                    Agent / {streamId} / {stream.status}
                  </div>
                  {stream.segments.map((segment, index) => {
                    if (segment.kind === "tool") {
                      return (
                        <ToolCard
                          key={segment.id}
                          segment={segment}
                          selected={state.selectedChatId === segment.id}
                        />
                      );
                    }
                    if (segment.kind === "error") {
                      return (
                        <div className="tool-card" key={segment.id}>
                          <pre>
                            {segment.code}: {segment.message}
                          </pre>
                        </div>
                      );
                    }
                    const isLast =
                      index === stream.segments.length - 1 &&
                      stream.status === "streaming";
                    return (
                      <div
                        id={`chat-${segment.id}`}
                        className="text-segment"
                        data-selected={state.selectedChatId === segment.id}
                        key={segment.id}
                        onClick={() => {
                          agentStore.selectChat(segment.id);
                          agentStore.selectTrace(`tokens-${segment.fromSeq}`);
                        }}
                      >
                        {segment.text}
                        {isLast ? <span className="stream-cursor" /> : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}
      </div>

      <footer className="composer">
        <form className="composer-form" onSubmit={submit}>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the agent to analyze, find, summarize, or load context..."
            aria-label="Message the agent"
          />
          <button
            className="send-button"
            type="submit"
            disabled={!content.trim()}
          >
            Send
          </button>
        </form>
      </footer>
    </section>
  );
}
