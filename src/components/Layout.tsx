import { useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import {
  BarChart3,
  Bell,
  Building2,
  Calendar,
  CalendarDays,
  CreditCard,
  Globe2,
  HelpCircle,
  Home,
  LogOut,
  MessageSquare,
  Menu,
  Plug,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/app/components/ui/sheet";
import { cn } from "@/app/components/ui/utils";
import { useAuth } from "@/lib/hooks/useAuth";

import ChatbotWidget from "./ChatbotWidget";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: Home },
  { label: "Propiedades", to: "/cms/properties", icon: Building2 },
  { label: "Reservas", to: "/bookings", icon: Calendar },
  { label: "Inbox", to: "/inbox", icon: MessageSquare },
  { label: "Canales y web", to: "/channels", icon: Plug },
  { label: "Clientes", to: "/clients", icon: Users },
  { label: "Pagos", to: "/payments", icon: CreditCard },
  { label: "Agencias", to: "/agencies", icon: Building2 },
  { label: "Limpieza", to: "/cleaning", icon: Sparkles },
  { label: "Mantenimiento", to: "/maintenance", icon: Wrench },
  { label: "Calendario", to: "/calendar", icon: CalendarDays },
  { label: "Contabilidad", to: "/accounting", icon: BarChart3 },
  { label: "Reporting", to: "/reports", icon: BarChart3 },
  { label: "Automatizaciones", to: "/automations", icon: Sparkles },
  { label: "Propietarios", to: "/owners", icon: Globe2 },
  { label: "FAQs", to: "/faq/admin", icon: HelpCircle },
  { label: "Equipo", to: "/team", icon: Users },
  { label: "Asistente IA", to: "/chatbot", icon: Sparkles },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const initials = useMemo(() => "PM", []);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#FC9F5B] text-black">
      <div className="border-b border-black/25 px-5 py-4">
        <Link to="/dashboard" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="flex size-10 items-center justify-center rounded-xl bg-black text-[#FC9F5B] shadow-sm">
            <Building2 className="size-5" />
          </div>
          <div>
            <p className="font-semibold tracking-tight">Apartments PMS</p>
            <p className="text-xs text-black/70">Property management</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-black text-[#FC9F5B] shadow-sm"
                  : "text-black hover:bg-[#FBD1A2] hover:text-black",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-black/25 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-black/20 bg-[#FBD1A2] px-3 py-3">
          <Avatar className="size-9">
            <AvatarFallback className="bg-black text-[#FC9F5B]">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">Host admin</p>
            <p className="text-xs text-black/70">Operaciones</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-black hover:bg-[#FBD1A2] hover:text-black"
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
        >
          <LogOut className="mr-2 size-4" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const currentLabel = navItems.find((item) => location.pathname.startsWith(item.to))?.label ?? "Dashboard";

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-border lg:block">
          <Sidebar />
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-white text-black backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild className="lg:hidden">
                    <Button variant="outline" size="icon">
                      <Menu className="size-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[86vw] max-w-sm p-0">
                    <SheetHeader className="sr-only">
                      <SheetTitle>Navegación</SheetTitle>
                    </SheetHeader>
                    <Sidebar onNavigate={() => setMobileOpen(false)} />
                  </SheetContent>
                </Sheet>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-black/70">Operaciones</p>
                  <h2 className="text-xl font-semibold tracking-tight text-black">{currentLabel}</h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="relative flex size-10 items-center justify-center rounded-xl border border-border bg-white text-black shadow-sm transition-colors hover:border-[#FC9F5B] hover:bg-[#FBD1A2]">
                  <Bell className="size-4" />
                  <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-[#B4233A] ring-2 ring-card" />
                </button>
                <div className="hidden rounded-xl border border-border bg-white px-4 py-2 text-sm text-black shadow-sm sm:block">
                  API <span className="font-medium text-black">localhost:8000</span>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-7 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <ChatbotWidget />
    </div>
  );
}
