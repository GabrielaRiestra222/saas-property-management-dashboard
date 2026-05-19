import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router";
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
import { Textarea } from "@/app/components/ui/textarea";
import DataTable from "@/components/ui/DataTable";
import PageHeader from "@/components/ui/PageHeader";
import { formatCurrency, formatDate, fullName } from "@/lib/formatters";
import { useBookings } from "@/lib/hooks/useBookings";
import { useClient, useUpdateClient } from "@/lib/hooks/useClients";
import type { Booking } from "@/types";

const schema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  document_id: z.string().optional(),
  nationality: z.string().optional(),
  passport: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof schema>;

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = Number(params.id);
  const clientQuery = useClient(clientId);
  const bookingsQuery = useBookings({ client: clientId });
  const updateClient = useUpdateClient();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      document_id: "",
      nationality: "",
      passport: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (clientQuery.data) {
      form.reset({
        first_name: clientQuery.data.first_name,
        last_name: clientQuery.data.last_name,
        email: clientQuery.data.email,
        phone: clientQuery.data.phone,
        document_id: clientQuery.data.document_id,
        nationality: clientQuery.data.nationality,
        passport: clientQuery.data.passport,
        notes: clientQuery.data.notes,
      });
    }
  }, [clientQuery.data, form]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={clientQuery.data ? fullName(clientQuery.data.first_name, clientQuery.data.last_name) : "Cliente"}
        subtitle="Ficha editable del huésped y su historial de reservas."
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(async (values) => {
                await updateClient.mutateAsync({ id: clientId, payload: values });
              })}
              className="space-y-4"
            >
              <FormField control={form.control} name="first_name" render={({ field }) => (
                <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="last_name" render={({ field }) => (
                <FormItem><FormLabel>Apellidos</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="document_id" render={({ field }) => (
                <FormItem><FormLabel>Documento</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="nationality" render={({ field }) => (
                <FormItem><FormLabel>Nacionalidad</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="passport" render={({ field }) => (
                <FormItem><FormLabel>Pasaporte</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notas</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <Button disabled={updateClient.isPending}>Guardar cambios</Button>
            </form>
          </Form>
        </div>

        <DataTable<Booking>
          loading={bookingsQuery.isLoading}
          rows={bookingsQuery.data?.results ?? []}
          emptyMessage="Este cliente todavía no tiene reservas."
          columns={[
            { key: "property", header: "Propiedad", render: (booking) => booking.apartment_title ?? `#${booking.apartment}` },
            { key: "checkin", header: "Check-in", render: (booking) => formatDate(booking.check_in) },
            { key: "checkout", header: "Check-out", render: (booking) => formatDate(booking.check_out) },
            { key: "total", header: "Total", render: (booking) => formatCurrency(booking.total_price) },
          ]}
        />
      </div>
    </div>
  );
}
