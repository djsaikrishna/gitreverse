"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navbar } from "@/components/navbar";
import { PromptMarkdown } from "@/components/prompt-markdown";

type ProfileChatPageProps = {
  login: string;
  displayName: string;
  avatarUrl: string;
};

function messageText(parts: { type: string; text?: string }[]): string {
  return parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("");
}

export function ProfileChatPage({
  login,
  displayName,
  avatarUrl,
}: ProfileChatPageProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/profile-chat",
        body: { login },
      }),
    [login]
  );

  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    transport,
  });

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    void sendMessage({ text });
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFDF8] text-zinc-900">
      <Navbar />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
        <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col">
          <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-xl bg-zinc-900" />
          <section className="relative z-10 flex min-h-[min(80vh,40rem)] flex-col rounded-xl border-[3px] border-zinc-900 bg-[#fff4da]">
            <header className="border-b-[3px] border-zinc-900 px-5 py-4">
              <div className="flex items-start gap-3">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    width={44}
                    height={44}
                    className="h-11 w-11 shrink-0 rounded border-2 border-zinc-900 bg-white object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded border-2 border-zinc-900 bg-white text-sm font-bold">
                    @
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-zinc-900">
                    {displayName}
                  </p>
                  <p className="text-sm text-zinc-600">@{login}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Chat as this voice
                  </p>
                </div>
                <Link
                  href={`/${encodeURIComponent(login)}`}
                  className="shrink-0 text-xs font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
                >
                  View prompt
                </Link>
              </div>
            </header>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-5 py-4"
              aria-live="polite"
            >
              {messages.length === 0 ? (
                <p className="text-sm text-zinc-600">
                  Ask anything in their voice…
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {messages.map((message) => {
                    const text = messageText(message.parts);
                    if (!text) return null;
                    const isUser = message.role === "user";

                    return (
                      <li
                        key={message.id}
                        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[min(100%,28rem)] rounded border-[2.5px] border-zinc-900 px-3 py-2 text-sm leading-relaxed ${
                            isUser
                              ? "bg-white text-zinc-900"
                              : "bg-[#fafafa] text-zinc-800"
                          }`}
                        >
                          {isUser ? (
                            <p className="whitespace-pre-wrap">{text}</p>
                          ) : (
                            <PromptMarkdown>{text}</PromptMarkdown>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div ref={bottomRef} />
            </div>

            {error ? (
              <div className="border-t border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">
                Something went wrong.
                <button
                  type="button"
                  onClick={() => void regenerate()}
                  className="ml-2 font-medium underline"
                >
                  Retry
                </button>
              </div>
            ) : null}

            <form
              onSubmit={handleSubmit}
              className="border-t-[3px] border-zinc-900 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="relative min-w-0 flex-1">
                  <div className="absolute inset-0 translate-x-1 translate-y-1 rounded bg-zinc-900" />
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isBusy}
                    rows={2}
                    placeholder="Say something…"
                    className="relative z-10 w-full resize-none rounded border-[3px] border-zinc-900 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-500 shadow-none focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-60"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isBusy ? (
                    <button
                      type="button"
                      onClick={() => void stop()}
                      className="rounded border-[3px] border-zinc-900 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
                    >
                      Stop
                    </button>
                  ) : null}
                  <div className="group relative">
                    <div className="absolute inset-0 translate-x-1 translate-y-1 rounded bg-zinc-800" />
                    <button
                      type="submit"
                      disabled={isBusy || !input.trim()}
                      className="relative z-10 rounded border-[3px] border-zinc-900 bg-[#d31611] px-5 py-2.5 text-sm font-medium text-white transition-transform group-hover:-translate-x-px group-hover:-translate-y-px disabled:pointer-events-none disabled:opacity-60"
                    >
                      {isBusy ? "Sending…" : "Send"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
