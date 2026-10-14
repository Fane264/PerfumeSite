"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Send, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { PerfumeCard } from "@/components/shop/perfume-card";
import { AITypingIndicator } from "@/components/shop/ai-typing-indicator";
import type { ApiPerfumeListItem } from "@/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function AssistantChat({ available }: { available: boolean }) {
  const t = useTranslations("assistant");
  const STARTERS = [
    t("chips.winter"),
    t("chips.office"),
    t("chips.party"),
    t("chips.similar"),
  ];
  const UNAVAILABLE_MESSAGE = t("unavailable");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [products, setProducts] = useState<ApiPerfumeListItem[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streaming]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    if (!available) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: trimmed },
        { role: "assistant", content: UNAVAILABLE_MESSAGE },
      ]);
      setInput("");
      return;
    }

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed },
      { role: "assistant", content: "" },
    ]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, conversationHistory: history }),
      });

      if (!res.ok || !res.body) {
        throw new Error("request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Read NDJSON events: {type:"text"|"done"|"error", ...}
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let event: {
            type: string;
            value?: string;
            reply?: string;
            products?: ApiPerfumeListItem[];
            error?: string;
          };
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }
          if (event.type === "text" && event.value) {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last && last.role === "assistant") {
                next[next.length - 1] = {
                  ...last,
                  content: last.content + event.value,
                };
              }
              return next;
            });
          } else if (event.type === "done") {
            if (event.reply) {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last && last.role === "assistant") {
                  next[next.length - 1] = { ...last, content: event.reply! };
                }
                return next;
              });
            }
            if (event.products && event.products.length > 0) {
              setProducts(event.products);
            }
          } else if (event.type === "error") {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last && last.role === "assistant") {
                next[next.length - 1] = {
                  ...last,
                  content: event.error ?? t("error"),
                };
              }
              return next;
            });
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === "assistant" && !last.content) {
          next[next.length - 1] = {
            ...last,
            content: t("error"),
          };
        }
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[60%_40%]">
      {/* ---- Chat column ---- */}
      <section className="flex min-h-[60vh] flex-col border border-border bg-surface">
        <header className="flex items-center gap-3 border-b border-border px-6 py-5">
          <span className="flex size-10 items-center justify-center rounded-full bg-gold/10 text-gold">
            <Sparkles className="size-5" />
          </span>
          <div>
            <h2 className="font-serif text-lg font-light text-cream">
              {t("chatHeader")}
            </h2>
            <p className="text-xs text-muted-foreground">
              Powered by Claude · DecantLux
            </p>
          </div>
        </header>

        <div
          ref={threadRef}
          className="flex-1 space-y-5 overflow-y-auto px-6 py-6 scrollbar-luxe"
        >
          {empty ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-gold/10 text-gold">
                <Wand2 className="size-6" />
              </span>
              <p className="max-w-sm text-muted-foreground">
                {t("chatEmpty")}
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <ChatBubble key={index} message={message} />
            ))
          )}
          {streaming &&
            messages[messages.length - 1]?.role === "assistant" &&
            !messages[messages.length - 1]?.content && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tl-sm bg-surface2 px-4 py-3">
                  <AITypingIndicator />
                </div>
              </div>
            )}
        </div>

        {/* Starter chips */}
        {empty && (
          <div className="flex flex-wrap gap-2 px-6 pb-2">
            {STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => send(starter)}
                className="border border-border px-3 py-2 text-left text-xs text-cream/80 transition-colors hover:border-gold/50 hover:text-gold"
              >
                {starter}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-3 border-t border-border p-4"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder={t("inputPlaceholder")}
            className="max-h-32 min-h-[44px] flex-1 resize-none border border-input bg-surface2 px-3.5 py-2.5 text-sm text-cream placeholder:text-muted-foreground focus:border-gold focus:outline-none"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            aria-label={t("send")}
            className="flex size-11 shrink-0 items-center justify-center bg-gold text-background transition-colors hover:bg-gold-light disabled:opacity-50"
          >
            <Send className="size-5" />
          </button>
        </form>
      </section>

      {/* ---- Products column ---- */}
      <aside className="lg:sticky lg:top-28 lg:h-fit">
        <h2 className="mb-6 font-serif text-xl font-light text-cream">
          {t("recommendedTitle")}
        </h2>
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
            <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-surface2 text-gold">
              <Sparkles className="size-5" />
            </span>
            <p className="text-sm text-muted-foreground">
              {t("recommendedEmpty")}
            </p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-2 gap-x-6 gap-y-10"
          >
            <AnimatePresence>
              {products.map((perfume) => (
                <motion.div key={perfume.id} variants={fadeUp} layout>
                  <PerfumeCard perfume={perfume} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </aside>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start gap-3")}>
      {!isUser && (
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-gold/10 text-gold">
          <Sparkles className="size-4" />
        </span>
      )}
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "rounded-2xl rounded-tr-sm bg-gold text-background"
            : "rounded-2xl rounded-tl-sm bg-surface2 text-cream",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
