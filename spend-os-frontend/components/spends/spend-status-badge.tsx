import { Badge } from '@/components/ui/badge';
import type { SpendStatus } from '@/types/api';
import { cn } from '@/lib/utils';

interface SpendStatusBadgeProps {
  status: SpendStatus;
  className?: string;
}

const statusConfig: Record<
  SpendStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }
> = {
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    variant: 'outline',
    className: 'border-yellow-500 text-yellow-700 dark:text-yellow-400',
  },
  APPROVED: {
    label: 'Approved',
    variant: 'outline',
    className: 'border-blue-500 text-blue-700 dark:text-blue-400',
  },
  EXECUTING: {
    label: 'Executing',
    variant: 'outline',
    className: 'border-purple-500 text-purple-700 dark:text-purple-400',
  },
  EXECUTED: {
    label: 'Executed',
    variant: 'outline',
    className: 'border-green-500 text-green-700 dark:text-green-400',
  },
  REJECTED: {
    label: 'Rejected',
    variant: 'destructive',
  },
  FAILED: {
    label: 'Failed',
    variant: 'destructive',
  },
};

export function SpendStatusBadge({ status, className }: SpendStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.PENDING_APPROVAL;

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
