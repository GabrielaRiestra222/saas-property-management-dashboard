import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { MessageCircle, Minus, SendHorizontal } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import api from "@/lib/api";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const trimmed = input.trim();

    if (!trimmed || loading) {
      return;
    }

    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: trimmed,
      createdAt: new Date(),
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const { data } = await api.post<{ reply?: string; message?: string }>("/chatbot/admin-message/", {
        message: trimmed,
        history,
      });

      setMessages((current) => [
        ...current,
        {
          id: uuidv4(),
          role: "assistant",
          content: data.reply ?? data.message ?? "No hubo respuesta del asistente.",
          createdAt: new Date(),
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: uuidv4(),
          role: "assistant",
          content: "No pude conectar con el asistente en este momento.",
          createdAt: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open ? (
        <div className="flex h-[500px] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border bg-[color:color-mix(in_srgb,var(--primary)_12%,white)] px-4 py-3">
            <div>
              <p className="font-semibold text-foreground">Asistente IA</p>
              <p className="text-xs text-muted-foreground">Ayuda rápida para la operativa diaria</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <Minus className="size-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 px-4 py-3">
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
                  Pregunta por reservas, pagos, tareas o próximas acciones.
                </div>
              ) : null}

              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p>{message.content}</p>
                    <p className={`mt-2 text-[10px] ${message.role === "user" ? "text-white/80" : "text-muted-foreground"}`}>
                      {format(message.createdAt, "HH:mm")}
                    </p>
                  </div>
                </div>
              ))}

              {loading ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-muted px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="size-2 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.3s]" />
                      <span className="size-2 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.15s]" />
                      <span className="size-2 animate-bounce rounded-full bg-muted-foreground/70" />
                    </div>
                  </div>
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Escribe tu pregunta..."
              />
              <Button size="icon" onClick={() => void sendMessage()} disabled={loading || !input.trim()}>
                <SendHorizontal className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {!open ? (
        <Button
          size="lg"
          className="h-14 translate-x-[-5.5rem] rounded-full bg-[color:#7d2838] px-5 shadow-xl hover:bg-[color:#69222f]"
          onClick={() => setOpen(true)}
        >
          <MessageCircle className="mr-2 size-5" />
          Asistente IA
        </Button>
      ) : null}
    </div>
  );
}
