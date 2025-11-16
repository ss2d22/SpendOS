'use client';

import { SectionHeader } from '@/components/common/section-header';
import { TreasuryBalanceCard } from '@/components/treasury/treasury-balance-card';
import { RunwayCard } from '@/components/treasury/runway-card';
import { BurnRateCard } from '@/components/treasury/burn-rate-card';
import { SpendRequestsTable } from '@/components/spends/spend-requests-table';
import { useRoleGuard } from '@/lib/hooks/useRoleGuard';
import { useSpendRequests } from '@/lib/hooks/useSpendRequests';

export default function AdminOverviewPage() {
  useRoleGuard('admin');

  const { data: requestsData, isLoading, error } = useSpendRequests({ limit: 10 });

  const recentRequests = requestsData || [];

  return (
    <div className="space-y-8">
      <SectionHeader title="Admin Overview" description="Treasury management and system overview" />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <TreasuryBalanceCard />
        <RunwayCard />
        <div className="md:col-span-1">
          <BurnRateCard />
        </div>
      </div>

      {/* Recent Requests */}
      <SpendRequestsTable
        requests={recentRequests}
        isLoading={isLoading}
        error={error}
        title="Recent Spend Requests"
      />
    </div>
  );
}
