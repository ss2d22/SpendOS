'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SectionHeader } from '@/components/common/section-header';
import { StatCard } from '@/components/common/stat-card';
import { SpendRequestsTable } from '@/components/spends/spend-requests-table';
import { useRoleGuard } from '@/lib/hooks/useRoleGuard';
import { useMySpendAccounts } from '@/lib/hooks/useSpendAccounts';
import { useSpendRequests } from '@/lib/hooks/useSpendRequests';
import { formatUsdc } from '@/lib/utils/format';
import { Wallet, TrendingUp, PlusCircle, FileText } from 'lucide-react';

export default function SpenderOverviewPage() {
  const { user } = useRoleGuard('spender');

  const { data: accountsData, isLoading: accountsLoading } = useMySpendAccounts();
  const { data: requestsData, isLoading: requestsLoading } = useSpendRequests({
    spender: user?.address,
    limit: 10,
  });

  const myAccounts = Array.isArray(accountsData) ? accountsData : [];
  const myRequests = Array.isArray(requestsData) ? requestsData : [];

  const totalVirtualBalance = myAccounts.reduce((sum: bigint, account: any) => {
    return sum + BigInt(account.periodSpent || '0');
  }, BigInt(0));

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Spender Overview"
        description="Your spend accounts and recent requests"
        action={
          <Button asChild>
            <Link href="/dashboard/spender/request">
              <PlusCircle className="w-4 h-4 mr-2" />
              New Request
            </Link>
          </Button>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Virtual Balance"
          value={`$${formatUsdc(totalVirtualBalance.toString())}`}
          description="Available across all accounts"
          icon={Wallet}
          isLoading={accountsLoading}
        />
        <StatCard
          title="Active Accounts"
          value={myAccounts.filter((a: any) => a.status === 'Active').length}
          description="Accounts you can use"
          icon={TrendingUp}
          isLoading={accountsLoading}
        />
        <StatCard
          title="Recent Requests"
          value={myRequests.length}
          description="Last 10 requests"
          icon={FileText}
          isLoading={requestsLoading}
        />
      </div>

      {/* My Accounts */}
      {myAccounts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {myAccounts.map((account: any) => (
            <Card key={account.accountId}>
              <CardHeader>
                <CardTitle className="text-lg">{account.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Period Spent</span>
                  <span className="font-semibold">${formatUsdc(account.periodSpent)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Budget/Period</span>
                  <span className="text-sm">${formatUsdc(account.budgetPerPeriod)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Per Tx Limit</span>
                  <span className="text-sm">${formatUsdc(account.perTxLimit)}</span>
                </div>
                {account.status === 'Frozen' && (
                  <div className="pt-2">
                    <span className="text-xs text-destructive font-medium">Account Frozen</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Requests */}
      <SpendRequestsTable
        requests={myRequests}
        isLoading={requestsLoading}
        title="Recent Requests"
        showAccount={true}
      />
    </div>
  );
}
