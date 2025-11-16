'use client';

import { useRouter } from 'next/navigation';
import { SectionHeader } from '@/components/common/section-header';
import { SpendRequestForm } from '@/components/spends/spend-request-form';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRoleGuard } from '@/lib/hooks/useRoleGuard';
import { useMySpendAccounts } from '@/lib/hooks/useSpendAccounts';

export default function SpenderRequestPage() {
  const router = useRouter();
  useRoleGuard('spender');

  const { data: accountsData, isLoading, error } = useMySpendAccounts();

  const myAccounts = Array.isArray(accountsData) ? accountsData : [];
  const activeAccounts = myAccounts
    .filter((account: any) => account.status === 'Active')
    .map((account: any) => ({
      id: account.accountId,
      name: account.label,
    }));

  if (isLoading) {
    return (
      <div className="space-y-8">
        <SectionHeader title="New Spend Request" />
        <Card>
          <CardContent className="py-8">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <SectionHeader title="New Spend Request" />
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-destructive text-center">Failed to load spend accounts</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeAccounts.length === 0) {
    return (
      <div className="space-y-8">
        <SectionHeader title="New Spend Request" />
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground text-center">
              You don't have any active spend accounts. Contact an admin to set up an account for you.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        title="New Spend Request"
        description="Request funds from your spend account"
      />

      <div className="max-w-3xl">
        <SpendRequestForm
          accounts={activeAccounts}
          onSuccess={() => {
            router.push('/dashboard/spender/history');
          }}
        />
      </div>
    </div>
  );
}
