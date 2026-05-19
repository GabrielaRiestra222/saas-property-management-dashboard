import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { eachMonthOfInterval, endOfMonth, format, startOfMonth, subMonths } from "date-fns";

import PageHeader from "@/components/ui/PageHeader";
import { formatCurrency } from "@/lib/formatters";
import { useBookings } from "@/lib/hooks/useBookings";
import { useProperties } from "@/lib/hooks/useProperties";
import { useTransactions } from "@/lib/hooks/useAccounting";

export default function AdvancedReportsPage() {
  const bookingsQuery = useBookings();
  const propertiesQuery = useProperties();
  const transactionsQuery = useTransactions();
  const bookings = bookingsQuery.data?.results ?? [];
  const properties = propertiesQuery.data?.results ?? [];
  const transactions = transactionsQuery.data?.results ?? [];

  const income = transactions.filter((item) => item.category === "INCOME").reduce((sum, item) => sum + Number(item.amount), 0);
  const nights = bookings.reduce((sum, booking) => {
    const start = new Date(booking.check_in).getTime();
    const end = new Date(booking.check_out).getTime();
    return sum + Math.max(1, Math.round((end - start) / 86400000));
  }, 0);
  const adr = nights ? income / nights : 0;
  const revPar = properties.length ? income / properties.length : 0;

  const monthly = useMemo(() => {
    return eachMonthOfInterval({
      start: startOfMonth(subMonths(new Date(), 11)),
      end: endOfMonth(new Date()),
    }).map((monthDate) => {
      const monthKey = format(monthDate, "yyyy-MM");
      return {
        month: format(monthDate, "MMM"),
        revenue: transactions.filter((item) => item.category === "INCOME" && item.date.startsWith(monthKey)).reduce((sum, item) => sum + Number(item.amount), 0),
        bookings: bookings.filter((item) => item.check_in.startsWith(monthKey)).length,
      };
    });
  }, [bookings, transactions]);

  const byProperty = properties.slice(0, 8).map((property) => ({
    name: property.title.length > 18 ? `${property.title.slice(0, 18)}...` : property.title,
    revenue: transactions.filter((item) => item.property === property.id && item.category === "INCOME").reduce((sum, item) => sum + Number(item.amount), 0),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Reporting avanzado" subtitle="KPIs tipo PMS: ingresos, ADR, RevPAR, reservas y rendimiento por propiedad." />

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Ingresos</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(income)}</p></div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Noches vendidas</p><p className="mt-2 text-2xl font-semibold">{nights}</p></div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">ADR</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(adr)}</p></div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">RevPAR aprox.</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(revPar)}</p></div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 font-semibold">Ingresos mensuales</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 font-semibold">Ingresos por propiedad</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byProperty}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="revenue" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
