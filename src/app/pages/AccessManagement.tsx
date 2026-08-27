import { useState } from "react";
import { Plus, ShieldAlert } from "lucide-react";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import FormModal from "@/components/ui/FormModal";
import PageHeader from "@/components/ui/PageHeader";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useProperties, useUpdateProperty } from "@/lib/hooks/useProperties";
import { useCreateUser, useUpdateUser, useUsers } from "@/lib/hooks/useUsers";
import type { UserAccount, UserRole } from "@/types";

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  OWNER: "Propietario",
};

const ROLE_BADGE: Record<UserRole, string> = {
  ADMIN: "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger)]",
  MANAGER: "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info)]",
  OWNER: "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)]",
};

function NewUserModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const createUser = useCreateUser();
  const [form, setForm] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    role: "OWNER" as UserRole,
    password: "",
  });

  return (
    <FormModal
      title="Nuevo usuario"
      description="Crea un acceso con un rol concreto. Los propietarios solo verán sus propios apartamentos."
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input placeholder="Usuario" value={form.username} onChange={(e) => setForm((c) => ({ ...c, username: e.target.value }))} />
        <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
        <Input placeholder="Nombre" value={form.first_name} onChange={(e) => setForm((c) => ({ ...c, first_name: e.target.value }))} />
        <Input placeholder="Apellidos" value={form.last_name} onChange={(e) => setForm((c) => ({ ...c, last_name: e.target.value }))} />
        <Select value={form.role} onValueChange={(value) => setForm((c) => ({ ...c, role: value as UserRole }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="OWNER">Propietario — solo sus apartamentos</SelectItem>
            <SelectItem value="MANAGER">Manager — acceso operativo completo</SelectItem>
            <SelectItem value="ADMIN">Admin — acceso total</SelectItem>
          </SelectContent>
        </Select>
        <Input type="password" placeholder="Contraseña" value={form.password} onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))} />
      </div>
      <div className="mt-5 flex justify-end">
        <Button
          disabled={!form.username || !form.password || createUser.isPending}
          onClick={async () => {
            await createUser.mutateAsync(form);
            onClose();
            setForm({ username: "", email: "", first_name: "", last_name: "", role: "OWNER", password: "" });
          }}
        >
          Crear usuario
        </Button>
      </div>
    </FormModal>
  );
}

export default function AccessManagementPage() {
  const currentUser = useCurrentUser();
  const [open, setOpen] = useState(false);

  const usersQuery = useUsers();
  const propertiesQuery = useProperties();
  const updateUser = useUpdateUser();
  const updateProperty = useUpdateProperty();

  const users = usersQuery.data ?? [];
  const owners = users.filter((user) => user.role === "OWNER");
  const properties = propertiesQuery.data?.results ?? [];

  if (!currentUser.isAdmin) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <p className="font-medium">Solo un administrador puede gestionar usuarios y accesos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Usuarios y accesos"
        subtitle="Da de alta cuentas, asigna roles y decide qué apartamentos ve cada propietario."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 size-4" />
            Nuevo usuario
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-5">
          <h3 className="font-semibold tracking-tight">Cuentas</h3>
          <p className="text-sm text-muted-foreground">Cambia el rol de una cuenta para ajustar lo que puede ver en el CRM.</p>
        </div>
        <div className="divide-y divide-border">
          {usersQuery.isLoading ? (
            <p className="p-5 text-sm text-muted-foreground">Cargando...</p>
          ) : users.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No hay usuarios todavía.</p>
          ) : (
            users.map((user: UserAccount) => (
              <div key={user.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-[180px] flex-1">
                  <p className="font-medium">{[user.first_name, user.last_name].filter(Boolean).join(" ") || user.username}</p>
                  <p className="text-xs text-muted-foreground">{user.email || user.username}</p>
                </div>
                <Badge variant="outline" className={ROLE_BADGE[user.role]}>
                  {ROLE_LABELS[user.role]}
                </Badge>
                <Select
                  value={user.role}
                  onValueChange={(value) => updateUser.mutate({ id: user.id, payload: { role: value as UserRole } })}
                >
                  <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OWNER">Propietario — solo sus apartamentos</SelectItem>
                    <SelectItem value="MANAGER">Manager — acceso operativo completo</SelectItem>
                    <SelectItem value="ADMIN">Admin — acceso total</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateUser.mutate({ id: user.id, payload: { is_active: !user.is_active } })}
                >
                  {user.is_active ? "Desactivar" : "Activar"}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-5">
          <h3 className="font-semibold tracking-tight">Apartamentos por propietario</h3>
          <p className="text-sm text-muted-foreground">
            Asigna cada apartamento a una cuenta con rol Propietario. Esa cuenta solo verá reservas, limpieza, mantenimiento y pagos de sus propios apartamentos.
          </p>
        </div>
        <div className="divide-y divide-border">
          {propertiesQuery.isLoading ? (
            <p className="p-5 text-sm text-muted-foreground">Cargando...</p>
          ) : properties.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No hay apartamentos.</p>
          ) : (
            properties.map((property) => (
              <div key={property.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-[180px] flex-1">
                  <p className="font-medium">{property.title}</p>
                  <p className="text-xs text-muted-foreground">{property.location}</p>
                </div>
                <Select
                  value={property.owner ? String(property.owner) : "NONE"}
                  onValueChange={(value) =>
                    updateProperty.mutate({
                      id: property.id,
                      payload: { owner: value === "NONE" ? null : Number(value) },
                    })
                  }
                >
                  <SelectTrigger className="w-[260px]"><SelectValue placeholder="Sin propietario asignado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Sin propietario asignado</SelectItem>
                    {owners.map((owner) => (
                      <SelectItem key={owner.id} value={String(owner.id)}>
                        {[owner.first_name, owner.last_name].filter(Boolean).join(" ") || owner.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))
          )}
        </div>
        {owners.length === 0 ? (
          <p className="border-t border-border p-4 text-xs text-muted-foreground">
            Crea primero una cuenta con rol Propietario para poder asignarle apartamentos.
          </p>
        ) : null}
      </div>

      <NewUserModal isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
}
