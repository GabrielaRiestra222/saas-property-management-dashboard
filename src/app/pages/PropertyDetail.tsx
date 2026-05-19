import { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, type Event } from "react-big-calendar";
import { format, getDay, parse, startOfWeek, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./CalendarPage.css";
import { Link, useParams } from "react-router";
import {
  Bath,
  BedDouble,
  CalendarDays,
  ChevronLeft,
  Edit,
  MapPin,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";

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
import { Skeleton } from "@/app/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import PageHeader from "@/components/ui/PageHeader";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useBookings } from "@/lib/hooks/useBookings";
import { useCalendarBlocks, useCreateCalendarBlock } from "@/lib/hooks/useCalendar";
import { useProperty } from "@/lib/hooks/useProperties";
import type { CalendarBlock } from "@/types";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: es }),
  getDay,
  locales: { es },
});

const BLOCK_COLORS: Record<CalendarBlock["reason"], string> = {
  BOOKING: "#3b82f6",
  CLEANING: "#10b981",
  MAINTENANCE: "#f59e0b",
  OWNER_USE: "#8b5cf6",
  BLOCKED: "#ef4444",
};

const BLOCK_LABELS: Record<CalendarBlock["reason"], string> = {
  BOOKING: "Reserva",
  CLEANING: "Limpieza",
  MAINTENANCE: "Mantenimiento",
  OWNER_USE: "Uso propio",
  BLOCKED: "Bloqueado",
};

type CalEvent = Event & {
  meta: { type: CalendarBlock["reason"]; color: string; bookingId?: number; notes?: string };
};

export default function PropertyDetailPage() {
  const { id } = useParams();
  const propertyId = Number(id);

  const propertyQuery = useProperty(propertyId);
  const bookingsQuery = useBookings({ property: propertyId });
  const blocksQuery = useCalendarBlocks(propertyId);
  const createBlock = useCreateCalendarBlock();

  const property = propertyQuery.data;
  const bookings = bookingsQuery.data?.results ?? [];
  const blocks = blocksQuery.data?.results ?? [];

  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [blockValues, setBlockValues] = useState({
    reason: "BLOCKED" as CalendarBlock["reason"],
    start_date: "",
    end_date: "",
    notes: "",
  });

  // Build calendar events from bookings + blocks
  const events = useMemo<CalEvent[]>(() => {
    const bookingEvents: CalEvent[] = bookings.map((b) => ({
      title: b.client_name ? `${b.client_name}` : `Reserva #${b.id}`,
      start: parseISO(b.check_in),
      end: parseISO(b.check_out),
      meta: { type: "BOOKING", color: BLOCK_COLORS.BOOKING, bookingId: b.id, notes: b.notes },
    }));

    const blockEvents: CalEvent[] = blocks
      .filter((bl) => bl.reason !== "BOOKING")
      .map((bl) => ({
        title: BLOCK_LABELS[bl.reason],
        start: parseISO(bl.start_date),
        end: parseISO(bl.end_date),
        meta: { type: bl.reason, color: BLOCK_COLORS[bl.reason], notes: bl.notes },
      }));

    return [...bookingEvents, ...blockEvents];
  }, [bookings, blocks]);

  const mainImage = property?.images.find((i) => i.is_main) ?? property?.images[0];

  if (propertyQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        No se encontró la propiedad.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={property.title}
        subtitle={property.location}
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/cms/properties">
                <ChevronLeft className="mr-1 size-4" />
                Propiedades
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/cms/properties/${property.id}/edit`}>
                <Edit className="mr-1 size-4" />
                Editar
              </Link>
            </Button>
            <Button asChild>
              <Link to={`/bookings/new?apartment=${property.id}`}>
                <Plus className="mr-1 size-4" />
                Nueva reserva
              </Link>
            </Button>
          </div>
        }
      />

      {/* Hero */}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* Main image */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          {mainImage ? (
            <img
              src={mainImage.image_url}
              alt={property.title}
              className="h-72 w-full object-cover lg:h-80"
            />
          ) : (
            <div className="flex h-72 items-center justify-center bg-muted text-muted-foreground lg:h-80">
              Sin imagen
            </div>
          )}
        </div>

        {/* Key info */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4 shrink-0" />
                <span>{property.address || property.location}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <BedDouble className="size-4 text-muted-foreground" />
                  {property.rooms} hab.
                </span>
                <span className="flex items-center gap-1.5">
                  <Bath className="size-4 text-muted-foreground" />
                  {property.bathrooms} baño{property.bathrooms !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="size-4 text-muted-foreground" />
                  Máx. {property.max_guests}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{formatCurrency(property.price_per_night)}</span>
                <span className="text-muted-foreground">/ noche</span>
              </div>
              <p className="text-muted-foreground">
                Limpieza: {formatCurrency(property.cleaning_fee)} · Mín. {property.min_nights} noche{property.min_nights !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <Badge variant={property.is_active ? "default" : "secondary"}>
                {property.is_active ? "Activa" : "Inactiva"}
              </Badge>
              <Badge variant={property.is_published ? "default" : "outline"}>
                {property.is_published ? "Publicada" : "Borrador"}
              </Badge>
            </div>
          </div>

          {/* Amenities preview */}
          {property.amenities.length > 0 && (
            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <p className="text-sm font-medium">Servicios</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {property.amenities.slice(0, 8).map((a) => (
                  <Badge key={a.id} variant="secondary" className="text-xs">
                    {a.name}
                  </Badge>
                ))}
                {property.amenities.length > 8 && (
                  <Badge variant="outline" className="text-xs">
                    +{property.amenities.length - 8}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs: calendar + bookings + info */}
      <Tabs defaultValue="calendar">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar">
            <CalendarDays className="mr-1.5 size-4" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="bookings">Reservas</TabsTrigger>
          <TabsTrigger value="info">Descripción</TabsTrigger>
        </TabsList>

        {/* Calendar tab */}
        <TabsContent value="calendar" className="space-y-4">
          {/* Legend + add block */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {Object.entries(BLOCK_LABELS).map(([key, label]) => (
                <span key={key} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="inline-block size-2.5 rounded-full"
                    style={{ background: BLOCK_COLORS[key as CalendarBlock["reason"]] }}
                  />
                  {label}
                </span>
              ))}
            </div>
            <Button size="sm" onClick={() => setAddBlockOpen(true)}>
              <Plus className="mr-1 size-3.5" />
              Bloquear fechas
            </Button>
          </div>

          <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
            <Calendar
              localizer={localizer}
              events={events}
              culture="es"
              defaultView="month"
              views={["month", "week", "agenda"]}
              style={{ height: 560 }}
              eventPropGetter={(event) => ({
                style: {
                  background: (event as CalEvent).meta.color,
                  borderRadius: "8px",
                  border: "none",
                  color: "#fff",
                  fontSize: "0.8rem",
                },
              })}
              onSelectEvent={(event) => setSelectedEvent(event as CalEvent)}
              messages={{
                today: "Hoy",
                previous: "Anterior",
                next: "Siguiente",
                month: "Mes",
                week: "Semana",
                agenda: "Agenda",
                date: "Fecha",
                time: "Hora",
                event: "Evento",
                noEventsInRange: "Sin eventos",
              }}
            />
          </div>
        </TabsContent>

        {/* Bookings tab */}
        <TabsContent value="bookings">
          <div className="rounded-3xl border border-border bg-card shadow-sm">
            {bookings.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No hay reservas para esta propiedad.</p>
            ) : (
              <div className="divide-y divide-border">
                {bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{b.client_name ?? `Cliente #${b.client}`}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(b.check_in)} → {formatDate(b.check_out)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{formatCurrency(b.total_price)}</span>
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/bookings/${b.id}`}>Ver</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Info tab */}
        <TabsContent value="info">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-4">
            {property.description && (
              <div>
                <p className="mb-1 text-sm font-medium text-muted-foreground">Descripción</p>
                <p className="whitespace-pre-wrap text-sm">{property.description}</p>
              </div>
            )}
            {property.rules && (
              <div>
                <p className="mb-1 text-sm font-medium text-muted-foreground">Normas</p>
                <p className="whitespace-pre-wrap text-sm">{property.rules}</p>
              </div>
            )}
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p><span className="text-muted-foreground">Check-in: </span>{property.check_in_time}</p>
              <p><span className="text-muted-foreground">Check-out: </span>{property.check_out_time}</p>
              {property.size_m2 && <p><span className="text-muted-foreground">Superficie: </span>{property.size_m2} m²</p>}
              {property.floor && <p><span className="text-muted-foreground">Planta: </span>{property.floor}</p>}
              {property.tourist_registration_number && (
                <p><span className="text-muted-foreground">Registro turístico: </span>{property.tourist_registration_number}</p>
              )}
            </div>
            {/* All images */}
            {property.images.length > 1 && (
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Galería</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {property.images.map((img) => (
                    <img
                      key={img.id}
                      src={img.image_url}
                      alt={img.caption || property.title}
                      className="aspect-square rounded-xl object-cover"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Event detail dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span
                className="inline-block size-3 rounded-full"
                style={{ background: selectedEvent?.meta.color }}
              />
              {selectedEvent?.title as string}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Tipo: </span>
              {selectedEvent ? BLOCK_LABELS[selectedEvent.meta.type] : ""}
            </p>
            <p>
              <span className="text-muted-foreground">Desde: </span>
              {selectedEvent?.start ? formatDate(format(selectedEvent.start as Date, "yyyy-MM-dd")) : ""}
            </p>
            <p>
              <span className="text-muted-foreground">Hasta: </span>
              {selectedEvent?.end ? formatDate(format(selectedEvent.end as Date, "yyyy-MM-dd")) : ""}
            </p>
            {selectedEvent?.meta.notes && (
              <p><span className="text-muted-foreground">Notas: </span>{selectedEvent.meta.notes}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            {selectedEvent?.meta.bookingId && (
              <Button asChild>
                <Link to={`/bookings/${selectedEvent.meta.bookingId}`} onClick={() => setSelectedEvent(null)}>
                  Ver reserva
                </Link>
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add block dialog */}
      <Dialog open={addBlockOpen} onOpenChange={setAddBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear fechas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-sm font-medium">Motivo</p>
              <Select
                value={blockValues.reason}
                onValueChange={(v) => setBlockValues((prev) => ({ ...prev, reason: v as CalendarBlock["reason"] }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(BLOCK_LABELS).filter(([k]) => k !== "BOOKING").map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-sm font-medium">Desde</p>
                <Input
                  type="date"
                  value={blockValues.start_date}
                  onChange={(e) => setBlockValues((prev) => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Hasta</p>
                <Input
                  type="date"
                  value={blockValues.end_date}
                  onChange={(e) => setBlockValues((prev) => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">Notas (opcional)</p>
              <Input
                value={blockValues.notes}
                onChange={(e) => setBlockValues((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddBlockOpen(false)}>Cancelar</Button>
            <Button
              disabled={!blockValues.start_date || !blockValues.end_date || createBlock.isPending}
              onClick={async () => {
                await createBlock.mutateAsync({
                  property: propertyId,
                  reason: blockValues.reason,
                  start_date: blockValues.start_date,
                  end_date: blockValues.end_date,
                  booking: null,
                  notes: blockValues.notes,
                });
                setBlockValues({ reason: "BLOCKED", start_date: "", end_date: "", notes: "" });
                setAddBlockOpen(false);
              }}
            >
              {createBlock.isPending ? "Guardando..." : "Guardar bloqueo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
