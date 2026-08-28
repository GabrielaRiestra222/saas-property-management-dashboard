import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api from "@/lib/api";
import type { CalendarBlock, CalendarBlockPayload, PaginatedResponse } from "@/types";

type CalendarBlockFilters = {
  date_from?: string;
  date_to?: string;
  page_size?: number;
};

export function useCalendarBlocks(propertyId?: number, filters?: CalendarBlockFilters) {
  return useQuery({
    queryKey: ["calendar", propertyId, filters],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<CalendarBlock>>("/calendar/", {
        params: {
          ...(propertyId ? { property: propertyId } : {}),
          ...filters,
        },
      });
      return data;
    },
  });
}

export function useCreateCalendarBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CalendarBlockPayload) => {
      const { data } = await api.post<CalendarBlock>("/calendar/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast.success("Bloque creado");
    },
    onError: () => toast.error("No se pudo crear el bloqueo"),
  });
}

export function useDeleteCalendarBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/calendar/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      toast.success("Bloque eliminado");
    },
    onError: () => toast.error("No se pudo eliminar el bloqueo"),
  });
}
