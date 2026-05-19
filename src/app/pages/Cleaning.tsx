import { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, type Event } from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
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
import FormModal from "@/components/ui/FormModal";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { useCleaningTasks, useCreateCleaningTask, useUpdateCleaningStatus } from "@/lib/hooks/useCleaning";
import { useProperties } from "@/lib/hooks/useProperties";
import type { CleaningTask } from "@/types";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: es }),
  getDay,
  locales: { es },
});

export default function CleaningPage() {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [status, setStatus] = useState("ALL");
  const [property, setProperty] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [open, setOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    property: "",
    scheduled_date: "",
    assigned_to: "",
    fee: "",
    notes: "",
  });

  const propertiesQuery = useProperties();
  const cleaningQuery = useCleaningTasks({
    status: status !== "ALL" ? status : undefined,
    property: property !== "ALL" ? property : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });
  const createCleaningTask = useCreateCleaningTask();
  const updateCleaningStatus = useUpdateCleaningStatus();

  const tasks = cleaningQuery.data?.results ?? [];
  const calendarEvents: Event[] = useMemo(
    () =>
      tasks.map((task) => ({
        title: `${task.property_title ?? `Propiedad #${task.property}`} · ${task.status}`,
        start: new Date(task.scheduled_date),
        end: new Date(task.scheduled_date),
        resource: task,
      })),
    [tasks],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Limpieza"
        subtitle="Vista de lista y calendario para organizar las tareas del equipo."
        action={<Button onClick={() => setOpen(true)}><Plus className="mr-2 size-4" />Nueva tarea de limpieza</Button>}
      />

      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-sm lg:flex-row">
        <div className="flex gap-2">
          <Button variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>Lista</Button>
          <Button variant={view === "calendar" ? "default" : "outline"} onClick={() => setView("calendar")}>Calendario</Button>
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full lg:w-[180px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="PENDING">PENDING</SelectItem>
            <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
            <SelectItem value="DONE">DONE</SelectItem>
          </SelectContent>
        </Select>
        <Select value={property} onValueChange={setProperty}>
          <SelectTrigger className="w-full lg:w-[220px]"><SelectValue placeholder="Propiedad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            {(propertiesQuery.data?.results ?? []).map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>{item.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
      </div>

      {view === "list" ? (
        <DataTable<CleaningTask>
          loading={cleaningQuery.isLoading}
          rows={tasks}
          emptyMessage="No hay tareas de limpieza."
          columns={[
            { key: "property", header: "Propiedad", render: (task) => task.property_title ?? `#${task.property}` },
            { key: "booking", header: "Reserva ref", render: (task) => (task.booking ? `#${task.booking}` : "-") },
            { key: "date", header: "Fecha", render: (task) => task.scheduled_date },
            { key: "assigned", header: "Asignado", render: (task) => task.assigned_to || "-" },
            { key: "status", header: "Estado", render: (task) => <StatusBadge status={task.status} type="cleaning" /> },
            { key: "fee", header: "Tarifa", render: (task) => task.fee },
            {
              key: "action",
              header: "Actualizar",
              render: (task) => (
                <Select value={task.status} onValueChange={(next) => updateCleaningStatus.mutate({ id: task.id, status: next as CleaningTask["status"] })}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">PENDING</SelectItem>
                    <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                    <SelectItem value="DONE">DONE</SelectItem>
                  </SelectContent>
                </Select>
              ),
            },
          ]}
        />
      ) : (
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="h-[680px]">
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              eventPropGetter={(event) => {
                const task = event.resource as CleaningTask;
                const style =
                  task.status === "DONE"
                    ? { backgroundColor: "#16a34a" }
                    : task.status === "IN_PROGRESS"
                      ? { backgroundColor: "#2563eb" }
                      : { backgroundColor: "#f59e0b" };
                return { style };
              }}
              onSelectEvent={(event) => {
                const task = event.resource as CleaningTask;
                updateCleaningStatus.mutate({
                  id: task.id,
                  status: task.status === "PENDING" ? "IN_PROGRESS" : "DONE",
                });
              }}
            />
          </div>
        </div>
      )}

      <FormModal title="Nueva tarea de limpieza" isOpen={open} onClose={() => setOpen(false)}>
        <div className="grid gap-4">
          <Select value={newTask.property} onValueChange={(value) => setNewTask((current) => ({ ...current, property: value }))}>
            <SelectTrigger><SelectValue placeholder="Propiedad" /></SelectTrigger>
            <SelectContent>
              {(propertiesQuery.data?.results ?? []).map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>{item.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={newTask.scheduled_date} onChange={(event) => setNewTask((current) => ({ ...current, scheduled_date: event.target.value }))} />
          <Input placeholder="Asignado a" value={newTask.assigned_to} onChange={(event) => setNewTask((current) => ({ ...current, assigned_to: event.target.value }))} />
          <Input placeholder="Tarifa" value={newTask.fee} onChange={(event) => setNewTask((current) => ({ ...current, fee: event.target.value }))} />
          <Input placeholder="Notas" value={newTask.notes} onChange={(event) => setNewTask((current) => ({ ...current, notes: event.target.value }))} />
          <div className="flex justify-end">
            <Button
              onClick={async () => {
                await createCleaningTask.mutateAsync({
                  property: Number(newTask.property),
                  booking: null,
                  assigned_to: newTask.assigned_to,
                  scheduled_date: newTask.scheduled_date,
                  status: "PENDING",
                  notes: newTask.notes,
                  fee: newTask.fee,
                });
                setOpen(false);
              }}
            >
              Guardar
            </Button>
          </div>
        </div>
      </FormModal>
    </div>
  );
}
