import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router";
import { z } from "zod";
import { addMonths, differenceInCalendarDays, differenceInDays, format, parseISO, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { Building2, CalendarDays, TrendingUp, User } from "lucide-react";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/app/components/ui/form";
import { Input } from "@/app/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Textarea } from "@/app/components/ui/textarea";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";
import { useAgency } from "@/lib/hooks/useAgencies";
import { useBooking, useBookings, useUpdateBooking } from "@/lib/hooks/useBookings";
import { useCleaningTasks, useCreateCleaningTask, useUpdateCleaningStatus } from "@/lib/hooks/useCleaning";
import { useCreatePayment, useMarkPaid, usePayments } from "@/lib/hooks/usePayments";
import { useProperty } from "@/lib/hooks/useProperties";

const paymentSchema = z.object({
  amount_due: z.string().min(1),
  amount_paid: z.string().min(1),
  due_date: z.string().min(1),
  payment_method: z.string().min(1),
  notes: z.string().optional(),
});

type PaymentValues = z.infer<typeof paymentSchema>;

type ScheduledPayment = {
  label: string;
  amount: number;
  dueDate: string;
  kind: "deposit" | "rent" | "deposit_return" | "signal";
};

function buildPaymentSchedule(
  totalPrice: number,
  checkIn: Date,
  checkOut: Date,
  nights: number,
): ScheduledPayment[] {
  const today = format(new Date(), "yyyy-MM-dd");

  if (nights <= 30) {
    // Short stay: 50% now, 50% one week before check-in
    const half = Math.round(totalPrice * 0.5 * 100) / 100;
    return [
      { label: "Señal (50%)", amount: half, dueDate: today, kind: "signal" },
      { label: "Pago final (50%)", amount: totalPrice - half, dueDate: format(subDays(checkIn, 7), "yyyy-MM-dd"), kind: "signal" },
    ];
  }

  // Monthly rental: deposit = 1 month rent + monthly payments + deposit return event
  const months = Math.ceil(nights / 30);
  const monthly = Math.round((totalPrice / months) * 100) / 100;
  const deposit = monthly; // fianza = 1 mes

  const schedule: ScheduledPayment[] = [
    { label: "Fianza (1 mes)", amount: deposit, dueDate: today, kind: "deposit" },
  ];

  for (let i = 0; i < months; i++) {
    const dueDate = format(addMonths(checkIn, i), "yyyy-MM-dd");
    const isLast = i === months - 1;
    const amount = isLast ? totalPrice - monthly * (months - 1) : monthly;
    schedule.push({
      label: `Alquiler mes ${i + 1} de ${months}`,
      amount: Math.round(amount * 100) / 100,
      dueDate,
      kind: "rent",
    });
  }

  // Deposit return at checkout
  schedule.push({
    label: "Devolución de fianza",
    amount: deposit,
    dueDate: format(checkOut, "yyyy-MM-dd"),
    kind: "deposit_return",
  });

  return schedule;
}

export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = Number(params.id);
  const bookingQuery = useBooking(bookingId);
  const paymentsQuery = usePayments(bookingId);
  const cleaningQuery = useCleaningTasks({ booking: bookingId });
  const updateBooking = useUpdateBooking();
  const markPaid = useMarkPaid();
  const createPayment = useCreatePayment();
  const updateCleaningStatus = useUpdateCleaningStatus();

  const booking = bookingQuery.data;
  const agencyQuery = useAgency(booking?.agency ?? undefined);
  const agency = agencyQuery.data;
  const propertyQuery = useProperty(booking?.apartment);
  const property = propertyQuery.data;
  const propertyBookingsQuery = useBookings(booking ? { property: booking.apartment } : undefined);
  const createCleaning = useCreateCleaningTask();
  const cleaningTask = cleaningQuery.data?.results?.[0];

  const form = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount_due: "",
      amount_paid: "",
      due_date: "",
      payment_method: "TRANSFER",
      notes: "",
    },
  });

  const { nights, storedPrice, calculatedPrice, totalPrice, agencyCommission, netIncome, schedule, priceIsEstimated } = useMemo(() => {
    if (!booking) return { nights: 0, storedPrice: 0, calculatedPrice: 0, totalPrice: 0, agencyCommission: 0, netIncome: 0, schedule: [], priceIsEstimated: false };

    const checkIn = parseISO(booking.check_in);
    const checkOut = parseISO(booking.check_out);
    const nights = Math.max(1, differenceInDays(checkOut, checkIn));
    const storedPrice = Number(booking.total_price) || 0;
    const calculatedPrice = property
      ? Math.round((nights * Number(property.price_per_night) + Number(property.cleaning_fee)) * 100) / 100
      : 0;
    const priceIsEstimated = storedPrice === 0 && calculatedPrice > 0;
    const totalPrice = priceIsEstimated ? calculatedPrice : storedPrice;
    const commissionRate = agency ? Number(agency.commission_percentage) / 100 : 0;
    const agencyCommission = Math.round(totalPrice * commissionRate * 100) / 100;
    const netIncome = Math.round((totalPrice - agencyCommission) * 100) / 100;
    const schedule = buildPaymentSchedule(totalPrice, checkIn, checkOut, nights);

    return { nights, storedPrice, calculatedPrice, totalPrice, agencyCommission, netIncome, schedule, priceIsEstimated };
  }, [booking, agency, property]);

  const existingPayments = paymentsQuery.data?.results ?? [];

  if (!booking && bookingQuery.isLoading) {
    return <div className="rounded-xl border border-border bg-card p-8">Cargando detalle...</div>;
  }

  if (!booking) {
    return <div className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-6 text-[var(--danger)]">No se encontró la reserva.</div>;
  }

  async function generateCleanings() {
    if (!booking) return;
    const checkIn = parseISO(booking.check_in);
    const checkOut = parseISO(booking.check_out);
    const allBookings = propertyBookingsQuery.data?.results ?? [];

    // Check if there's a previous booking checking out within 2 days of our check-in
    const prevClose = allBookings.some((b) => {
      if (b.id === booking.id) return false;
      const gap = differenceInCalendarDays(checkIn, parseISO(b.check_out));
      return gap >= 0 && gap <= 2;
    });

    // Check if there's a next booking checking in within 2 days of our check-out
    const nextClose = allBookings.some((b) => {
      if (b.id === booking.id) return false;
      const gap = differenceInCalendarDays(parseISO(b.check_in), checkOut);
      return gap >= 0 && gap <= 2;
    });

    // Departure cleaning: only if no adjacent next booking (they'll create arrival cleaning)
    if (!nextClose) {
      await createCleaning.mutateAsync({
        property: booking.apartment,
        booking: booking.id,
        assigned_to: "",
        scheduled_date: format(checkOut, "yyyy-MM-dd"),
        status: "PENDING",
        notes: `Limpieza de salida · Reserva #${booking.id}`,
        fee: "0",
      });
    }

    // Arrival cleaning: only if no adjacent previous booking
    if (!prevClose) {
      await createCleaning.mutateAsync({
        property: booking.apartment,
        booking: booking.id,
        assigned_to: "",
        scheduled_date: format(subDays(checkIn, 1), "yyyy-MM-dd"),
        status: "PENDING",
        notes: `Limpieza de entrada · Reserva #${booking.id}`,
        fee: "0",
      });
    }

    // If both are close (very back-to-back), create just one intermediate cleaning
    if (prevClose && nextClose) {
      await createCleaning.mutateAsync({
        property: booking.apartment,
        booking: booking.id,
        assigned_to: "",
        scheduled_date: format(checkOut, "yyyy-MM-dd"),
        status: "PENDING",
        notes: `Limpieza entrada/salida · Reserva #${booking.id}`,
        fee: "0",
      });
    }
  }

  async function generateAllPayments() {
    for (const item of schedule) {
      if (item.kind === "deposit_return") continue;
      await createPayment.mutateAsync({
        booking: booking!.id,
        amount_due: String(item.amount),
        amount_paid: "0",
        due_date: item.dueDate,
        payment_date: null,
        payment_method: "TRANSFER",
        status: "PENDING",
        notes: item.label,
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Reserva #${booking.id}`}
        subtitle="Vista completa con pagos, limpieza, notas y análisis financiero."
        breadcrumb={[{ label: "Reservas", to: "/bookings" }, { label: `#${booking.id}` }]}
      />

      {/* Hero card: client + property + dates */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <User className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Cliente</p>
            <Link to={`/clients/${booking.client}`} className="text-lg font-semibold text-primary hover:underline">
              {booking.client_name ?? `#${booking.client}`}
            </Link>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={booking.status} type="booking" />
              {booking.num_guests ? <span className="text-xs text-muted-foreground">{booking.num_guests} huéspedes</span> : null}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Building2 className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Propiedad</p>
            <p className="text-lg font-semibold">{booking.apartment_title ?? `#${booking.apartment}`}</p>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="size-3.5" />
              <span>
                {format(parseISO(booking.check_in), "d MMM yyyy", { locale: es })}
                {" → "}
                {format(parseISO(booking.check_out), "d MMM yyyy", { locale: es })}
                {" · "}
                {nights} noche{nights !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Price mismatch warning */}
      {priceIsEstimated ? (
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-[var(--warning)] dark:text-amber-300">Precio guardado incorrecto (0 €)</p>
            <p className="mt-0.5 text-[var(--warning)] dark:text-amber-400">
              Precio calculado según tarifa actual de la propiedad: <strong>{formatCurrency(calculatedPrice)}</strong>
              {property ? ` (${nights} noches × ${formatCurrency(property.price_per_night)} + ${formatCurrency(property.cleaning_fee)} limpieza)` : ""}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-[var(--warning-border)] text-[var(--warning)] hover:bg-[var(--warning-bg)] dark:text-amber-300"
            disabled={updateBooking.isPending}
            onClick={() =>
              updateBooking.mutate({
                id: booking.id,
                payload: { total_price: calculatedPrice.toFixed(2) },
              })
            }
          >
            Corregir precio
          </Button>
        </div>
      ) : null}

      {/* Financial summary */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" />
          <h3 className="font-semibold">Resumen financiero</h3>
          {agency && (
            <Badge variant="outline" className="ml-auto text-xs">
              Agencia: {agency.name} ({agency.commission_percentage}% comisión)
            </Badge>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground">Total reserva{priceIsEstimated ? " (estimado)" : ""}</p>
            <p className="mt-1 text-xl font-bold">{formatCurrency(totalPrice)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{nights} noches · {formatCurrency(totalPrice / nights)}/noche</p>
          </div>
          {agency ? (
            <div className="rounded-md bg-[var(--warning-bg)] p-4 dark:bg-orange-950/20">
              <p className="text-xs text-muted-foreground">Comisión agencia</p>
              <p className="mt-1 text-xl font-bold text-[var(--warning)]">− {formatCurrency(agencyCommission)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{agency.commission_percentage}% de {formatCurrency(totalPrice)}</p>
            </div>
          ) : null}
          <div className="rounded-md bg-[var(--success-bg)] p-4 dark:bg-green-950/20">
            <p className="text-xs text-muted-foreground">Ingreso neto</p>
            <p className="mt-1 text-xl font-bold text-[var(--success)]">{formatCurrency(netIncome)}</p>
            {agency ? <p className="mt-0.5 text-xs text-muted-foreground">Tras comisión de agencia</p> : null}
          </div>
          <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-950/20">
            <p className="text-xs text-muted-foreground">Cobrado / Pendiente</p>
            <p className="mt-1 text-xl font-bold">{formatCurrency(booking.total_paid)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Pendiente: {formatCurrency(booking.remaining_balance)}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="payments">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="payments">Pagos</TabsTrigger>
          <TabsTrigger value="schedule">Plan de pagos</TabsTrigger>
          <TabsTrigger value="cleaning">Limpieza</TabsTrigger>
          <TabsTrigger value="notes">Notas</TabsTrigger>
        </TabsList>

        {/* Existing payments */}
        <TabsContent value="payments" className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="space-y-3">
              {existingPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todavía no hay pagos registrados. Usa el plan de pagos para generarlos automáticamente.</p>
              ) : existingPayments.map((payment) => (
                <div key={payment.id} className="flex flex-col gap-3 rounded-md border border-border p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">{formatCurrency(payment.amount_due)} · {payment.payment_method}</p>
                    <p className="text-sm text-muted-foreground">
                      Vence {formatDate(payment.due_date)}
                      {payment.notes ? ` · ${payment.notes}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={payment.status} type="payment" />
                    {payment.status === "PENDING" ? (
                      <Button size="sm" onClick={() => markPaid.mutate(payment.id)}>Marcar pagado</Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 font-semibold">Añadir pago manual</h3>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(async (values) => {
                  await createPayment.mutateAsync({
                    booking: booking.id,
                    amount_due: values.amount_due,
                    amount_paid: values.amount_paid,
                    due_date: values.due_date,
                    payment_date: null,
                    payment_method: values.payment_method,
                    status: "PENDING",
                    notes: values.notes ?? "",
                  });
                  form.reset();
                })}
                className="grid gap-4 md:grid-cols-2"
              >
                <FormField control={form.control} name="amount_due" render={({ field }) => (
                  <FormItem><FormLabel>Importe</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="amount_paid" render={({ field }) => (
                  <FormItem><FormLabel>Pagado ahora</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="due_date" render={({ field }) => (
                  <FormItem><FormLabel>Vencimiento</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="payment_method" render={({ field }) => (
                  <FormItem><FormLabel>Método</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem className="md:col-span-2"><FormLabel>Notas</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="md:col-span-2">
                  <Button disabled={createPayment.isPending}>Guardar pago</Button>
                </div>
              </form>
            </Form>
          </div>
        </TabsContent>

        {/* Auto payment schedule */}
        <TabsContent value="schedule" className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Plan de pagos sugerido</h3>
                <p className="text-sm text-muted-foreground">
                  Calculado para {nights} noche{nights !== 1 ? "s" : ""} · Total: {formatCurrency(totalPrice)}
                  {agency ? ` · Neto agencia: ${formatCurrency(netIncome)}` : ""}
                </p>
              </div>
              {existingPayments.length === 0 ? (
                <Button
                  onClick={() => void generateAllPayments()}
                  disabled={createPayment.isPending}
                >
                  Generar todos los pagos
                </Button>
              ) : (
                <Badge variant="outline">Ya tienes {existingPayments.length} pago(s) registrado(s)</Badge>
              )}
            </div>

            <div className="space-y-3">
              {schedule.map((item, i) => {
                const isReturn = item.kind === "deposit_return";
                const isDeposit = item.kind === "deposit";
                const pct = isReturn ? null : Math.round((item.amount / totalPrice) * 100);

                return (
                  <div
                    key={i}
                    className={`flex items-center gap-4 rounded-md border p-4 ${
                      isReturn
                        ? "border-[var(--success-border)] bg-[var(--success-bg)] dark:border-green-900 dark:bg-green-950/20"
                        : isDeposit
                          ? "border-[var(--warning-border)] bg-[var(--warning-bg)] dark:border-amber-900 dark:bg-amber-950/20"
                          : "border-border"
                    }`}
                  >
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        isReturn
                          ? "bg-[var(--success-bg)] text-[var(--success)] dark:bg-green-900/40 dark:text-green-300"
                          : isDeposit
                            ? "bg-[var(--warning-bg)] text-[var(--warning)] dark:bg-amber-900/40 dark:text-amber-300"
                            : "bg-primary/10 text-primary"
                      }`}
                    >
                      {isReturn ? "↩" : isDeposit ? "F" : i}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {isReturn ? "Fecha devolución: " : "Vence el "}
                        {formatDate(item.dueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${isReturn ? "text-[var(--success)]" : isDeposit ? "text-[var(--warning)]" : ""}`}>
                        {isReturn ? "+" : ""}{formatCurrency(item.amount)}
                      </p>
                      {pct !== null && (
                        <p className="text-xs text-muted-foreground">{pct}% del total</p>
                      )}
                    </div>
                    {isReturn ? (
                      <Badge variant="outline" className="border-[var(--success-border)] text-[var(--success)] text-xs">
                        Recordatorio
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={createPayment.isPending}
                        onClick={async () => {
                          await createPayment.mutateAsync({
                            booking: booking.id,
                            amount_due: String(item.amount),
                            amount_paid: "0",
                            due_date: item.dueDate,
                            payment_date: null,
                            payment_method: "TRANSFER",
                            status: "PENDING",
                            notes: item.label,
                          });
                        }}
                      >
                        Registrar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {agency ? (
              <div className="mt-4 rounded-md border border-[var(--warning-border)] bg-[var(--warning-bg)] p-4 text-sm dark:border-orange-900 dark:bg-orange-950/30">
                <p className="font-medium text-[var(--warning)] dark:text-orange-300">Desglose con agencia — {agency.name}</p>
                <div className="mt-2 grid gap-1 sm:grid-cols-3">
                  <div><span className="text-muted-foreground">Comisión ({agency.commission_percentage}%): </span><span className="font-medium text-[var(--warning)] dark:text-orange-400">−{formatCurrency(agencyCommission)}</span></div>
                  <div><span className="text-muted-foreground">Ingreso neto: </span><span className="font-semibold text-[var(--success)]">{formatCurrency(netIncome)}</span></div>
                  <div><span className="text-muted-foreground">Por noche (neto): </span><span className="font-medium">{formatCurrency(netIncome / nights)}</span></div>
                </div>
              </div>
            ) : null}
          </div>
        </TabsContent>

        {/* Cleaning */}
        <TabsContent value="cleaning" className="space-y-4">
          {/* Auto-generate button */}
          {cleaningQuery.data?.results?.length === 0 && (
            <div className="flex items-center justify-between rounded-xl border border-dashed border-border bg-muted/40 p-4">
              <div>
                <p className="text-sm font-medium">Sin tareas de limpieza</p>
                <p className="text-xs text-muted-foreground">
                  Se crearán 1 ó 2 limpiezas según si hay reservas adyacentes en los próximos 2 días.
                </p>
              </div>
              <Button
                size="sm"
                disabled={createCleaning.isPending || propertyBookingsQuery.isLoading}
                onClick={() => void generateCleanings()}
              >
                {createCleaning.isPending ? "Generando..." : "Auto-generar limpiezas"}
              </Button>
            </div>
          )}

          {/* List all cleaning tasks for this booking */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
            {(cleaningQuery.data?.results ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Pulsa el botón de arriba para generar las limpiezas automáticamente.</p>
            ) : (
              (cleaningQuery.data?.results ?? []).map((task) => (
                <div key={task.id} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-md border border-border p-4">
                  <div>
                    <p className="font-medium">{task.notes || (task.property_title ?? `Propiedad #${task.property}`)}</p>
                    <p className="text-sm text-muted-foreground">Programada para {formatDate(task.scheduled_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={task.status} type="cleaning" />
                    {task.status !== "DONE" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateCleaningStatus.mutate({
                            id: task.id,
                            status: task.status === "PENDING" ? "IN_PROGRESS" : "DONE",
                          })
                        }
                      >
                        Avanzar estado
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
            <Textarea
              defaultValue={booking.notes}
              className="min-h-40"
              onBlur={(event) =>
                updateBooking.mutate({
                  id: booking.id,
                  payload: { notes: event.target.value },
                })
              }
            />
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <p>Creada: {formatDateTime(booking.created_at)}</p>
              <p>Estado: {booking.status}</p>
              <p>Total pendiente: {formatCurrency(booking.remaining_balance)}</p>
              {booking.agency ? <p>Agencia ID: {booking.agency}{agency ? ` · ${agency.name}` : ""}</p> : null}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
