'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useSignMessage } from 'wagmi';
import { Button } from '@/components/ui/button';
import { getNonce, verifySignature } from '@/lib/api/auth';
import { buildSiweMessage } from '@/lib/auth/siwe';
import { useUserStore } from '@/lib/store/user';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function SignInWithWalletButton() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { isAuthenticated } = useUserStore();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    if (!address || !isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    console.log('[AUTH] Starting sign-in process for address:', address);
    setIsLoading(true);

    try {
      // Step 1: Get nonce
      console.log('[AUTH] Step 1: Getting nonce...');
      const { nonce } = await getNonce(address);
      console.log('[AUTH] Nonce received:', nonce);

      // Step 2: Build SIWE message
      console.log('[AUTH] Step 2: Building SIWE message...');
      const message = buildSiweMessage(address, nonce);
      console.log('[AUTH] SIWE message:', message);

      // Step 3: Sign message
      console.log('[AUTH] Step 3: Requesting wallet signature...');
      const signature = await signMessageAsync({ message });
      console.log('[AUTH] Signature received:', signature);

      // Step 4: Verify signature
      console.log('[AUTH] Step 4: Verifying signature with backend...');
      await verifySignature({ address, message, signature });
      console.log('[AUTH] Signature verified successfully');

      // Step 5: Refetch user data and wait for it to complete
      console.log('[AUTH] Step 5: Refetching user data...');
      const result = await queryClient.refetchQueries({ queryKey: ['me'] });
      console.log('[AUTH] Refetch result:', result);

      toast.success('Successfully signed in!');

      // Navigate to dashboard after successful sign-in
      console.log('[AUTH] Navigating to dashboard...');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('[AUTH] Sign in error:', error);

      // Check if it's a network error (backend not available)
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        toast.error('Backend API is not available. Please ensure the backend server is running on http://localhost:3001');
      } else if (error.message.includes('User rejected')) {
        toast.error('Signature request was rejected');
      } else {
        toast.error(error.message || 'Failed to sign in');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <Button
      onClick={handleSignIn}
      disabled={isLoading}
      variant="default"
    >
      {isLoading ? 'Signing in...' : 'Sign in with wallet'}
    </Button>
  );
}
