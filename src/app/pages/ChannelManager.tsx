import { useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import PageHeader from "@/components/ui/PageHeader";
import { formatDate } from "@/lib/formatters";
import { useChannelConnections, useCreateChannelConnection, useSyncIcal } from "@/lib/hooks/useIntegrations";
import { useBookings } from "@/lib/hooks/useBookings";
import { useProperties } from "@/lib/hooks/useProperties";

const channels = [
  { name: "Airbnb", status: "Pendiente de conectar", color: "bg-slate-100 text-slate-700" },
  { name: "Booking.com", status: "Pendiente de conectar", color: "bg-slate-100 text-slate-700" },
  { name: "Vrbo", status: "Pendiente de conectar", color: "bg-slate-100 text-slate-700" },
  { name: "Expedia", status: "Pendiente de conectar", color: "bg-slate-100 text-slate-700" },
  { name: "Web directa", status: "Con catálogo local", color: "bg-emerald-100 text-emerald-700" },
];

export default function ChannelManagerPage() {
  const propertiesQuery = useProperties();
  const bookingsQuery = useBookings();
  const connectionsQuery = useChannelConnections();
  const createConnection = useCreateChannelConnection();
  const syncIcal = useSyncIcal();
  const [newConnection, setNewConnection] = useState({
    property: "",
    channel: "ICAL",
    ical_import_url: "",
    external_listing_id: "",
  });
  const properties = propertiesQuery.data?.results ?? [];
  const bookings = bookingsQuery.data?.results ?? [];
  const connections = connectionsQuery.data?.results ?? [];
  const published = properties.filter((property) => property.is_published);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Canales y web"
        subtitle="Centro de conexión para catálogo público, OTAs y sincronización de disponibilidad."
        action={
          <Button variant="outline" onClick={() => {
            void propertiesQuery.refetch();
            void bookingsQuery.refetch();
            void connectionsQuery.refetch();
          }}>
            <RefreshCw className="mr-2 size-4" />
            Actualizar
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Propiedades publicadas</p>
          <p className="mt-2 text-3xl font-semibold">{published.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Reservas sincronizables</p>
          <p className="mt-2 text-3xl font-semibold">{bookings.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">API conectada</p>
          <p className="mt-2 text-lg font-semibold">127.0.0.1:8000/api</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Conectores</h3>
            <p className="text-sm text-muted-foreground">Estado operativo de canales y catálogo.</p>
          </div>
          <Button asChild variant="outline">
            <a href="http://127.0.0.1:5174/" target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 size-4" />
              Abrir catálogo
            </a>
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {channels.map((channel) => (
            <div key={channel.name} className="rounded-xl border border-border p-4">
              <p className="font-medium">{channel.name}</p>
              <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${channel.color}`}>
                {channel.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="font-semibold">Conexiones iCal/API</h3>
          <div className="mt-4 space-y-3">
            {connections.map((connection) => (
              <div key={connection.id} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium">{connection.property_title} · {connection.channel}</p>
                  <p className="text-xs text-muted-foreground">
                    {connection.status} · {connection.last_sync_at ? formatDate(connection.last_sync_at, "dd MMM yyyy, HH:mm") : "Sin sincronizar"}
                  </p>
                </div>
                {connection.channel === "ICAL" ? (
                  <Button size="sm" variant="outline" onClick={() => syncIcal.mutate(connection.id)}>Sync iCal</Button>
                ) : null}
              </div>
            ))}
            {!connections.length ? <p className="text-sm text-muted-foreground">Todavía no hay conexiones guardadas.</p> : null}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="font-semibold">Añadir iCal</h3>
          <div className="mt-4 grid gap-3">
            <select className="h-10 rounded-lg border border-input bg-input-background px-3" value={newConnection.property} onChange={(event) => setNewConnection((current) => ({ ...current, property: event.target.value }))}>
              <option value="">Propiedad</option>
              {properties.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}
            </select>
            <Input placeholder="URL iCal de Airbnb/Booking/Vrbo" value={newConnection.ical_import_url} onChange={(event) => setNewConnection((current) => ({ ...current, ical_import_url: event.target.value }))} />
            <Input placeholder="ID externo opcional" value={newConnection.external_listing_id} onChange={(event) => setNewConnection((current) => ({ ...current, external_listing_id: event.target.value }))} />
            <Button disabled={!newConnection.property || !newConnection.ical_import_url} onClick={() => createConnection.mutate({
              property: Number(newConnection.property),
              channel: newConnection.channel,
              ical_import_url: newConnection.ical_import_url,
              external_listing_id: newConnection.external_listing_id,
              status: "CONNECTED",
            })}>
              Guardar conexión
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="font-semibold">Web catálogo localizada</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Ruta local: /Users/gabstone/Downloads/Property Management System Website
        </p>
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <div className="rounded-lg bg-muted p-3">Lee propiedades desde GET /api/properties/</div>
          <div className="rounded-lg bg-muted p-3">Debe exponer propiedades públicas sin token o con CORS/proxy dev</div>
          <div className="rounded-lg bg-muted p-3">Dev recomendado: puerto 5174 para no chocar con el dashboard</div>
          <div className="rounded-lg bg-muted p-3">Última revisión: {formatDate(new Date().toISOString())}</div>
          <div className="rounded-lg bg-muted p-3">Export iCal: /api/properties/&lt;id&gt;/ical/</div>
        </div>
      </div>
    </div>
  );
}
