'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SectionHeader } from '@/components/common/section-header';
import { EmptyState } from '@/components/common/empty-state';
import { useRoleGuard } from '@/lib/hooks/useRoleGuard';
import { useSpendAccounts } from '@/lib/hooks/useSpendAccounts';
import { formatUsdc, shortenAddress } from '@/lib/utils/format';
import { PlusCircle, Wallet, ExternalLink } from 'lucide-react';

export default function AdminAccountsPage() {
  useRoleGuard('admin');

  const { data, isLoading, error } = useSpendAccounts();

  const accounts = data || [];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <SectionHeader title="Spend Accounts" />
        <Card>
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <SectionHeader title="Spend Accounts" />
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-destructive text-center">Failed to load spend accounts</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Spend Accounts"
        description="Manage all spend accounts and their configurations"
        action={
          <Button asChild>
            <Link href="/dashboard/admin/accounts/new">
              <PlusCircle className="w-4 h-4 mr-2" />
              New Account
            </Link>
          </Button>
        }
      />

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No spend accounts"
          description="Create your first spend account to get started"
          action={
            <Button asChild>
              <Link href="/dashboard/admin/accounts/new">
                <PlusCircle className="w-4 h-4 mr-2" />
                Create Account
              </Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Accounts ({accounts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Spender</TableHead>
                    <TableHead>Virtual Balance</TableHead>
                    <TableHead>Budget/Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.accountId}>
                      <TableCell className="font-mono text-sm">{account.accountId}</TableCell>
                      <TableCell className="font-semibold">{account.label}</TableCell>
                      <TableCell className="font-mono text-sm">{shortenAddress(account.owner)}</TableCell>
                      <TableCell className="font-semibold">${formatUsdc(account.periodSpent)}</TableCell>
                      <TableCell>${formatUsdc(account.budgetPerPeriod)}</TableCell>
                      <TableCell>
                        {account.status === 'Frozen' ? (
                          <Badge variant="destructive">Frozen</Badge>
                        ) : account.status === 'Closed' ? (
                          <Badge variant="outline">Closed</Badge>
                        ) : (
                          <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/dashboard/admin/accounts/${account.accountId}`}>
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
