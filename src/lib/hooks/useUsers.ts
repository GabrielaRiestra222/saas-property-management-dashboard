import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api from "@/lib/api";
import type { PaginatedResponse, UserAccount, UserAccountPayload } from "@/types";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<UserAccount> | UserAccount[]>("/users/");
      return Array.isArray(data) ? data : data.results;
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UserAccountPayload) => {
      const { data } = await api.post<UserAccount>("/users/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario creado");
    },
    onError: () => toast.error("No se pudo crear el usuario"),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UserAccountPayload }) => {
      const { data } = await api.patch<UserAccount>(`/users/${id}/`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario actualizado");
    },
    onError: () => toast.error("No se pudo actualizar el usuario"),
  });
}
