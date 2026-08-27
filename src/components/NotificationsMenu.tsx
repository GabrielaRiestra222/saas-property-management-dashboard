import { Link } from "react-router";
import { Bell, CalendarDays, CreditCard, Sparkles, Wrench } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { useDashboardStats } from "@/lib/hooks/useDashboard";

export default function NotificationsMenu() {
  const statsQuery = useDashboardStats({ refetchInterval: 60_000 });
  const stats = statsQuery.data;

  const items = stats
    ? [
        { label: "Check-ins hoy", count: stats.pending_checkins_today, to: "/bookings", icon: CalendarDays },
        { label: "Check-outs hoy", count: stats.pending_checkouts_today, to: "/bookings", icon: CalendarDays },
        { label: "Pagos pendientes", count: stats.pending_payments, to: "/payments", icon: CreditCard },
        { label: "Limpiezas pendientes", count: stats.pending_cleanings, to: "/cleaning", icon: Sparkles },
        { label: "Mantenimiento abierto", count: stats.open_maintenance, to: "/maintenance", icon: Wrench },
      ].filter((item) => item.count > 0)
    : [];

  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex size-9 items-center justify-center rounded-md border border-border bg-card text-foreground/70 transition-colors hover:border-accent hover:text-foreground">
          <Bell className="size-4" strokeWidth={1.75} />
          {total > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-medium text-white">
              {total > 9 ? "9+" : total}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Pendientes de hoy</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            {statsQuery.isLoading ? "Cargando..." : "Nada pendiente. Todo al día."}
          </p>
        ) : (
          items.map((item) => (
            <DropdownMenuItem key={item.label} asChild>
              <Link to={item.to} className="flex items-center gap-2">
                <item.icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
                <span className="flex-1">{item.label}</span>
                <span className="font-semibold">{item.count}</span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
