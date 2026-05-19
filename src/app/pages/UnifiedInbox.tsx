import { Mail, MessageSquare, Send } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import PageHeader from "@/components/ui/PageHeader";
import { formatDate } from "@/lib/formatters";
import { useBookings } from "@/lib/hooks/useBookings";

const templates = [
  "Confirmación de reserva y próximos pasos",
  "Recordatorio de check-in online",
  "Solicitud de pago pendiente",
  "Instrucciones de llegada",
];

export default function UnifiedInboxPage() {
  const bookingsQuery = useBookings();
  const bookings = bookingsQuery.data?.results ?? [];
  const threads = bookings.slice(0, 12).map((booking, index) => ({
    id: booking.id,
    guest: booking.client_name ?? `Cliente #${booking.client}`,
    property: booking.apartment_title ?? `Propiedad #${booking.apartment}`,
    date: booking.check_in,
    channel: ["Web", "Airbnb", "Booking.com", "WhatsApp"][index % 4],
    unread: index % 3 === 0,
  }));
  const selected = threads[0];

  return (
    <div className="space-y-6">
      <PageHeader title="Inbox unificado" subtitle="Vista central para conversaciones de huéspedes, reservas y acciones rápidas." />

      <div className="grid min-h-[620px] gap-4 lg:grid-cols-[360px_1fr]">
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-4">
            <h3 className="font-semibold">Conversaciones</h3>
            <p className="text-sm text-muted-foreground">{threads.length} hilos vinculados a reservas</p>
          </div>
          <div className="divide-y divide-border">
            {threads.map((thread) => (
              <button key={thread.id} className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-secondary">
                <div className="mt-1 rounded-lg bg-secondary p-2 text-primary">
                  <MessageSquare className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{thread.guest}</p>
                    {thread.unread ? <span className="size-2 rounded-full bg-primary" /> : null}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{thread.property}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{thread.channel} · {formatDate(thread.date)}</p>
                </div>
              </button>
            ))}
            {!threads.length ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No hay conversaciones porque aún no hay reservas cargadas.</div>
            ) : null}
          </div>
        </div>

        <div className="flex rounded-xl border border-border bg-card shadow-sm">
          {selected ? (
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="border-b border-border p-5">
                <p className="text-sm text-muted-foreground">{selected.channel}</p>
                <h3 className="text-lg font-semibold">{selected.guest}</h3>
                <p className="text-sm text-muted-foreground">{selected.property}</p>
              </div>
              <div className="flex-1 space-y-3 p-5">
                <div className="max-w-xl rounded-xl bg-muted p-4 text-sm">
                  Hola, quiero confirmar los detalles de llegada y si hay algún pago pendiente antes del check-in.
                </div>
                <div className="ml-auto max-w-xl rounded-xl bg-primary p-4 text-sm text-primary-foreground">
                  Gracias. Te enviamos las instrucciones de llegada y el enlace de check-in online.
                </div>
              </div>
              <div className="border-t border-border p-5">
                <div className="mb-3 flex flex-wrap gap-2">
                  {templates.map((template) => (
                    <Button key={template} variant="outline" size="sm">{template}</Button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Textarea className="min-h-20" placeholder="Escribe una respuesta..." />
                  <Button className="self-end">
                    <Send className="mr-2 size-4" />
                    Enviar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-10 text-center text-muted-foreground">
              <Mail className="mb-3 size-10" />
              Selecciona una conversación
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
