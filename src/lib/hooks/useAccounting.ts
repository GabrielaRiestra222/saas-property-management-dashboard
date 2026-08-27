import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api from "@/lib/api";
import type { PaginatedResponse, Transaction, TransactionPayload } from "@/types";

type AccountingFilters = Record<string, string | number | undefined>;

export function useTransactions(filters?: AccountingFilters, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ["accounting", filters],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Transaction>>("/accounting/", {
        params: filters,
      });
      return data;
    },
    refetchInterval: options?.refetchInterval,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TransactionPayload) => {
      const { data } = await api.post<Transaction>("/accounting/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Transacción creada");
    },
    onError: () => toast.error("No se pudo crear la transacción"),
  });
}
