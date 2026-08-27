import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

import api from "@/lib/api";
import type { MaintenancePayload, MaintenanceRequest, PaginatedResponse } from "@/types";

type MaintenanceFilters = Record<string, string | number | undefined>;
type MaintenanceResponse = PaginatedResponse<MaintenanceRequest> | MaintenanceRequest[];

function normalizeMaintenanceResponse(data: MaintenanceResponse): PaginatedResponse<MaintenanceRequest> {
  if (Array.isArray(data)) {
    return {
      count: data.length,
      next: null,
      previous: null,
      results: data,
    };
  }

  return data;
}

export function useMaintenanceRequests(filters?: MaintenanceFilters, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ["maintenance", filters],
    queryFn: async () => {
      const { data } = await api.get<MaintenanceResponse>("/maintenance/", {
        params: filters,
      });
      return normalizeMaintenanceResponse(data);
    },
    refetchInterval: options?.refetchInterval,
  });
}

export function useCreateMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: MaintenancePayload) => {
      const { data } = await api.post<MaintenanceRequest>("/maintenance/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Parte de mantenimiento creado");
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data;
        const message = typeof detail === "string"
          ? detail
          : detail?.detail ?? JSON.stringify(detail ?? {});
        toast.error(`No se pudo crear el parte: ${message}`);
        return;
      }

      toast.error("No se pudo crear el parte");
    },
  });
}

export function useUpdateMaintenanceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: MaintenanceRequest["status"] }) => {
      const { data } = await api.patch<MaintenanceRequest>(`/maintenance/${id}/`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Estado de mantenimiento actualizado");
    },
    onError: () => toast.error("No se pudo actualizar el mantenimiento"),
  });
}
