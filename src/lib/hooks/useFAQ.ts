import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api from "@/lib/api";
import type {
  FAQ,
  FAQCategory,
  FAQCategoryPayload,
  FAQPayload,
  PaginatedResponse,
} from "@/types";

export function useFAQCategories() {
  return useQuery({
    queryKey: ["faq", "categories"],
    queryFn: async () => {
      const { data } = await api.get<FAQCategory[]>("/faq/categories/");
      return data;
    },
  });
}

export function useFAQs() {
  return useQuery({
    queryKey: ["faq", "items"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<FAQ>>("/faq/");
      return data;
    },
  });
}

export function useCreateFAQ() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: FAQPayload) => {
      const { data } = await api.post<FAQ>("/faq/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faq"] });
      toast.success("FAQ creada");
    },
    onError: () => toast.error("No se pudo crear la FAQ"),
  });
}

export function useUpdateFAQ() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<FAQPayload> }) => {
      const { data } = await api.patch<FAQ>(`/faq/${id}/`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faq"] });
      toast.success("FAQ actualizada");
    },
    onError: () => toast.error("No se pudo actualizar la FAQ"),
  });
}

export function useDeleteFAQ() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/faq/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faq"] });
      toast.success("FAQ eliminada");
    },
    onError: () => toast.error("No se pudo eliminar la FAQ"),
  });
}

export function useCreateFAQCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: FAQCategoryPayload) => {
      const { data } = await api.post<FAQCategory>("/faq/categories/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faq", "categories"] });
      toast.success("Categoría creada");
    },
    onError: () => toast.error("No se pudo crear la categoría"),
  });
}
