import { useState } from "react";

import { Button } from "@/app/components/ui/button";
import DataTable from "@/components/ui/DataTable";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/formatters";
import { useBookings } from "@/lib/hooks/useBookings";
import { useMarkPaid, usePayments } from "@/lib/hooks/usePayments";
import type { BookingPayment } from "@/types";

export default function PaymentsPage() {
  const [onlyPending, setOnlyPending] = useState(false);
  const [page, setPage] = useState(1);

  const paymentsQuery = usePayments(undefined, { page, status: onlyPending ? "PENDING" : undefined });
  const bookingsQuery = useBookings();
  const markPaid = useMarkPaid();

  const bookings = bookingsQuery.data?.results ?? [];
  const payments = paymentsQuery.data?.results ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagos"
        subtitle="Control de vencimientos, cobros y seguimiento del saldo pendiente."
        action={
          <label className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm">
            <input
              type="checkbox"
              checked={onlyPending}
              onChange={(event) => {
                setOnlyPending(event.target.checked);
                setPage(1);
              }}
            />
            Solo pendientes
          </label>
        }
      />

      <DataTable<BookingPayment>
        loading={paymentsQuery.isLoading}
        rows={payments}
        emptyMessage="No hay pagos para mostrar."
        onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
        onNextPage={() => setPage((current) => current + 1)}
        hasPreviousPage={Boolean(paymentsQuery.data?.previous)}
        hasNextPage={Boolean(paymentsQuery.data?.next)}
        columns={[
          {
            key: "booking",
            header: "Reserva",
            render: (payment) => {
              const booking = bookings.find((item) => item.id === payment.booking);
              return booking ? `#${booking.id}` : `#${payment.booking}`;
            },
          },
          {
            key: "client",
            header: "Cliente",
            render: (payment) => bookings.find((item) => item.id === payment.booking)?.client_name ?? "-",
          },
          {
            key: "property",
            header: "Propiedad",
            render: (payment) => bookings.find((item) => item.id === payment.booking)?.apartment_title ?? "-",
          },
          { key: "due", header: "Vence", render: (payment) => payment.due_date, sortValue: (payment) => payment.due_date },
          {
            key: "amount",
            header: "Importe",
            render: (payment) => formatCurrency(payment.amount_due),
            sortValue: (payment) => Number(payment.amount_due),
          },
          { key: "paid", header: "Pagado", render: (payment) => formatCurrency(payment.amount_paid) },
          {
            key: "pending",
            header: "Pendiente",
            render: (payment) => formatCurrency(Number(payment.amount_due) - Number(payment.amount_paid)),
          },
          { key: "status", header: "Estado", render: (payment) => <StatusBadge status={payment.status} type="payment" /> },
          {
            key: "actions",
            header: "Acción",
            render: (payment) =>
              payment.status === "PENDING" ? (
                <Button size="sm" onClick={() => markPaid.mutate(payment.id)}>Marcar pagado</Button>
              ) : (
                "Completado"
              ),
          },
        ]}
      />
    </div>
  );
}
