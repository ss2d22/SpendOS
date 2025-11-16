'use client';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionHeader } from '@/components/common/section-header';
import { useDepartmentBreakdown } from '@/lib/hooks/useAnalytics';
import { formatUsdc } from '@/lib/utils/format';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function DepartmentBreakdownPage() {
  const { data: breakdown, isLoading, error } = useDepartmentBreakdown();

  const chartData = breakdown?.map((dept) => ({
    name: dept.department,
    value: parseFloat(formatUsdc(dept.totalSpent)),
    percentage: dept.percentage,
  })) || [];

  const totalSpent = breakdown?.reduce((sum, dept) => sum + parseFloat(formatUsdc(dept.totalSpent)), 0) || 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Department Breakdown"
        description="View spending distribution across different departments and accounts"
      />

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      ) : error ? (
        <Card className="glass-card p-8 text-center">
          <p className="text-destructive mb-2">Failed to load department breakdown</p>
          <p className="text-sm text-muted-foreground">Please try again later</p>
        </Card>
      ) : breakdown && breakdown.length > 0 ? (
        <>
          {/* Total Spending Summary */}
          <Card className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spending Across All Departments</p>
                <p className="text-3xl font-bold mt-2">${totalSpent.toFixed(2)}</p>
              </div>
              <Badge variant="secondary">{breakdown.length} Departments</Badge>
            </div>
          </Card>

          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Pie Chart */}
            <Card className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-6">Spending Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry: any) => `${entry.name}: ${entry.percentage.toFixed(1)}%`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: any, name, props: any) => [
                      `$${value.toFixed(2)} (${props.payload.percentage.toFixed(1)}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Bar Chart */}
            <Card className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-6">Spending by Department</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: any) => [`$${value.toFixed(2)}`, 'Spent']}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Detailed Table */}
          <Card className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">Department Details</h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Account ID</TableHead>
                    <TableHead className="text-right">Total Spent</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdown.map((dept, index) => (
                    <TableRow key={dept.accountId}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span>{dept.department}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">#{dept.accountId}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${formatUsdc(dept.totalSpent)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{dept.percentage.toFixed(1)}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      ) : (
        <Card className="glass-card p-12 text-center">
          <p className="text-muted-foreground">No spending data available</p>
          <p className="text-sm text-muted-foreground mt-2">
            Create spend accounts and make requests to see department breakdown
          </p>
        </Card>
      )}
    </div>
  );
}
