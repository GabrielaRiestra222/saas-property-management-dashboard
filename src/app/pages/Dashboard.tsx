import { useMemo } from "react";
import { Link } from "react-router";
import {
  differenceInCalendarDays,
  eachMonthOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  Euro,
  LoaderCircle,
  Sparkles,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import PageHeader from "@/components/ui/PageHeader";
import { useBookings } from "@/lib/hooks/useBookings";
import { useCleaningTasks } from "@/lib/hooks/useCleaning";
import { useDashboardStats } from "@/lib/hooks/useDashboard";
import { useMaintenanceRequests } from "@/lib/hooks/useMaintenance";
import { usePayments } from "@/lib/hooks/usePayments";
import { useProperties } from "@/lib/hooks/useProperties";
import { useTransactions } from "@/lib/hooks/useAccounting";
import { formatCurrency, formatDate } from "@/lib/formatters";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-5 shadow-sm transition-colors hover:border-accent">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-3 font-display text-4xl font-medium tracking-tight text-foreground">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const statsQuery = useDashboardStats();
  const bookingsQuery = useBookings();
  const cleaningQuery = useCleaningTasks();
  const maintenanceQuery = useMaintenanceRequests();
  const transactionsQuery = useTransactions();
  const propertiesQuery = useProperties();
  const paymentsQuery = usePayments();

  const loading = statsQuery.isLoading || bookingsQuery.isLoading || cleaningQuery.isLoading || maintenanceQuery.isLoading;
  const hasError = statsQuery.isError || bookingsQuery.isError || cleaningQuery.isError || maintenanceQuery.isError;

  const bookings = bookingsQuery.data?.results ?? [];
  const cleaning = cleaningQuery.data?.results ?? [];
  const maintenance = maintenanceQuery.data?.results ?? [];
  const transactions = transactionsQuery.data?.results ?? [];
  const properties = propertiesQuery.data?.results ?? [];
  const payments = paymentsQuery.data?.results ?? [];
  const stats = statsQuery.data;

  const today = format(new Date(), "yyyy-MM-dd");
  const checkinsToday = bookings.filter((booking) => booking.check_in === today);
  const checkoutsToday = bookings.filter((booking) => booking.check_out === today);

  // Per-property occupancy and revenue for the current month
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const daysInMonth = differenceInCalendarDays(monthEnd, monthStart) + 1;
  const monthKey = format(new Date(), "yyyy-MM");

  const propertyStats = useMemo(() => {
    return properties.map((property) => {
      const propBookings = bookings.filter(
        (b) => b.apartment === property.id && b.status !== "CANCELLED",
      );

      // Nights occupied this month
      const occupiedNights = propBookings.reduce((sum, b) => {
        const start = parseISO(b.check_in) < monthStart ? monthStart : parseISO(b.check_in);
        const end = parseISO(b.check_out) > monthEnd ? monthEnd : parseISO(b.check_out);
        const nights = Math.max(0, differenceInCalendarDays(end, start));
        return sum + nights;
      }, 0);

      const occupancyPct = Math.min(100, Math.round((occupiedNights / daysInMonth) * 100));

      // Revenue this month (from bookings whose check_in falls in this month)
      const revenueMonth = propBookings
        .filter((b) => b.check_in.startsWith(monthKey))
        .reduce((sum, b) => sum + Number(b.total_price), 0);

      // Revenue this year
      const revenueYear = propBookings
        .filter((b) => b.check_in.startsWith(format(new Date(), "yyyy")))
        .reduce((sum, b) => sum + Number(b.total_price), 0);

      // Pending payments for this property
      const propBookingIds = new Set(propBookings.map((b) => b.id));
      const pendingAmount = payments
        .filter((p) => propBookingIds.has(p.booking) && p.status === "PENDING")
        .reduce((sum, p) => sum + Number(p.amount_due), 0);

      // ADR: average daily rate for this month
      const adr = occupiedNights > 0 ? revenueMonth / occupiedNights : 0;

      // Next check-in
      const upcoming = propBookings
        .filter((b) => b.check_in >= today)
        .sort((a, b) => a.check_in.localeCompare(b.check_in))[0];

      return { property, occupancyPct, occupiedNights, revenueMonth, revenueYear, pendingAmount, adr, upcoming };
    }).sort((a, b) => b.revenueMonth - a.revenueMonth);
  }, [properties, bookings, payments, today, monthKey, daysInMonth]);

  const chartMonths = eachMonthOfInterval({
    start: startOfMonth(subMonths(new Date(), 11)),
    end: endOfMonth(new Date()),
  });

  const chartData = chartMonths.map((monthDate) => {
    const monthKey = format(monthDate, "yyyy-MM");
    const monthTotal = transactions
      .filter((transaction) => transaction.category === "INCOME" && transaction.date.startsWith(monthKey))
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    return {
      month: format(monthDate, "MMM"),
      revenue: monthTotal,
    };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="Visión general de ingresos, ocupación y tareas operativas del día."
      />

      {hasError ? (
        <div className="rounded-md border border-[var(--danger-border)] bg-[var(--danger-bg)] p-6 text-[var(--danger)]">
          <p className="font-medium">No se pudo cargar el dashboard.</p>
          <Button className="mt-4" onClick={() => {
            void statsQuery.refetch();
            void bookingsQuery.refetch();
            void cleaningQuery.refetch();
            void maintenanceQuery.refetch();
            void transactionsQuery.refetch();
          }}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {loading ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[360px] rounded-xl" />
        </>
      ) : null}

      {!loading && stats ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total ingresos (mes)" value={formatCurrency(stats.total_revenue_month)} />
            <StatCard label="Total ingresos (año)" value={formatCurrency(stats.total_revenue_year)} />
            <StatCard label="Reservas activas" value={String(stats.active_bookings)} />
            <StatCard label="Tasa ocupación %" value={`${stats.occupancy_rate_percent}%`} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">Ingresos mensuales</h3>
                  <p className="text-sm text-muted-foreground">Agrupados por mes con datos reales del API.</p>
                </div>
                {transactionsQuery.isFetching ? <LoaderCircle className="size-4 animate-spin text-muted-foreground" /> : null}
              </div>

              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid stroke="rgba(23,28,27,0.08)" strokeDasharray="3 3" vertical={false} />
                    <XAxis axisLine={false} dataKey="month" tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(255,253,248,0.96)",
                        border: "1px solid rgba(220,229,239,0.95)",
                        borderRadius: 12,
                        boxShadow: "0 12px 28px rgba(23,32,51,0.10)",
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="revenue" fill="var(--primary)" radius={[12, 12, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-secondary p-3 text-primary">
                    <CalendarDays className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Check-ins hoy</p>
                    <p className="text-2xl font-semibold">{stats.pending_checkins_today}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  {checkinsToday.length ? checkinsToday.map((booking) => (
                    <div key={booking.id} className="rounded-lg border border-border bg-muted/70 px-3 py-2">
                      {booking.apartment_title ?? `Propiedad #${booking.apartment}`}
                    </div>
                  )) : <p className="text-muted-foreground">Sin check-ins pendientes hoy.</p>}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Link to="/cleaning" className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary">
                    <div className="flex items-center gap-3">
                      <Sparkles className="size-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Limpiezas pendientes</p>
                        <p className="text-xl font-semibold">{stats.pending_cleanings}</p>
                      </div>
                    </div>
                  </Link>
                  <Link to="/maintenance" className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary">
                    <div className="flex items-center gap-3">
                      <Wrench className="size-5 text-[var(--warning)]" />
                      <div>
                        <p className="text-sm text-muted-foreground">Mantenimiento abierto</p>
                        <p className="text-xl font-semibold">{stats.open_maintenance}</p>
                      </div>
                    </div>
                  </Link>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <CreditCard className="size-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Pagos pendientes</p>
                        <p className="text-xl font-semibold">{stats.pending_payments}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <Euro className="size-5 text-[var(--success)]" />
                      <div>
                        <p className="text-sm text-muted-foreground">Check-outs hoy</p>
                        <p className="text-xl font-semibold">{stats.pending_checkouts_today}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold tracking-tight">Actividad operativa</h3>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
                <div className="space-y-3 text-sm">
                  {checkoutsToday.slice(0, 2).map((booking) => (
                    <div key={`checkout-${booking.id}`} className="rounded-lg border border-border bg-muted/70 px-3 py-2">
                      Check-out: {booking.apartment_title ?? `Propiedad #${booking.apartment}`} el {formatDate(booking.check_out)}
                    </div>
                  ))}
                  {cleaning.slice(0, 2).map((task) => (
                    <div key={`cleaning-${task.id}`} className="rounded-lg border border-border bg-muted/70 px-3 py-2">
                      Limpieza {task.property_title ?? `#${task.property}`} para {formatDate(task.scheduled_date)}
                    </div>
                  ))}
                  {maintenance.slice(0, 2).map((item) => (
                    <div key={`maintenance-${item.id}`} className="rounded-lg border border-border bg-muted/70 px-3 py-2">
                      {item.title} en {item.property_title ?? `#${item.property}`}
                    </div>
                  ))}
                  {!checkoutsToday.length && !cleaning.length && !maintenance.length ? (
                    <p className="text-muted-foreground">No hay actividad operativa destacada.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          {/* Rentabilidad por propiedad */}
          {propertyStats.length > 0 ? (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                <h3 className="font-semibold tracking-tight">Rentabilidad por propiedad</h3>
                <span className="ml-1 text-sm text-muted-foreground">
                  · {format(new Date(), "MMMM yyyy", { locale: es })}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">Propiedad</th>
                      <th className="pb-3 pr-4 font-medium">Ocupación</th>
                      <th className="pb-3 pr-4 font-medium">ADR</th>
                      <th className="pb-3 pr-4 font-medium">Ingresos mes</th>
                      <th className="pb-3 pr-4 font-medium">Ingresos año</th>
                      <th className="pb-3 pr-4 font-medium">Pendiente cobro</th>
                      <th className="pb-3 font-medium">Próxima reserva</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {propertyStats.map(({ property, occupancyPct, occupiedNights, revenueMonth, revenueYear, pendingAmount, adr, upcoming }) => (
                      <tr key={property.id} className="group">
                        <td className="py-3 pr-4">
                          <Link to={`/cms/properties/${property.id}/edit`} className="font-medium text-primary hover:underline">
                            {property.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">{property.location}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full ${occupancyPct >= 70 ? "bg-[var(--success)]" : occupancyPct >= 40 ? "bg-[var(--warning)]" : "bg-[var(--danger)]"}`}
                                style={{ width: `${occupancyPct}%` }}
                              />
                            </div>
                            <span className={`font-medium ${occupancyPct >= 70 ? "text-[var(--success)]" : occupancyPct >= 40 ? "text-[var(--warning)]" : "text-[var(--danger)]"}`}>
                              {occupancyPct}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{occupiedNights} noches</p>
                        </td>
                        <td className="py-3 pr-4 font-medium">{adr > 0 ? formatCurrency(adr) : "—"}</td>
                        <td className="py-3 pr-4">
                          <span className="font-semibold text-[var(--success)]">{formatCurrency(revenueMonth)}</span>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">{formatCurrency(revenueYear)}</td>
                        <td className="py-3 pr-4">
                          {pendingAmount > 0 ? (
                            <Badge variant="outline" className="text-[var(--warning)] border-[var(--warning-border)] bg-[var(--warning-bg)] text-xs">
                              {formatCurrency(pendingAmount)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Al día</span>
                          )}
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">
                          {upcoming ? (
                            <Link to={`/bookings/${upcoming.id}`} className="hover:text-primary hover:underline">
                              {upcoming.client_name || "Cliente"} · {formatDate(upcoming.check_in)}
                            </Link>
                          ) : "Sin reservas"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
