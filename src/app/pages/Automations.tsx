import { useState } from "react";
import { BellRing, CalendarClock, CreditCard, MailCheck, Sparkles } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import PageHeader from "@/components/ui/PageHeader";
import { useAutomationWebhooks, useCreateAutomationWebhook } from "@/lib/hooks/useIntegrations";

const initialRules = [
  { id: 1, name: "Enviar instrucciones 24h antes del check-in", trigger: "Check-in mañana", icon: CalendarClock, active: true },
  { id: 2, name: "Recordar pago pendiente", trigger: "Pago vencido o incompleto", icon: CreditCard, active: true },
  { id: 3, name: "Crear tarea de limpieza al confirmar reserva", trigger: "Reserva confirmada", icon: Sparkles, active: true },
  { id: 4, name: "Avisar mantenimiento urgente", trigger: "Incidencia URGENT", icon: BellRing, active: false },
  { id: 5, name: "Email post estancia", trigger: "Check-out completado", icon: MailCheck, active: false },
];

export default function AutomationsPage() {
  const [rules, setRules] = useState(initialRules);
  const webhooksQuery = useAutomationWebhooks();
  const createWebhook = useCreateAutomationWebhook();
  const [webhook, setWebhook] = useState({
    name: "",
    event: "MAINTENANCE_CREATED",
    target: "N8N",
    url: "",
    secret: "",
  });
  const webhooks = webhooksQuery.data?.results ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automatizaciones"
        subtitle="Reglas listas para reducir tareas repetitivas en reservas, pagos, limpieza y comunicación."
        action={<Button onClick={() => document.getElementById("webhook-url")?.focus()}>Nuevo webhook</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {rules.map((rule) => {
            const Icon = rule.icon;
            return (
              <div key={rule.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-secondary p-2 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="font-medium">{rule.name}</p>
                    <p className="text-sm text-muted-foreground">Disparador: {rule.trigger}</p>
                  </div>
                </div>
                <Switch
                  checked={rule.active}
                  onCheckedChange={(checked) => {
                    setRules((current) => current.map((item) => item.id === rule.id ? { ...item, active: checked } : item));
                  }}
                />
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="font-semibold">n8n / WhatsApp / Telegram</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Crea un webhook saliente hacia n8n. Desde n8n puedes enviar WhatsApp, Telegram o actualizar de vuelta el gestor.
          </p>
          <div className="mt-5 grid gap-3">
            <Input placeholder="Nombre" value={webhook.name} onChange={(event) => setWebhook((current) => ({ ...current, name: event.target.value }))} />
            <select className="h-10 rounded-lg border border-input bg-input-background px-3" value={webhook.event} onChange={(event) => setWebhook((current) => ({ ...current, event: event.target.value }))}>
              <option value="CLIENT_CREATED">Cliente creado</option>
              <option value="BOOKING_CREATED">Reserva creada</option>
              <option value="MAINTENANCE_CREATED">Mantenimiento creado</option>
              <option value="MAINTENANCE_UPDATED">Mantenimiento actualizado</option>
              <option value="CHECKIN_COMPLETED">Check-in completado</option>
            </select>
            <Input id="webhook-url" placeholder="https://tu-n8n/webhook/..." value={webhook.url} onChange={(event) => setWebhook((current) => ({ ...current, url: event.target.value }))} />
            <Input placeholder="Secret opcional" value={webhook.secret} onChange={(event) => setWebhook((current) => ({ ...current, secret: event.target.value }))} />
            <Button disabled={!webhook.name || !webhook.url} onClick={() => createWebhook.mutate({ ...webhook, is_active: true })}>Guardar webhook</Button>
          </div>
          <div className="mt-5 space-y-2 text-sm">
            <div className="rounded-lg bg-muted p-3">Entrada n8n → gestor: POST /api/integrations/n8n/inbound/</div>
            {webhooks.map((item) => (
              <div key={item.id} className="rounded-lg border border-border p-3">
                <p className="font-medium">{item.name}</p>
                <p className="break-all text-xs text-muted-foreground">{item.event} · {item.url}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
