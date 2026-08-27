import { zodResolver } from "@hookform/resolvers/zod";
import { differenceInCalendarDays, format, parseISO, subDays } from "date-fns";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import PageHeader from "@/components/ui/PageHeader";
import { formatCurrency, fullName } from "@/lib/formatters";
import { useAgencies } from "@/lib/hooks/useAgencies";
import { useBookings, useCreateBooking } from "@/lib/hooks/useBookings";
import { useClients, useCreateClient } from "@/lib/hooks/useClients";
import { useCreateCleaningTask } from "@/lib/hooks/useCleaning";
import { useProperties } from "@/lib/hooks/useProperties";

const schema = z.object({
  apartment: z.string().min(1, "Selecciona una propiedad"),
  check_in: z.string().min(1, "Selecciona check-in"),
  check_out: z.string().min(1, "Selecciona check-out"),
  num_guests: z.coerce.number().min(1),
  client: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  source: z.string().optional(),
  agency: z.string().optional(),
  notes: z.string().optional(),
});

type BookingWizardValues = z.infer<typeof schema>;

export default function NewBookingPage() {
  const [step, setStep] = useState(1);
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const navigate = useNavigate();
  const form = useForm<BookingWizardValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      apartment: "",
      check_in: "",
      check_out: "",
      num_guests: 1,
      client: "",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      source: "",
      agency: "",
      notes: "",
    },
  });

  const propertiesQuery = useProperties();
  const clientsQuery = useClients();
  const agenciesQuery = useAgencies();
  const createClient = useCreateClient();
  const createBooking = useCreateBooking();
  const createCleaning = useCreateCleaningTask();
  // Loaded lazily after apartment is selected so we can check adjacency
  const watchedApartmentForAdj = form.watch("apartment");
  const adjBookingsQuery = useBookings(watchedApartmentForAdj ? { property: watchedApartmentForAdj } : undefined);

  const properties = propertiesQuery.data?.results ?? [];
  const clients = clientsQuery.data?.results ?? [];
  const agencies = agenciesQuery.data?.results ?? [];

  // Watch values at component level so React re-renders when they change
  const watchedApartment = form.watch("apartment");
  const watchedCheckIn = form.watch("check_in");
  const watchedCheckOut = form.watch("check_out");

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === Number(watchedApartment)),
    [properties, watchedApartment],
  );

  const nights = useMemo(() => {
    if (!watchedCheckIn || !watchedCheckOut) return 0;
    return Math.max(1, differenceInCalendarDays(new Date(watchedCheckOut), new Date(watchedCheckIn)));
  }, [watchedCheckIn, watchedCheckOut]);

  const total = useMemo(() => {
    if (!selectedProperty || nights === 0) return 0;
    return nights * Number(selectedProperty.price_per_night) + Number(selectedProperty.cleaning_fee);
  }, [selectedProperty, nights]);

  const overlappingBooking = useMemo(() => {
    if (!watchedCheckIn || !watchedCheckOut) return null;
    const checkIn = new Date(watchedCheckIn);
    const checkOut = new Date(watchedCheckOut);
    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) || checkOut <= checkIn) return null;

    const existing = adjBookingsQuery.data?.results ?? [];
    return existing.find(
      (booking) =>
        booking.status !== "CANCELLED" &&
        new Date(booking.check_in) < checkOut &&
        new Date(booking.check_out) > checkIn,
    ) ?? null;
  }, [adjBookingsQuery.data, watchedCheckIn, watchedCheckOut]);

  async function submitBooking(values: BookingWizardValues) {
    let clientId = Number(values.client || 0);

    if (clientMode === "new") {
      const createdClient = await createClient.mutateAsync({
        first_name: values.first_name ?? "",
        last_name: values.last_name ?? "",
        email: values.email ?? "",
        phone: values.phone ?? "",
        document_id: "",
        nationality: "",
        passport: "",
        notes: "",
      });
      clientId = createdClient.id;
    }

    const newBooking = await createBooking.mutateAsync({
      apartment: Number(values.apartment),
      client: clientId,
      check_in: values.check_in,
      check_out: values.check_out,
      total_price: total.toFixed(2),
      status: "PENDING",
      num_guests: values.num_guests,
      notes: values.notes ?? "",
      source: values.source ? Number(values.source) : undefined,
      agency: values.agency ? Number(values.agency) : undefined,
    });

    // Auto-create cleaning tasks with adjacency check
    const checkIn = parseISO(values.check_in);
    const checkOut = parseISO(values.check_out);
    const existingBookings = adjBookingsQuery.data?.results ?? [];

    const prevClose = existingBookings.some((b) => {
      if (b.id === newBooking.id) return false;
      const gap = differenceInCalendarDays(checkIn, parseISO(b.check_out));
      return gap >= 0 && gap <= 2;
    });
    const nextClose = existingBookings.some((b) => {
      if (b.id === newBooking.id) return false;
      const gap = differenceInCalendarDays(parseISO(b.check_in), checkOut);
      return gap >= 0 && gap <= 2;
    });

    if (prevClose && nextClose) {
      // Back-to-back on both sides: single turn-around cleaning
      await createCleaning.mutateAsync({
        property: Number(values.apartment), booking: newBooking.id,
        assigned_to: "", scheduled_date: format(checkOut, "yyyy-MM-dd"),
        status: "PENDING", notes: `Limpieza entrada/salida · Reserva #${newBooking.id}`, fee: "0",
      });
    } else {
      if (!nextClose) {
        await createCleaning.mutateAsync({
          property: Number(values.apartment), booking: newBooking.id,
          assigned_to: "", scheduled_date: format(checkOut, "yyyy-MM-dd"),
          status: "PENDING", notes: `Limpieza de salida · Reserva #${newBooking.id}`, fee: "0",
        });
      }
      if (!prevClose) {
        await createCleaning.mutateAsync({
          property: Number(values.apartment), booking: newBooking.id,
          assigned_to: "", scheduled_date: format(subDays(checkIn, 1), "yyyy-MM-dd"),
          status: "PENDING", notes: `Limpieza de entrada · Reserva #${newBooking.id}`, fee: "0",
        });
      }
    }

    navigate("/bookings");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Nueva reserva" subtitle="Wizard en tres pasos para propiedad, cliente y confirmación." />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(submitBooking)} className="space-y-6">
          <div className="grid gap-2 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStep(item)}
                className={`rounded-md border px-4 py-3 text-left ${step === item ? "border-primary bg-primary/5" : "border-border bg-card"}`}
              >
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Paso {item}</p>
                <p className="mt-1 font-medium">
                  {item === 1 ? "Propiedad y fechas" : item === 2 ? "Cliente" : "Confirmar"}
                </p>
              </button>
            ))}
          </div>

          {step === 1 ? (
            <div className="grid gap-4 rounded-xl border border-border bg-card p-5 shadow-sm md:grid-cols-2">
              <FormField
                control={form.control}
                name="apartment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Propiedad</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecciona propiedad" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {properties.map((property) => (
                          <SelectItem key={property.id} value={String(property.id)}>{property.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="num_guests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Huéspedes</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="check_in"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-in</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="check_out"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-out</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="rounded-md bg-muted p-4 md:col-span-2">
                <p className="text-sm text-muted-foreground">Cálculo estimado</p>
                <p className="mt-2 font-medium">
                  {nights} noches x {formatCurrency(selectedProperty?.price_per_night ?? 0)} + limpieza {formatCurrency(selectedProperty?.cleaning_fee ?? 0)} = {formatCurrency(total)}
                </p>
              </div>
              {overlappingBooking ? (
                <div className="rounded-md border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4 text-sm text-[var(--danger)] md:col-span-2">
                  Ese apartamento ya tiene una reserva de {overlappingBooking.client_name || "otro cliente"} del{" "}
                  {overlappingBooking.check_in} al {overlappingBooking.check_out}. Elige otras fechas.
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex gap-3">
                <Button type="button" variant={clientMode === "existing" ? "default" : "outline"} onClick={() => setClientMode("existing")}>
                  Cliente existente
                </Button>
                <Button type="button" variant={clientMode === "new" ? "default" : "outline"} onClick={() => setClientMode("new")}>
                  Nuevo cliente
                </Button>
              </div>

              {clientMode === "existing" ? (
                <FormField
                  control={form.control}
                  name="client"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Busca por nombre o email" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={String(client.id)}>
                              {fullName(client.first_name, client.last_name)} · {client.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField control={form.control} name="first_name" render={({ field }) => (
                    <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="last_name" render={({ field }) => (
                    <FormItem><FormLabel>Apellidos</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h3 className="text-lg font-semibold">Resumen</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <p><span className="text-muted-foreground">Propiedad:</span> {selectedProperty?.title ?? "-"}</p>
                  <p><span className="text-muted-foreground">Cliente:</span> {clientMode === "existing"
                    ? fullName(
                        clients.find((client) => client.id === Number(form.watch("client")))?.first_name,
                        clients.find((client) => client.id === Number(form.watch("client")))?.last_name,
                      )
                    : fullName(form.watch("first_name"), form.watch("last_name"))}</p>
                  <p><span className="text-muted-foreground">Fechas:</span> {form.watch("check_in")} → {form.watch("check_out")}</p>
                  <p><span className="text-muted-foreground">Total:</span> {formatCurrency(total)}</p>
                </div>
              </div>
              <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
                <FormField control={form.control} name="source" render={({ field }) => (
                  <FormItem><FormLabel>Source (opcional)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField
                  control={form.control}
                  name="agency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agencia (opcional)</FormLabel>
                      <Select value={field.value || "NONE"} onValueChange={(value) => field.onChange(value === "NONE" ? "" : value)}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecciona agencia" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NONE">Sin agencia</SelectItem>
                          {agencies.map((agency) => (
                            <SelectItem key={agency.id} value={String(agency.id)}>{agency.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>Notas</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>
          ) : null}

          <div className="flex justify-between">
            <Button type="button" variant="outline" disabled={step === 1} onClick={() => setStep((current) => current - 1)}>
              Atrás
            </Button>
            {step < 3 ? (
              <Button type="button" onClick={() => setStep((current) => current + 1)}>Continuar</Button>
            ) : (
              <Button disabled={createBooking.isPending || createClient.isPending || createCleaning.isPending || Boolean(overlappingBooking)}>
                {createBooking.isPending || createClient.isPending || createCleaning.isPending ? "Creando..." : "Crear reserva"}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
