import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import api from "@/lib/api";
import type { PaginatedResponse } from "@/types";

export type ChannelConnection = {
  id: number;
  property: number;
  property_title?: string;
  channel: string;
  external_listing_id: string;
  ical_import_url: string;
  status: string;
  last_sync_at: string | null;
  last_error: string;
  content_sync_enabled: boolean;
  rates_sync_enabled: boolean;
  availability_sync_enabled: boolean;
};

export type AutomationWebhook = {
  id: number;
  name: string;
  event: string;
  target: string;
  url: string;
  is_active: boolean;
  secret: string;
};

export type SeasonalRate = {
  id: number;
  property: number;
  property_title?: string;
  name: string;
  start_date: string;
  end_date: string;
  price_per_night: string;
  min_nights: number;
  discount_percent: string;
  is_active: boolean;
};

export function useChannelConnections() {
  return useQuery({
    queryKey: ["channel-connections"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ChannelConnection>>("/channel-connections/");
      return data;
    },
  });
}

export function useCreateChannelConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<ChannelConnection>) => {
      const { data } = await api.post<ChannelConnection>("/channel-connections/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-connections"] });
      toast.success("Canal conectado");
    },
  });
}

export function useSyncIcal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ imported: number }>(`/channel-connections/${id}/sync-ical/`);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["channel-connections"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      toast.success(`iCal sincronizado: ${data.imported} eventos`);
    },
  });
}

export function useAutomationWebhooks() {
  return useQuery({
    queryKey: ["automation-webhooks"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<AutomationWebhook>>("/automation-webhooks/");
      return data;
    },
  });
}

export function useCreateAutomationWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<AutomationWebhook>) => {
      const { data } = await api.post<AutomationWebhook>("/automation-webhooks/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-webhooks"] });
      toast.success("Webhook creado");
    },
  });
}

export function useSeasonalRates() {
  return useQuery({
    queryKey: ["seasonal-rates"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<SeasonalRate>>("/seasonal-rates/");
      return data;
    },
  });
}
