'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { useUserStore } from '@/lib/store/user';
import { useAlerts } from '@/lib/hooks/useAlerts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle } from 'lucide-react';
import { useAcknowledgeAlert } from '@/lib/hooks/useAlerts';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user } = useUserStore();

  console.log('[DashboardLayout] Auth state:', { isAuthenticated, hasUser: !!user, user });

  // Only fetch alerts if authenticated and user is admin
  const { data: alertsData } = useAlerts({ enabled: isAuthenticated && !!user && user.role === 'admin' });
  const { mutate: acknowledgeAlert } = useAcknowledgeAlert();

  // Redirect to landing if not authenticated
  useEffect(() => {
    console.log('[DashboardLayout] useEffect - checking auth:', { isAuthenticated, hasUser: !!user });
    if (!isAuthenticated || !user) {
      console.log('[DashboardLayout] Redirecting to home - user not authenticated');
      router.push('/');
    }
  }, [isAuthenticated, user, router]);

  // Don't render dashboard if not authenticated
  if (!isAuthenticated || !user) {
    console.log('[DashboardLayout] Not rendering - user not authenticated');
    return null;
  }

  const activeAlerts = (alertsData || []).filter((a: any) => !a.acknowledged);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <AppHeader />

        {/* Alert Banner */}
        {activeAlerts.length > 0 && (
          <div className="border-b border-border bg-muted/30 px-4 sm:px-6 py-3 space-y-2">
            {activeAlerts.slice(0, 3).map((alert: any) => (
              <Alert key={alert.id} variant={alert.severity === 'CRITICAL' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  <span className="capitalize">{alert.severity.toLowerCase()} Alert</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => acknowledgeAlert(alert.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </AlertTitle>
                <AlertDescription>{alert.message}</AlertDescription>
              </Alert>
            ))}
            {activeAlerts.length > 3 && (
              <p className="text-sm text-muted-foreground text-center">
                +{activeAlerts.length - 3} more alerts
              </p>
            )}
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
