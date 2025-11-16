'use client';

import { useState } from 'react';
import { SectionHeader } from '@/components/common/section-header';
import { SpendRequestsTable } from '@/components/spends/spend-requests-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useRoleGuard } from '@/lib/hooks/useRoleGuard';
import { useSpendRequests } from '@/lib/hooks/useSpendRequests';
import { useApproveSpend, useRejectSpend } from '@/lib/contracts/hooks';
import { toast } from 'sonner';

export default function ManagerApprovalsPage() {
  useRoleGuard('manager');

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedSpendId, setSelectedSpendId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: requestsData, isLoading, error } = useSpendRequests({ status: 'PENDING_APPROVAL' });
  const { approveSpend, isPending: isApproving } = useApproveSpend();
  const { rejectSpend, isPending: isRejecting } = useRejectSpend();

  const pendingRequests = requestsData || [];

  const handleApproveClick = (spendId: number) => {
    setSelectedSpendId(spendId);
    setApproveDialogOpen(true);
  };

  const handleRejectClick = (spendId: number) => {
    setSelectedSpendId(spendId);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const confirmApprove = async () => {
    if (selectedSpendId === null) return;

    try {
      await approveSpend(selectedSpendId);
      setApproveDialogOpen(false);
      toast.success('Spend request approved!');
    } catch (error) {
      // Error handled by hook
    }
  };

  const confirmReject = async () => {
    if (selectedSpendId === null || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      await rejectSpend(selectedSpendId, rejectionReason);
      setRejectDialogOpen(false);
      toast.success('Spend request rejected');
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Spend Approvals"
        description="Review and approve or reject pending spend requests"
      />

      <SpendRequestsTable
        requests={pendingRequests}
        isLoading={isLoading}
        error={error}
        title="Pending Approvals"
        onApprove={handleApproveClick}
        onReject={handleRejectClick}
      />

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Spend Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve spend request #{selectedSpendId}? This will trigger the cross-chain
              transfer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)} disabled={isApproving}>
              Cancel
            </Button>
            <Button onClick={confirmApprove} disabled={isApproving}>
              {isApproving ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Spend Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting spend request #{selectedSpendId}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Rejection Reason</Label>
            <Textarea
              id="reason"
              placeholder="Please explain why this request is being rejected..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} disabled={isRejecting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmReject} disabled={isRejecting || !rejectionReason.trim()}>
              {isRejecting ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
