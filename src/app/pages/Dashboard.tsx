import { useMemo } from "react";
import { Link } from "react-router";
import {
  differenceInCalendarDays,
  eachMonthOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowRight,
  CreditCard,
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
import TodayOps from "@/app/components/TodayOps";
import { useBookings, useReturnDeposit } from "@/lib/hooks/useBookings";
import { useCleaningTasks } from "@/lib/hooks/useCleaning";
import { useDashboardStats } from "@/lib/hooks/useDashboard";
import { useMaintenanceRequests } from "@/lib/hooks/useMaintenance";
import { usePayments } from "@/lib/hooks/usePayments";
import { useProperties } from "@/lib/hooks/useProperties";
import { useTransactions } from "@/lib/hooks/useAccounting";
import { formatCurrency, formatDate } from "@/lib/formatters";

function DepositOverdueRow({ booking }: { booking: import("@/types").Booking }) {
  const returnDeposit = useReturnDeposit();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--warning-border)] bg-card px-3 py-2">
      <span>
        <Link to={`/bookings/${booking.id}`} className="font-medium hover:underline">
          {booking.apartment_title ?? `Propiedad #${booking.apartment}`}
        </Link>
        <span className="text-muted-foreground"> · {booking.client_name || "Huésped"} · salió el {formatDate(booking.check_out)}</span>
      </span>
      <div className="flex items-center gap-3">
        <span className="font-semibold text-[var(--warning)]">{formatCurrency(booking.deposit_amount)}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => returnDeposit.mutate(booking.id)}
          disabled={returnDeposit.isPending && returnDeposit.variables === booking.id}
        >
          {returnDeposit.isPending && returnDeposit.variables === booking.id ? "..." : "Devolver"}
        </Button>
      </div>
    </div>
  );
}

function SectionError({ onRetry, message = "No se pudo cargar esta sección." }: { onRetry: () => void; message?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger)]">
      <span>{message}</span>
      <button type="button" onClick={onRetry} className="shrink-0 font-medium underline underline-offset-2">
        Reintentar
      </button>
    </div>
  );
}

const LIVE_REFRESH_MS = 60_000;

export default function DashboardPage() {
  const statsQuery = useDashboardStats({ refetchInterval: LIVE_REFRESH_MS });
  const bookingsQuery = useBookings(undefined, { refetchInterval: LIVE_REFRESH_MS });
  const cleaningQuery = useCleaningTasks(undefined, { refetchInterval: LIVE_REFRESH_MS });
  const maintenanceQuery = useMaintenanceRequests(undefined, { refetchInterval: LIVE_REFRESH_MS });
  const transactionsQuery = useTransactions();
  const propertiesQuery = useProperties();
  const paymentsQuery = usePayments(undefined, { refetchInterval: LIVE_REFRESH_MS });

  const loading = statsQuery.isLoading || bookingsQuery.isLoading || cleaningQuery.isLoading || maintenanceQuery.isLoading;
  // Stats backs almost every widget on this page — without it there's nothing
  // meaningful to render. The other queries degrade gracefully (empty list +
  // an inline retry) so one flaky endpoint doesn't blank the whole dashboard.
  const statsFailed = statsQuery.isError;
  const bookingsFailed = bookingsQuery.isError;
  const cleaningFailed = cleaningQuery.isError;
  const maintenanceFailed = maintenanceQuery.isError;
  const transactionsFailed = transactionsQuery.isError;
  const propertiesFailed = propertiesQuery.isError;

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

  const newBookingsCutoff = subDays(new Date(), 7);
  const newBookings = bookings
    .filter((booking) => booking.created_at && new Date(booking.created_at) >= newBookingsCutoff)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const pendingDeposits = bookings.filter(
    (booking) => Number(booking.deposit_amount) > 0 && !booking.deposit_returned,
  );
  const depositsPendingTotal = pendingDeposits.reduce((sum, b) => sum + Number(b.deposit_amount), 0);
  // Overdue: already checked out but the deposit still hasn't been returned —
  // today's check-outs already surface the "Devolver" action inline, this list
  // is for the ones that slipped through.
  const depositsOverdue = pendingDeposits
    .filter((booking) => booking.check_out < today)
    .sort((a, b) => a.check_out.localeCompare(b.check_out));

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

      {statsFailed ? (
        <div className="rounded-md border border-[var(--danger-border)] bg-[var(--danger-bg)] p-6 text-[var(--danger)]">
          <p className="font-medium">No se pudo cargar el dashboard.</p>
          <Button className="mt-4" onClick={() => void statsQuery.refetch()}>
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

      {!loading && !statsFailed && stats ? (
        <>
          {bookingsFailed ? (
            <SectionError message="No se pudieron cargar las reservas." onRetry={() => void bookingsQuery.refetch()} />
          ) : (
            <TodayOps
              checkins={checkinsToday}
              checkouts={checkoutsToday}
              newBookings={newBookings}
              monthTotal={stats.total_revenue_month}
              depositsPendingTotal={depositsPendingTotal}
              depositsPendingCount={pendingDeposits.length}
            />
          )}

          {/* Quick links — the stuff you'd otherwise dig for in the sidebar */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Link to="/cleaning" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent hover:bg-secondary">
              <Sparkles className="size-5 text-primary" strokeWidth={1.75} />
              <div>
                <p className="text-sm text-muted-foreground">Limpiezas pendientes</p>
                <p className="text-xl font-semibold">{stats.pending_cleanings}</p>
              </div>
            </Link>
            <Link to="/maintenance" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent hover:bg-secondary">
              <Wrench className="size-5 text-[var(--warning)]" strokeWidth={1.75} />
              <div>
                <p className="text-sm text-muted-foreground">Mantenimiento abierto</p>
                <p className="text-xl font-semibold">{stats.open_maintenance}</p>
              </div>
            </Link>
            <Link to="/payments" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent hover:bg-secondary">
              <CreditCard className="size-5 text-primary" strokeWidth={1.75} />
              <div>
                <p className="text-sm text-muted-foreground">Pagos pendientes</p>
                <p className="text-xl font-semibold">{stats.pending_payments}</p>
              </div>
            </Link>
          </div>

          {depositsOverdue.length > 0 ? (
            <div className="rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-5">
              <div className="mb-3 flex items-center gap-2 text-[var(--warning)]">
                <AlertTriangle className="size-4" />
                <h3 className="font-semibold tracking-tight">Fianzas sin devolver de estancias ya finalizadas</h3>
              </div>
              <div className="space-y-2 text-sm">
                {depositsOverdue.map((booking) => (
                  <DepositOverdueRow key={booking.id} booking={booking} />
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">Ingresos mensuales</h3>
                  <p className="text-sm text-muted-foreground">Agrupados por mes con datos reales del API.</p>
                </div>
                {transactionsQuery.isFetching ? <LoaderCircle className="size-4 animate-spin text-muted-foreground" /> : null}
              </div>

              {transactionsFailed ? (
                <SectionError message="No se pudieron cargar los ingresos." onRetry={() => void transactionsQuery.refetch()} />
              ) : (
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
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold tracking-tight">Otros indicadores</h3>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/70 px-3 py-2">
                    <span className="text-muted-foreground">Ingresos (año)</span>
                    <span className="font-semibold">{formatCurrency(stats.total_revenue_year)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/70 px-3 py-2">
                    <span className="text-muted-foreground">Reservas activas</span>
                    <span className="font-semibold">{stats.active_bookings}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/70 px-3 py-2">
                    <span className="text-muted-foreground">Tasa de ocupación</span>
                    <span className="font-semibold">{stats.occupancy_rate_percent}%</span>
                  </div>
                  {(cleaningFailed || maintenanceFailed) ? (
                    <SectionError
                      message="Parte de la actividad operativa no se pudo cargar."
                      onRetry={() => {
                        void cleaningQuery.refetch();
                        void maintenanceQuery.refetch();
                      }}
                    />
                  ) : null}
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
                </div>
              </div>
            </div>
          </div>
          {/* Rentabilidad por propiedad */}
          {propertiesFailed ? (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <SectionError message="No se pudieron cargar las propiedades." onRetry={() => void propertiesQuery.refetch()} />
            </div>
          ) : null}
          {!propertiesFailed && propertyStats.length > 0 ? (
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
