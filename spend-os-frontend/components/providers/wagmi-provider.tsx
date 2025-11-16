'use client';

import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '@/lib/config/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { useUIStore } from '@/lib/store/ui';
import { WalletWatcher } from './wallet-watcher';
import '@rainbow-me/rainbowkit/styles.css';
import { ReactNode, useState } from 'react';

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 5000,
      },
    },
  }));

  const { darkMode } = useUIStore();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkMode ? darkTheme() : lightTheme()}
        >
          <WalletWatcher />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
