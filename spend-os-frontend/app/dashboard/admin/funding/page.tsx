'use client';

import { useFundingHistory } from '@/lib/hooks/useFundingHistory';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FundingHistoryTable } from '@/components/treasury/funding-history-table';
import { SectionHeader } from '@/components/common/section-header';
import { AlertCircle } from 'lucide-react';

export default function AdminFundingPage() {
  const { data: events, isLoading, error } = useFundingHistory();

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Funding History"
        description="View all treasury funding operations (deposits and withdrawals)"
      />

      <Card className="glass-card p-6">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-500 mb-1">About Funding Operations</p>
              <p className="text-muted-foreground">
                Treasury funding is handled via Circle Gateway and backend automation. This page provides
                visibility into USDC movements in and out of the treasury across different chains. Inbound
                transfers increase the treasury balance, while outbound transfers reduce it.
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive mb-2">Failed to load funding history</p>
            <p className="text-sm text-muted-foreground">Please try again later</p>
          </div>
        ) : (
          <FundingHistoryTable events={events || []} />
        )}
      </Card>
    </div>
  );
}
