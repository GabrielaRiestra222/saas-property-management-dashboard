import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Plus } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import DataTable from "@/components/ui/DataTable";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useBookings, useUpdateBooking } from "@/lib/hooks/useBookings";
import { useProperties } from "@/lib/hooks/useProperties";
import type { Booking } from "@/types";

function getBookingNights(booking: Booking) {
  return Math.max(
    1,
    Math.round((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / (1000 * 60 * 60 * 24)),
  );
}

function getPendingPaymentsCount(booking: Booking) {
  if (typeof booking.pending_payments_count === "number") {
    return booking.pending_payments_count;
  }

  return booking.payments?.filter((payment) => payment.status === "PENDING").length ?? 0;
}

function getPricePerNight(booking: Booking) {
  if (booking.price_per_night) {
    return Number(booking.price_per_night);
  }

  return Number(booking.total_price) / getBookingNights(booking);
}

export default function BookingsPage() {
  const [status, setStatus] = useState<string>("ALL");
  const [property, setProperty] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const propertiesQuery = useProperties();
  const bookingsQuery = useBookings({
    status: status !== "ALL" ? status : undefined,
    property: property !== "ALL" ? property : undefined,
    check_in_after: dateFrom || undefined,
    check_in_before: dateTo || undefined,
    search: search || undefined,
  });
  const updateBooking = useUpdateBooking();

  const bookings = useMemo(() => {
    return (bookingsQuery.data?.results ?? []).filter((booking) =>
      search
        ? (booking.client_name ?? "").toLowerCase().includes(search.toLowerCase())
        : true,
    );
  }, [bookingsQuery.data?.results, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservas"
        subtitle="Consulta la actividad actual, filtra por estado y crea nuevas reservas."
        action={
          <Button asChild>
            <Link to="/bookings/new">
              <Plus className="mr-2 size-4" />
              Nueva reserva
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-sm md:grid-cols-5">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los estados</SelectItem>
            <SelectItem value="PENDING">PENDING</SelectItem>
            <SelectItem value="CONFIRMED">CONFIRMED</SelectItem>
            <SelectItem value="CANCELLED">CANCELLED</SelectItem>
          </SelectContent>
        </Select>
        <Select value={property} onValueChange={setProperty}>
          <SelectTrigger><SelectValue placeholder="Propiedad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas las propiedades</SelectItem>
            {(propertiesQuery.data?.results ?? []).map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>{item.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="Cliente" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
      </div>

      {bookingsQuery.isError ? (
        <div className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-6 text-[var(--danger)]">
          <p>No se pudieron cargar las reservas.</p>
          <Button className="mt-4" onClick={() => void bookingsQuery.refetch()}>Reintentar</Button>
        </div>
      ) : null}

      <DataTable<Booking>
        loading={bookingsQuery.isLoading}
        rows={bookings}
        emptyMessage="No hay reservas para los filtros seleccionados."
        columns={[
          { key: "id", header: "#", render: (booking) => `#${booking.id}` },
          {
            key: "property",
            header: "Apartamento",
            render: (booking) => (
              <Link to={`/properties/${booking.apartment}`} className="font-medium text-primary hover:underline">
                {booking.apartment_title || `Apartamento #${booking.apartment}`}
              </Link>
            ),
          },
          {
            key: "client",
            header: "Cliente",
            render: (booking) => (
              <Link to={`/clients/${booking.client}`} className="font-medium text-primary hover:underline">
                {booking.client_name || `Cliente #${booking.client}`}
              </Link>
            ),
          },
          { key: "checkin", header: "Check-in", render: (booking) => formatDate(booking.check_in) },
          { key: "checkout", header: "Check-out", render: (booking) => formatDate(booking.check_out) },
          {
            key: "nights",
            header: "Noches",
            render: (booking) => String(getBookingNights(booking)),
          },
          {
            key: "nightly",
            header: "Importe/noche",
            render: (booking) => (
              <span className="font-medium">{formatCurrency(getPricePerNight(booking))}</span>
            ),
          },
          { key: "total", header: "Total", render: (booking) => <span className="font-semibold">{formatCurrency(booking.total_price)}</span> },
          {
            key: "paid",
            header: "Pagado",
            render: (booking) => (
              <span className="text-[var(--success)]">{formatCurrency(booking.total_paid)}</span>
            ),
          },
          {
            key: "pending",
            header: "Pendiente",
            render: (booking) => {
              const pending = Number(booking.remaining_balance);
              return <span className={pending > 0 ? "font-medium text-[var(--warning)]" : "text-muted-foreground"}>{formatCurrency(pending)}</span>;
            },
          },
          {
            key: "pendingPayments",
            header: "Pagos pend.",
            render: (booking) => {
              const count = getPendingPaymentsCount(booking);
              return (
                <span className={count > 0 ? "font-semibold text-[var(--warning)]" : "text-muted-foreground"}>
                  {count}
                </span>
              );
            },
          },
          {
            key: "agency",
            header: "Agencia",
            render: (booking) => booking.agency_name
              ? <span className="text-xs text-muted-foreground">{booking.agency_name}</span>
              : <span className="text-xs text-muted-foreground">—</span>,
          },
          { key: "status", header: "Estado", render: (booking) => <StatusBadge status={booking.status} type="booking" /> },
          {
            key: "actions",
            header: "Acciones",
            render: (booking) => (
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/bookings/${booking.id}`}>Ver detalle</Link>
                </Button>
                <Select
                  value={booking.status}
                  onValueChange={(nextStatus) =>
                    updateBooking.mutate({
                      id: booking.id,
                      payload: { status: nextStatus as Booking["status"] },
                    })
                  }
                >
                  <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">PENDING</SelectItem>
                    <SelectItem value="CONFIRMED">CONFIRMED</SelectItem>
                    <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                  </SelectContent>
                </Select>
                <Button asChild size="sm" variant="outline">
                  <Link to={`/bookings/${booking.id}#payments`}>Añadir pago</Link>
                </Button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
