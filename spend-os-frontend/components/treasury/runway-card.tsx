'use client';

import { TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/common/stat-card';
import { useRunway } from '@/lib/hooks/useAnalytics';

export function RunwayCard() {
  const { data, isLoading, error } = useRunway();

  if (error) {
    return (
      <StatCard
        title="Runway"
        value="Error"
        description="Failed to load runway"
        icon={TrendingUp}
      />
    );
  }

  const runwayDays = data?.days || 0;
  const runwayText =
    runwayDays === -1
      ? 'Infinite'
      : runwayDays > 365
      ? `${Math.floor(runwayDays / 365)} years`
      : `${runwayDays} days`;

  return (
    <StatCard
      title="Runway"
      value={runwayText}
      description="Estimated time until funds depleted"
      icon={TrendingUp}
      isLoading={isLoading}
    />
  );
}
