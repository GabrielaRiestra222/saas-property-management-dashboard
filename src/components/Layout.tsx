import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import {
  BarChart3,
  Building2,
  Calendar,
  CalendarDays,
  ChevronDown,
  CreditCard,
  Globe2,
  HelpCircle,
  Home,
  KeyRound,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Search,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/app/components/ui/sheet";
import { cn } from "@/app/components/ui/utils";
import { useAuth } from "@/lib/hooks/useAuth";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { startSessionWatcher, stopSessionWatcher } from "@/lib/sessionWatcher";

import ChatbotWidget, { ChatbotTriggerButton, type ChatbotState } from "./ChatbotWidget";
import CommandPalette from "./CommandPalette";
import NotificationsMenu from "./NotificationsMenu";

type NavItem = {
  label: string;
  to: string;
  icon: typeof Home;
  /** Hidden for the OWNER role — owners only see their own portfolio's operations. */
  ownerHidden?: boolean;
  /** Only visible to ADMIN role / superusers. */
  adminOnly?: boolean;
};

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: "Inicio",
    items: [{ label: "Dashboard", to: "/dashboard", icon: Home }],
  },
  {
    label: "Operaciones",
    items: [
      { label: "Calendario", to: "/calendar", icon: CalendarDays },
      { label: "Reservas", to: "/bookings", icon: Calendar },
      { label: "Limpieza", to: "/cleaning", icon: Sparkles, ownerHidden: true },
      { label: "Mantenimiento", to: "/maintenance", icon: Wrench, ownerHidden: true },
    ],
  },
  {
    label: "Comercial",
    items: [
      { label: "Vista apartamentos", to: "/apartments/board", icon: LayoutGrid },
      { label: "Apartamentos", to: "/cms/properties", icon: Building2 },
      { label: "Clientes", to: "/clients", icon: Users, ownerHidden: true },
      { label: "Inbox", to: "/inbox", icon: MessageSquare, ownerHidden: true },
      { label: "Canales y web", to: "/channels", icon: Plug, ownerHidden: true },
      { label: "Agencias", to: "/agencies", icon: Building2, ownerHidden: true },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { label: "Pagos", to: "/payments", icon: CreditCard },
      { label: "Contabilidad", to: "/accounting", icon: BarChart3 },
      { label: "Reporting", to: "/reports", icon: BarChart3, ownerHidden: true },
    ],
  },
  {
    label: "Contenido web",
    items: [
      { label: "FAQs", to: "/faq/admin", icon: HelpCircle, ownerHidden: true },
      { label: "Web pública", to: "/owners", icon: Globe2, ownerHidden: true },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Automatizaciones", to: "/automations", icon: Sparkles, ownerHidden: true },
      { label: "Equipo", to: "/team", icon: Users, ownerHidden: true },
      { label: "Usuarios y accesos", to: "/team/access", icon: KeyRound, ownerHidden: true, adminOnly: true },
      { label: "Asistente IA", to: "/chatbot", icon: Sparkles, ownerHidden: true },
    ],
  },
];

const flatNavItems = navSections.flatMap((section) => section.items);

function visibleSections(isOwner: boolean, isAdmin: boolean) {
  return navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.ownerHidden && isOwner) return false;
        if (item.adminOnly && !isAdmin) return false;
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);
}

function sectionForPath(pathname: string) {
  return (
    navSections.find((section) =>
      section.items.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`)),
    )?.label ?? navSections[0].label
  );
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administración",
  MANAGER: "Operaciones",
  OWNER: "Propietario",
};

function Sidebar({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const currentUser = useCurrentUser();

  const sections = useMemo(
    () => visibleSections(currentUser.isOwner, currentUser.isAdmin),
    [currentUser.isOwner, currentUser.isAdmin],
  );

  const displayName = currentUser.fullName || "Cuenta";
  const roleLabel = currentUser.isSuperuser
    ? "Superadmin"
    : (currentUser.role && ROLE_LABELS[currentUser.role]) || "Operaciones";
  const initials = useMemo(
    () =>
      displayName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "PM",
    [displayName],
  );
  const [openSection, setOpenSection] = useState(() => sectionForPath(location.pathname));

  useEffect(() => {
    setOpenSection(sectionForPath(location.pathname));
  }, [location.pathname]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
      <div className={cn("border-b border-sidebar-border py-5", collapsed ? "px-3" : "px-5")}>
        <Link
          to="/dashboard"
          className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}
          onClick={onNavigate}
          title="Apartments PMS"
        >
          <div className="flex size-9 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-primary">
            <Building2 className="size-4" />
          </div>
          <div className={cn(collapsed && "hidden")}>
            <p className="font-display text-lg leading-none tracking-wide text-sidebar-foreground">Apartments</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-sidebar-foreground/50">Property management</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-5">
        {sections.map((section) => {
          const collapsible = section.items.length > 1;
          const isOpen = collapsed || !collapsible || openSection === section.label;

          return (
            <div key={section.label} className="space-y-0.5">
              {collapsible ? (
                <button
                  type="button"
                  onClick={() => setOpenSection((current) => (current === section.label ? "" : section.label))}
                  className={cn(
                    "flex w-full items-center justify-between px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.2em] text-sidebar-foreground/40 transition-colors hover:text-sidebar-foreground/70",
                    collapsed && "sr-only",
                  )}
                >
                  {section.label}
                  <ChevronDown className={cn("size-3 transition-transform", isOpen && "rotate-180")} />
                </button>
              ) : (
                <p className={cn("px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.2em] text-sidebar-foreground/40", collapsed && "sr-only")}>
                  {section.label}
                </p>
              )}
              {isOpen
                ? section.items.map((item) => {
                    const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={onNavigate}
                        title={item.label}
                        className={cn(
                          "group relative flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                          collapsed && "justify-center px-2",
                          active
                            ? "bg-sidebar-accent text-sidebar-foreground"
                            : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                        )}
                      >
                        {active ? (
                          <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-sidebar-primary" />
                        ) : null}
                        <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                        <span className={cn("truncate font-normal", collapsed && "sr-only")}>{item.label}</span>
                      </Link>
                    );
                  })
                : null}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className={cn("mb-2 flex items-center rounded-md px-3 py-2.5", collapsed ? "justify-center" : "gap-3")}>
          <Avatar className="size-8">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className={cn("min-w-0", collapsed && "hidden")}>
            <p className="truncate text-sm text-sidebar-foreground">{displayName}</p>
            <p className="text-xs text-sidebar-foreground/50">{roleLabel}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className={cn("w-full text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground", collapsed ? "justify-center px-2" : "justify-start")}
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          title="Cerrar sesión"
        >
          <LogOut className={cn("size-4", !collapsed && "mr-2")} strokeWidth={1.75} />
          <span className={cn(collapsed && "sr-only")}>Cerrar sesión</span>
        </Button>
      </div>
    </div>
  );
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatState, setChatState] = useState<ChatbotState>("closed");
  const location = useLocation();
  const currentLabel = flatNavItems.find((item) => location.pathname.startsWith(item.to))?.label ?? "Dashboard";
  const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);

  useEffect(() => {
    startSessionWatcher();
    return () => stopSessionWatcher();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className={cn("hidden border-r border-sidebar-border transition-[width] duration-200 lg:block", sidebarCollapsed ? "w-20" : "w-64")}>
          <Sidebar collapsed={sidebarCollapsed} />
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="hidden lg:inline-flex"
                  onClick={() => setSidebarCollapsed((current) => !current)}
                  title={sidebarCollapsed ? "Expandir menú" : "Plegar menú"}
                >
                  {sidebarCollapsed ? <PanelLeftOpen className="size-4" strokeWidth={1.75} /> : <PanelLeftClose className="size-4" strokeWidth={1.75} />}
                </Button>
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild className="lg:hidden">
                    <Button variant="outline" size="icon">
                      <Menu className="size-4" strokeWidth={1.75} />
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
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Operaciones</p>
                  <h2 className="font-display text-2xl leading-tight tracking-tight text-foreground">{currentLabel}</h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSearchOpen(true)}
                  className="hidden items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-foreground sm:flex"
                >
                  <Search className="size-4" strokeWidth={1.75} />
                  <span>Buscar...</span>
                  <kbd className="ml-2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                    {isMac ? "⌘K" : "Ctrl+K"}
                  </kbd>
                </button>
                <Button variant="outline" size="icon" className="sm:hidden" onClick={() => setSearchOpen(true)} title="Buscar">
                  <Search className="size-4" strokeWidth={1.75} />
                </Button>
                <ChatbotTriggerButton
                  state={chatState}
                  onClick={() => setChatState((current) => (current === "closed" ? "open" : "closed"))}
                />
                <NotificationsMenu />
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
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <ChatbotWidget state={chatState} onStateChange={setChatState} />
    </div>
  );
}
