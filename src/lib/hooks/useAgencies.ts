import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api from "@/lib/api";
import type { Agency, AgencyPayload, PaginatedResponse } from "@/types";

export function useAgency(id?: number) {
  return useQuery({
    queryKey: ["agencies", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Agency>(`/agencies/${id}/`);
      return data;
    },
  });
}

export function useAgencies() {
  return useQuery({
    queryKey: ["agencies"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Agency>>("/agencies/");
      return data;
    },
  });
}

export function useCreateAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AgencyPayload) => {
      const { data } = await api.post<Agency>("/agencies/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      toast.success("Agencia creada");
    },
    onError: () => toast.error("No se pudo crear la agencia"),
  });
}

export function useUpdateAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<AgencyPayload> }) => {
      const { data } = await api.patch<Agency>(`/agencies/${id}/`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      toast.success("Agencia actualizada");
    },
    onError: () => toast.error("No se pudo actualizar la agencia"),
  });
}
