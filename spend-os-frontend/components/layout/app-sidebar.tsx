'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  FileText,
  Settings,
  TrendingUp,
  Users,
  CheckSquare,
  PlusCircle,
  History,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/lib/store/user';
import { useUIStore } from '@/lib/store/ui';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ('admin' | 'manager' | 'spender')[];
}

const navItems: NavItem[] = [
  // Admin routes
  {
    label: 'Admin Overview',
    href: '/dashboard/admin',
    icon: LayoutDashboard,
    roles: ['admin'],
  },
  {
    label: 'Spend Accounts',
    href: '/dashboard/admin/accounts',
    icon: Wallet,
    roles: ['admin'],
  },
  {
    label: 'Funding History',
    href: '/dashboard/admin/funding',
    icon: FileText,
    roles: ['admin'],
  },
  {
    label: 'Settings',
    href: '/dashboard/admin/settings',
    icon: Settings,
    roles: ['admin'],
  },
  // Manager routes
  {
    label: 'Manager Overview',
    href: '/dashboard/manager',
    icon: LayoutDashboard,
    roles: ['manager'],
  },
  {
    label: 'Approvals',
    href: '/dashboard/manager/approvals',
    icon: CheckSquare,
    roles: ['manager'],
  },
  {
    label: 'Managed Accounts',
    href: '/dashboard/manager/accounts',
    icon: Users,
    roles: ['manager'],
  },
  // Spender routes
  {
    label: 'Spender Overview',
    href: '/dashboard/spender',
    icon: LayoutDashboard,
    roles: ['spender'],
  },
  {
    label: 'New Request',
    href: '/dashboard/spender/request',
    icon: PlusCircle,
    roles: ['spender'],
  },
  {
    label: 'Request History',
    href: '/dashboard/spender/history',
    icon: History,
    roles: ['spender'],
  },
  // Analytics (admin only)
  {
    label: 'Analytics',
    href: '/dashboard/analytics/runway',
    icon: TrendingUp,
    roles: ['admin'],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUserStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const userRoles = user?.roles || [];

  // Filter nav items based on user roles
  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true; // Show to all roles
    return item.roles.some((role) => userRoles.includes(role));
  });

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col border-r border-border bg-background transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Sidebar header */}
      <div className="h-16 border-b border-border flex items-center justify-end px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start',
                  sidebarCollapsed && 'justify-center px-2',
                  isActive && 'bg-secondary'
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className={cn('w-5 h-5', !sidebarCollapsed && 'mr-3')} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Button>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
