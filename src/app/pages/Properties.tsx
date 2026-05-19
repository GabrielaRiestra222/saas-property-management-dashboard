import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DataTable from "@/components/ui/DataTable";
import PageHeader from "@/components/ui/PageHeader";
import { useDeleteProperty, useProperties, useUpdateProperty } from "@/lib/hooks/useProperties";
import { formatCurrency } from "@/lib/formatters";
import type { Property } from "@/types";

export default function PropertiesPage() {
  const propertiesQuery = useProperties();
  const updateProperty = useUpdateProperty();
  const deleteProperty = useDeleteProperty();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const properties = propertiesQuery.data?.results ?? [];
  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === deleteId) ?? null,
    [deleteId, properties],
  );

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
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          <p>No se pudieron cargar las propiedades.</p>
          <Button className="mt-4" onClick={() => void propertiesQuery.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : null}

      <DataTable<Property>
        loading={propertiesQuery.isLoading}
        rows={properties}
        emptyMessage="No hay propiedades. Crea la primera."
        columns={[
          {
            key: "image",
            header: "Imagen",
            render: (property) => {
              const image = property.images.find((item) => item.is_main) ?? property.images[0];
              return image ? (
                <img src={image.image_url} alt={property.title} className="h-14 w-20 rounded-xl object-cover" />
              ) : (
                <div className="flex h-14 w-20 items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground">
                  Sin imagen
                </div>
              );
            },
          },
          {
            key: "title",
            header: "Título",
            render: (property) => (
              <div>
                <p className="font-medium">{property.title}</p>
                <p className="text-xs text-muted-foreground">{property.slug}</p>
              </div>
            ),
          },
          {
            key: "location",
            header: "Ubicación",
            render: (property) => property.location,
          },
          {
            key: "price",
            header: "Precio / noche",
            render: (property) => formatCurrency(property.price_per_night),
          },
          {
            key: "rooms",
            header: "Habitaciones",
            render: (property) => `${property.rooms} hab.`,
          },
          {
            key: "status",
            header: "Estado",
            render: (property) => (
              <button
                type="button"
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  property.is_published
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
                onClick={() =>
                  updateProperty.mutate({
                    id: property.id,
                    payload: { is_published: !property.is_published },
                  })
                }
              >
                {property.is_published ? "Publicada" : "Borrador"}
              </button>
            ),
          },
          {
            key: "actions",
            header: "Acciones",
            render: (property) => (
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/property/${property.id}`}>Ver</Link>
                </Button>
                <Button asChild size="icon" variant="outline">
                  <Link to={`/cms/properties/${property.id}/edit`}>
                    <Pencil className="size-4" />
                  </Link>
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() =>
                    updateProperty.mutate({
                      id: property.id,
                      payload: { is_published: !property.is_published },
                    })
                  }
                >
                  <Eye className="size-4" />
                </Button>
                <Button size="icon" variant="outline" onClick={() => setDeleteId(property.id)}>
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
