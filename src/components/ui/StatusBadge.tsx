import { Badge } from "@/app/components/ui/badge";

type StatusBadgeProps = {
  status: string;
  type: "booking" | "cleaning" | "maintenance" | "payment";
};

const SUCCESS = "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success)]";
const WARNING = "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)]";
const DANGER = "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger)]";
const INFO = "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info)]";
const NEUTRAL = "border-border bg-muted text-muted-foreground";

const toneMap: Record<StatusBadgeProps["type"], Record<string, string>> = {
  booking: {
    PENDING: WARNING,
    CONFIRMED: SUCCESS,
    CANCELLED: DANGER,
  },
  cleaning: {
    PENDING: WARNING,
    IN_PROGRESS: INFO,
    DONE: SUCCESS,
  },
  maintenance: {
    OPEN: NEUTRAL,
    IN_PROGRESS: INFO,
    RESOLVED: SUCCESS,
  },
  payment: {
    PENDING: WARNING,
    PAID: SUCCESS,
  },
};

export default function StatusBadge({ status, type }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={toneMap[type][status] ?? NEUTRAL}
    >
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
