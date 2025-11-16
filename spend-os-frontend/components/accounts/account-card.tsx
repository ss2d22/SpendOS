'use client';

import { SpendAccountDetails } from '@/types/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatUsdc, formatAddress } from '@/lib/utils/format';
import { Snowflake, Play, RotateCcw, XCircle, Unlock } from 'lucide-react';
import { useFreezeAccount, useUnfreezeAccount, useSweepAccount, useResetPeriod, useCloseAccount } from '@/lib/contracts/hooks';
import { useState } from 'react';
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

interface AccountCardProps {
  account: SpendAccountDetails;
  canManage?: boolean; // admin or manager
}

export function AccountCard({ account, canManage = false }: AccountCardProps) {
  const [freezeDialogOpen, setFreezeDialogOpen] = useState(false);
  const [unfreezeDialogOpen, setUnfreezeDialogOpen] = useState(false);
  const [sweepDialogOpen, setSweepDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  const { freezeAccount, isPending: isFreezePending } = useFreezeAccount();
  const { unfreezeAccount, isPending: isUnfreezePending } = useUnfreezeAccount();
  const { sweepAccount, isPending: isSweepPending } = useSweepAccount();
  const { resetPeriod, isPending: isResetPending } = useResetPeriod();
  const { closeAccount, isPending: isClosePending } = useCloseAccount();

  const handleFreeze = async () => {
    await freezeAccount(account.accountId);
    setFreezeDialogOpen(false);
  };

  const handleUnfreeze = async () => {
    await unfreezeAccount(account.accountId);
    setUnfreezeDialogOpen(false);
  };

  const handleSweep = async () => {
    await sweepAccount(account.accountId);
    setSweepDialogOpen(false);
  };

  const handleReset = async () => {
    await resetPeriod(account.accountId);
    setResetDialogOpen(false);
  };

  const handleClose = async () => {
    await closeAccount(account.accountId);
    setCloseDialogOpen(false);
  };

  const canClose = account.periodReserved === '0';
  const statusColor =
    account.status === 'Active'
      ? 'bg-green-500/10 text-green-500 border-green-500/20'
      : account.status === 'Frozen'
        ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
        : 'bg-gray-500/10 text-gray-500 border-gray-500/20';

  return (
    <>
      <Card className="glass-card p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-semibold">{account.label}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Account #{account.accountId}
              </p>
            </div>
            <Badge className={statusColor}>{account.status}</Badge>
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Owner</p>
              <p className="font-mono text-sm mt-1">{formatAddress(account.owner)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Approver</p>
              <p className="font-mono text-sm mt-1">{formatAddress(account.approver)}</p>
            </div>
          </div>

          {/* Budget and Limits */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Budget/Period</p>
              <p className="text-lg font-semibold mt-1">
                ${formatUsdc(account.budgetPerPeriod)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Per-Tx Limit</p>
              <p className="text-lg font-semibold mt-1">
                ${formatUsdc(account.perTxLimit)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Daily Limit</p>
              <p className="text-lg font-semibold mt-1">
                {account.dailyLimit === '0' ? 'None' : `$${formatUsdc(account.dailyLimit)}`}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Approval Threshold</p>
              <p className="text-lg font-semibold mt-1">
                ${formatUsdc(account.approvalThreshold)}
              </p>
            </div>
          </div>

          {/* Period Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Period Spent</p>
              <p className="text-lg font-semibold mt-1">
                ${formatUsdc(account.periodSpent)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Period Reserved</p>
              <p className="text-lg font-semibold mt-1">
                ${formatUsdc(account.periodReserved)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Virtual Balance</p>
              <p className="text-lg font-semibold mt-1 text-primary">
                ${formatUsdc(account.virtualBalance)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Daily Spent</p>
              <p className="text-lg font-semibold mt-1">
                ${formatUsdc(account.dailySpent)}
              </p>
            </div>
          </div>

          {/* Actions */}
          {canManage && account.status !== 'Closed' && (
            <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
              {account.status === 'Active' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFreezeDialogOpen(true)}
                  disabled={isFreezePending}
                >
                  <Snowflake className="w-4 h-4 mr-2" />
                  Freeze Account
                </Button>
              ) : account.status === 'Frozen' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUnfreezeDialogOpen(true)}
                  disabled={isUnfreezePending}
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  Unfreeze Account
                </Button>
              ) : null}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSweepDialogOpen(true)}
                disabled={isSweepPending || account.status !== 'Active'}
              >
                <Play className="w-4 h-4 mr-2" />
                Sweep Account
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setResetDialogOpen(true)}
                disabled={isResetPending || account.status !== 'Active'}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Period
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCloseDialogOpen(true)}
                disabled={isClosePending || !canClose}
                title={!canClose ? 'Cannot close account with reserved funds' : ''}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Close Account
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Confirmation Dialogs */}
      <AlertDialog open={freezeDialogOpen} onOpenChange={setFreezeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Freeze Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to freeze "{account.label}"? No new spend requests will be accepted while frozen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFreeze} disabled={isFreezePending}>
              {isFreezePending ? 'Freezing...' : 'Freeze'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={unfreezeDialogOpen} onOpenChange={setUnfreezeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unfreeze Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unfreeze "{account.label}"? Spenders will be able to submit requests again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnfreeze} disabled={isUnfreezePending}>
              {isUnfreezePending ? 'Unfreezing...' : 'Unfreeze'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={sweepDialogOpen} onOpenChange={setSweepDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sweep Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will return all unused budget for the current period to the treasury. Continue?
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
              This will reset the current spending period, clearing period spent and reserved amounts. Continue?
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

      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently close "{account.label}"? This action cannot be undone.
              {!canClose && (
                <p className="text-destructive mt-2">
                  Cannot close account with reserved funds (${formatUsdc(account.periodReserved)}).
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClose}
              disabled={isClosePending || !canClose}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isClosePending ? 'Closing...' : 'Close Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
