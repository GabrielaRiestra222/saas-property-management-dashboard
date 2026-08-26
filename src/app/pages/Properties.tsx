import { useMemo, useState } from "react";
import { Link } from "react-router";
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, Eye, ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DataTable from "@/components/ui/DataTable";
import PageHeader from "@/components/ui/PageHeader";
import { useDeleteProperty, useProperties, useUpdateProperty } from "@/lib/hooks/useProperties";
import { formatCurrency } from "@/lib/formatters";
import type { Property } from "@/types";
import { resolveMediaUrl } from "@/lib/api";

type PropertyKindFilter = "ALL" | "APARTMENTS" | "SHARED_FLATS";
type PropertySortKey = "number" | "title" | "owner" | "price" | "capacity" | "status" | "completion";
type SortDirection = "asc" | "desc";

function getImageSrc(image?: Property["images"][number]) {
  return resolveMediaUrl(image?.image || image?.image_url);
}

function firstLine(value?: string[]) {
  return Array.isArray(value) ? value[0] ?? "" : "";
}

function propertyField(property: Property, key: string) {
  const direct = property[key as keyof Property];
  return typeof direct === "string" ? direct : firstLine(property.equipment?.[key]);
}

function propertyNumber(property: Property) {
  return propertyField(property, "apartment_number") || propertyField(property, "unit_number") || String(property.id);
}

function propertyNumberSortValue(property: Property) {
  const rawNumber = propertyNumber(property);
  const numericPrefix = rawNumber.match(/\d+/)?.[0];
  return numericPrefix ? Number(numericPrefix) : Number.MAX_SAFE_INTEGER;
}

function propertyKind(property: Property) {
  const pricingModel = propertyField(property, "pricing_model");
  const rentalType = propertyField(property, "rental_type");
  const housingType = propertyField(property, "housing_type");
  const isSharedFlat = [pricingModel, rentalType, housingType].some((value) =>
    value.toLowerCase().includes("room") ||
    value.toLowerCase().includes("habitacion") ||
    value.toLowerCase().includes("pisos_alquilados_por_habitaciones") ||
    value.toLowerCase().includes("piso_compartido") ||
    value.toLowerCase().includes("coliving"),
  );

  return isSharedFlat ? "SHARED_FLATS" : "APARTMENTS";
}

const HOUSING_TYPE_LABELS: Record<string, string> = {
  PISO: "Piso",
  APARTAMENTO: "Apartamento",
  ESTUDIO: "Estudio",
  LOCAL: "Local",
};

function propertyKindLabel(property: Property) {
  if (propertyKind(property) === "SHARED_FLATS") {
    return "Piso por habitaciones";
  }
  const housingType = propertyField(property, "housing_type").toUpperCase();
  return HOUSING_TYPE_LABELS[housingType] ?? "Apartamento";
}

function propertyCompletion(property: Property) {
  const hasPrice = Boolean(
    propertyField(property, "price_1_month") ||
      property.price_per_night ||
      propertyField(property, "price_15_days"),
  );
  const checks = [
    { label: "descripción", done: Boolean(property.description?.trim()) },
    { label: "foto principal", done: property.images.some((image) => image.is_main) || property.images.length > 0 },
    { label: "ubicación", done: Boolean(property.address || property.location || propertyField(property, "city")) },
    { label: "precio", done: hasPrice },
    { label: "capacidad", done: Boolean(property.max_guests && property.rooms && property.bathrooms) },
    { label: "normas", done: Boolean(property.rules?.trim()) },
    { label: "horarios", done: Boolean(property.check_in_time && property.check_out_time) },
    { label: "servicios", done: property.amenities.length > 0 || Object.keys(property.equipment ?? {}).length > 0 },
  ];
  const missing = checks.filter((item) => !item.done).map((item) => item.label);
  return {
    percent: Math.round(((checks.length - missing.length) / checks.length) * 100),
    missing,
  };
}

function propertyPriceSortValue(property: Property) {
  const rawValue = propertyField(property, "price_1_month") || propertyField(property, "room_price_note") || property.price_per_night;
  const numericValue = Number(String(rawValue).replace(",", ".").match(/\d+(\.\d+)?/)?.[0] ?? 0);
  return Number.isNaN(numericValue) ? 0 : numericValue;
}

function statusLabel(property: Property) {
  if (!property.is_active) return { label: "Oculta", className: "bg-slate-100 text-slate-700" };
  if (property.is_published) return { label: "Publicada", className: "bg-[var(--success-bg)] text-[var(--success)]" };
  return { label: "Borrador", className: "bg-[var(--warning-bg)] text-[var(--warning)]" };
}

export default function PropertiesPage() {
  const propertiesQuery = useProperties();
  const updateProperty = useUpdateProperty();
  const deleteProperty = useDeleteProperty();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [kindFilter, setKindFilter] = useState<PropertyKindFilter>("ALL");
  const [sortConfig, setSortConfig] = useState<{ key: PropertySortKey; direction: SortDirection }>({
    key: "number",
    direction: "asc",
  });

  const properties = propertiesQuery.data?.results ?? [];
  const filteredProperties = useMemo(
    () =>
      properties
        .filter((property) => kindFilter === "ALL" || propertyKind(property) === kindFilter)
        .toSorted((a, b) => {
          if (sortConfig.key === "number" && kindFilter === "ALL" && propertyKind(a) !== propertyKind(b)) {
            return propertyKind(a) === "APARTMENTS" ? -1 : 1;
          }

          const valueDiff = (() => {
            switch (sortConfig.key) {
              case "number":
                return propertyNumberSortValue(a) - propertyNumberSortValue(b);
              case "title":
                return a.title.localeCompare(b.title, "es", { numeric: true, sensitivity: "base" });
              case "owner":
                return propertyField(a, "owner_name").localeCompare(propertyField(b, "owner_name"), "es", { sensitivity: "base" });
              case "price":
                return propertyPriceSortValue(a) - propertyPriceSortValue(b);
              case "capacity":
                return a.max_guests - b.max_guests || a.rooms - b.rooms || a.bathrooms - b.bathrooms;
              case "status":
                return statusLabel(a).label.localeCompare(statusLabel(b).label, "es", { sensitivity: "base" });
              case "completion":
                return propertyCompletion(a).percent - propertyCompletion(b).percent;
              default:
                return 0;
            }
          })();

          const directedDiff = sortConfig.direction === "asc" ? valueDiff : -valueDiff;
          return directedDiff || propertyNumberSortValue(a) - propertyNumberSortValue(b);
        }),
    [kindFilter, properties, sortConfig],
  );
  const apartmentCount = useMemo(
    () => properties.filter((property) => propertyKind(property) === "APARTMENTS").length,
    [properties],
  );
  const sharedFlatCount = properties.length - apartmentCount;
  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === deleteId) ?? null,
    [deleteId, properties],
  );
  const handleSort = (key: PropertySortKey) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };
  const SortHeader = ({ label, sortKey }: { label: string; sortKey: PropertySortKey }) => {
    const active = sortConfig.key === sortKey;
    const Icon = active ? (sortConfig.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md px-1 py-1 text-left font-medium transition-colors hover:bg-muted"
        onClick={() => handleSort(sortKey)}
      >
        {label}
        <Icon className={`size-3.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Propiedades"
        subtitle="Gestiona la disponibilidad, publicación y edición de tus apartamentos."
        action={
          <Button asChild>
            <Link to="/cms/properties/new">
              <Plus className="mr-2 size-4" />
              Nueva propiedad
            </Link>
          </Button>
        }
      />

      {propertiesQuery.isError ? (
        <div className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-6 text-[var(--danger)]">
          <p>No se pudieron cargar las propiedades.</p>
          <Button className="mt-4" onClick={() => void propertiesQuery.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div>
          <p className="text-sm font-medium">Catálogo</p>
          <p className="text-xs text-muted-foreground">
            {filteredProperties.length} visibles · {apartmentCount} apartamentos · {sharedFlatCount} pisos por habitaciones
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "ALL", label: `Todos (${properties.length})` },
            { value: "APARTMENTS", label: `Apartamentos (${apartmentCount})` },
            { value: "SHARED_FLATS", label: `Pisos por habitaciones (${sharedFlatCount})` },
          ].map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={kindFilter === item.value ? "default" : "outline"}
              onClick={() => setKindFilter(item.value as PropertyKindFilter)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <DataTable<Property>
        loading={propertiesQuery.isLoading}
        rows={filteredProperties}
        emptyMessage="No hay propiedades para este filtro."
        columns={[
          {
            key: "number",
            header: <SortHeader label="Nº" sortKey="number" />,
            className: "w-16",
            render: (property) => (
              <div className="flex flex-col">
                <span className="text-sm font-semibold tabular-nums">{propertyNumber(property)}</span>
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {propertyKindLabel(property)}
                </span>
              </div>
            ),
          },
          {
            key: "title",
            header: <SortHeader label="Título" sortKey="title" />,
            className: "min-w-64",
            render: (property) => {
              const image = property.images.find((item) => item.is_main) ?? property.images[0];
              const imageSrc = getImageSrc(image);

              return (
              <div className="flex items-center gap-2">
                {imageSrc ? (
                  <div className="relative size-10 overflow-hidden rounded-md border border-border bg-muted">
                    <img src={imageSrc} alt={property.title} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex size-10 items-center justify-center rounded-md border border-dashed border-border bg-muted text-muted-foreground">
                    <ImageIcon className="size-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium">{property.title}</p>
                  <p className="max-w-[360px] truncate text-xs text-muted-foreground">
                    {property.address || property.location || property.slug}
                  </p>
                </div>
              </div>
              );
            },
          },
          {
            key: "owner",
            header: <SortHeader label="Propietario" sortKey="owner" />,
            render: (property) => propertyField(property, "owner_name") || "-",
          },
          {
            key: "price",
            header: <SortHeader label="Precio" sortKey="price" />,
            render: (property) => propertyField(property, "price_1_month") ? `${formatCurrency(propertyField(property, "price_1_month"))} / mes` : formatCurrency(property.price_per_night),
          },
          {
            key: "capacity",
            header: <SortHeader label="Capacidad" sortKey="capacity" />,
            render: (property) => (
              <div className="text-sm">
                <p>{property.max_guests} huéspedes</p>
                <p className="text-xs text-muted-foreground">
                  {property.rooms} hab. · {property.bathrooms} baños
                </p>
              </div>
            ),
          },
          {
            key: "status",
            header: <SortHeader label="Estado" sortKey="status" />,
            render: (property) => {
              const status = statusLabel(property);
              return (
                <button
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}
                  onClick={() =>
                    updateProperty.mutate({
                      id: property.id,
                      payload: { is_published: !property.is_published },
                    })
                  }
                >
                  {status.label}
                </button>
              );
            },
          },
          {
            key: "completion",
            header: <SortHeader label="Web" sortKey="completion" />,
            render: (property) => {
              const completion = propertyCompletion(property);
              const ready = completion.missing.length === 0;
              return (
                <div className="min-w-28">
                  <div className="flex items-center gap-1.5">
                    {ready ? (
                      <CheckCircle2 className="size-4 text-[var(--success)]" />
                    ) : (
                      <AlertTriangle className="size-4 text-[var(--warning)]" />
                    )}
                    <span className="text-sm font-medium">{completion.percent}% completo</span>
                  </div>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {ready ? "Listo para publicar" : `Falta: ${completion.missing.slice(0, 2).join(", ")}`}
                  </p>
                </div>
              );
            },
          },
          {
            key: "actions",
            header: "Acciones",
            render: (property) => (
              <div className="flex items-center gap-1">
                <Button asChild size="icon" variant="outline" title="Ver ficha">
                  <Link to={`/property/${property.id}`}>
                    <Eye className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="icon" variant="outline" title="Editar">
                  <Link to={`/cms/properties/${property.id}/edit`}>
                    <Pencil className="size-4" />
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    updateProperty.mutate({
                      id: property.id,
                      payload: { is_published: !property.is_published },
                    })
                  }
                >
                  {property.is_published ? "Ocultar" : "Publicar"}
                </Button>
                <Button size="icon" variant="outline" title="Eliminar" onClick={() => setDeleteId(property.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ),
          },
        ]}
      />

      <ConfirmDialog
        open={Boolean(selectedProperty)}
        title="Eliminar propiedad"
        description={`Esta acción eliminará ${selectedProperty?.title ?? "la propiedad"} y no se puede deshacer.`}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            deleteProperty.mutate(deleteId, {
              onSettled: () => setDeleteId(null),
            });
          }
        }}
        confirmLabel="Eliminar"
      />
    </div>
  );
}
