import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api from "@/lib/api";
import type { Client, ClientPayload, PaginatedResponse } from "@/types";

export function useClients(search?: string, page?: number) {
  return useQuery({
    queryKey: ["clients", search, page],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Client>>("/clients/", {
        params: { search: search || undefined, page },
      });
      return data;
    },
    placeholderData: (previous) => previous,
  });
}

export function useClient(id?: number) {
  return useQuery({
    queryKey: ["clients", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Client>(`/clients/${id}/`);
      return data;
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ClientPayload) => {
      const { data } = await api.post<Client>("/clients/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente creado");
    },
    onError: () => toast.error("No se pudo crear el cliente"),
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<ClientPayload> }) => {
      const { data } = await api.patch<Client>(`/clients/${id}/`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients", variables.id] });
      toast.success("Cliente actualizado");
    },
    onError: () => toast.error("No se pudo actualizar el cliente"),
  });
}
