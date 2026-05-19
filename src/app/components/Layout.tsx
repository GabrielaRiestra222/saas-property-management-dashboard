import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { LayoutDashboard, Building2, Calendar, CreditCard, Bell, User, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { username, logout } = useAuth();

  const navItems = [
    { path: '/', label: 'Panel', icon: LayoutDashboard },
    { path: '/properties', label: 'Propiedades', icon: Building2 },
    { path: '/bookings', label: 'Reservas', icon: Calendar },
    { path: '/payments', label: 'Pagos', icon: CreditCard },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const currentLabel = navItems.find((item) => isActive(item.path))?.label ?? 'Panel';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col" style={{ backgroundColor: 'var(--sidebar)' }}>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg" style={{ color: 'var(--sidebar-foreground)' }}>
              PropertyOS
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                  ${active
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium text-[15px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-[15px]">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-8 flex-shrink-0">
          <h1 className="text-xl font-semibold text-foreground">{currentLabel}</h1>

          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-xl hover:bg-muted transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-sm font-medium text-foreground">{username ?? 'Admin'}</div>
                <div className="text-xs text-muted-foreground">Administrador</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-[1440px] mx-auto p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
