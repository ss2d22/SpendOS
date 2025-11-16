'use client';

import { FundingEvent } from '@/types/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatUsdc, formatAddress } from '@/lib/utils/format';
import { formatDate } from '@/lib/utils/date';
import { ExternalLink } from 'lucide-react';

interface FundingHistoryTableProps {
  events: FundingEvent[];
}

export function FundingHistoryTable({ events }: FundingHistoryTableProps) {
  const getExplorerUrl = (txHash: string) => {
    // Arc Testnet explorer
    return `https://testnet.arcscan.app/tx/${txHash}`;
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No funding events recorded yet</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Depositor</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Transaction</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event, index) => (
            <TableRow key={event.transactionHash || index}>
              <TableCell className="font-mono text-sm">
                {formatDate(event.timestamp)}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {formatAddress(event.depositor)}
              </TableCell>
              <TableCell className="text-right font-semibold">
                <span className="text-green-500">+${formatUsdc(event.amount)}</span>
              </TableCell>
              <TableCell>
                <a
                  href={getExplorerUrl(event.transactionHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-primary hover:underline font-mono"
                >
                  {formatAddress(event.transactionHash)}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
