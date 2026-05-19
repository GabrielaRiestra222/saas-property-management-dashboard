import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api from "@/lib/api";
import type { BookingPayment, PaginatedResponse, PaymentPayload } from "@/types";

export function usePayments(bookingId?: number) {
  return useQuery({
    queryKey: ["payments", bookingId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<BookingPayment>>("/payments/", {
        params: bookingId ? { booking: bookingId } : undefined,
      });
      return data;
    },
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PaymentPayload) => {
      const { data } = await api.post<BookingPayment>("/payments/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Pago creado");
    },
    onError: () => toast.error("No se pudo crear el pago"),
  });
}

export function useMarkPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data } = await api.patch<BookingPayment>(`/payments/${id}/`, {
        status: "PAID",
        payment_date: today,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Pago marcado como pagado");
    },
    onError: () => toast.error("No se pudo actualizar el pago"),
  });
}
