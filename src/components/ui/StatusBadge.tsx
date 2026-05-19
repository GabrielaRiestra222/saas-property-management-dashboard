import { Badge } from "@/app/components/ui/badge";

type StatusBadgeProps = {
  status: string;
  type: "booking" | "cleaning" | "maintenance" | "payment";
};

const toneMap: Record<StatusBadgeProps["type"], Record<string, string>> = {
  booking: {
    PENDING: "bg-amber-100 text-amber-700 border-amber-200",
    CONFIRMED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-rose-100 text-rose-700 border-rose-200",
  },
  cleaning: {
    PENDING: "bg-amber-100 text-amber-700 border-amber-200",
    IN_PROGRESS: "bg-sky-100 text-sky-700 border-sky-200",
    DONE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  maintenance: {
    OPEN: "bg-slate-100 text-slate-700 border-slate-200",
    IN_PROGRESS: "bg-sky-100 text-sky-700 border-sky-200",
    RESOLVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  payment: {
    PENDING: "bg-amber-100 text-amber-700 border-amber-200",
    PAID: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
};

export default function StatusBadge({ status, type }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={toneMap[type][status] ?? "bg-slate-100 text-slate-700 border-slate-200"}
    >
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
