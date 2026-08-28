import { Fragment, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, type Event } from "react-big-calendar";
import {
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  parse,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./CalendarPage.css";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, Filter, Plus, RotateCcw } from "lucide-react";

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
import { resolveMediaUrl } from "@/lib/api";
import { useBookings } from "@/lib/hooks/useBookings";
import { useCalendarBlocks, useCreateCalendarBlock } from "@/lib/hooks/useCalendar";
import { useCleaningTasks } from "@/lib/hooks/useCleaning";
import { useMaintenanceRequests } from "@/lib/hooks/useMaintenance";
import { usePayments } from "@/lib/hooks/usePayments";
import { useProperties } from "@/lib/hooks/useProperties";
import type { CalendarBlock, Booking, BookingPayment, CleaningTask, MaintenanceRequest } from "@/types";

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

function getMainPropertyImage(property: { images?: Array<{ image?: string; image_url?: string; is_main?: boolean }> }) {
  const image = property.images?.find((item) => item.is_main) ?? property.images?.[0];
  return resolveMediaUrl(image?.image || image?.image_url);
}

function dateOnlyTime(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function relationId(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value && typeof value === "object" && "id" in value) {
    return Number((value as { id: number | string }).id);
  }
  return 0;
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const [propertyId, setPropertyId] = useState("ALL");
  const [calendarView, setCalendarView] = useState<"calendar" | "planner">("planner");
  const [plannerMonth, setPlannerMonth] = useState(startOfMonth(new Date()));
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
  const [plannerCreatedBlocks, setPlannerCreatedBlocks] = useState<CalendarBlock[]>([]);

  const propertiesQuery = useProperties();
  const plannerDateRange = useMemo(
    () => ({
      date_from: format(startOfMonth(plannerMonth), "yyyy-MM-dd"),
      date_to: format(endOfMonth(plannerMonth), "yyyy-MM-dd"),
      page_size: 500,
    }),
    [plannerMonth],
  );
  const blocksQuery = useCalendarBlocks(propertyId !== "ALL" ? Number(propertyId) : undefined, plannerDateRange);
  const bookingsQuery = useBookings({
    ...(propertyId !== "ALL" ? { property: propertyId } : {}),
    ...plannerDateRange,
  });
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

    const calendarBlocks = [...plannerCreatedBlocks, ...(blocksQuery.data?.results ?? [])].filter(
      (block, index, allBlocks) => allBlocks.findIndex((item) => item.id === block.id) === index,
    );

    for (const block of calendarBlocks) {
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
          title: `Vence ${formatCurrency(p.amount_due)}`,
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
          title: `Dev. fianza · ${b.apartment_title ?? `#${b.apartment}`}`,
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
    plannerCreatedBlocks,
  ]);

  const selectedEventData = selectedEvent?.resource as { type: string; data: Booking & CleaningTask & MaintenanceRequest & CalendarBlock & BookingPayment } | undefined;
  const plannerDays = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(plannerMonth), end: endOfMonth(plannerMonth) }),
    [plannerMonth],
  );
  const plannerProperties = useMemo(() => {
    const all = propertiesQuery.data?.results ?? [];
    return propertyId === "ALL" ? all : all.filter((property) => property.id === Number(propertyId));
  }, [propertiesQuery.data?.results, propertyId]);

  function eventPropertyId(event: Event) {
    const data = event.resource?.data as Partial<Booking & CleaningTask & MaintenanceRequest & CalendarBlock> | undefined;
    return relationId(data?.apartment ?? data?.property);
  }

  function eventsForCell(day: Date, currentPropertyId: number) {
    return events.filter((event) => {
      if (eventPropertyId(event) !== currentPropertyId) {
        return false;
      }

      const dayTime = dateOnlyTime(day);
      const start = event.start instanceof Date ? event.start : new Date(event.start as Date);
      const end = event.end instanceof Date ? event.end : new Date(event.end as Date);
      return dayTime >= dateOnlyTime(start) && dayTime <= dateOnlyTime(end);
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendario"
        subtitle="Reservas, bloqueos, limpiezas, mantenimiento y vencimientos por apartamento."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 size-4" />
            Crear bloqueo
          </Button>
        }
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Filter className="size-4" />
            Filtros
          </div>
          <Select value={propertyId} onValueChange={setPropertyId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Apartamento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los apartamentos</SelectItem>
              {(propertiesQuery.data?.results ?? []).map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>{item.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-3 grid grid-cols-2 rounded-lg border border-border p-1">
            <Button
              type="button"
              size="sm"
              variant={calendarView === "planner" ? "default" : "ghost"}
              onClick={() => setCalendarView("planner")}
            >
              Planner
            </Button>
            <Button
              type="button"
              size="sm"
              variant={calendarView === "calendar" ? "default" : "ghost"}
              onClick={() => setCalendarView("calendar")}
            >
              Mes/semana
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Leyenda operativa</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setActiveFilters(new Set(EVENT_TYPES.map((type) => type.key)))}
            >
              <RotateCcw className="mr-2 size-4" />
              Todo
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map((type) => (
              <button
                key={type.key}
                type="button"
                onClick={() => toggleFilter(type.key)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-opacity ${
                  activeFilters.has(type.key) ? "opacity-100" : "opacity-45"
                }`}
                style={{
                  borderColor: type.color,
                  color: activeFilters.has(type.key) ? "#fff" : type.color,
                  backgroundColor: activeFilters.has(type.key) ? type.color : "transparent",
                }}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {calendarView === "planner" ? (
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold capitalize">{format(plannerMonth, "MMMM yyyy", { locale: es })}</p>
              <p className="text-xs text-muted-foreground">Click en una celda vacía para bloquear fechas; click en una reserva para ver detalle.</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPlannerMonth((current) => addMonths(current, -1))}>
                <ChevronLeft className="mr-1 size-4" />
                Ant.
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setPlannerMonth(startOfMonth(new Date()))}>
                Hoy
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setPlannerMonth((current) => addMonths(current, 1))}>
                Sig.
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          </div>
          <div className="overflow-auto rounded-lg border border-border">
            <div
              className="grid min-w-[900px]"
              style={{ gridTemplateColumns: `130px repeat(${Math.max(plannerProperties.length, 1)}, minmax(220px, 1fr))` }}
            >
              <div className="sticky left-0 top-0 z-20 border-b border-r border-border bg-muted px-3 py-3 text-sm font-medium">
                Fecha
              </div>
              {plannerProperties.map((property) => {
                const image = getMainPropertyImage(property);
                return (
                  <div key={property.id} className="sticky top-0 z-10 flex min-h-16 items-center gap-3 border-b border-r border-border bg-muted px-3 py-2 text-sm font-medium">
                    {image ? (
                      <img
                        src={image}
                        alt={property.title}
                        className="h-11 w-14 shrink-0 rounded-md object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-background text-[10px] text-muted-foreground">
                        Sin foto
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="line-clamp-1">{property.title}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {property.is_published ? "Publicado" : "Borrador"}
                      </span>
                    </div>
                  </div>
                );
              })}
              {plannerDays.map((day) => (
                <Fragment key={format(day, "yyyy-MM-dd")}>
                  <button
                    key={`${format(day, "yyyy-MM-dd")}-date`}
                    type="button"
                    className="sticky left-0 z-10 border-b border-r border-border bg-card px-3 py-2 text-left text-xs hover:bg-muted"
                    onClick={() => {
                      setBlockValues({
                        property: propertyId !== "ALL" ? propertyId : "",
                        reason: "BLOCKED",
                        start_date: format(day, "yyyy-MM-dd"),
                        end_date: format(day, "yyyy-MM-dd"),
                        notes: "",
                      });
                      setOpen(true);
                    }}
                  >
                    <span className="block font-medium">{format(day, "dd MMM", { locale: es })}</span>
                    <span className="text-muted-foreground">{format(day, "EEEE", { locale: es })}</span>
                  </button>
                  {plannerProperties.map((property) => {
                    const cellEvents = eventsForCell(day, property.id);
                    return (
                      <button
                        key={`${format(day, "yyyy-MM-dd")}-${property.id}`}
                        type="button"
                        className="min-h-20 border-b border-r border-border p-2 text-left hover:bg-muted/60"
                        onClick={() => {
                          if (cellEvents[0]) {
                            setSelectedEvent(cellEvents[0]);
                            return;
                          }

                          setBlockValues({
                            property: String(property.id),
                            reason: "BLOCKED",
                            start_date: format(day, "yyyy-MM-dd"),
                            end_date: format(day, "yyyy-MM-dd"),
                            notes: "",
                          });
                          setOpen(true);
                        }}
                      >
                        <div className="space-y-1">
                          {cellEvents.map((event) => {
                            const type = event.resource.type as string;
                            return (
                              <span
                                key={`${event.title}-${event.start}`}
                                className="block truncate rounded-md px-2 py-1 text-xs font-medium text-white"
                                style={{ backgroundColor: colorForType(type) }}
                                title={event.title as string}
                              >
                                {event.title as string}
                              </span>
                            );
                          })}
                        </div>
                      </button>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
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
      )}

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
          <div>
            <Select value={blockValues.property} onValueChange={(value) => setBlockValues((current) => ({ ...current, property: value }))}>
              <SelectTrigger className={!blockValues.property ? "border-[var(--danger-border)]" : undefined}>
                <SelectValue placeholder="Propiedad" />
              </SelectTrigger>
              <SelectContent>
                {(propertiesQuery.data?.results ?? []).map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>{item.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!blockValues.property ? (
              <p className="mt-1 text-xs text-[var(--danger)]">
                Elige a qué apartamento aplica el bloqueo — al abrir desde la columna de fecha no queda ninguno preseleccionado.
              </p>
            ) : null}
          </div>
          <Select value={blockValues.reason} onValueChange={(value) => setBlockValues((current) => ({ ...current, reason: value as CalendarBlock["reason"] }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="BLOCKED">BLOCKED</SelectItem>
              <SelectItem value="OWNER_USE">OWNER_USE</SelectItem>
              <SelectItem value="MAINTENANCE">MAINTENANCE</SelectItem>
              <SelectItem value="CLEANING">CLEANING</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={blockValues.start_date}
            onChange={(event) => setBlockValues((current) => ({
              ...current,
              start_date: event.target.value,
              // Keep the range valid if the user drags start past the current end.
              end_date: current.end_date && current.end_date < event.target.value ? event.target.value : current.end_date,
            }))}
          />
          <Input
            type="date"
            min={blockValues.start_date || undefined}
            value={blockValues.end_date}
            onChange={(event) => setBlockValues((current) => ({ ...current, end_date: event.target.value }))}
          />
          <Input placeholder="Notas" value={blockValues.notes} onChange={(event) => setBlockValues((current) => ({ ...current, notes: event.target.value }))} />
          <div className="flex justify-end">
            <Button
              disabled={
                !blockValues.property ||
                !blockValues.start_date ||
                !blockValues.end_date ||
                blockValues.end_date < blockValues.start_date ||
                createBlock.isPending
              }
              onClick={async () => {
                try {
                  const createdBlock = await createBlock.mutateAsync({
                    property: Number(blockValues.property),
                    reason: blockValues.reason,
                    start_date: blockValues.start_date,
                    end_date: blockValues.end_date,
                    booking: null,
                    notes: blockValues.notes,
                  });
                  setPlannerCreatedBlocks((current) => [createdBlock, ...current.filter((block) => block.id !== createdBlock.id)]);
                  await blocksQuery.refetch();
                  setOpen(false);
                } catch {
                  // useCreateCalendarBlock already surfaces a toast — keep the
                  // modal open so the user can fix whatever field was wrong.
                }
              }}
            >
              {createBlock.isPending ? "Guardando..." : "Guardar bloqueo"}
            </Button>
          </div>
        </div>
      </FormModal>
    </div>
  );
}
