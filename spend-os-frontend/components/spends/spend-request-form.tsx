'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useChainId } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRequestSpend } from '@/lib/contracts/hooks';
import { MAINNET_CHAINS, TESTNET_CHAINS, TESTNET_CHAIN_IDS } from '@/lib/config/constants';
import { toast } from 'sonner';

const formSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      { message: 'Amount must be a positive number' }
    ),
  chainId: z.string().min(1, 'Destination chain is required'),
  destinationAddress: z
    .string()
    .min(1, 'Destination address is required')
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
});

interface SpendRequestFormProps {
  accounts: { id: number; name: string }[];
  onSuccess?: () => void;
}

export function SpendRequestForm({ accounts, onSuccess }: SpendRequestFormProps) {
  const { requestSpend, isPending, isConfirming } = useRequestSpend();
  const chainId = useChainId();

  // Determine if we're on testnet based on the connected chain
  const isTestnet = chainId ? TESTNET_CHAIN_IDS.has(chainId) : false;
  const availableChains = isTestnet ? TESTNET_CHAINS : MAINNET_CHAINS;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountId: '',
      amount: '',
      chainId: '',
      destinationAddress: '',
      description: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await requestSpend({
        accountId: parseInt(values.accountId),
        amount: values.amount,
        chainId: parseInt(values.chainId),
        destinationAddress: values.destinationAddress as `0x${string}`,
        description: values.description,
      });

      form.reset();
      toast.success('Spend request submitted successfully!');
      onSuccess?.();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const isLoading = isPending || isConfirming;

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Spend Request</CardTitle>
        <CardDescription>Request funds from your spend account</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Account Selection */}
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Spend Account</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name} (ID: {account.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (USDC)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="100.00" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormDescription>Amount in USDC (e.g., 100.50)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Destination Chain */}
            <FormField
              control={form.control}
              name="chainId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination Chain</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select chain" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableChains.map((chain) => (
                        <SelectItem key={chain.id} value={chain.id.toString()}>
                          {chain.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Showing {isTestnet ? 'testnet' : 'mainnet'} chains based on your connected wallet
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Destination Address */}
            <FormField
              control={form.control}
              name="destinationAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination Address</FormLabel>
                  <FormControl>
                    <Input placeholder="0x..." {...field} disabled={isLoading} />
                  </FormControl>
                  <FormDescription>The address to receive USDC on the destination chain</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Payment for..." rows={3} {...field} disabled={isLoading} />
                  </FormControl>
                  <FormDescription>Brief description of the spend purpose</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
