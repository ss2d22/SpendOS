'use client';

import { useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserStore } from '@/lib/store/user';
import { getMe } from '@/lib/api/auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, clearUser } = useUserStore();

  const { data: me, isLoading, error, isSuccess } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    console.log('[AuthProvider] Query state:', { isLoading, isSuccess, hasError: !!error, hasData: !!me });

    if (isSuccess && me) {
      console.log('[AuthProvider] Setting user data:', me);
      setUser(me);
    } else if (error && !isLoading) {
      // Only clear user if there's an error and we're not currently loading
      console.log('[AuthProvider] Clearing user due to error:', error);
      clearUser();
    }
  }, [me, error, isLoading, isSuccess, setUser, clearUser]);

  // You can show a loading spinner here if needed
  if (isLoading) {
    console.log('[AuthProvider] Showing loading state');
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
