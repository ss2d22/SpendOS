'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { treasuryConfig } from './treasury';
import { parseUsdcToInt } from '../utils/format';
import { toast } from 'sonner';
import { mapEvmErrorToMessage } from '../utils/errors';
import { useQueryClient } from '@tanstack/react-query';

// ============================================================================
// Account Management Hooks
// ============================================================================

/**
 * Hook to create a new spend account
 */
export function useCreateSpendAccount() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const queryClient = useQueryClient();

  const createSpendAccount = async (params: {
    name: string;
    spender: `0x${string}`;
    approver: `0x${string}`;
    budgetPerPeriod: string;
    perTxLimit: string;
    approvalThreshold: string;
    resetPeriodDays: number;
    allowedChains: number[];
  }) => {
    try {
      const hash = await writeContractAsync({
        ...treasuryConfig,
        functionName: 'createSpendAccount',
        args: [
          params.name,
          params.spender,
          params.approver,
          parseUsdcToInt(params.budgetPerPeriod),
          parseUsdcToInt(params.perTxLimit),
          parseUsdcToInt(params.approvalThreshold),
          BigInt(params.resetPeriodDays),
          params.allowedChains.map(BigInt),
        ],
      });

      toast.success('Spend account creation submitted!');

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['spend-accounts'] });

      return hash;
    } catch (error: any) {
      const message = mapEvmErrorToMessage(error);
      toast.error(`Failed to create account: ${message}`);
      throw error;
    }
  };

  return {
    createSpendAccount,
    hash,
    isPending,
    isConfirming,
    error,
  };
}

/**
 * Hook to update spend account configuration
 */
export function useUpdateSpendAccount() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const queryClient = useQueryClient();

  const updateSpendAccount = async (params: {
    accountId: number;
    budgetPerPeriod: string;
    perTxLimit: string;
    approvalThreshold: string;
    resetPeriodDays: number;
  }) => {
    try {
      const hash = await writeContractAsync({
        ...treasuryConfig,
        functionName: 'updateSpendAccount',
        args: [
          BigInt(params.accountId),
          parseUsdcToInt(params.budgetPerPeriod),
          parseUsdcToInt(params.perTxLimit),
          parseUsdcToInt(params.approvalThreshold),
          BigInt(params.resetPeriodDays),
        ],
      });

      toast.success('Account update submitted!');

      await queryClient.invalidateQueries({ queryKey: ['spend-accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['spend-account', params.accountId] });

      return hash;
    } catch (error: any) {
      const message = mapEvmErrorToMessage(error);
      toast.error(`Failed to update account: ${message}`);
      throw error;
    }
  };

  return {
    updateSpendAccount,
    hash,
    isPending,
    isConfirming,
    error,
  };
}

/**
 * Hook to close a spend account
 */
export function useCloseAccount() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const queryClient = useQueryClient();

  const closeAccount = async (accountId: number) => {
    try {
      const hash = await writeContractAsync({
        ...treasuryConfig,
        functionName: 'closeAccount',
        args: [BigInt(accountId)],
      });

      toast.success('Account closure submitted!');

      await queryClient.invalidateQueries({ queryKey: ['spend-accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['spend-account', accountId] });

      return hash;
    } catch (error: any) {
      const message = mapEvmErrorToMessage(error);
      toast.error(`Failed to close account: ${message}`);
      throw error;
    }
  };

  return {
    closeAccount,
    hash,
    isPending,
    isConfirming,
    error,
  };
}

/**
 * Hook to freeze a spend account
 */
export function useFreezeAccount() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const queryClient = useQueryClient();

  const freezeAccount = async (accountId: number) => {
    try {
      const hash = await writeContractAsync({
        ...treasuryConfig,
        functionName: 'freezeAccount',
        args: [BigInt(accountId)],
      });

      toast.success('Account frozen!');

      await queryClient.invalidateQueries({ queryKey: ['spend-accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['spend-account', accountId] });

      return hash;
    } catch (error: any) {
      const message = mapEvmErrorToMessage(error);
      toast.error(`Failed to freeze account: ${message}`);
      throw error;
    }
  };

  return {
    freezeAccount,
    hash,
    isPending,
    isConfirming,
    error,
  };
}

/**
 * Hook to unfreeze a spend account
 */
export function useUnfreezeAccount() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const queryClient = useQueryClient();

  const unfreezeAccount = async (accountId: number) => {
    try {
      const hash = await writeContractAsync({
        ...treasuryConfig,
        functionName: 'unfreezeAccount',
        args: [BigInt(accountId)],
      });

      toast.success('Account unfrozen!');

      await queryClient.invalidateQueries({ queryKey: ['spend-accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['spend-account', accountId] });

      return hash;
    } catch (error: any) {
      const message = mapEvmErrorToMessage(error);
      toast.error(`Failed to unfreeze account: ${message}`);
      throw error;
    }
  };

  return {
    unfreezeAccount,
    hash,
    isPending,
    isConfirming,
    error,
  };
}

/**
 * Hook to update allowed chains for a spend account
 */
export function useUpdateAllowedChains() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const queryClient = useQueryClient();

  const updateAllowedChains = async (accountId: number, chainIds: number[]) => {
    try {
      const hash = await writeContractAsync({
        ...treasuryConfig,
        functionName: 'updateAllowedChains',
        args: [BigInt(accountId), chainIds.map(BigInt)],
      });

      toast.success('Allowed chains updated!');

      await queryClient.invalidateQueries({ queryKey: ['spend-accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['spend-account', accountId] });

      return hash;
    } catch (error: any) {
      const message = mapEvmErrorToMessage(error);
      toast.error(`Failed to update chains: ${message}`);
      throw error;
    }
  };

  return {
    updateAllowedChains,
    hash,
    isPending,
    isConfirming,
    error,
  };
}

/**
 * Hook to set auto-topup configuration
 */
export function useSetAutoTopupConfig() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const queryClient = useQueryClient();

  const setAutoTopupConfig = async (params: {
    accountId: number;
    enabled: boolean;
    threshold: string;
    topupAmount: string;
  }) => {
    try {
      const hash = await writeContractAsync({
        ...treasuryConfig,
        functionName: 'setAutoTopupConfig',
        args: [
          BigInt(params.accountId),
          params.enabled,
          parseUsdcToInt(params.threshold),
          parseUsdcToInt(params.topupAmount),
        ],
      });

      toast.success('Auto-topup configuration updated!');

      await queryClient.invalidateQueries({ queryKey: ['spend-accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['spend-account', params.accountId] });

      return hash;
    } catch (error: any) {
      const message = mapEvmErrorToMessage(error);
      toast.error(`Failed to set auto-topup: ${message}`);
      throw error;
    }
  };

  return {
    setAutoTopupConfig,
    hash,
    isPending,
    isConfirming,
    error,
  };
}

/**
 * Hook to manually trigger auto-topup
 */
export function useAutoTopup() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const queryClient = useQueryClient();

  const autoTopup = async (accountId: number) => {
    try {
      const hash = await writeContractAsync({
        ...treasuryConfig,
        functionName: 'autoTopup',
        args: [BigInt(accountId)],
      });

      toast.success('Auto-topup triggered!');

      await queryClient.invalidateQueries({ queryKey: ['spend-accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['spend-account', accountId] });
      await queryClient.invalidateQueries({ queryKey: ['treasury-balance'] });

      return hash;
    } catch (error: any) {
      const message = mapEvmErrorToMessage(error);
      toast.error(`Failed to topup: ${message}`);
      throw error;
    }
  };

  return {
    autoTopup,
    hash,
    isPending,
    isConfirming,
    error,
  };
}

/**
 * Hook to reset period for a spend account
 */
export function useResetPeriod() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const queryClient = useQueryClient();

  const resetPeriod = async (accountId: number) => {
    try {
      const hash = await writeContractAsync({
        ...treasuryConfig,
        functionName: 'resetPeriod',
        args: [BigInt(accountId)],
      });

      toast.success('Period reset!');

      await queryClient.invalidateQueries({ queryKey: ['spend-accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['spend-account', accountId] });

      return hash;
    } catch (error: any) {
      const message = mapEvmErrorToMessage(error);
      toast.error(`Failed to reset period: ${message}`);
      throw error;
    }
  };

  return {
    resetPeriod,
    hash,
    isPending,
    isConfirming,
    error,
  };
}

/**
 * Hook to sweep funds from account back to treasury
 */
export function useSweepAccount() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const queryClient = useQueryClient();

  const sweepAccount = async (accountId: number) => {
    try {
      const hash = await writeContractAsync({
        ...treasuryConfig,
        functionName: 'sweepAccount',
        args: [BigInt(accountId)],
      });

      toast.success('Account swept!');

      await queryClient.invalidateQueries({ queryKey: ['spend-accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['spend-account', accountId] });
      await queryClient.invalidateQueries({ queryKey: ['treasury-balance'] });

      return hash;
    } catch (error: any) {
      const message = mapEvmErrorToMessage(error);
      toast.error(`Failed to sweep account: ${message}`);
      throw error;
    }
  };

  return {
    sweepAccount,
    hash,
    isPending,
    isConfirming,
    error,
  };
}

// ============================================================================
// Spend Management Hooks
// ============================================================================

/**
 * Hook to request a spend
 */
export function useRequestSpend() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const queryClient = useQueryClient();

  const requestSpend = async (params: {
    accountId: number;
    amount: string;
    chainId: number;
    destinationAddress: `0x${string}`;
    description: string;
  }) => {
    try {
      const hash = await writeContractAsync({
        ...treasuryConfig,
        functionName: 'requestSpend',
        args: [
          BigInt(params.accountId),
          parseUsdcToInt(params.amount),
          BigInt(params.chainId),
          params.destinationAddress,
          params.description,
        ],
      });

      toast.success('Spend request submitted!');

      await queryClient.invalidateQueries({ queryKey: ['spend-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['spend-account', params.accountId] });

      return hash;
    } catch (error: any) {
      const message = mapEvmErrorToMessage(error);
      toast.error(`Failed to request spend: ${message}`);
      throw error;
    }
  };

  return {
    requestSpend,
    hash,
    isPending,
    isConfirming,
    error,
  };
}

/**
 * Hook to approve a spend request
 */
export function useApproveSpend() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const queryClient = useQueryClient();

  const approveSpend = async (spendId: number) => {
    try {
      const hash = await writeContractAsync({
        ...treasuryConfig,
        functionName: 'approveSpend',
        args: [BigInt(spendId)],
      });

      toast.success('Spend approved!');

      await queryClient.invalidateQueries({ queryKey: ['spend-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['spend-request', spendId] });

      return hash;
    } catch (error: any) {
      const message = mapEvmErrorToMessage(error);
      toast.error(`Failed to approve spend: ${message}`);
      throw error;
    }
  };

  return {
    approveSpend,
    hash,
    isPending,
    isConfirming,
    error,
  };
}

/**
 * Hook to reject a spend request
 */
export function useRejectSpend() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const queryClient = useQueryClient();

  const rejectSpend = async (spendId: number, reason: string) => {
    try {
      const hash = await writeContractAsync({
        ...treasuryConfig,
        functionName: 'rejectSpend',
        args: [BigInt(spendId), reason],
      });

      toast.success('Spend rejected!');

      await queryClient.invalidateQueries({ queryKey: ['spend-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['spend-request', spendId] });

      return hash;
    } catch (error: any) {
      const message = mapEvmErrorToMessage(error);
      toast.error(`Failed to reject spend: ${message}`);
      throw error;
    }
  };

  return {
    rejectSpend,
    hash,
    isPending,
    isConfirming,
    error,
  };
}

// ============================================================================
// Contract Management Hooks
// ============================================================================

/**
 * Hook to pause the contract (admin only)
 */
export function usePauseContract() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const queryClient = useQueryClient();

  const pauseContract = async () => {
    try {
      const hash = await writeContractAsync({
        ...treasuryConfig,
        functionName: 'pause',
        args: [],
      });

      toast.success('Contract paused!');

      await queryClient.invalidateQueries({ queryKey: ['contract-status'] });

      return hash;
    } catch (error: any) {
      const message = mapEvmErrorToMessage(error);
      toast.error(`Failed to pause contract: ${message}`);
      throw error;
    }
  };

  return {
    pauseContract,
    hash,
    isPending,
    isConfirming,
    error,
  };
}

/**
 * Hook to unpause the contract (admin only)
 */
export function useUnpauseContract() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const queryClient = useQueryClient();

  const unpauseContract = async () => {
    try {
      const hash = await writeContractAsync({
        ...treasuryConfig,
        functionName: 'unpause',
        args: [],
      });

      toast.success('Contract unpaused!');

      await queryClient.invalidateQueries({ queryKey: ['contract-status'] });

      return hash;
    } catch (error: any) {
      const message = mapEvmErrorToMessage(error);
      toast.error(`Failed to unpause contract: ${message}`);
      throw error;
    }
  };

  return {
    unpauseContract,
    hash,
    isPending,
    isConfirming,
    error,
  };
}
