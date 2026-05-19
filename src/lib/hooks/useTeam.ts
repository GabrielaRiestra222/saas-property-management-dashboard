import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api from "@/lib/api";
import type { TeamMember, TeamMemberPayload, PaginatedResponse } from "@/types";

export function useTeamMembers(search?: string) {
  return useQuery({
    queryKey: ["team", search],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<TeamMember>>("/team/", {
        params: search ? { search } : undefined,
      });
      return data;
    },
  });
}

export function useTeamMember(id?: number) {
  return useQuery({
    queryKey: ["team", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<TeamMember>(`/team/${id}/`);
      return data;
    },
  });
}

export function useCreateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TeamMemberPayload) => {
      const { data } = await api.post<TeamMember>("/team/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      toast.success("Miembro añadido");
    },
    onError: () => toast.error("No se pudo añadir el miembro"),
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<TeamMemberPayload> }) => {
      const { data } = await api.patch<TeamMember>(`/team/${id}/`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["team", variables.id] });
      toast.success("Miembro actualizado");
    },
    onError: () => toast.error("No se pudo actualizar el miembro"),
  });
}

export function useDeleteTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/team/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      toast.success("Miembro eliminado");
    },
    onError: () => toast.error("No se pudo eliminar el miembro"),
  });
}
