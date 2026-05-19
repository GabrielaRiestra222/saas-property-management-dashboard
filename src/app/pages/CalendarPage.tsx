import { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, type Event } from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./CalendarPage.css";
import { useNavigate } from "react-router";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import FormModal from "@/components/ui/FormModal";
import PageHeader from "@/components/ui/PageHeader";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useBookings } from "@/lib/hooks/useBookings";
import { useCalendarBlocks, useCreateCalendarBlock } from "@/lib/hooks/useCalendar";
import { useCleaningTasks } from "@/lib/hooks/useCleaning";
import { useMaintenanceRequests } from "@/lib/hooks/useMaintenance";
import { usePayments } from "@/lib/hooks/usePayments";
import { useProperties } from "@/lib/hooks/useProperties";
import type { CalendarBlock, Booking, BookingPayment, CleaningTask, MaintenanceRequest } from "@/types";
import { differenceInCalendarDays, parseISO } from "date-fns";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: es }),
  getDay,
  locales: { es },
});

const EVENT_TYPES = [
  { key: "BOOKING", label: "Reservas", color: "#3b82f6" },
  { key: "CLEANING", label: "Limpieza", color: "#10b981" },
  { key: "MAINTENANCE", label: "Mantenimiento", color: "#f59e0b" },
  { key: "OWNER_USE", label: "Propietario", color: "#8b5cf6" },
  { key: "BLOCKED", label: "Bloqueado", color: "#ef4444" },
  { key: "PAYMENT", label: "Vence pago", color: "#a855f7" },
  { key: "DEPOSIT_RETURN", label: "Dev. fianza", color: "#06b6d4" },
] as const;

type EventType = (typeof EVENT_TYPES)[number]["key"];

function colorForType(type: string): string {
  return EVENT_TYPES.find((t) => t.key === type)?.color ?? "#64748b";
}

function labelForType(type: string): string {
  return EVENT_TYPES.find((t) => t.key === type)?.label ?? type;
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const [propertyId, setPropertyId] = useState("ALL");
  const [open, setOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<EventType>>(new Set(EVENT_TYPES.map((t) => t.key)));
  const [blockValues, setBlockValues] = useState({
    property: "",
    reason: "BLOCKED" as CalendarBlock["reason"],
    start_date: "",
    end_date: "",
    notes: "",
  });

  const propertiesQuery = useProperties();
  const blocksQuery = useCalendarBlocks(propertyId !== "ALL" ? Number(propertyId) : undefined);
  const bookingsQuery = useBookings(propertyId !== "ALL" ? { property: propertyId } : undefined);
  const cleaningQuery = useCleaningTasks(propertyId !== "ALL" ? { property: propertyId } : undefined);
  const maintenanceQuery = useMaintenanceRequests(propertyId !== "ALL" ? { property: propertyId } : undefined);
  const paymentsQuery = usePayments();
  const createBlock = useCreateCalendarBlock();

  function toggleFilter(type: EventType) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  const events = useMemo<Event[]>(() => {
    const all: Event[] = [];

    if (activeFilters.has("BOOKING")) {
      for (const booking of bookingsQuery.data?.results ?? []) {
        all.push({
          title: `${(booking as Booking).client_name ?? "Cliente"} · ${(booking as Booking).apartment_title ?? `Propiedad #${(booking as Booking).apartment}`}`,
          start: new Date((booking as Booking).check_in),
          end: new Date((booking as Booking).check_out),
          resource: { type: "BOOKING", data: booking },
        });
      }
    }

    if (activeFilters.has("CLEANING")) {
      for (const task of cleaningQuery.data?.results ?? []) {
        all.push({
          title: `${(task as CleaningTask).property_title ?? `Propiedad #${(task as CleaningTask).property}`} · limpieza`,
          start: new Date((task as CleaningTask).scheduled_date),
          end: new Date((task as CleaningTask).scheduled_date),
          resource: { type: "CLEANING", data: task },
        });
      }
    }

    if (activeFilters.has("MAINTENANCE")) {
      for (const item of maintenanceQuery.data?.results ?? []) {
        all.push({
          title: (item as MaintenanceRequest).title,
          start: new Date((item as MaintenanceRequest).reported_at),
          end: new Date((item as MaintenanceRequest).reported_at),
          resource: { type: "MAINTENANCE", data: item },
        });
      }
    }

    for (const block of blocksQuery.data?.results ?? []) {
      const type = block.reason as EventType;
      if (!activeFilters.has(type)) continue;
      all.push({
        title: block.reason === "OWNER_USE" ? "Propietario" : block.notes || block.reason,
        start: new Date(block.start_date),
        end: new Date(block.end_date),
        resource: { type: block.reason, data: block },
      });
    }

    // Payment due-date events (PENDING only)
    if (activeFilters.has("PAYMENT")) {
      for (const payment of paymentsQuery.data?.results ?? []) {
        const p = payment as BookingPayment;
        if (p.status !== "PENDING") continue;
        const d = new Date(p.due_date);
        all.push({
          title: `💳 Vence ${formatCurrency(p.amount_due)}`,
          start: d,
          end: d,
          resource: { type: "PAYMENT", data: p },
        });
      }
    }

    // Deposit return reminders: any booking > 30 nights gets one at check-out
    if (activeFilters.has("DEPOSIT_RETURN")) {
      for (const booking of bookingsQuery.data?.results ?? []) {
        const b = booking as Booking;
        const nights = differenceInCalendarDays(parseISO(b.check_out), parseISO(b.check_in));
        if (nights <= 30) continue;
        const monthly = Number(b.total_price) / Math.ceil(nights / 30);
        const d = new Date(b.check_out);
        all.push({
          title: `↩ Dev. fianza · ${b.apartment_title ?? `#${b.apartment}`}`,
          start: d,
          end: d,
          resource: { type: "DEPOSIT_RETURN", data: { ...b, depositAmount: Math.round(monthly * 100) / 100 } },
        });
      }
    }

    return all;
  }, [
    activeFilters,
    blocksQuery.data?.results,
    bookingsQuery.data?.results,
    cleaningQuery.data?.results,
    maintenanceQuery.data?.results,
    paymentsQuery.data?.results,
  ]);

  const selectedEventData = selectedEvent?.resource as { type: string; data: Booking & CleaningTask & MaintenanceRequest & CalendarBlock & BookingPayment } | undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendario"
        subtitle="Vista mensual, semanal y diaria con reservas, limpieza, mantenimiento y bloqueos."
        action={<Button onClick={() => setOpen(true)}>Crear bloqueo</Button>}
      />

      {/* Color legend */}
      <div className="flex flex-wrap gap-2 rounded-3xl border border-border bg-card px-4 py-3 shadow-sm">
        {EVENT_TYPES.map((type) => (
          <button
            key={type.key}
            type="button"
            onClick={() => toggleFilter(type.key)}
            className={`transition-opacity ${activeFilters.has(type.key) ? "opacity-100" : "opacity-40"}`}
          >
            <Badge style={{ backgroundColor: type.color, color: "#fff", borderColor: "transparent" }}>
              {type.label}
            </Badge>
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground self-center">Haz clic para filtrar</span>
      </div>

      <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
        <Select value={propertyId} onValueChange={setPropertyId}>
          <SelectTrigger className="w-full sm:w-[260px]"><SelectValue placeholder="Propiedad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas las propiedades</SelectItem>
            {(propertiesQuery.data?.results ?? []).map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>{item.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
        <div className="h-[760px]">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            views={["month", "week", "day"]}
            selectable
            onSelectSlot={({ start, end }) => {
              setBlockValues({
                property: propertyId !== "ALL" ? propertyId : "",
                reason: "BLOCKED",
                start_date: format(start, "yyyy-MM-dd"),
                end_date: format(end, "yyyy-MM-dd"),
                notes: "",
              });
              setOpen(true);
            }}
            onSelectEvent={(event) => setSelectedEvent(event)}
            eventPropGetter={(event) => {
              const type = event.resource.type as string;
              return {
                style: {
                  backgroundColor: colorForType(type),
                  borderRadius: "8px",
                  border: "none",
                  color: "#fff",
                  padding: "2px 6px",
                },
              };
            }}
          />
        </div>
      </div>

      {/* Event detail dialog */}
      <Dialog open={selectedEvent !== null} onOpenChange={(open) => { if (!open) setSelectedEvent(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title as string}</DialogTitle>
          </DialogHeader>
          {selectedEventData ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge style={{ backgroundColor: colorForType(selectedEventData.type), color: "#fff", borderColor: "transparent" }}>
                  {labelForType(selectedEventData.type)}
                </Badge>
              </div>

              {selectedEventData.type === "BOOKING" && (
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><p className="text-xs text-muted-foreground">Cliente</p><p>{selectedEventData.data.client_name ?? "-"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Propiedad</p><p>{selectedEventData.data.apartment_title ?? `#${selectedEventData.data.apartment}`}</p></div>
                    <div><p className="text-xs text-muted-foreground">Check-in</p><p>{formatDate(selectedEventData.data.check_in)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Check-out</p><p>{formatDate(selectedEventData.data.check_out)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Total</p><p>{formatCurrency(selectedEventData.data.total_price)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Estado</p><p>{selectedEventData.data.status}</p></div>
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => { navigate(`/bookings/${selectedEventData.data.id}`); setSelectedEvent(null); }}>
                      Ver reserva
                    </Button>
                  </div>
                </div>
              )}

              {selectedEventData.type === "CLEANING" && (
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><p className="text-xs text-muted-foreground">Propiedad</p><p>{selectedEventData.data.property_title ?? `#${selectedEventData.data.property}`}</p></div>
                    <div><p className="text-xs text-muted-foreground">Fecha</p><p>{formatDate(selectedEventData.data.scheduled_date)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Estado</p><p>{selectedEventData.data.status}</p></div>
                    <div><p className="text-xs text-muted-foreground">Asignado a</p><p>{selectedEventData.data.assigned_to || "-"}</p></div>
                  </div>
                </div>
              )}

              {selectedEventData.type === "MAINTENANCE" && (
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><p className="text-xs text-muted-foreground">Propiedad</p><p>{selectedEventData.data.property_title ?? `#${selectedEventData.data.property}`}</p></div>
                    <div><p className="text-xs text-muted-foreground">Prioridad</p><p>{selectedEventData.data.priority}</p></div>
                    <div><p className="text-xs text-muted-foreground">Estado</p><p>{selectedEventData.data.status}</p></div>
                    <div><p className="text-xs text-muted-foreground">Coste</p><p>{formatCurrency(selectedEventData.data.cost)}</p></div>
                  </div>
                  {selectedEventData.data.description ? <p className="text-muted-foreground">{selectedEventData.data.description}</p> : null}
                </div>
              )}

              {(selectedEventData.type === "BLOCKED" || selectedEventData.type === "OWNER_USE") && (
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><p className="text-xs text-muted-foreground">Desde</p><p>{formatDate(selectedEventData.data.start_date)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Hasta</p><p>{formatDate(selectedEventData.data.end_date)}</p></div>
                  </div>
                  {selectedEventData.data.notes ? <p className="text-muted-foreground">{selectedEventData.data.notes}</p> : null}
                </div>
              )}

              {selectedEventData.type === "PAYMENT" && (
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><p className="text-xs text-muted-foreground">Importe</p><p className="font-semibold">{formatCurrency(selectedEventData.data.amount_due)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Vencimiento</p><p>{formatDate(selectedEventData.data.due_date)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Método</p><p>{selectedEventData.data.payment_method || "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Estado</p><p>{selectedEventData.data.status}</p></div>
                  </div>
                  {selectedEventData.data.notes ? <p className="text-muted-foreground">{selectedEventData.data.notes}</p> : null}
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => { navigate(`/bookings/${selectedEventData.data.booking}`); setSelectedEvent(null); }}>
                      Ver reserva
                    </Button>
                  </div>
                </div>
              )}

              {selectedEventData.type === "DEPOSIT_RETURN" && (
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><p className="text-xs text-muted-foreground">Propiedad</p><p>{selectedEventData.data.apartment_title ?? `#${selectedEventData.data.apartment}`}</p></div>
                    <div><p className="text-xs text-muted-foreground">Cliente</p><p>{selectedEventData.data.client_name ?? `#${selectedEventData.data.client}`}</p></div>
                    <div><p className="text-xs text-muted-foreground">Importe fianza</p><p className="font-semibold text-cyan-700">{formatCurrency((selectedEventData.data as unknown as { depositAmount: number }).depositAmount)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Fecha check-out</p><p>{formatDate(selectedEventData.data.check_out)}</p></div>
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => { navigate(`/bookings/${selectedEventData.data.id}`); setSelectedEvent(null); }}>
                      Ver reserva
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <FormModal title="Crear bloqueo" isOpen={open} onClose={() => setOpen(false)}>
        <div className="grid gap-4">
          <Select value={blockValues.property} onValueChange={(value) => setBlockValues((current) => ({ ...current, property: value }))}>
            <SelectTrigger><SelectValue placeholder="Propiedad" /></SelectTrigger>
            <SelectContent>
              {(propertiesQuery.data?.results ?? []).map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>{item.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={blockValues.reason} onValueChange={(value) => setBlockValues((current) => ({ ...current, reason: value as CalendarBlock["reason"] }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="BLOCKED">BLOCKED</SelectItem>
              <SelectItem value="OWNER_USE">OWNER_USE</SelectItem>
              <SelectItem value="MAINTENANCE">MAINTENANCE</SelectItem>
              <SelectItem value="CLEANING">CLEANING</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={blockValues.start_date} onChange={(event) => setBlockValues((current) => ({ ...current, start_date: event.target.value }))} />
          <Input type="date" value={blockValues.end_date} onChange={(event) => setBlockValues((current) => ({ ...current, end_date: event.target.value }))} />
          <Input placeholder="Notas" value={blockValues.notes} onChange={(event) => setBlockValues((current) => ({ ...current, notes: event.target.value }))} />
          <div className="flex justify-end">
            <Button
              onClick={async () => {
                await createBlock.mutateAsync({
                  property: Number(blockValues.property),
                  reason: blockValues.reason,
                  start_date: blockValues.start_date,
                  end_date: blockValues.end_date,
                  booking: null,
                  notes: blockValues.notes,
                });
                setOpen(false);
              }}
            >
              Guardar bloqueo
            </Button>
          </div>
        </div>
      </FormModal>
    </div>
  );
}
