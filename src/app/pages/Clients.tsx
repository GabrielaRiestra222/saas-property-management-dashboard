import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
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
import FormModal from "@/components/ui/FormModal";
import PageHeader from "@/components/ui/PageHeader";
import { formatCurrency, formatDate, fullName } from "@/lib/formatters";
import { useBookings } from "@/lib/hooks/useBookings";
import { useClient, useClients, useUpdateClient } from "@/lib/hooks/useClients";
import type { Client } from "@/types";

const editSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().default(""),
  document_id: z.string().optional().default(""),
  nationality: z.string().optional().default(""),
  passport: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

type EditFormValues = z.infer<typeof editSchema>;

function DetailModal({ clientId, onClose }: { clientId: number; onClose: () => void }) {
  const clientQuery = useClient(clientId);
  const bookingsQuery = useBookings({ client: clientId });
  const client = clientQuery.data;

  return (
    <div className="space-y-5">
      {clientQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : client ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><p className="text-xs text-muted-foreground">Nombre completo</p><p className="font-medium">{fullName(client.first_name, client.last_name)}</p></div>
            <div><p className="text-xs text-muted-foreground">Email</p><p>{client.email}</p></div>
            <div><p className="text-xs text-muted-foreground">Teléfono</p><p>{client.phone || "-"}</p></div>
            <div><p className="text-xs text-muted-foreground">Documento</p><p>{client.document_id || "-"}</p></div>
            <div><p className="text-xs text-muted-foreground">Nacionalidad</p><p>{client.nationality || "-"}</p></div>
            <div><p className="text-xs text-muted-foreground">Pasaporte</p><p>{client.passport || "-"}</p></div>
            <div><p className="text-xs text-muted-foreground">Registrado</p><p>{formatDate(client.created_at)}</p></div>
            {client.notes ? <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Notas</p><p className="text-sm">{client.notes}</p></div> : null}
          </div>

          <div>
            <p className="mb-3 text-sm font-medium">Historial de reservas</p>
            <DataTable
              loading={bookingsQuery.isLoading}
              rows={bookingsQuery.data?.results ?? []}
              emptyMessage="Sin reservas."
              columns={[
                { key: "property", header: "Propiedad", render: (b) => b.apartment_title ?? `#${b.apartment}` },
                { key: "checkin", header: "Check-in", render: (b) => formatDate(b.check_in) },
                { key: "checkout", header: "Check-out", render: (b) => formatDate(b.check_out) },
                { key: "total", header: "Total", render: (b) => formatCurrency(b.total_price) },
                { key: "status", header: "Estado", render: (b) => b.status },
              ]}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
            <Link to={`/clients/${client.id}`}>
              <Button>Ver ficha completa</Button>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

function EditModal({ clientId, onClose }: { clientId: number; onClose: () => void }) {
  const clientQuery = useClient(clientId);
  const updateClient = useUpdateClient();

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { first_name: "", last_name: "", email: "", phone: "", document_id: "", nationality: "", passport: "", notes: "" },
  });

  useEffect(() => {
    if (clientQuery.data) {
      form.reset({
        first_name: clientQuery.data.first_name,
        last_name: clientQuery.data.last_name,
        email: clientQuery.data.email,
        phone: clientQuery.data.phone ?? "",
        document_id: clientQuery.data.document_id ?? "",
        nationality: clientQuery.data.nationality ?? "",
        passport: clientQuery.data.passport ?? "",
        notes: clientQuery.data.notes ?? "",
      });
    }
  }, [clientQuery.data, form]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          await updateClient.mutateAsync({ id: clientId, payload: values });
          onClose();
        })}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
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
            <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="document_id" render={({ field }) => (
            <FormItem><FormLabel>Documento</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="nationality" render={({ field }) => (
            <FormItem><FormLabel>Nacionalidad</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="passport" render={({ field }) => (
            <FormItem><FormLabel>Pasaporte</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem className="sm:col-span-2"><FormLabel>Notas</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={updateClient.isPending}>Guardar cambios</Button>
        </div>
      </form>
    </Form>
  );
}

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);

  const clientsQuery = useClients(search);
  const bookingsQuery = useBookings();
  const bookings = bookingsQuery.data?.results ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Clientes" subtitle="Directorio de huéspedes con acceso rápido al historial de reservas." />

      <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
        <Input placeholder="Buscar por nombre o email" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>

      <DataTable<Client>
        loading={clientsQuery.isLoading}
        rows={clientsQuery.data?.results ?? []}
        emptyMessage="No se encontraron clientes."
        columns={[
          {
            key: "name",
            header: "Nombre completo",
            render: (client) => (
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => setDetailId(client.id)}>
                {fullName(client.first_name, client.last_name)}
              </button>
            ),
          },
          { key: "email", header: "Email", render: (client) => client.email },
          { key: "phone", header: "Teléfono", render: (client) => client.phone || "-" },
          { key: "nationality", header: "Nacionalidad", render: (client) => client.nationality || "-" },
          {
            key: "bookings",
            header: "# Reservas",
            render: (client) => String(bookings.filter((booking) => booking.client === client.id).length),
          },
          {
            key: "actions",
            header: "",
            render: (client) => (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setDetailId(client.id)}>Ver detalles</Button>
                <Button size="sm" variant="outline" onClick={() => setEditId(client.id)}>Editar</Button>
              </div>
            ),
          },
        ]}
      />

      <FormModal title="Detalle del cliente" isOpen={detailId !== null} onClose={() => setDetailId(null)}>
        {detailId !== null ? <DetailModal clientId={detailId} onClose={() => setDetailId(null)} /> : null}
      </FormModal>

      <FormModal title="Editar cliente" isOpen={editId !== null} onClose={() => setEditId(null)}>
        {editId !== null ? <EditModal clientId={editId} onClose={() => setEditId(null)} /> : null}
      </FormModal>
    </div>
  );
}
