import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api from "@/lib/api";
import type { Booking, BookingPayload, PaginatedResponse } from "@/types";

type BookingFilters = {
  status?: string;
  property?: number | string;
  date?: string;
  client?: number | string;
  search?: string;
  check_in_after?: string;
  check_in_before?: string;
};

export function useBookings(filters?: BookingFilters) {
  return useQuery({
    queryKey: ["bookings", filters],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Booking>>("/bookings/", {
        params: filters,
      });
      return data;
    },
  });
}

export function useBooking(id?: number) {
  return useQuery({
    queryKey: ["bookings", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Booking>(`/bookings/${id}/`);
      return data;
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BookingPayload) => {
      const { data } = await api.post<Booking>("/bookings/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Reserva creada");
    },
    onError: () => toast.error("No se pudo crear la reserva"),
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<BookingPayload> & { status?: Booking["status"] } }) => {
      const { data } = await api.patch<Booking>(`/bookings/${id}/`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["bookings", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Reserva actualizada");
    },
    onError: () => toast.error("No se pudo actualizar la reserva"),
  });
}
