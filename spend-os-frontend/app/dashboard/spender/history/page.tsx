'use client';

import { SectionHeader } from '@/components/common/section-header';
import { SpendRequestsTable } from '@/components/spends/spend-requests-table';
import { useRoleGuard } from '@/lib/hooks/useRoleGuard';
import { useSpendRequests } from '@/lib/hooks/useSpendRequests';

export default function SpenderHistoryPage() {
  const { user } = useRoleGuard('spender');

  const { data: requestsData, isLoading, error } = useSpendRequests({
    spender: user?.address,
  });

  const myRequests = Array.isArray(requestsData) ? requestsData : [];

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Request History"
        description="All your spend requests and their status"
      />

      <SpendRequestsTable
        requests={myRequests}
        isLoading={isLoading}
        error={error}
        title="All Requests"
        showAccount={true}
      />
    </div>
  );
}
