'use client';

import { SectionHeader } from '@/components/common/section-header';
import { StatCard } from '@/components/common/stat-card';
import { SpendRequestsTable } from '@/components/spends/spend-requests-table';
import { useRoleGuard } from '@/lib/hooks/useRoleGuard';
import { useSpendRequests } from '@/lib/hooks/useSpendRequests';
import { useMySpendAccounts } from '@/lib/hooks/useSpendAccounts';
import { CheckSquare, Users } from 'lucide-react';

export default function ManagerOverviewPage() {
  useRoleGuard('manager');

  const { data: requestsData, isLoading: requestsLoading } = useSpendRequests({ status: 'PENDING_APPROVAL' });
  const { data: accountsData, isLoading: accountsLoading } = useMySpendAccounts();

  const pendingRequests = Array.isArray(requestsData) ? requestsData : [];
  const managedAccounts = Array.isArray(accountsData) ? accountsData : [];

  return (
    <div className="space-y-8">
      <SectionHeader title="Manager Overview" description="Review and approve spend requests" />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="Pending Approvals"
          value={pendingRequests.length}
          description="Requests awaiting your approval"
          icon={CheckSquare}
          isLoading={requestsLoading}
        />
        <StatCard
          title="Managed Accounts"
          value={managedAccounts.length}
          description="Accounts you oversee"
          icon={Users}
          isLoading={accountsLoading}
        />
      </div>

      {/* Pending Approvals */}
      <SpendRequestsTable
        requests={pendingRequests}
        isLoading={requestsLoading}
        title="Pending Approvals"
      />
    </div>
  );
}
