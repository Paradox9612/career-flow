import { BarChart3, Download, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { EmptyState } from '@/src/components/ui/empty-state';
import { Input } from '@/src/components/ui/input';
import {
  computeAnalyticsMetrics,
  computeApplicationFunnel,
  computeApplicationTrend,
  computeStatusDistribution,
  filterApplicationsByDateRange,
  type AnalyticsDateRange,
} from '@/src/lib/analytics';
import { exportApplicationsToCsv } from '@/src/lib/utils';
import type { JobApplication } from '@/src/types/careerflow';

interface AnalyticsPageProps {
  applications: JobApplication[];
  loading: boolean;
  onOpenCreateApplication: () => void;
}

const RANGE_OPTIONS: { id: AnalyticsDateRange; label: string }[] = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: '180d', label: 'Last 6 months' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom' },
];

export function AnalyticsPage({
  applications,
  loading,
  onOpenCreateApplication,
}: AnalyticsPageProps) {
  const [range, setRange] = useState<AnalyticsDateRange>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const scopedApplications = useMemo(
    () => filterApplicationsByDateRange(applications, range, customStart, customEnd),
    [applications, range, customStart, customEnd]
  );

  const metrics = useMemo(
    () => computeAnalyticsMetrics(scopedApplications),
    [scopedApplications]
  );
  const funnelData = useMemo(
    () => computeApplicationFunnel(scopedApplications),
    [scopedApplications]
  );
  const statusData = useMemo(
    () => computeStatusDistribution(scopedApplications),
    [scopedApplications]
  );
  const monthlyTrend = useMemo(
    () => computeApplicationTrend(scopedApplications, 'monthly'),
    [scopedApplications]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-24 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse"
            />
          ))}
        </div>
        <div className="h-96 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Analytics & Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Conversion rates, source performance, and submission velocity calculated from your saved applications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={scopedApplications.length === 0}
            onClick={() => exportApplicationsToCsv(scopedApplications)}
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={scopedApplications.length === 0}
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            <span>Print Summary</span>
          </Button>
        </div>
      </div>

      {/* Date Range Filters */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-full sm:w-fit">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setRange(opt.id)}
              className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                range === opt.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {range === 'custom' && (
          <div className="grid grid-cols-1 sm:flex sm:items-center gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 w-9 sm:w-auto">From</span>
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-9 flex-1 sm:w-40 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 w-9 sm:w-auto">To</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-9 flex-1 sm:w-40 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {applications.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No analytics data available yet"
          description="Conversion rates, source performance, and funnel charts will calculate automatically once you track your first job applications."
          action={
            <Button type="button" onClick={onOpenCreateApplication}>
              Add First Application
            </Button>
          }
        />
      ) : scopedApplications.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No applications in selected date range"
          description="Expand your date filter or switch back to All time to inspect your historical pipeline metrics."
          action={
            <Button type="button" variant="outline" onClick={() => setRange('all')}>
              Show All Time
            </Button>
          }
        />
      ) : (
        <>
          {/* 6 Calculated Conversion Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { label: 'Total in Range', value: String(metrics.total) },
              { label: 'Response Rate', value: `${metrics.responseRate}%` },
              { label: 'Interview Rate', value: `${metrics.interviewConversionRate}%` },
              { label: 'Offer Rate', value: `${metrics.offerConversionRate}%` },
              { label: 'Rejection Rate', value: `${metrics.rejectionRate}%` },
              { label: 'Avg Apps / Week', value: String(metrics.avgApplicationsPerWeek) },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5 sm:px-5 sm:py-4"
              >
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {m.label}
                </p>
                <p className="mt-1.5 font-display text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {m.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <Card className="lg:col-span-7 min-w-0">
              <CardHeader>
                <h2 className="text-base font-semibold">Monthly Activity</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Applications added vs submitted per month
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyTrend.series}
                      margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.35} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                        }}
                      />
                      <Bar
                        dataKey="applications"
                        name="Added"
                        fill="#94a3b8"
                        radius={[4, 4, 0, 0]}
                        barSize={18}
                      />
                      <Bar
                        dataKey="submitted"
                        name="Submitted"
                        fill="#2563eb"
                        radius={[4, 4, 0, 0]}
                        barSize={18}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-5 min-w-0">
              <CardHeader>
                <h2 className="text-base font-semibold">Pipeline Outcomes Breakdown</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Active pipeline, offers, rejections, and inactive roles
                </p>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row items-center gap-6">
                <div className="h-[220px] w-full sm:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.outcomesBreakdown}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={82}
                        paddingAngle={2}
                      >
                        {metrics.outcomesBreakdown.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <ul className="space-y-2.5 text-xs flex-1 w-full">
                  {metrics.outcomesBreakdown.map((item) => (
                    <li
                      key={item.name}
                      className="flex items-center justify-between gap-3 py-1 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                    >
                      <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <span
                          className="h-2.5 w-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span>{item.name}</span>
                      </span>
                      <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                        {item.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <Card className="lg:col-span-6 min-w-0">
              <CardHeader>
                <h2 className="text-base font-semibold">Interview Conversion Funnel</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Stage-by-stage drop-off within selected period
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={funnelData}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.35} horizontal={false} />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="stage"
                        width={76}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value, _name, item) => [
                          `${value} (${item.payload.conversionPct}%)`,
                          'Reached',
                        ]}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-6 min-w-0">
              <CardHeader>
                <h2 className="text-base font-semibold">Application Source Performance</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Which channels generate the most interviews and offers
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <th className="py-3 pl-4 sm:pl-6 pr-3 whitespace-nowrap">Source</th>
                        <th className="py-3 px-3 text-right whitespace-nowrap">Apps</th>
                        <th className="py-3 px-3 text-right whitespace-nowrap">Interviews</th>
                        <th className="py-3 px-3 text-right whitespace-nowrap">Offers</th>
                        <th className="py-3 pl-3 pr-4 sm:pr-6 text-right whitespace-nowrap">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                      {metrics.sourcePerformance.map((row) => (
                        <tr key={row.source}>
                          <td className="py-3 pl-6 pr-3 font-medium text-slate-900 dark:text-slate-100">
                            {row.source}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums">
                            {row.total}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums">
                            {row.interviews}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums">
                            {row.offers}
                          </td>
                          <td className="py-3 pl-3 pr-6 text-right font-mono tabular-nums text-blue-600 dark:text-blue-400 font-medium">
                            {row.interviewRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold">Status Counts</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Exact application counts by stage within selected period
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="h-[250px] min-w-[540px] sm:min-w-0 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statusData}
                      margin={{ top: 8, right: 16, left: -16, bottom: 20 }}
                    >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.35} />
                    <XAxis
                      dataKey="status"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      interval={0}
                      angle={-18}
                      textAnchor="end"
                      height={50}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" name="Applications" radius={[4, 4, 0, 0]} barSize={26}>
                      {statusData.map((entry) => (
                        <Cell key={entry.status} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
