'use client';

import { Wallet } from 'lucide-react';
import { StatCard } from '@/components/common/stat-card';
import { useTreasuryBalance } from '@/lib/hooks/useTreasuryBalance';

export function TreasuryBalanceCard() {
  const { data, isLoading, error } = useTreasuryBalance();

  if (error) {
    return (
      <StatCard
        title="Treasury Balance"
        value="Error"
        description="Failed to load balance"
        icon={Wallet}
      />
    );
  }

  // Backend now returns already-formatted USDC dollar strings (e.g., "22.50", "5.00")
  const unifiedBalance = data?.unified || '0.00';
  const available = data?.available || '0.00';
  const committed = data?.committed || '0.00';

  return (
    <StatCard
      title="Treasury Balance (Unified)"
      value={`$${unifiedBalance}`}
      description={`Available: $${available} | Committed: $${committed}`}
      icon={Wallet}
      isLoading={isLoading}
    />
  );
}
