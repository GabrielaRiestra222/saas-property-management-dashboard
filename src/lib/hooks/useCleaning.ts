import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api from "@/lib/api";
import type { CleaningTask, CleaningTaskPayload, PaginatedResponse } from "@/types";

type CleaningFilters = Record<string, string | number | undefined>;

export function useCleaningTasks(filters?: CleaningFilters) {
  return useQuery({
    queryKey: ["cleaning", filters],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<CleaningTask>>("/cleaning/", {
        params: filters,
      });
      return data;
    },
  });
}

export function useCreateCleaningTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CleaningTaskPayload) => {
      const { data } = await api.post<CleaningTask>("/cleaning/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cleaning"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Tarea de limpieza creada");
    },
    onError: () => toast.error("No se pudo crear la tarea de limpieza"),
  });
}

export function useUpdateCleaningStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: CleaningTask["status"] }) => {
      const completedAt = status === "DONE" ? format(new Date(), "yyyy-MM-dd'T'HH:mm:ss") : null;
      const { data } = await api.patch<CleaningTask>(`/cleaning/${id}/`, {
        status,
        completed_at: completedAt,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cleaning"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Estado de limpieza actualizado");
    },
    onError: () => toast.error("No se pudo actualizar la limpieza"),
  });
}
