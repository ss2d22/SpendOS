import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Role } from '@/types/models';
import type { MeResponse } from '@/types/api';

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (me: MeResponse) => void;
  clearUser: () => void;
  hasRole: (role: Role) => boolean;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      setUser: (me: MeResponse) => {
        console.log('[UserStore] setUser called with:', me);

        // Determine primary role (admin > manager > spender)
        const primaryRole: Role = me.roles.includes('admin')
          ? 'admin'
          : me.roles.includes('manager')
          ? 'manager'
          : me.roles.includes('spender')
          ? 'spender'
          : 'unknown';

        const user: User = {
          address: me.sub as `0x${string}`, // Backend uses 'sub' (SIWE standard)
          role: primaryRole,
          roles: me.roles,
          ownedAccountIds: me.ownedAccountIds,
          approverAccountIds: me.approverAccountIds,
        };
        console.log('[UserStore] Setting user state:', { user, isAuthenticated: true });
        set({ user, isAuthenticated: true });
      },

      clearUser: () => {
        console.log('[UserStore] clearUser called');
        set({ user: null, isAuthenticated: false });
      },

      hasRole: (role: Role) => {
        const { user } = get();
        if (!user) return false;
        return user.roles.includes(role) || user.role === role;
      },
    }),
    {
      name: 'spendos-user',
    }
  )
);
