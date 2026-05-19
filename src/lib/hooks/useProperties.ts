import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

import api from "@/lib/api";
import type { CalendarBlock, PaginatedResponse, Property, PropertyPayload } from "@/types";

function getApiErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return "";
  }

  const detail = error.response?.data;
  if (!detail) {
    return "";
  }

  if (typeof detail === "string") {
    return detail;
  }

  if (detail.detail) {
    return String(detail.detail);
  }

  return JSON.stringify(detail);
}

export function useProperties() {
  return useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Property>>("/properties/");
      return data;
    },
  });
}

export function useProperty(id?: number) {
  return useQuery({
    queryKey: ["properties", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Property>(`/properties/${id}/`);
      return data;
    },
  });
}

export function usePropertyCalendar(id?: number) {
  return useQuery({
    queryKey: ["properties", id, "calendar"],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<CalendarBlock[]>(`/properties/${id}/calendar/`);
      return data;
    },
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PropertyPayload) => {
      const { data } = await api.post<Property>("/properties/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast.success("Propiedad creada correctamente");
    },
    onError: (error) => {
      const message = getApiErrorMessage(error);
      toast.error(message ? `No se pudo crear la propiedad: ${message}` : "No se pudo crear la propiedad");
    },
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<PropertyPayload> }) => {
      const { data } = await api.patch<Property>(`/properties/${id}/`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["properties", variables.id] });
      toast.success("Propiedad actualizada");
    },
    onError: (error) => {
      const message = getApiErrorMessage(error);
      toast.error(message ? `No se pudo actualizar la propiedad: ${message}` : "No se pudo actualizar la propiedad");
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/properties/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast.success("Propiedad eliminada");
    },
    onError: () => toast.error("No se pudo eliminar la propiedad"),
  });
}
