'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSpendAccounts } from '@/lib/hooks/useSpendAccounts';
import { useUserStore } from '@/lib/store/user';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionHeader } from '@/components/common/section-header';
import { EmptyState } from '@/components/common/empty-state';
import { formatUsdc, formatAddress } from '@/lib/utils/format';
import { useSweepAccount, useResetPeriod, useAutoTopup } from '@/lib/contracts/hooks';
import { Play, RotateCcw, Eye } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ManagerAccountsPage() {
  const router = useRouter();
  const { user } = useUserStore();
  const { data: allAccounts, isLoading } = useSpendAccounts();

  const [sweepDialogOpen, setSweepDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [topupDialogOpen, setTopupDialogOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const { sweepAccount, isPending: isSweepPending } = useSweepAccount();
  const { resetPeriod, isPending: isResetPending } = useResetPeriod();
  const { autoTopup, isPending: isTopupPending } = useAutoTopup();

  // Filter accounts where current user is the approver
  const managedAccounts = (Array.isArray(allAccounts) && user?.address)
    ? allAccounts.filter(
        (account) => account.approver?.toLowerCase() === user.address.toLowerCase()
      )
    : [];

  const handleSweep = async () => {
    if (selectedAccountId === null) return;
    await sweepAccount(selectedAccountId);
    setSweepDialogOpen(false);
    setSelectedAccountId(null);
  };

  const handleReset = async () => {
    if (selectedAccountId === null) return;
    await resetPeriod(selectedAccountId);
    setResetDialogOpen(false);
    setSelectedAccountId(null);
  };

  const handleTopup = async () => {
    if (selectedAccountId === null) return;
    await autoTopup(selectedAccountId);
    setTopupDialogOpen(false);
    setSelectedAccountId(null);
  };

  const openSweepDialog = (accountId: number) => {
    setSelectedAccountId(accountId);
    setSweepDialogOpen(true);
  };

  const openResetDialog = (accountId: number) => {
    setSelectedAccountId(accountId);
    setResetDialogOpen(true);
  };

  const openTopupDialog = (accountId: number) => {
    setSelectedAccountId(accountId);
    setTopupDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (managedAccounts.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Managed Accounts"
          description="View and manage spend accounts where you are the approver"
        />
        <EmptyState
          title="No Managed Accounts"
          description="You are not assigned as an approver for any spend accounts yet."
          icon={Eye}
        />
      </div>
    );
  }

  const selectedAccount = managedAccounts.find((a) => a.accountId === selectedAccountId);

  return (
    <>
      <div className="space-y-6">
        <SectionHeader
          title="Managed Accounts"
          description={`You are managing ${managedAccounts.length} spend account${managedAccounts.length !== 1 ? 's' : ''}`}
        />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {managedAccounts.map((account) => {
            const virtualBalance =
              parseFloat(formatUsdc(account.budgetPerPeriod)) -
              (parseFloat(formatUsdc(account.periodSpent)) + parseFloat(formatUsdc(account.periodReserved)));

            const statusColor =
              account.status === 'Active'
                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                : account.status === 'Frozen'
                  ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                  : 'bg-gray-500/10 text-gray-500 border-gray-500/20';

            return (
              <Card key={account.accountId} className="glass-card p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{account.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Account #{account.accountId}
                    </p>
                  </div>
                  <Badge className={statusColor}>{account.status}</Badge>
                </div>

                {/* Owner */}
                <div>
                  <p className="text-xs text-muted-foreground">Owner (Spender)</p>
                  <p className="font-mono text-sm mt-1">{formatAddress(account.owner)}</p>
                </div>

                {/* Budget Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Period Budget</p>
                    <p className="text-lg font-semibold mt-1">
                      ${formatUsdc(account.budgetPerPeriod)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Virtual Balance</p>
                    <p className="text-lg font-semibold text-primary mt-1">
                      ${virtualBalance.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Period Spent</p>
                    <p className="text-sm font-medium mt-1">${formatUsdc(account.periodSpent)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Period Reserved</p>
                    <p className="text-sm font-medium mt-1">${formatUsdc(account.periodReserved)}</p>
                  </div>
                </div>

                {/* Auto-Topup Status */}
                {account.autoTopupEnabled && (
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium">Auto-Topup</p>
                      <Badge variant="outline" className="text-green-500 border-green-500">
                        Enabled
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Min:</span>{' '}
                        <span className="font-medium">${formatUsdc(account.autoTopupMinBalance)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Target:</span>{' '}
                        <span className="font-medium">${formatUsdc(account.autoTopupTargetBalance)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/admin/accounts/${account.accountId}`)}
                    className="flex-1"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>

                  {account.status === 'Active' && account.autoTopupEnabled && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openTopupDialog(account.accountId)}
                      disabled={isTopupPending && selectedAccountId === account.accountId}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Topup
                    </Button>
                  )}

                  {account.status === 'Active' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openSweepDialog(account.accountId)}
                        disabled={isSweepPending && selectedAccountId === account.accountId}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Sweep
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openResetDialog(account.accountId)}
                        disabled={isResetPending && selectedAccountId === account.accountId}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Reset
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <AlertDialog open={sweepDialogOpen} onOpenChange={setSweepDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sweep Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will return all unused budget for the current period to the treasury for{' '}
              <strong>{selectedAccount?.label}</strong>. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSweep} disabled={isSweepPending}>
              {isSweepPending ? 'Sweeping...' : 'Sweep'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Period</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the current spending period for <strong>{selectedAccount?.label}</strong>,
              clearing period spent and reserved amounts. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} disabled={isResetPending}>
              {isResetPending ? 'Resetting...' : 'Reset'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={topupDialogOpen} onOpenChange={setTopupDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trigger Auto-Topup</AlertDialogTitle>
            <AlertDialogDescription>
              This will manually trigger the auto-topup operation for <strong>{selectedAccount?.label}</strong>.
              The account will be topped up to the configured target balance. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTopup} disabled={isTopupPending}>
              {isTopupPending ? 'Triggering...' : 'Trigger Topup'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
