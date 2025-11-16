'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionHeader } from '@/components/common/section-header';
import { RunwayCard } from '@/components/treasury/runway-card';
import { useRunway, useBurnRate } from '@/lib/hooks/useAnalytics';
import { formatUsdc } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';

export default function RunwayAnalyticsPage() {
  const [period, setPeriod] = useState<30 | 60 | 90>(30);
  const { data: runwayData, isLoading: isRunwayLoading } = useRunway();
  const { data: burnData, isLoading: isBurnLoading } = useBurnRate(period);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Runway Analytics"
        description="Analyze treasury runway and spending patterns over time"
      />

      {/* Runway Overview */}
      <div className="grid gap-4 md:grid-cols-1">
        <RunwayCard />
      </div>

      {/* Burn Rate Statistics */}
      <Card className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Burn Rate Analysis</h2>
          <div className="flex space-x-2">
            <Button
              variant={period === 30 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(30)}
            >
              30 Days
            </Button>
            <Button
              variant={period === 60 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(60)}
            >
              60 Days
            </Button>
            <Button
              variant={period === 90 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(90)}
            >
              90 Days
            </Button>
          </div>
        </div>

        {isBurnLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : burnData ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Analysis Period</p>
              <p className="text-lg font-semibold">{burnData.period} days</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-lg font-semibold">${formatUsdc(burnData.totalSpent)}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No spending data available</p>
          </div>
        )}
      </Card>

      {/* Summary Stats */}
      {burnData && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-card p-6">
            <p className="text-sm text-muted-foreground mb-2">Average Daily</p>
            <p className="text-2xl font-bold">${burnData.dailyAverage ? formatUsdc(burnData.dailyAverage) : '0.00'}</p>
          </Card>
          <Card className="glass-card p-6">
            <p className="text-sm text-muted-foreground mb-2">Average Weekly</p>
            <p className="text-2xl font-bold">${burnData.weeklyAverage ? formatUsdc(burnData.weeklyAverage) : '0.00'}</p>
          </Card>
          <Card className="glass-card p-6">
            <p className="text-sm text-muted-foreground mb-2">Average Monthly</p>
            <p className="text-2xl font-bold">${burnData.monthlyAverage ? formatUsdc(burnData.monthlyAverage) : '0.00'}</p>
          </Card>
        </div>
      )}
    </div>
  );
}
