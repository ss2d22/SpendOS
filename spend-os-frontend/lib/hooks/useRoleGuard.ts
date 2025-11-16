'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/store/user';
import type { Role } from '@/types/models';

/**
 * Hook to protect routes based on user role
 * Redirects to landing page if user doesn't have required role
 */
export function useRoleGuard(requiredRole?: Role | Role[]) {
  const router = useRouter();
  const { user, isAuthenticated } = useUserStore();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/');
      return;
    }

    if (requiredRole) {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      const hasRequiredRole = roles.some((role) => user.roles.includes(role));

      if (!hasRequiredRole) {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, user, requiredRole, router]);

  return { user, isAuthenticated };
}
