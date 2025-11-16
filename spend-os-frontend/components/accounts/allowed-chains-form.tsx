'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { SpendAccountDetails } from '@/types/api';
import { updateAllowedChains } from '@/lib/api/accounts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MAINNET_CHAINS, TESTNET_CHAINS, TESTNET_CHAIN_IDS } from '@/lib/config/constants';
import { Badge } from '@/components/ui/badge';
import { useChainId } from 'wagmi';

interface AllowedChainsFormProps {
  account: SpendAccountDetails;
  onSuccess?: () => void;
}

export function AllowedChainsForm({ account, onSuccess }: AllowedChainsFormProps) {
  const queryClient = useQueryClient();
  const chainId = useChainId();
  const [selectedChains, setSelectedChains] = useState<number[]>(account.allowedChains);

  // Determine if we're on testnet based on the connected chain
  const isTestnet = chainId ? TESTNET_CHAIN_IDS.has(chainId) : false;
  const availableChains = isTestnet ? TESTNET_CHAINS : MAINNET_CHAINS;

  const { mutateAsync: updateChains, isPending } = useMutation({
    mutationFn: (chains: number[]) =>
      updateAllowedChains(account.accountId, { allowedChains: chains }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spend-account', account.accountId] });
    },
  });

  const handleToggleChain = (chainId: number) => {
    setSelectedChains((prev) => {
      if (prev.includes(chainId)) {
        return prev.filter((id) => id !== chainId);
      } else {
        return [...prev, chainId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedChains.length === 0) {
      toast.error('Please select at least one chain');
      return;
    }

    try {
      await updateChains(selectedChains);
      toast.success('Allowed chains updated successfully');
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update allowed chains');
      console.error('Failed to update allowed chains:', error);
    }
  };

  const hasChanges = JSON.stringify([...selectedChains].sort()) !== JSON.stringify([...account.allowedChains].sort());

  return (
    <form onSubmit={handleSubmit}>
      <Card className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">Allowed Destination Chains</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Select which chains spenders can request funds to be sent to ({isTestnet ? 'Testnet' : 'Mainnet'} chains). Changes will take effect immediately after confirmation.
        </p>

        <div className="space-y-4">
          {availableChains.map((chain) => {
            const isSelected = selectedChains.includes(chain.id);
            const isCurrentlyAllowed = account.allowedChains.includes(chain.id);

            return (
              <div
                key={chain.id}
                className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  id={`chain-${chain.id}`}
                  checked={isSelected}
                  onCheckedChange={() => handleToggleChain(chain.id)}
                />
                <label
                  htmlFor={`chain-${chain.id}`}
                  className="flex-1 flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <p className="font-medium">{chain.name}</p>
                    <p className="text-sm text-muted-foreground">Chain ID: {chain.id}</p>
                  </div>
                  {isCurrentlyAllowed && !isSelected && (
                    <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                      Will be removed
                    </Badge>
                  )}
                  {!isCurrentlyAllowed && isSelected && (
                    <Badge variant="outline" className="text-green-500 border-green-500">
                      Will be added
                    </Badge>
                  )}
                  {isCurrentlyAllowed && isSelected && (
                    <Badge variant="secondary">Currently allowed</Badge>
                  )}
                </label>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedChains.length} chain{selectedChains.length !== 1 ? 's' : ''} selected
            </p>
            <Button type="submit" disabled={isPending || !hasChanges}>
              {isPending ? 'Updating...' : hasChanges ? 'Update Allowed Chains' : 'No Changes'}
            </Button>
          </div>
        </div>
      </Card>
    </form>
  );
}
