'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSpendAccount } from '@/lib/hooks/useSpendAccount';
import { useAccountSpendRequests } from '@/lib/hooks/useSpendRequests';
import { useUserStore } from '@/lib/store/user';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { AccountCard } from '@/components/accounts/account-card';
import { AccountSummaryChart } from '@/components/accounts/account-summary-chart';
import { AccountConfigForm } from '@/components/accounts/account-config-form';
import { AllowedChainsForm } from '@/components/accounts/allowed-chains-form';
import { AutoTopupForm } from '@/components/accounts/auto-topup-form';
import { SpendRequestsTable } from '@/components/spends/spend-requests-table';
import { ArrowLeft } from 'lucide-react';
import { SUPPORTED_CHAINS } from '@/lib/config/constants';
import { Badge } from '@/components/ui/badge';
import { formatUsdc } from '@/lib/utils/format';

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUserStore();

  const accountId = params?.id ? parseInt(params.id as string) : null;
  const { data: account, isLoading: isAccountLoading, error: accountError } = useSpendAccount(accountId);
  const { data: requests = [], isLoading: isRequestsLoading } = useAccountSpendRequests(accountId);

  // Only admins and the account's manager can manage
  const canManage = user?.role === 'admin' || (user?.approverAccountIds || []).includes(accountId || -1);

  if (isAccountLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (accountError || !account) {
    return (
      <Card className="glass-card p-8 text-center">
        <h2 className="text-xl font-semibold text-destructive mb-2">Account Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The account you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Button variant="outline" onClick={() => router.push('/dashboard/admin/accounts')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Accounts
        </Button>
      </Card>
    );
  }

  const allowedChainNames = account.allowedChains
    .map((chainId) => SUPPORTED_CHAINS.find((c) => c.id === chainId)?.name || `Chain ${chainId}`)
    .join(', ');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/admin/accounts')}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Accounts
          </Button>
          <h1 className="text-3xl font-bold">Account Details</h1>
          <p className="text-muted-foreground mt-1">
            Manage configuration and view activity for {account.label}
          </p>
        </div>
      </div>

      {/* Account Summary Card */}
      <AccountCard account={account} canManage={canManage} />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="chains">Allowed Chains</TabsTrigger>
          <TabsTrigger value="autotopup">Auto-Topup</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Budget Chart */}
          <AccountSummaryChart account={account} />

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass-card p-4">
              <p className="text-sm text-muted-foreground">Virtual Balance</p>
              <p className="text-2xl font-bold text-primary mt-2">
                ${formatUsdc(account.virtualBalance)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Available for new requests
              </p>
            </Card>

            <Card className="glass-card p-4">
              <p className="text-sm text-muted-foreground">Daily Usage</p>
              <p className="text-2xl font-bold mt-2">
                ${formatUsdc(account.dailySpent)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {account.dailyLimit !== '0'
                  ? `of $${formatUsdc(account.dailyLimit)} limit`
                  : 'No daily limit'}
              </p>
            </Card>

            <Card className="glass-card p-4">
              <p className="text-sm text-muted-foreground">Period Progress</p>
              <p className="text-2xl font-bold mt-2">
                {account.budgetPerPeriod !== '0'
                  ? (
                      (parseFloat(formatUsdc(account.periodSpent, 10)) / parseFloat(formatUsdc(account.budgetPerPeriod, 10))) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ${formatUsdc(account.periodSpent)} of $
                {formatUsdc(account.budgetPerPeriod)}
              </p>
            </Card>
          </div>

          {/* Allowed Chains */}
          <Card className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">Allowed Destination Chains</h3>
            <div className="flex flex-wrap gap-2">
              {account.allowedChains.length > 0 ? (
                account.allowedChains.map((chainId) => {
                  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
                  return (
                    <Badge key={chainId} variant="secondary">
                      {chain?.name || `Chain ${chainId}`}
                    </Badge>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No chains configured</p>
              )}
            </div>
          </Card>

          {/* Recent Requests */}
          <Card className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Spend Requests</h3>
            {isRequestsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : requests.length > 0 ? (
              <SpendRequestsTable requests={requests.slice(0, 5)} compact />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No spend requests yet
              </p>
            )}
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration">
          {canManage ? (
            <AccountConfigForm account={account} onSuccess={() => window.location.reload()} />
          ) : (
            <Card className="glass-card p-8 text-center">
              <p className="text-muted-foreground">
                You don't have permission to modify this account's configuration.
              </p>
            </Card>
          )}
        </TabsContent>

        {/* Allowed Chains Tab */}
        <TabsContent value="chains">
          {canManage ? (
            <AllowedChainsForm account={account} onSuccess={() => window.location.reload()} />
          ) : (
            <Card className="glass-card p-8 text-center">
              <p className="text-muted-foreground mb-4">
                You don't have permission to modify this account's allowed chains.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {account.allowedChains.map((chainId) => {
                  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
                  return (
                    <Badge key={chainId} variant="secondary">
                      {chain?.name || `Chain ${chainId}`}
                    </Badge>
                  );
                })}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Auto-Topup Tab */}
        <TabsContent value="autotopup">
          {canManage ? (
            <AutoTopupForm account={account} onSuccess={() => window.location.reload()} />
          ) : (
            <Card className="glass-card p-8 text-center">
              <p className="text-muted-foreground">
                You don't have permission to modify this account's auto-topup configuration.
              </p>
            </Card>
          )}
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests">
          <Card className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">All Spend Requests</h3>
            {isRequestsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : requests.length > 0 ? (
              <SpendRequestsTable requests={requests} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No spend requests for this account yet
              </p>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
