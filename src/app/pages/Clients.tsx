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
import { useImageUpload } from "@/lib/hooks/useImageUpload";
import type { Booking, Client } from "@/types";

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

function BookingContractPanel({ booking }: { booking: Booking }) {
  const { uploadFile, uploading } = useImageUpload();
  const storageKey = `booking-documents-${booking.id}`;
  const [documents, setDocuments] = useState<Array<{ name: string; url: string }>>(() => {
    const stored = localStorage.getItem(storageKey);
    const parsed = stored ? JSON.parse(stored) as Array<{ name: string; url: string }> : [];
    return booking.contract_url ? [{ name: "Contrato", url: booking.contract_url }, ...parsed] : parsed;
  });

  async function addContractPdf(fileList: File[]) {
    const pdfs = fileList.filter((file) => file.type === "application/pdf");
    if (!pdfs.length) {
      return;
    }

    const nextDocuments = [...documents];
    for (const pdf of pdfs) {
      const result = await uploadFile(pdf, { bookingId: booking.id, kind: "contract" });
      if (result) {
        nextDocuments.push({ name: result.filename || pdf.name, url: result.url });
      }
    }
    setDocuments(nextDocuments);
    localStorage.setItem(storageKey, JSON.stringify(nextDocuments));
  }

  return (
    <div className="mt-2">
      <div
        className="rounded-xl border-2 border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
        onDragOver={(event) => event.preventDefault()}
        onDrop={async (event) => {
          event.preventDefault();
          await addContractPdf(Array.from(event.dataTransfer.files));
        }}
      >
        <input
          id={`booking-contract-${booking.id}`}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={async (event) => {
            await addContractPdf(Array.from(event.target.files || []));
            event.target.value = "";
          }}
        />
        <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => document.getElementById(`booking-contract-${booking.id}`)?.click()}>
          {uploading ? "Subiendo..." : "Adjuntar contrato o documentos"}
        </Button>
        <span className="ml-2 text-xs">PDF</span>
      </div>
      {documents.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-2">
          {documents.map((document, index) => (
            <a key={`${document.name}-${index}`} href={document.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
              {document.name}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

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
                { key: "property", header: "Propiedad", render: (b) => (
                  <div>
                    <p>{b.apartment_title ?? `#${b.apartment}`}</p>
                    <BookingContractPanel booking={b} />
                  </div>
                ) },
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
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);

  const clientsQuery = useClients(search, page);
  const bookingsQuery = useBookings();
  const bookings = bookingsQuery.data?.results ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Clientes" subtitle="Directorio de huéspedes con acceso rápido al historial de reservas." />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <Input
          placeholder="Buscar por nombre o email"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </div>

      <DataTable<Client>
        loading={clientsQuery.isLoading}
        rows={clientsQuery.data?.results ?? []}
        emptyMessage="No se encontraron clientes."
        onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
        onNextPage={() => setPage((current) => current + 1)}
        hasPreviousPage={Boolean(clientsQuery.data?.previous)}
        hasNextPage={Boolean(clientsQuery.data?.next)}
        columns={[
          {
            key: "name",
            header: "Nombre completo",
            render: (client) => (
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => setDetailId(client.id)}>
                {fullName(client.first_name, client.last_name)}
              </button>
            ),
            sortValue: (client) => fullName(client.first_name, client.last_name).toLowerCase(),
          },
          { key: "email", header: "Email", render: (client) => client.email },
          { key: "phone", header: "Teléfono", render: (client) => client.phone || "-" },
          { key: "nationality", header: "Nacionalidad", render: (client) => client.nationality || "-" },
          {
            key: "bookings",
            header: "# Reservas",
            render: (client) => String(bookings.filter((booking) => booking.client === client.id).length),
            sortValue: (client) => bookings.filter((booking) => booking.client === client.id).length,
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
