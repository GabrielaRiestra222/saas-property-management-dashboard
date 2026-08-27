import { useQuery } from "@tanstack/react-query";

import api from "@/lib/api";
import type { DashboardStats } from "@/types";

export function useDashboardStats(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const { data } = await api.get<DashboardStats>("/dashboard/stats/");
      return data;
    },
    refetchInterval: options?.refetchInterval,
  });
}
