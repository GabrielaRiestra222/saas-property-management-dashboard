import PageHeader from "@/components/ui/PageHeader";
import { formatCurrency } from "@/lib/formatters";
import { useBookings } from "@/lib/hooks/useBookings";
import { useProperties } from "@/lib/hooks/useProperties";
import { useTransactions } from "@/lib/hooks/useAccounting";

export default function OwnersPortalPage() {
  const propertiesQuery = useProperties();
  const bookingsQuery = useBookings();
  const transactionsQuery = useTransactions();
  const properties = propertiesQuery.data?.results ?? [];
  const bookings = bookingsQuery.data?.results ?? [];
  const transactions = transactionsQuery.data?.results ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Portal propietarios" subtitle="Resumen por propietario/propiedad para transparencia, rendimiento y extractos." />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Propiedades visibles</p>
          <p className="mt-2 text-3xl font-semibold">{properties.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Reservas asociadas</p>
          <p className="mt-2 text-3xl font-semibold">{bookings.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Ingresos registrados</p>
          <p className="mt-2 text-3xl font-semibold">
            {formatCurrency(transactions.filter((item) => item.category === "INCOME").reduce((sum, item) => sum + Number(item.amount), 0))}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-5">
          <h3 className="font-semibold">Vista de propietarios</h3>
          <p className="text-sm text-muted-foreground">Datos que se podrían publicar en un portal privado por owner.</p>
        </div>
        <div className="divide-y divide-border">
          {properties.map((property) => {
            const propertyBookings = bookings.filter((booking) => booking.apartment === property.id);
            const propertyTransactions = transactions.filter((transaction) => transaction.property === property.id);
            const income = propertyTransactions.filter((item) => item.category === "INCOME").reduce((sum, item) => sum + Number(item.amount), 0);
            const expense = propertyTransactions.filter((item) => item.category === "EXPENSE").reduce((sum, item) => sum + Number(item.amount), 0);

            return (
              <div key={property.id} className="grid gap-4 p-5 md:grid-cols-[1fr_140px_140px_140px]">
                <div>
                  <p className="font-medium">{property.title}</p>
                  <p className="text-sm text-muted-foreground">{property.location}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reservas</p>
                  <p className="font-semibold">{propertyBookings.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ingresos</p>
                  <p className="font-semibold text-[var(--success)]">{formatCurrency(income)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Neto</p>
                  <p className="font-semibold">{formatCurrency(income - expense)}</p>
                </div>
              </div>
            );
          })}
          {!properties.length ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No hay propiedades para mostrar.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
