import { useQuery } from "@tanstack/react-query";

import api from "@/lib/api";
import type { Amenity } from "@/types";

type AmenitiesResponse =
  | Amenity[]
  | {
      results?: Amenity[];
    };

export function useAmenities() {
  return useQuery({
    queryKey: ["amenities"],
    queryFn: async () => {
      const { data } = await api.get<AmenitiesResponse>("/amenities/");
      return Array.isArray(data) ? data : data.results ?? [];
    },
  });
}
