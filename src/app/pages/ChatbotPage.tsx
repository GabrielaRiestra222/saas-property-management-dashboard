import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { SendHorizontal } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import PageHeader from "@/components/ui/PageHeader";

type Message = {
  id: string;
  role: "user" | "bot";
  content: string;
  createdAt: Date;
};

const BOT_RULES: Array<{ pattern: RegExp; reply: string }> = [
  {
    pattern: /precio|coste|cuánto|tarifa|rate|price/i,
    reply: "Los precios varían según la propiedad y la temporada. Puedes consultar el precio exacto en la ficha de cada propiedad desde el menú Propiedades.",
  },
  {
    pattern: /check.?in|entrada|llegada/i,
    reply: "El check-in es a partir de las 15:00 h. Si necesitas una entrada anticipada, consúltalo con el equipo con al menos 24 h de antelación.",
  },
  {
    pattern: /check.?out|salida/i,
    reply: "El check-out debe realizarse antes de las 11:00 h. El late check-out está sujeto a disponibilidad.",
  },
  {
    pattern: /parking|aparcamiento|coche|garaje/i,
    reply: "Algunas propiedades incluyen parking privado. Puedes ver la información de aparcamiento en los amenities de cada propiedad.",
  },
  {
    pattern: /wifi|internet|contraseña/i,
    reply: "Todas las propiedades incluyen WiFi de alta velocidad. La contraseña se entrega en el check-in.",
  },
  {
    pattern: /limpieza|limpiar|clean/i,
    reply: "El servicio de limpieza se realiza entre estancias. Para limpiezas adicionales, puedes solicitarlo desde el menú Limpieza.",
  },
  {
    pattern: /mascota|perro|gato|animal/i,
    reply: "La política de mascotas varía por propiedad. Consulta las normas de la propiedad específica antes de confirmar la reserva.",
  },
  {
    pattern: /pago|factura|recibo|cobro/i,
    reply: "Puedes gestionar todos los pagos desde el menú Pagos. Para emitir facturas o ver el estado de cobros, dirígete a Contabilidad.",
  },
  {
    pattern: /reserva|booking/i,
    reply: "Para crear una nueva reserva ve a Reservas → Nueva reserva. Desde ahí podrás asignar propiedad, cliente, fechas y condiciones.",
  },
  {
    pattern: /mantenimiento|avería|roto|problema/i,
    reply: "Para reportar una incidencia, ve al menú Mantenimiento y crea una nueva solicitud con la prioridad adecuada.",
  },
  {
    pattern: /hola|buenas|hey|hi|hello/i,
    reply: "¡Hola! Soy el asistente del dashboard. Puedo ayudarte con preguntas sobre reservas, propiedades, precios, check-in/out y más. ¿En qué te puedo ayudar?",
  },
  {
    pattern: /gracias|thanks/i,
    reply: "¡De nada! Si tienes más preguntas, aquí estaré.",
  },
];

function getBotReply(message: string): string {
  for (const rule of BOT_RULES) {
    if (rule.pattern.test(message)) {
      return rule.reply;
    }
  }
  return "No tengo una respuesta específica para eso todavía. Puedes consultar el menú correspondiente en el sidebar o contactar con el equipo de soporte.";
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uuidv4(),
      role: "bot",
      content: "¡Hola! Soy el asistente del dashboard. Puedo ayudarte con preguntas sobre reservas, precios, check-in/out, limpieza y más. ¿En qué te puedo ayudar?",
      createdAt: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || typing) return;

    const userMsg: Message = { id: uuidv4(), role: "user", content: trimmed, createdAt: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    const delay = 1000 + Math.random() * 1000;
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: uuidv4(), role: "bot", content: getBotReply(trimmed), createdAt: new Date() },
      ]);
    }, delay);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asistente IA"
        subtitle="Resuelve dudas sobre la operativa diaria, reservas, propiedades y más."
      />

      <div className="mx-auto flex h-[calc(100vh-220px)] max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <ScrollArea className="min-h-0 flex-1 px-4 py-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-md px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p className="leading-relaxed">{msg.content}</p>
                  <p className={`mt-2 text-[10px] ${msg.role === "user" ? "text-white/70" : "text-muted-foreground"}`}>
                    {format(msg.createdAt, "HH:mm")}
                  </p>
                </div>
              </div>
            ))}

            {typing ? (
              <div className="flex justify-start">
                <div className="rounded-md bg-muted px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
                    <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
                    <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60" />
                  </div>
                </div>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Escribe tu pregunta..."
              disabled={typing}
            />
            <Button size="icon" onClick={sendMessage} disabled={typing || !input.trim()}>
              <SendHorizontal className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
