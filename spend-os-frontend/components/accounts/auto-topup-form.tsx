'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AutoTopupFormData } from '@/types/models';
import { SpendAccountDetails } from '@/types/api';
import { updateAutoTopup, executeAutoTopup } from '@/lib/api/accounts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatUsdc } from '@/lib/utils/format';
import { Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const formSchema = z
  .object({
    minBalance: z
      .string()
      .min(1, 'Minimum balance is required')
      .refine(
        (val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num > 0;
        },
        { message: 'Minimum balance must be a positive number' }
      )
      .refine(
        (val) => {
          const parts = val.split('.');
          return parts.length === 1 || parts[1].length <= 6;
        },
        { message: 'Minimum balance can have at most 6 decimal places' }
      ),
    targetBalance: z
      .string()
      .min(1, 'Target balance is required')
      .refine(
        (val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num > 0;
        },
        { message: 'Target balance must be a positive number' }
      )
      .refine(
        (val) => {
          const parts = val.split('.');
          return parts.length === 1 || parts[1].length <= 6;
        },
        { message: 'Target balance can have at most 6 decimal places' }
      ),
  })
  .refine((data) => parseFloat(data.targetBalance) > parseFloat(data.minBalance), {
    message: 'Target balance must be greater than minimum balance',
    path: ['targetBalance'],
  });

interface AutoTopupFormProps {
  account: SpendAccountDetails;
  onSuccess?: () => void;
}

export function AutoTopupForm({ account, onSuccess }: AutoTopupFormProps) {
  const queryClient = useQueryClient();

  const { mutateAsync: updateConfig, isPending: isConfigPending } = useMutation({
    mutationFn: (data: { minBalance: string; targetBalance: string }) =>
      updateAutoTopup(account.accountId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spend-account', account.accountId] });
    },
  });

  const form = useForm<AutoTopupFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      minBalance: account.autoTopupEnabled ? formatUsdc(account.autoTopupMinBalance) : '',
      targetBalance: account.autoTopupEnabled ? formatUsdc(account.autoTopupTargetBalance) : '',
    },
  });

  const onSubmit = async (data: AutoTopupFormData) => {
    try {
      await updateConfig({
        minBalance: data.minBalance,
        targetBalance: data.targetBalance,
      });

      toast.success('Auto-topup configuration updated successfully');
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update auto-topup config');
      console.error('Failed to update auto-topup config:', error);
    }
  };

  const { mutateAsync: triggerTopup, isPending: isTopupPending } = useMutation({
    mutationFn: () => executeAutoTopup(account.accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spend-account', account.accountId] });
    },
  });

  const handleTriggerTopup = async () => {
    try {
      await triggerTopup();
      toast.success('Auto-topup triggered successfully');
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to trigger auto-topup');
      console.error('Failed to trigger auto-topup:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Auto-Topup Status</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Current virtual balance: ${formatUsdc(account.virtualBalance)}
            </p>
          </div>
          <Badge variant={account.autoTopupEnabled ? 'default' : 'secondary'}>
            {account.autoTopupEnabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>

        {account.autoTopupEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-sm text-muted-foreground">Minimum Balance</p>
              <p className="text-lg font-semibold">${formatUsdc(account.autoTopupMinBalance)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Target Balance</p>
              <p className="text-lg font-semibold">${formatUsdc(account.autoTopupTargetBalance)}</p>
            </div>
          </div>
        )}

        {account.autoTopupEnabled && account.status === 'Active' && (
          <div className="mt-6 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={handleTriggerTopup}
              disabled={isTopupPending}
            >
              <Play className="w-4 h-4 mr-2" />
              {isTopupPending ? 'Triggering...' : 'Trigger Auto-Topup Now'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Manually trigger an auto-topup operation for this account
            </p>
          </div>
        )}
      </Card>

      <Card className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">Configure Auto-Topup</h3>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="minBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Balance (USDC)</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="100.00" {...field} />
                  </FormControl>
                  <FormDescription>
                    When virtual balance falls below this threshold, auto-topup will trigger
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Balance (USDC)</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="500.00" {...field} />
                  </FormControl>
                  <FormDescription>
                    Auto-topup will add funds to reach this target balance
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <p className="text-sm">
                <strong>How it works:</strong> When the virtual balance drops below the minimum, the system
                will automatically add USDC from the treasury to bring the balance up to the target amount.
              </p>
              <p className="text-sm mt-2">
                <strong>Example:</strong> With min = $100 and target = $500, if balance reaches $95, the system
                will add $405 to bring it to $500.
              </p>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button type="submit" disabled={isConfigPending}>
                {isConfigPending ? 'Updating...' : 'Update Auto-Topup Config'}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}
