import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

import api from "@/lib/api";
import type { Booking, BookingPayload, PaginatedResponse } from "@/types";

function getBookingErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const detail = error.response?.data;
  if (!detail) {
    return fallback;
  }

  if (typeof detail === "string") {
    return detail;
  }

  // DRF ValidationError from Booking.clean() (date overlap, check-out before
  // check-in, ...) comes back as {"__all__": ["message"]} or a field dict.
  const messages = Object.values(detail).flat();
  return messages.length ? String(messages[0]) : fallback;
}

type BookingFilters = {
  status?: string;
  property?: number | string;
  date?: string;
  client?: number | string;
  search?: string;
  date_from?: string;
  date_to?: string;
  page_size?: number;
  check_in_after?: string;
  check_in_before?: string;
};

export function useBookings(filters?: BookingFilters, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ["bookings", filters],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Booking>>("/bookings/", {
        params: filters,
      });
      return data;
    },
    refetchInterval: options?.refetchInterval,
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
    onError: (error) => toast.error(getBookingErrorMessage(error, "No se pudo crear la reserva")),
  });
}

export function useReturnDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<Booking>(`/bookings/${id}/return-deposit/`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Fianza marcada como devuelta");
    },
    onError: (error) => toast.error(getBookingErrorMessage(error, "No se pudo actualizar la fianza")),
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
    onError: (error) => toast.error(getBookingErrorMessage(error, "No se pudo actualizar la reserva")),
  });
}
