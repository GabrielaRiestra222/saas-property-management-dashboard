import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { UserCircle } from "lucide-react";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
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
import FormModal from "@/components/ui/FormModal";
import PageHeader from "@/components/ui/PageHeader";
import { formatDate, fullName } from "@/lib/formatters";
import { useCleaningTasks } from "@/lib/hooks/useCleaning";
import { useMaintenanceRequests } from "@/lib/hooks/useMaintenance";
import {
  useCreateTeamMember,
  useTeamMember,
  useTeamMembers,
  useUpdateTeamMember,
} from "@/lib/hooks/useTeam";
import type { TeamMember, TeamMemberRole } from "@/types";

const ROLE_CONFIG: Record<TeamMemberRole, { label: string; color: string }> = {
  CLEANER: { label: "Limpieza", color: "#10b981" },
  CHECKIN: { label: "Check-in", color: "#3b82f6" },
  MAINTENANCE: { label: "Mantenimiento", color: "#f59e0b" },
  ADMIN: { label: "Admin", color: "#8b5cf6" },
};

const memberSchema = z.object({
  first_name: z.string().min(1, "Requerido"),
  last_name: z.string().min(1, "Requerido"),
  email: z.string().email("Email inválido"),
  phone: z.string().default(""),
  role: z.enum(["CLEANER", "CHECKIN", "MAINTENANCE", "ADMIN"]),
  photo: z.string().default(""),
  notes: z.string().default(""),
  is_active: z.boolean().default(true),
});

type MemberFormValues = z.infer<typeof memberSchema>;

function RoleBadge({ role }: { role: TeamMemberRole }) {
  const config = ROLE_CONFIG[role];
  return (
    <Badge style={{ backgroundColor: config.color, color: "#fff", borderColor: "transparent" }}>
      {config.label}
    </Badge>
  );
}

function MemberForm({
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
}: {
  defaultValues?: Partial<MemberFormValues>;
  onSubmit: (values: MemberFormValues) => Promise<void>;
  isPending: boolean;
  onCancel: () => void;
}) {
  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      role: "CLEANER",
      photo: "",
      notes: "",
      is_active: true,
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
          <FormField control={form.control} name="role" render={({ field }) => (
            <FormItem>
              <FormLabel>Rol</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="photo" render={({ field }) => (
            <FormItem><FormLabel>URL de foto</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem className="sm:col-span-2"><FormLabel>Notas</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isPending}>Guardar</Button>
        </div>
      </form>
    </Form>
  );
}

function MemberDetailDialog({ memberId, onClose, onEdit }: { memberId: number; onClose: () => void; onEdit: () => void }) {
  const memberQuery = useTeamMember(memberId);
  const cleaningQuery = useCleaningTasks();
  const maintenanceQuery = useMaintenanceRequests();
  const updateMember = useUpdateTeamMember();
  const member = memberQuery.data;

  const pendingCleanings = (cleaningQuery.data?.results ?? []).filter(
    (t) => t.assigned_to === fullName(member?.first_name, member?.last_name) && t.status !== "DONE",
  );
  const doneCleanings = (cleaningQuery.data?.results ?? []).filter(
    (t) => t.assigned_to === fullName(member?.first_name, member?.last_name) && t.status === "DONE",
  );
  const pendingMaintenance = (maintenanceQuery.data?.results ?? []).filter(
    (t) => t.assigned_to === fullName(member?.first_name, member?.last_name) && t.status !== "RESOLVED",
  );

  if (!member) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        {member.photo ? (
          <img src={member.photo} alt={fullName(member.first_name, member.last_name)} className="size-16 rounded-full object-cover" />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full bg-muted">
            <UserCircle className="size-10 text-muted-foreground" />
          </div>
        )}
        <div>
          <p className="text-lg font-semibold">{fullName(member.first_name, member.last_name)}</p>
          <RoleBadge role={member.role} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <div><p className="text-xs text-muted-foreground">Email</p><p>{member.email}</p></div>
        <div><p className="text-xs text-muted-foreground">Teléfono</p><p>{member.phone || "-"}</p></div>
        <div><p className="text-xs text-muted-foreground">Estado</p><p>{member.is_active ? "Activo" : "Inactivo"}</p></div>
        <div><p className="text-xs text-muted-foreground">Desde</p><p>{formatDate(member.created_at)}</p></div>
        {member.notes ? <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Notas</p><p>{member.notes}</p></div> : null}
      </div>

      {pendingCleanings.length > 0 || pendingMaintenance.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium">Tareas pendientes ({pendingCleanings.length + pendingMaintenance.length})</p>
          <div className="space-y-1">
            {pendingCleanings.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                <span>Limpieza · {t.property_title ?? `#${t.property}`}</span>
                <span className="text-xs text-muted-foreground">{formatDate(t.scheduled_date)}</span>
              </div>
            ))}
            {pendingMaintenance.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                <span>Mantenimiento · {t.title}</span>
                <Badge variant="outline">{t.priority}</Badge>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {doneCleanings.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium">Historial completado ({doneCleanings.length})</p>
          <div className="space-y-1">
            {doneCleanings.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground">
                <span>Limpieza · {t.property_title ?? `#${t.property}`}</span>
                <span className="text-xs">{formatDate(t.scheduled_date)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={async () => {
            await updateMember.mutateAsync({ id: member.id, payload: { is_active: !member.is_active } });
          }}
          disabled={updateMember.isPending}
        >
          {member.is_active ? "Desactivar" : "Activar"}
        </Button>
        <Button variant="outline" onClick={onEdit}>Editar</Button>
        <Button variant="outline" onClick={onClose}>Cerrar</Button>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const teamQuery = useTeamMembers(search || undefined);
  const memberQuery = useTeamMember(editId ?? undefined);
  const createMember = useCreateTeamMember();
  const updateMember = useUpdateTeamMember();

  const members = teamQuery.data?.results ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipo"
        subtitle="Gestiona los miembros del equipo, sus roles y tareas asignadas."
        action={<Button onClick={() => setCreateOpen(true)}>+ Añadir miembro</Button>}
      />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <Input
          placeholder="Buscar por nombre o email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {teamQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border border-border bg-muted" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground shadow-sm">
          No hay miembros en el equipo todavía.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              onView={() => setDetailId(member.id)}
              onEdit={() => setEditId(member.id)}
              onToggleActive={async () => {
                await updateMember.mutateAsync({ id: member.id, payload: { is_active: !member.is_active } });
              }}
            />
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={detailId !== null} onOpenChange={(open) => { if (!open) setDetailId(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ficha del miembro</DialogTitle>
          </DialogHeader>
          {detailId !== null ? (
            <MemberDetailDialog
              memberId={detailId}
              onClose={() => setDetailId(null)}
              onEdit={() => { setEditId(detailId); setDetailId(null); }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <FormModal title="Editar miembro" isOpen={editId !== null} onClose={() => setEditId(null)}>
        {editId !== null && memberQuery.data ? (
          <MemberForm
            defaultValues={{
              first_name: memberQuery.data.first_name,
              last_name: memberQuery.data.last_name,
              email: memberQuery.data.email,
              phone: memberQuery.data.phone,
              role: memberQuery.data.role,
              photo: memberQuery.data.photo,
              notes: memberQuery.data.notes,
              is_active: memberQuery.data.is_active,
            }}
            onSubmit={async (values) => {
              await updateMember.mutateAsync({ id: editId, payload: values });
              setEditId(null);
            }}
            isPending={updateMember.isPending}
            onCancel={() => setEditId(null)}
          />
        ) : null}
      </FormModal>

      {/* Create modal */}
      <FormModal title="Añadir miembro" isOpen={createOpen} onClose={() => setCreateOpen(false)}>
        <MemberForm
          onSubmit={async (values) => {
            await createMember.mutateAsync(values);
            setCreateOpen(false);
          }}
          isPending={createMember.isPending}
          onCancel={() => setCreateOpen(false)}
        />
      </FormModal>
    </div>
  );
}

function MemberCard({
  member,
  onView,
  onEdit,
  onToggleActive,
}: {
  member: TeamMember;
  onView: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-opacity ${member.is_active ? "opacity-100" : "opacity-60"}`}
    >
      <div className="mb-4 flex items-start gap-3">
        <button type="button" onClick={onView} className="shrink-0">
          {member.photo ? (
            <img src={member.photo} alt={fullName(member.first_name, member.last_name)} className="size-12 rounded-full object-cover" />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <UserCircle className="size-8 text-muted-foreground" />
            </div>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={onView} className="text-left">
            <p className="font-medium leading-tight">{fullName(member.first_name, member.last_name)}</p>
          </button>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{member.email}</p>
          <div className="mt-1.5">
            <RoleBadge role={member.role} />
          </div>
        </div>
      </div>

      {member.phone ? <p className="mb-3 text-xs text-muted-foreground">{member.phone}</p> : null}

      <div className="mt-auto flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={onEdit}>Editar</Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onToggleActive}
          className={member.is_active ? "text-destructive hover:text-destructive" : ""}
        >
          {member.is_active ? "Desactivar" : "Activar"}
        </Button>
      </div>
    </div>
  );
}
