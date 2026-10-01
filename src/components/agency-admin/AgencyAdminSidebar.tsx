import { NavLink, useLocation, useParams } from 'react-router-dom';
import {
  Car,
  BookOpen,
  CalendarDays,
  Users,
  Tags,
  UserCog,
  Settings,
  LogOut,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Agency } from '@/types/agency';

interface AgencyAdminSidebarProps {
  agency: Agency | null;
}

const AgencyAdminSidebar = ({ agency }: AgencyAdminSidebarProps) => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const base = `/agency/${slug}/admin`;

  const navItems = [
    { to: `${base}/fleet`, icon: Car, label: 'Fleet' },
    { to: `${base}/reservations`, icon: BookOpen, label: 'Reservations' },
    { to: `${base}/calendar`, icon: CalendarDays, label: 'Calendar' },
    { to: `${base}/services-pricing`, icon: Tags, label: 'Services & Pricing' },
    { to: `${base}/drivers`, icon: UserCog, label: 'Drivers' },
    { to: `${base}/settings`, icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col gradient-sidebar sidebar-glow">
      {/* Agency Branding */}
      <div className="flex h-[68px] items-center gap-3 px-6">
        {agency?.logo_url ? (
          <img src={agency.logo_url} alt={agency.name} className="h-9 w-9 rounded-lg object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-accent gold-glow text-accent-foreground font-bold text-sm">
            {agency?.name?.charAt(0) ?? 'A'}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-sidebar-accent-foreground leading-none truncate">
            {agency?.name ?? 'Agency'}
          </h1>
          <p className="text-[9px] font-semibold text-sidebar-primary uppercase tracking-[0.25em] mt-1">
            Admin Panel
          </p>
        </div>
      </div>

      <div className="mx-6 gold-line opacity-40" />

      {/* Navigation */}
      <nav className="flex-1 px-4 py-5 space-y-0.5 overflow-y-auto">
        <p className="text-[9px] font-bold text-sidebar-foreground/70 uppercase tracking-[0.25em] px-3 mb-3">
          Management
        </p>
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to);

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
                "h-[17px] w-[17px] shrink-0 transition-colors duration-200",
                isActive ? "text-sidebar-primary" : "group-hover:text-sidebar-accent-foreground"
              )} />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="h-3.5 w-3.5 text-sidebar-primary/50" />}
            </NavLink>
          );
        })}
      </nav>

      {/* Storefront Link */}
      <div className="px-4 pb-2">
        <NavLink
          to={`/agency/${slug}`}
          className="flex items-center gap-3 rounded-xl px-3.5 py-[11px] text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground transition-colors"
        >
          <ExternalLink className="h-[17px] w-[17px] shrink-0" />
          <span className="flex-1">View Storefront</span>
        </NavLink>
      </div>

      {/* Footer */}
      <div className="mx-6 gold-line opacity-20" />
      <div className="p-5 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-accent text-[11px] font-bold text-accent-foreground shadow-sm">
            {user?.email?.charAt(0).toUpperCase() ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-sidebar-accent-foreground truncate leading-none">
              {user?.user_metadata?.full_name || 'Admin'}
            </p>
            <p className="text-[10px] text-sidebar-foreground truncate mt-1">
              {user?.email ?? ''}
            </p>
          </div>
          <button
            onClick={signOut}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AgencyAdminSidebar;
