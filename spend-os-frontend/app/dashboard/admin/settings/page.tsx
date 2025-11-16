'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SectionHeader } from '@/components/common/section-header';
import { usePauseContract, useUnpauseContract } from '@/lib/contracts/hooks';
import { TREASURY_ADDRESS } from '@/lib/config/constants';
import { formatAddress } from '@/lib/utils/format';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Pause, Play, Server, Shield, Activity, AlertTriangle } from 'lucide-react';
import { SUPPORTED_CHAINS } from '@/lib/config/constants';

export default function AdminSettingsPage() {
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [unpauseDialogOpen, setUnpauseDialogOpen] = useState(false);

  const { pauseContract, isPending: isPausePending } = usePauseContract();
  const { unpauseContract, isPending: isUnpausePending } = useUnpauseContract();

  const handlePause = async () => {
    await pauseContract();
    setPauseDialogOpen(false);
  };

  const handleUnpause = async () => {
    await unpauseContract();
    setUnpauseDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="System Settings"
        description="Manage contract configuration, permissions, and system state"
      />

      {/* Contract & Environment */}
      <Card className="glass-card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Server className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Contract & Environment</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Treasury Contract Address</p>
              <div className="flex items-center space-x-2">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  {formatAddress(TREASURY_ADDRESS, 12)}
                </code>
                <a
                  href={`https://testnet.arcscan.app/address/${TREASURY_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  View on Explorer
                </a>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Network</p>
              <Badge variant="outline" className="text-blue-500 border-blue-500">
                Arc Testnet (5042002)
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Supported Destination Chains</p>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_CHAINS.map((chain) => (
                <Badge key={chain.id} variant="secondary">
                  {chain.name} ({chain.id})
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Contract State */}
      <Card className="glass-card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Contract State</h2>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-500 mb-1">Emergency Controls</p>
              <p className="text-muted-foreground">
                Pausing the contract will prevent all spend operations (requests, approvals, executions).
                Only use this in emergency situations. Existing funds remain safe.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Contract Status</p>
            <div className="flex items-center space-x-2">
              <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                Active
              </Badge>
              <p className="text-sm text-muted-foreground">
                All operations are functioning normally
              </p>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="destructive"
              onClick={() => setPauseDialogOpen(true)}
              disabled={isPausePending}
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause Contract
            </Button>
            <Button
              variant="outline"
              onClick={() => setUnpauseDialogOpen(true)}
              disabled={isUnpausePending}
            >
              <Play className="w-4 h-4 mr-2" />
              Unpause Contract
            </Button>
          </div>
        </div>
      </Card>

      {/* System Health */}
      <Card className="glass-card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">System Health</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Database</p>
              <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                OK
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">All database connections healthy</p>
          </div>

          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Redis Cache</p>
              <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                OK
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Cache responding normally</p>
          </div>

          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Arc RPC</p>
              <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                OK
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Blockchain connection active</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Last checked: {new Date().toLocaleString()} • Auto-refresh every 30 seconds
        </p>
      </Card>

      {/* Role Management Info */}
      <Card className="glass-card p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Role Management</h2>
        </div>

        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            Role assignments are managed via the smart contract and backend. Each spend account has its own
            owner (spender) and approver (manager). Global admin permissions are controlled by the contract
            owner and cannot be modified through this interface.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            To modify roles for specific accounts, use the account detail pages.
          </p>
        </div>
      </Card>

      {/* Confirmation Dialogs */}
      <AlertDialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pause Contract</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to pause the Treasury contract? This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Prevent all new spend requests</li>
                <li>Block all spend approvals</li>
                <li>Halt all spend executions</li>
                <li>Stop all auto-topup operations</li>
              </ul>
              <p className="mt-2 font-semibold text-destructive">
                Only use this in emergency situations!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePause}
              disabled={isPausePending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPausePending ? 'Pausing...' : 'Pause Contract'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={unpauseDialogOpen} onOpenChange={setUnpauseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpause Contract</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unpause the Treasury contract? This will restore all normal operations
              including spend requests, approvals, and executions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnpause} disabled={isUnpausePending}>
              {isUnpausePending ? 'Unpausing...' : 'Unpause Contract'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
