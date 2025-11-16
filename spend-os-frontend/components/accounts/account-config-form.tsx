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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PERIOD_DURATIONS, UpdateAccountFormData } from '@/types/models';
import { SpendAccountDetails } from '@/types/api';
import { updateSpendAccount } from '@/lib/api/accounts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatUsdc } from '@/lib/utils/format';

const formSchema = z
  .object({
    label: z.string().min(1, 'Label is required').max(64, 'Label must be 64 characters or less'),
    budgetPerPeriod: z
      .string()
      .min(1, 'Budget is required')
      .refine(
        (val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num > 0;
        },
        { message: 'Budget must be a positive number' }
      )
      .refine(
        (val) => {
          const parts = val.split('.');
          return parts.length === 1 || parts[1].length <= 6;
        },
        { message: 'Budget can have at most 6 decimal places' }
      ),
    periodDuration: z.enum(['weekly', 'monthly', 'custom']),
    customPeriodSeconds: z.string().optional(),
    perTxLimit: z
      .string()
      .min(1, 'Per-tx limit is required')
      .refine(
        (val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num > 0;
        },
        { message: 'Per-tx limit must be a positive number' }
      )
      .refine(
        (val) => {
          const parts = val.split('.');
          return parts.length === 1 || parts[1].length <= 6;
        },
        { message: 'Per-tx limit can have at most 6 decimal places' }
      ),
    dailyLimit: z
      .string()
      .min(1, 'Daily limit is required')
      .refine(
        (val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num >= 0;
        },
        { message: 'Daily limit must be a non-negative number' }
      )
      .refine(
        (val) => {
          const parts = val.split('.');
          return parts.length === 1 || parts[1].length <= 6;
        },
        { message: 'Daily limit can have at most 6 decimal places' }
      ),
    approvalThreshold: z
      .string()
      .min(1, 'Approval threshold is required')
      .refine(
        (val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num > 0;
        },
        { message: 'Approval threshold must be a positive number' }
      )
      .refine(
        (val) => {
          const parts = val.split('.');
          return parts.length === 1 || parts[1].length <= 6;
        },
        { message: 'Approval threshold can have at most 6 decimal places' }
      ),
  })
  .refine((data) => parseFloat(data.approvalThreshold) <= parseFloat(data.perTxLimit), {
    message: 'Approval threshold must be less than or equal to per-transaction limit',
    path: ['approvalThreshold'],
  })
  .refine(
    (data) => {
      const dailyLimit = parseFloat(data.dailyLimit);
      const perTxLimit = parseFloat(data.perTxLimit);
      return dailyLimit === 0 || dailyLimit >= perTxLimit;
    },
    {
      message: 'Daily limit must be 0 (no limit) or greater than or equal to per-transaction limit',
      path: ['dailyLimit'],
    }
  )
  .refine(
    (data) => {
      if (data.periodDuration === 'custom') {
        const seconds = parseInt(data.customPeriodSeconds || '0');
        return !isNaN(seconds) && seconds > 0;
      }
      return true;
    },
    {
      message: 'Custom period seconds must be a positive number',
      path: ['customPeriodSeconds'],
    }
  );

interface AccountConfigFormProps {
  account: SpendAccountDetails;
  onSuccess?: () => void;
}

export function AccountConfigForm({ account, onSuccess }: AccountConfigFormProps) {
  const queryClient = useQueryClient();

  const { mutateAsync: updateAccount, isPending } = useMutation({
    mutationFn: (data: {
      budgetPerPeriod?: string;
      perTxLimit?: string;
      dailyLimit?: string;
      approvalThreshold?: string;
    }) => updateSpendAccount(account.accountId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spend-account', account.accountId] });
    },
  });

  // Determine period duration type
  const getPeriodType = (seconds: number): 'weekly' | 'monthly' | 'custom' => {
    const weekInSeconds = 7 * 24 * 60 * 60;
    const monthInSeconds = 30 * 24 * 60 * 60;
    if (seconds === weekInSeconds) return 'weekly';
    if (seconds === monthInSeconds) return 'monthly';
    return 'custom';
  };

  const periodType = getPeriodType(account.periodDuration);

  const form = useForm<UpdateAccountFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: account.label,
      budgetPerPeriod: formatUsdc(account.budgetPerPeriod),
      periodDuration: periodType,
      customPeriodSeconds: periodType === 'custom' ? account.periodDuration.toString() : '',
      perTxLimit: formatUsdc(account.perTxLimit),
      dailyLimit: formatUsdc(account.dailyLimit),
      approvalThreshold: formatUsdc(account.approvalThreshold),
    },
  });

  const periodDuration = form.watch('periodDuration');

  const onSubmit = async (data: UpdateAccountFormData) => {
    // Get period duration in seconds
    let periodSeconds: number;
    if (data.periodDuration === 'custom') {
      periodSeconds = parseInt(data.customPeriodSeconds || '0');
    } else {
      const periodOption = PERIOD_DURATIONS.find((p) => p.value === data.periodDuration);
      periodSeconds = periodOption?.seconds || 0;
    }

    // Check if new budget is sufficient
    const newBudget = parseFloat(data.budgetPerPeriod);
    const currentAllocated =
      parseFloat(formatUsdc(account.periodSpent)) + parseFloat(formatUsdc(account.periodReserved));
    if (newBudget < currentAllocated) {
      toast.error(
        `New budget ($${newBudget.toFixed(2)}) is less than currently allocated ($${currentAllocated.toFixed(2)}). Transaction may revert.`
      );
    }

    try {
      await updateAccount({
        budgetPerPeriod: data.budgetPerPeriod,
        perTxLimit: data.perTxLimit,
        dailyLimit: data.dailyLimit,
        approvalThreshold: data.approvalThreshold,
      });

      toast.success('Account configuration updated successfully');
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update account');
      console.error('Failed to update account:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Label</FormLabel>
              <FormControl>
                <Input placeholder="Engineering Team" {...field} />
              </FormControl>
              <FormDescription>A human-readable name for this account (max 64 chars)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Read-only display of owner and approver */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Owner Address (Spender)
            </label>
            <div className="mt-2 p-3 rounded-md bg-muted font-mono text-sm">{account.owner}</div>
            <p className="text-sm text-muted-foreground mt-1">The address that can request spends (read-only)</p>
          </div>

          <div>
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Approver Address
            </label>
            <div className="mt-2 p-3 rounded-md bg-muted font-mono text-sm">{account.approver}</div>
            <p className="text-sm text-muted-foreground mt-1">The address that can approve requests (read-only)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="budgetPerPeriod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget Per Period (USDC)</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="1000.00" {...field} />
                </FormControl>
                <FormDescription>Total budget available each period</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="periodDuration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Period Duration</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PERIOD_DURATIONS.map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>How often the budget resets</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {periodDuration === 'custom' && (
          <FormField
            control={form.control}
            name="customPeriodSeconds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custom Period (Seconds)</FormLabel>
                <FormControl>
                  <Input type="number" min="1" placeholder="86400" {...field} />
                </FormControl>
                <FormDescription>Period duration in seconds (e.g., 86400 = 1 day)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="perTxLimit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Per-Transaction Limit (USDC)</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="100.00" {...field} />
                </FormControl>
                <FormDescription>Max amount per request</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dailyLimit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Daily Limit (USDC)</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="0 for no limit" {...field} />
                </FormControl>
                <FormDescription>0 = no daily limit</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="approvalThreshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Approval Threshold (USDC)</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="50.00" {...field} />
                </FormControl>
                <FormDescription>Auto-approve below this</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Updating...' : 'Update Configuration'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
