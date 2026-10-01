import { NavLink, useLocation } from 'react-router-dom';
import {
  Building2,
  Car,
  Users,
  ArrowRightLeft,
  BookOpen,
  CalendarDays,
  Tags,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { to: '/agencies', icon: Building2, label: 'Agencies' },
  { to: '/vehicles', icon: Car, label: 'Vehicles' },
  { to: '/drivers', icon: Users, label: 'Drivers' },
  { to: '/assignments', icon: ArrowRightLeft, label: 'Vehicle ↔ Agency Assignment' },
  { to: '/bookings', icon: BookOpen, label: 'Bookings' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/services-pricing', icon: Tags, label: 'Services' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const AdminSidebar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[270px] flex-col gradient-sidebar sidebar-glow">
      {/* Logo */}
      <div className="flex h-[76px] items-center gap-3.5 px-7">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-accent gold-glow">
          <Car className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-base font-display font-bold text-sidebar-accent-foreground tracking-wide leading-none">
            TravelHub
          </h1>
          <p className="text-[9px] font-semibold text-sidebar-primary uppercase tracking-[0.25em] mt-1">
            Super Admin
          </p>
        </div>
      </div>

      {/* Divider with gold accent */}
      <div className="mx-6 gold-line opacity-40" />

      {/* Navigation */}
      <nav className="flex-1 px-4 py-7 space-y-0.5">
        <p className="text-[9px] font-bold text-sidebar-foreground/70 uppercase tracking-[0.25em] px-3 mb-4">
          Navigation
        </p>
        {navItems.map((item) => {
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3.5 py-[11px] text-[13px] font-medium transition-all duration-250 relative',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground'
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary" />
              )}
              <item.icon className={cn(
                "h-[18px] w-[18px] shrink-0 transition-colors duration-200",
                isActive ? "text-sidebar-primary" : "group-hover:text-sidebar-accent-foreground"
              )} />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight className="h-3.5 w-3.5 text-sidebar-primary/50" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mx-6 gold-line opacity-20" />
      <div className="p-5 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-accent text-[11px] font-bold text-accent-foreground shadow-sm">
            {user?.email?.charAt(0).toUpperCase() ?? 'SA'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-sidebar-accent-foreground truncate leading-none">
              Super Admin
            </p>
            <p className="text-[10px] text-sidebar-foreground truncate mt-1">
              {user?.email ?? 'admin@travelhub.io'}
            </p>
          </div>
          <button
            onClick={signOut}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
