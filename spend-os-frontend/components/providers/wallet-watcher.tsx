'use client';

import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useUserStore } from '@/lib/store/user';
import { logout } from '@/lib/api/auth';
import { clearAllCookies } from '@/lib/utils/cookies';

/**
 * Component that watches for wallet disconnection and logs out the user
 */
export function WalletWatcher() {
  const { address, isConnected } = useAccount();
  const { isAuthenticated, clearUser } = useUserStore();
  const previousAddress = useRef<string | undefined>();
  const previousConnected = useRef<boolean>(false);

  useEffect(() => {
    // Track when wallet disconnects
    if (previousConnected.current && !isConnected && isAuthenticated) {
      console.log('[WalletWatcher] Wallet disconnected, logging out user');

      // Call logout API to clear server-side session
      logout()
        .then(() => {
          console.log('[WalletWatcher] Logout API call successful');
        })
        .catch((error) => {
          console.error('[WalletWatcher] Logout API call failed:', error);
        })
        .finally(() => {
          // Clear all cookies
          clearAllCookies();
          // Clear user from local store regardless of API success
          clearUser();
        });
    }

    // Track when wallet address changes (user switched accounts)
    if (
      previousAddress.current &&
      address &&
      previousAddress.current !== address &&
      isAuthenticated
    ) {
      console.log('[WalletWatcher] Wallet address changed, logging out user');

      // Call logout API to clear server-side session
      logout()
        .then(() => {
          console.log('[WalletWatcher] Logout API call successful');
        })
        .catch((error) => {
          console.error('[WalletWatcher] Logout API call failed:', error);
        })
        .finally(() => {
          // Clear all cookies
          clearAllCookies();
          // Clear user from local store regardless of API success
          clearUser();
        });
    }

    // Update refs for next render
    previousAddress.current = address;
    previousConnected.current = isConnected;
  }, [address, isConnected, isAuthenticated, clearUser]);

  return null; // This component doesn't render anything
}
