import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arcTestnet } from './chains';

// Get WalletConnect project ID from env - use a dummy ID if not set
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'dummy-project-id-for-local-dev';

export const wagmiConfig = getDefaultConfig({
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Arc SpendOS',
  projectId: walletConnectProjectId,
  chains: [arcTestnet],
  ssr: true,
});
