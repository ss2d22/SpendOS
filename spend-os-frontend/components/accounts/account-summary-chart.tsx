'use client';

import { SpendAccountDetails } from '@/types/api';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatUsdc } from '@/lib/utils/format';

interface AccountSummaryChartProps {
  account: SpendAccountDetails;
}

export function AccountSummaryChart({ account }: AccountSummaryChartProps) {
  const budgetNum = parseFloat(formatUsdc(account.budgetPerPeriod));
  const spentNum = parseFloat(formatUsdc(account.periodSpent));
  const reservedNum = parseFloat(formatUsdc(account.periodReserved));
  const availableNum = parseFloat(formatUsdc(account.virtualBalance));

  const data = [
    {
      name: 'Budget',
      Budget: budgetNum,
      Spent: spentNum,
      Reserved: reservedNum,
      Available: availableNum,
    },
  ];

  return (
    <Card className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-6">Period Budget Overview</h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value: any) => `$${value.toFixed(2)}`}
          />
          <Legend />
          <Bar dataKey="Budget" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} />
          <Bar dataKey="Spent" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
          <Bar dataKey="Reserved" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
          <Bar dataKey="Available" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div>
          <p className="text-xs text-muted-foreground">Total Budget</p>
          <p className="text-lg font-semibold">${budgetNum.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Spent</p>
          <p className="text-lg font-semibold text-destructive">${spentNum.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Reserved</p>
          <p className="text-lg font-semibold text-chart-2">${reservedNum.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Available</p>
          <p className="text-lg font-semibold text-primary">${availableNum.toFixed(2)}</p>
        </div>
      </div>
    </Card>
  );
}
