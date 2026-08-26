import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";
import { Plus } from "lucide-react";

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
import DataTable from "@/components/ui/DataTable";
import FormModal from "@/components/ui/FormModal";
import PageHeader from "@/components/ui/PageHeader";
import { formatCurrency } from "@/lib/formatters";
import { useAgencies, useCreateAgency, useUpdateAgency } from "@/lib/hooks/useAgencies";
import { useTransactions } from "@/lib/hooks/useAccounting";
import type { Agency } from "@/types";

const schema = z.object({
  name: z.string().min(1),
  contact_name: z.string().default(""),
  email: z.string().email().or(z.literal("")),
  phone: z.string().default(""),
  commission_percentage: z.string().default("0"),
  contract_start: z.string().nullable().default(null),
  contract_end: z.string().nullable().default(null),
  is_active: z.boolean(),
  notes: z.string().default(""),
});

type AgencyValues = z.infer<typeof schema>;

export default function AgenciesPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Agency | null>(null);
  const agenciesQuery = useAgencies();
  const transactionsQuery = useTransactions();
  const createAgency = useCreateAgency();
  const updateAgency = useUpdateAgency();
  const form = useForm<AgencyValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      contact_name: "",
      email: "",
      phone: "",
      commission_percentage: "0",
      contract_start: null,
      contract_end: null,
      is_active: true,
      notes: "",
    },
  });

  function openForEdit(agency?: Agency) {
    const nextAgency = agency ?? null;
    setEditing(nextAgency);
    form.reset(
      nextAgency
        ? {
            name: nextAgency.name,
            contact_name: nextAgency.contact_name,
            email: nextAgency.email,
            phone: nextAgency.phone,
            commission_percentage: nextAgency.commission_percentage,
            contract_start: nextAgency.contract_start,
            contract_end: nextAgency.contract_end,
            is_active: nextAgency.is_active,
            notes: nextAgency.notes,
          }
        : {
            name: "",
            contact_name: "",
            email: "",
            phone: "",
            commission_percentage: "0",
            contract_start: null,
            contract_end: null,
            is_active: true,
            notes: "",
          },
    );
    setOpen(true);
  }

  const transactions = transactionsQuery.data?.results ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agencias"
        subtitle="Partners, contratos y comisión estimada generada."
        action={<Button onClick={() => openForEdit()}><Plus className="mr-2 size-4" />Nueva agencia</Button>}
      />

      <DataTable<Agency>
        loading={agenciesQuery.isLoading}
        rows={agenciesQuery.data?.results ?? []}
        emptyMessage="No hay agencias registradas."
        columns={[
          { key: "name", header: "Nombre", render: (agency) => agency.name },
          { key: "commission", header: "Comisión %", render: (agency) => `${agency.commission_percentage}%` },
          { key: "active", header: "Activa", render: (agency) => (agency.is_active ? "Sí" : "No") },
          {
            key: "contract",
            header: "Contrato",
            render: (agency) => `${agency.contract_start ?? "-"} / ${agency.contract_end ?? "-"}`,
          },
          {
            key: "generated",
            header: "Comisiones generadas",
            render: (agency) => {
              const total = transactions
                .filter((transaction) => transaction.subcategory.toLowerCase().includes(agency.name.toLowerCase()))
                .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
              return formatCurrency(total);
            },
          },
          {
            key: "actions",
            header: "Acciones",
            render: (agency) => <Button size="sm" variant="outline" onClick={() => openForEdit(agency)}>Editar</Button>,
          },
        ]}
      />

      <FormModal title={editing ? "Editar agencia" : "Nueva agencia"} isOpen={open} onClose={() => setOpen(false)}>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              if (editing) {
                await updateAgency.mutateAsync({ id: editing.id, payload: values });
              } else {
                await createAgency.mutateAsync(values);
              }
              setOpen(false);
            })}
            className="grid gap-4 md:grid-cols-2"
          >
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="contact_name" render={({ field }) => (
              <FormItem><FormLabel>Contacto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="commission_percentage" render={({ field }) => (
              <FormItem><FormLabel>Comisión %</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="contract_start" render={({ field }) => (
              <FormItem><FormLabel>Contrato inicio</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="contract_end" render={({ field }) => (
              <FormItem><FormLabel>Contrato fin</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
            <label className="flex items-center gap-2 rounded-md border border-border px-4 py-3 text-sm">
              <input type="checkbox" checked={form.watch("is_active")} onChange={(event) => form.setValue("is_active", event.target.checked)} />
              Agencia activa
            </label>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem className="md:col-span-2"><FormLabel>Notas</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="md:col-span-2 flex justify-end">
              <Button>{editing ? "Guardar cambios" : "Crear agencia"}</Button>
            </div>
          </form>
        </Form>
      </FormModal>
    </div>
  );
}
