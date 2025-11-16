'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SpendStatusBadge } from './spend-status-badge';
import { EmptyState } from '@/components/common/empty-state';
import { formatUsdc, shortenAddress } from '@/lib/utils/format';
import { formatRelativeTime } from '@/lib/utils/date';
import { FileText } from 'lucide-react';
import type { SpendRequest } from '@/types/api';

interface SpendRequestsTableProps {
  requests: SpendRequest[];
  isLoading?: boolean;
  error?: Error | null;
  title?: string;
  showAccount?: boolean;
  compact?: boolean;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
}

export function SpendRequestsTable({
  requests,
  isLoading,
  error,
  title = 'Spend Requests',
  showAccount = true,
  compact = false,
  onApprove,
  onReject,
}: SpendRequestsTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Failed to load spend requests</p>
        </CardContent>
      </Card>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={FileText} title="No spend requests" description="There are no spend requests to display." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                {showAccount && <TableHead>Account</TableHead>}
                <TableHead>Amount</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Chain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.requestId}>
                  <TableCell className="font-mono text-sm">{request.requestId}</TableCell>
                  {showAccount && <TableCell>{request.accountLabel || `Account ${request.accountId}`}</TableCell>}
                  <TableCell className="font-semibold">${formatUsdc(request.amount)}</TableCell>
                  <TableCell className="font-mono text-sm">{shortenAddress(request.destinationAddress)}</TableCell>
                  <TableCell>{request.destinationChainId}</TableCell>
                  <TableCell>
                    <SpendStatusBadge status={request.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatRelativeTime(request.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {request.status === 'PENDING_APPROVAL' && onApprove && onReject && (
                        <>
                          <Button size="sm" variant="default" onClick={() => onApprove(request.requestId)}>
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => onReject(request.requestId)}>
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
