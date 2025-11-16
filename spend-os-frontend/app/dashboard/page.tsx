'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/store/user';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useUserStore();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/');
      return;
    }

    // Redirect based on primary role
    if (user.role === 'admin') {
      router.push('/dashboard/admin');
    } else if (user.role === 'manager') {
      router.push('/dashboard/manager');
    } else if (user.role === 'spender') {
      router.push('/dashboard/spender');
    } else {
      // Unknown role, go to landing
      router.push('/');
    }
  }, [user, isAuthenticated, router]);

  // Show loading skeleton while redirecting
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}
