'use client';

import { Moon, Sun, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConnectWalletButton } from '@/components/web3/connect-wallet-button';
import { useUserStore } from '@/lib/store/user';
import { useUIStore } from '@/lib/store/ui';
import { useAlerts } from '@/lib/hooks/useAlerts';

interface AppHeaderProps {
  onMenuClick?: () => void;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const { user } = useUserStore();
  const { darkMode, toggleDarkMode } = useUIStore();

  // Only fetch alerts if user is admin
  const { data: alertsData } = useAlerts({ enabled: !!user && user.role === 'admin' });

  const activeAlerts = (alertsData || []).filter((a: any) => !a.acknowledged);

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">A</span>
            </div>
            <span className="hidden sm:inline text-xl font-bold">Arc SpendOS</span>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Active alerts badge */}
          {activeAlerts.length > 0 && (
            <Badge variant="destructive" className="hidden sm:flex">
              {activeAlerts.length} {activeAlerts.length === 1 ? 'Alert' : 'Alerts'}
            </Badge>
          )}

          {/* User role badge */}
          {user && (
            <Badge variant="secondary" className="hidden sm:flex capitalize">
              {user.role}
            </Badge>
          )}

          {/* Dark mode toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>

          {/* Wallet connection */}
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  );
}
