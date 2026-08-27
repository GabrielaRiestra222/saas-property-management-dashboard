import { useEffect } from "react";
import { useNavigate } from "react-router";
import {
  BarChart3,
  Building2,
  Calendar,
  CalendarDays,
  CreditCard,
  Home,
  MessageSquare,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/app/components/ui/command";
import { useBookings } from "@/lib/hooks/useBookings";
import { useClients } from "@/lib/hooks/useClients";
import { useProperties } from "@/lib/hooks/useProperties";
import { fullName } from "@/lib/formatters";

const staticDestinations = [
  { label: "Dashboard", to: "/dashboard", icon: Home },
  { label: "Calendario", to: "/calendar", icon: CalendarDays },
  { label: "Reservas", to: "/bookings", icon: Calendar },
  { label: "Nueva reserva", to: "/bookings/new", icon: Calendar },
  { label: "Limpieza", to: "/cleaning", icon: Sparkles },
  { label: "Mantenimiento", to: "/maintenance", icon: Wrench },
  { label: "Apartamentos", to: "/cms/properties", icon: Building2 },
  { label: "Clientes", to: "/clients", icon: Users },
  { label: "Inbox", to: "/inbox", icon: MessageSquare },
  { label: "Pagos", to: "/payments", icon: CreditCard },
  { label: "Contabilidad", to: "/accounting", icon: BarChart3 },
];

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  const propertiesQuery = useProperties();
  const clientsQuery = useClients();
  const bookingsQuery = useBookings();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  function go(to: string) {
    onOpenChange(false);
    navigate(to);
  }

  const properties = propertiesQuery.data?.results ?? [];
  const clients = clientsQuery.data?.results ?? [];
  const bookings = bookingsQuery.data?.results ?? [];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Buscar" description="Salta directo a cualquier sección, apartamento, cliente o reserva.">
      <CommandInput placeholder="Buscar apartamentos, clientes, reservas..." />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>

        <CommandGroup heading="Navegación">
          {staticDestinations.map((item) => (
            <CommandItem key={item.to} value={item.label} onSelect={() => go(item.to)}>
              <item.icon />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {properties.length ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Apartamentos">
              {properties.map((property) => (
                <CommandItem key={`property-${property.id}`} value={`${property.title} ${property.location}`} onSelect={() => go(`/cms/properties/${property.id}/edit`)}>
                  <Building2 />
                  <span>{property.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{property.location}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        {clients.length ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Clientes">
              {clients.slice(0, 25).map((client) => (
                <CommandItem
                  key={`client-${client.id}`}
                  value={`${fullName(client.first_name, client.last_name)} ${client.email}`}
                  onSelect={() => go(`/clients/${client.id}`)}
                >
                  <Users />
                  <span>{fullName(client.first_name, client.last_name)}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{client.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        {bookings.length ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Reservas">
              {bookings.slice(0, 25).map((booking) => (
                <CommandItem
                  key={`booking-${booking.id}`}
                  value={`${booking.client_name ?? ""} ${booking.apartment_title ?? ""} #${booking.id}`}
                  onSelect={() => go(`/bookings/${booking.id}`)}
                >
                  <Calendar />
                  <span>
                    #{booking.id} · {booking.client_name || "Cliente"}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">{booking.apartment_title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
