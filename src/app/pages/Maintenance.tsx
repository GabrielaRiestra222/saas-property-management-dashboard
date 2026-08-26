import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AlertCircle, LoaderCircle, Plus, RefreshCw } from "lucide-react";

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
import { Skeleton } from "@/app/components/ui/skeleton";
import { Textarea } from "@/app/components/ui/textarea";
import FormModal from "@/components/ui/FormModal";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useCreateMaintenance, useMaintenanceRequests, useUpdateMaintenanceStatus } from "@/lib/hooks/useMaintenance";
import { useProperties } from "@/lib/hooks/useProperties";
import { useTeamMembers } from "@/lib/hooks/useTeam";
import type { MaintenanceRequest } from "@/types";

const schema = z.object({
  property: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assigned_to: z.string().default(""),
  cost: z.string().default("0"),
});

type MaintenanceValues = z.infer<typeof schema>;

const columns: MaintenanceRequest["status"][] = ["OPEN", "IN_PROGRESS", "RESOLVED"];
const columnLabels: Record<MaintenanceRequest["status"], string> = {
  OPEN: "Abiertas",
  IN_PROGRESS: "En curso",
  RESOLVED: "Resueltas",
};

const priorityLabels: Record<MaintenanceRequest["priority"], string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export default function MaintenancePage() {
  const [open, setOpen] = useState(false);
  const maintenanceQuery = useMaintenanceRequests();
  const createMaintenance = useCreateMaintenance();
  const updateMaintenance = useUpdateMaintenanceStatus();
  const propertiesQuery = useProperties();
  const teamQuery = useTeamMembers();
  const form = useForm<MaintenanceValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      property: "",
      title: "",
      description: "",
      priority: "MEDIUM",
      assigned_to: "",
      cost: "0",
    },
  });

  const items = maintenanceQuery.data?.results ?? [];
  const teamMembers = teamQuery.data?.results ?? [];
  const memberNameById = new Map(teamMembers.map((member) => [
    member.id,
    [member.first_name, member.last_name].filter(Boolean).join(" ") || member.email,
  ]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mantenimiento"
        subtitle="Tablero kanban para incidencias abiertas, en curso y resueltas."
        action={<Button onClick={() => setOpen(true)}><Plus className="mr-2 size-4" />Nuevo parte</Button>}
      />

      {maintenanceQuery.isError ? (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4 text-[var(--danger)]">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-medium">No se pudo cargar el listado de incidencias.</p>
              <p className="text-sm text-[var(--danger)]">
                Comprueba que el backend esté activo en http://127.0.0.1:8000/api y que exista el endpoint /maintenance/.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => maintenanceQuery.refetch()}>
            <RefreshCw className="mr-2 size-4" />
            Reintentar
          </Button>
        </div>
      ) : null}

      {maintenanceQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {columns.map((column) => (
            <Skeleton key={column} className="h-[420px] rounded-xl" />
          ))}
        </div>
      ) : null}

      {!maintenanceQuery.isLoading && !maintenanceQuery.isError && items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <p className="font-medium text-foreground">No hay incidencias registradas.</p>
          <p className="mt-1 text-sm text-muted-foreground">Crea el primer parte para empezar a organizar mantenimiento.</p>
          <Button className="mt-5" onClick={() => setOpen(true)}>
            <Plus className="mr-2 size-4" />
            Nuevo parte
          </Button>
        </div>
      ) : null}

      {!maintenanceQuery.isLoading && !maintenanceQuery.isError && items.length > 0 ? (
      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map((column) => (
          <div
            key={column}
            className="min-h-[420px] rounded-xl border border-border bg-card p-4 shadow-sm"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const id = Number(event.dataTransfer.getData("text/plain"));
              if (id) {
                updateMaintenance.mutate({ id, status: column });
              }
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">{columnLabels[column]}</h3>
              <span className="rounded-full bg-muted px-3 py-1 text-xs">{items.filter((item) => item.status === column).length}</span>
            </div>
            <div className="space-y-3">
              {items.filter((item) => item.status === column).map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", String(item.id))}
                  className="cursor-grab rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.property_title ?? `Propiedad #${item.property}`}</p>
                    </div>
                    <StatusBadge status={item.status} type="maintenance" />
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{item.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-muted px-2 py-1">{priorityLabels[item.priority] ?? item.priority}</span>
                    <span className="rounded-full bg-muted px-2 py-1">
                      {item.assigned_to_name ?? (item.assigned_to ? memberNameById.get(item.assigned_to) : null) ?? "Sin asignar"}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-1">{formatDate(item.reported_at)}</span>
                    {Number(item.cost) > 0 ? <span className="rounded-full bg-muted px-2 py-1">{formatCurrency(Number(item.cost))}</span> : null}
                  </div>
                </div>
              ))}
              {items.filter((item) => item.status === column).length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                  Sin incidencias
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      ) : null}

      <FormModal title="Nuevo parte" isOpen={open} onClose={() => setOpen(false)}>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              await createMaintenance.mutateAsync({
                property: Number(values.property),
                title: values.title,
                description: values.description,
                priority: values.priority,
                status: "OPEN",
                assigned_to: values.assigned_to ? Number(values.assigned_to) : null,
                cost: values.cost,
              });
              form.reset();
              setOpen(false);
            })}
            className="grid gap-4"
          >
            <FormField control={form.control} name="property" render={({ field }) => (
              <FormItem>
                <FormLabel>Propiedad</FormLabel>
                <FormControl>
                  <select className="h-10 rounded-lg border border-input bg-input-background px-3 shadow-sm" {...field}>
                    <option value="">Selecciona propiedad</option>
                    {(propertiesQuery.data?.results ?? []).map((item) => (
                      <option key={item.id} value={String(item.id)}>{item.title}</option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="priority" render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridad</FormLabel>
                <FormControl>
                  <select className="h-10 rounded-lg border border-input bg-input-background px-3 shadow-sm" {...field}>
                    <option value="LOW">Baja</option>
                    <option value="MEDIUM">Media</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="assigned_to" render={({ field }) => (
              <FormItem>
                <FormLabel>Asignado a</FormLabel>
                <FormControl>
                  <select className="h-10 rounded-lg border border-input bg-input-background px-3 shadow-sm" {...field}>
                    <option value="">Sin asignar</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={String(member.id)}>
                        {[member.first_name, member.last_name].filter(Boolean).join(" ") || member.email}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="cost" render={({ field }) => (
              <FormItem><FormLabel>Coste estimado</FormLabel><FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex justify-end">
              <Button disabled={createMaintenance.isPending}>
                {createMaintenance.isPending ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
                Crear parte
              </Button>
            </div>
          </form>
        </Form>
      </FormModal>
    </div>
  );
}
