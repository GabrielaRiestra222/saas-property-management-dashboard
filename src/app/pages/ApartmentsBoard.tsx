import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { BedDouble, Building2, ImageIcon, MapPin, Users } from "lucide-react";

import { resolveMediaUrl } from "@/lib/api";
import { cn } from "@/app/components/ui/utils";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useBookings } from "@/lib/hooks/useBookings";
import { useCleaningTasks } from "@/lib/hooks/useCleaning";
import { useMaintenanceRequests } from "@/lib/hooks/useMaintenance";
import { usePayments } from "@/lib/hooks/usePayments";
import { useProperties } from "@/lib/hooks/useProperties";
import type { Property } from "@/types";

function propertyImage(property?: Property) {
  if (!property) return "";
  const image = property.images.find((item) => item.is_main) ?? property.images[0];
  return resolveMediaUrl(image?.image || image?.image_url);
}

type Tab = "bookings" | "cleaning" | "maintenance" | "payments";

const TABS: { key: Tab; label: string }[] = [
  { key: "bookings", label: "Reservas" },
  { key: "cleaning", label: "Limpieza" },
  { key: "maintenance", label: "Mantenimiento" },
  { key: "payments", label: "Pagos" },
];

export default function ApartmentsBoardPage() {
  const propertiesQuery = useProperties();
  const bookingsQuery = useBookings();
  const cleaningQuery = useCleaningTasks();
  const maintenanceQuery = useMaintenanceRequests();
  const paymentsQuery = usePayments();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("bookings");

  const properties = propertiesQuery.data?.results ?? [];
  const allBookings = bookingsQuery.data?.results ?? [];
  const allCleaning = cleaningQuery.data?.results ?? [];
  const allMaintenance = maintenanceQuery.data?.results ?? [];
  const allPayments = paymentsQuery.data?.results ?? [];

  useEffect(() => {
    if (selectedId === null && properties.length > 0) {
      setSelectedId(properties[0].id);
    }
  }, [properties, selectedId]);

  const selected = properties.find((property) => property.id === selectedId);

  const propertyBookings = useMemo(
    () => allBookings.filter((booking) => booking.apartment === selectedId).sort((a, b) => b.check_in.localeCompare(a.check_in)),
    [allBookings, selectedId],
  );
  const propertyBookingIds = useMemo(() => new Set(propertyBookings.map((booking) => booking.id)), [propertyBookings]);
  const propertyCleaning = useMemo(
    () => allCleaning.filter((task) => task.property === selectedId).sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date)),
    [allCleaning, selectedId],
  );
  const propertyMaintenance = useMemo(
    () => allMaintenance.filter((item) => item.property === selectedId).sort((a, b) => b.reported_at.localeCompare(a.reported_at)),
    [allMaintenance, selectedId],
  );
  const propertyPayments = useMemo(
    () => allPayments.filter((payment) => propertyBookingIds.has(payment.booking)).sort((a, b) => b.due_date.localeCompare(a.due_date)),
    [allPayments, propertyBookingIds],
  );

  const today = format(new Date(), "yyyy-MM-dd");
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const daysInMonth = differenceInCalendarDays(monthEnd, monthStart) + 1;
  const monthKey = format(new Date(), "yyyy-MM");

  const stats = useMemo(() => {
    const active = propertyBookings.filter((booking) => booking.status !== "CANCELLED");

    const occupiedNights = active.reduce((sum, booking) => {
      const start = parseISO(booking.check_in) < monthStart ? monthStart : parseISO(booking.check_in);
      const end = parseISO(booking.check_out) > monthEnd ? monthEnd : parseISO(booking.check_out);
      return sum + Math.max(0, differenceInCalendarDays(end, start));
    }, 0);

    const revenueMonth = active
      .filter((booking) => booking.check_in.startsWith(monthKey))
      .reduce((sum, booking) => sum + Number(booking.total_price), 0);

    const pendingAmount = propertyPayments
      .filter((payment) => payment.status === "PENDING")
      .reduce((sum, payment) => sum + Number(payment.amount_due), 0);

    const upcoming = active
      .filter((booking) => booking.check_in >= today)
      .sort((a, b) => a.check_in.localeCompare(b.check_in))[0];

    return {
      occupancyPct: Math.min(100, Math.round((occupiedNights / daysInMonth) * 100)),
      revenueMonth,
      pendingAmount,
      upcoming,
    };
  }, [propertyBookings, propertyPayments, today, monthKey, daysInMonth, monthStart, monthEnd]);

  const loading = propertiesQuery.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vista apartamentos"
        subtitle="Elige un apartamento y consulta reservas, limpieza, mantenimiento y pagos en un mismo sitio."
      />

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 w-44 shrink-0 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {properties.map((property) => {
            const src = propertyImage(property);
            const active = property.id === selectedId;

            return (
              <button
                key={property.id}
                type="button"
                onClick={() => setSelectedId(property.id)}
                className={cn(
                  "group relative h-28 w-44 shrink-0 overflow-hidden rounded-md border text-left transition-all",
                  active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-accent",
                )}
              >
                {src ? (
                  <img src={src} alt={property.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                    <ImageIcon className="size-6" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent" />
                <p className="absolute bottom-2 left-2 right-2 truncate text-sm font-medium text-white">{property.title}</p>
              </button>
            );
          })}
        </div>
      )}

      {selected ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="grid md:grid-cols-[1.1fr_1fr]">
            <div className="relative h-64 md:h-full">
              {propertyImage(selected) ? (
                <img src={propertyImage(selected)} alt={selected.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                  <ImageIcon className="size-10" />
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between gap-6 p-6">
              <div>
                <h3 className="font-display text-3xl font-medium tracking-tight text-foreground">{selected.title}</h3>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" />
                  {selected.location}
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-4" /> {selected.max_guests} huéspedes
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BedDouble className="size-4" /> {selected.rooms} habitaciones
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Building2 className="size-4" /> {formatCurrency(selected.price_per_night)}/noche
                  </span>
                </div>
                <Link to={`/cms/properties/${selected.id}/edit`} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
                  Editar ficha completa →
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Ocupación mes</p>
                  <p className="mt-1 font-display text-2xl font-medium text-foreground">{stats.occupancyPct}%</p>
                </div>
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Ingresos mes</p>
                  <p className="mt-1 font-display text-2xl font-medium text-[var(--success)]">{formatCurrency(stats.revenueMonth)}</p>
                </div>
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Pendiente cobro</p>
                  <p className={cn("mt-1 font-display text-2xl font-medium", stats.pendingAmount > 0 ? "text-[var(--warning)]" : "text-foreground")}>
                    {formatCurrency(stats.pendingAmount)}
                  </p>
                </div>
              </div>

              {stats.upcoming ? (
                <p className="text-sm text-muted-foreground">
                  Próxima reserva:{" "}
                  <Link to={`/bookings/${stats.upcoming.id}`} className="font-medium text-primary hover:underline">
                    {stats.upcoming.client_name || "Cliente"} · {formatDate(stats.upcoming.check_in)}
                  </Link>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Sin próximas reservas.</p>
              )}
            </div>
          </div>

          <div className="border-t border-border">
            <div className="flex gap-1 overflow-x-auto px-4 pt-3">
              {TABS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={cn(
                    "shrink-0 rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                    tab === item.key
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="p-4">
              {tab === "bookings" ? (
                <SimpleList
                  rows={propertyBookings}
                  emptyMessage="Sin reservas para este apartamento."
                  renderRow={(booking) => (
                    <Link to={`/bookings/${booking.id}`} key={booking.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:border-accent">
                      <div>
                        <p className="font-medium">{booking.client_name || "Cliente"}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(booking.check_in)} → {formatDate(booking.check_out)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{formatCurrency(booking.total_price)}</span>
                        <StatusBadge status={booking.status} type="booking" />
                      </div>
                    </Link>
                  )}
                />
              ) : null}

              {tab === "cleaning" ? (
                <SimpleList
                  rows={propertyCleaning}
                  emptyMessage="Sin tareas de limpieza para este apartamento."
                  renderRow={(task) => (
                    <div key={task.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{formatDate(task.scheduled_date)}</p>
                        <p className="text-xs text-muted-foreground">{task.assigned_to || "Sin asignar"}</p>
                      </div>
                      <StatusBadge status={task.status} type="cleaning" />
                    </div>
                  )}
                />
              ) : null}

              {tab === "maintenance" ? (
                <SimpleList
                  rows={propertyMaintenance}
                  emptyMessage="Sin partes de mantenimiento para este apartamento."
                  renderRow={(item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(item.reported_at)}</p>
                      </div>
                      <StatusBadge status={item.status} type="maintenance" />
                    </div>
                  )}
                />
              ) : null}

              {tab === "payments" ? (
                <SimpleList
                  rows={propertyPayments}
                  emptyMessage="Sin pagos asociados a este apartamento."
                  renderRow={(payment) => (
                    <div key={payment.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{formatCurrency(payment.amount_due)}</p>
                        <p className="text-xs text-muted-foreground">Vence {formatDate(payment.due_date)}</p>
                      </div>
                      <StatusBadge status={payment.status} type="payment" />
                    </div>
                  )}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : !loading ? (
        <p className="text-muted-foreground">No hay apartamentos dados de alta todavía.</p>
      ) : null}
    </div>
  );
}

function SimpleList<T extends { id: number }>({
  rows,
  emptyMessage,
  renderRow,
}: {
  rows: T[];
  emptyMessage: string;
  renderRow: (row: T) => ReactNode;
}) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return <div className="space-y-2">{rows.map(renderRow)}</div>;
}
