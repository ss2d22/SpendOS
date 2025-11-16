'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SectionHeader } from '@/components/common/section-header';
import { useRoleGuard } from '@/lib/hooks/useRoleGuard';
import { MAINNET_CHAINS, TESTNET_CHAINS, TESTNET_CHAIN_IDS } from '@/lib/config/constants';
import { toast } from 'sonner';
import { createSpendAccount } from '@/lib/api/accounts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useChainId } from 'wagmi';

const formSchema = z
  .object({
    label: z.string().min(1, 'Label is required').max(64, 'Label must be 64 characters or less'),
    owner: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
    approver: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
    budgetPerPeriod: z.string().refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: 'Budget must be a positive number' }
    ),
    perTxLimit: z.string().refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: 'Per-transaction limit must be a positive number' }
    ),
    dailyLimit: z.string().refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      },
      { message: 'Daily limit must be a non-negative number (0 for no limit)' }
    ),
    approvalThreshold: z.string().refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      },
      { message: 'Approval threshold must be a non-negative number' }
    ),
    periodDays: z.string().refine(
      (val) => {
        const num = parseInt(val);
        return !isNaN(num) && num > 0;
      },
      { message: 'Period duration must be a positive number of days' }
    ),
    allowedChains: z.array(z.number()).min(1, 'At least one chain must be selected'),
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
  );

export default function NewAccountPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const chainId = useChainId();
  useRoleGuard('admin');

  // Determine if we're on testnet based on the connected chain
  const isTestnet = chainId ? TESTNET_CHAIN_IDS.has(chainId) : false;
  const availableChains = isTestnet ? TESTNET_CHAINS : MAINNET_CHAINS;

  const { mutateAsync: createAccount, isPending } = useMutation({
    mutationFn: createSpendAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spend-accounts'] });
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: '',
      owner: '',
      approver: '',
      budgetPerPeriod: '',
      perTxLimit: '',
      dailyLimit: '0',
      approvalThreshold: '',
      periodDays: '30', // 30 days
      allowedChains: [],
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Convert days to seconds (1 day = 86400 seconds)
      const periodDurationInSeconds = parseInt(values.periodDays) * 86400;

      await createAccount({
        label: values.label,
        owner: values.owner,
        approver: values.approver,
        budgetPerPeriod: values.budgetPerPeriod,
        perTxLimit: values.perTxLimit,
        dailyLimit: values.dailyLimit,
        approvalThreshold: values.approvalThreshold,
        periodDuration: periodDurationInSeconds,
        allowedChains: values.allowedChains,
      });

      toast.success('Account created successfully!');
      router.push('/dashboard/admin/accounts');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
      console.error('Failed to create account:', error);
    }
  };

  const isLoading = isPending;

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Create Spend Account"
        description="Set up a new spend account with budget and approval rules"
      />

      <div className="max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>Configure the spend account parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Account Label */}
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Label</FormLabel>
                      <FormControl>
                        <Input placeholder="Marketing Budget" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormDescription>A descriptive label for this spend account (max 64 chars)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Owner Address (Spender) */}
                <FormField
                  control={form.control}
                  name="owner"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Address (Spender)</FormLabel>
                      <FormControl>
                        <Input placeholder="0x..." {...field} disabled={isLoading} />
                      </FormControl>
                      <FormDescription>Ethereum address of the account owner who can request spends</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Approver Address */}
                <FormField
                  control={form.control}
                  name="approver"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Approver Address</FormLabel>
                      <FormControl>
                        <Input placeholder="0x..." {...field} disabled={isLoading} />
                      </FormControl>
                      <FormDescription>Ethereum address of the approver/manager</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Budget Per Period */}
                <FormField
                  control={form.control}
                  name="budgetPerPeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Per Period (USDC)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="10000.00" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormDescription>Total budget allocated per reset period</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Per Transaction Limit */}
                <FormField
                  control={form.control}
                  name="perTxLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Per Transaction Limit (USDC)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="1000.00" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormDescription>Maximum amount per single transaction</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Daily Limit */}
                <FormField
                  control={form.control}
                  name="dailyLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Limit (USDC)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0 for no limit" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormDescription>
                        Maximum daily spending limit. Set to 0 for no daily limit.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Approval Threshold */}
                <FormField
                  control={form.control}
                  name="approvalThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Approval Threshold (USDC)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="500.00" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormDescription>
                        Requests below this amount are auto-approved
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Period Duration (in days) */}
                <FormField
                  control={form.control}
                  name="periodDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Period Duration (days)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" placeholder="30" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormDescription>
                        Budget reset period in days (e.g., 30 = monthly, 7 = weekly, 90 = quarterly)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Allowed Chains */}
                <FormField
                  control={form.control}
                  name="allowedChains"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel>Allowed Destination Chains</FormLabel>
                        <FormDescription>
                          Select which chains this account can send USDC to ({isTestnet ? 'Testnet' : 'Mainnet'} chains)
                        </FormDescription>
                      </div>
                      {availableChains.map((chain) => (
                        <FormField
                          key={chain.id}
                          control={form.control}
                          name="allowedChains"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={chain.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(chain.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, chain.id])
                                        : field.onChange(field.value?.filter((value) => value !== chain.id));
                                    }}
                                    disabled={isLoading}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {chain.name} (Chain ID: {chain.id})
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Account'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
