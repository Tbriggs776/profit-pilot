import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  Users, Activity, MousePointer, Clock,
  RefreshCw, Calendar, TrendingUp, Eye, Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

const RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

function StatCard({ title, value, sub, icon: Icon, color, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="border-0 shadow-md bg-white dark:bg-slate-800">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{title}</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
              {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
            </div>
            <div className={`p-2.5 rounded-xl ${color}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>
          {p.value} {p.name}
        </p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [rangeIndex, setRangeIndex] = useState(0);

  // Use device local timezone offset (minutes behind UTC)
  const timezoneOffset = new Date().getTimezoneOffset();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const days = RANGES[rangeIndex].days;
      const startDate = format(startOfDay(subDays(new Date(), days - 1)), "yyyy-MM-dd'T'HH:mm:ss");
      const endDate = format(endOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss");

      const { data: result, error: fnError } = await supabase.functions.invoke('getAnalytics', {
        body: { startDate, endDate, timezoneOffset },
      });
      if (fnError) throw fnError;
      setData(result);
    } catch (e) {
      setError(e.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [rangeIndex]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const localTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold text-slate-900 dark:text-white">Analytics</span>
            <span className="hidden sm:inline text-xs text-slate-400 ml-1">({localTZ})</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="gap-2 text-slate-600 dark:text-slate-400"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Date Range Picker */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {RANGES.map((r, i) => (
            <button
              key={i}
              onClick={() => setRangeIndex(i)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all select-none ${
                rangeIndex === i
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              {r.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border-0 shadow-md bg-white dark:bg-slate-800 animate-pulse h-24" />
            ))}
          </div>
        )}

        {data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Events" value={data.summary.totalEvents.toLocaleString()} icon={Zap} color="bg-emerald-500" delay={0.05} />
              <StatCard title="Unique Users" value={data.summary.uniqueUsers.toLocaleString()} icon={Users} color="bg-blue-500" delay={0.1} />
              <StatCard title="Sessions" value={data.summary.uniqueSessions.toLocaleString()} icon={MousePointer} color="bg-purple-500" delay={0.15} />
              <StatCard title="Top Event" value={data.summary.topEventName} sub="most frequent" icon={TrendingUp} color="bg-amber-500" delay={0.2} />
            </div>

            {/* Events Over Time */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="border-0 shadow-md bg-white dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Events Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data.timeline} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="evGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b30" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        tickFormatter={v => {
                          const d = new Date(v + 'T00:00:00');
                          return format(d, 'MMM d');
                        }}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="events" name="events" stroke="#10b981" fill="url(#evGrad)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-4">
              {/* Events by Hour */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="border-0 shadow-md bg-white dark:bg-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      Activity by Hour
                      <span className="text-xs text-slate-400 font-normal">(local time)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={data.byHour} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b30" />
                        <XAxis
                          dataKey="hour"
                          tick={{ fontSize: 10, fill: '#94a3b8' }}
                          tickFormatter={v => v.split(':')[0]}
                          interval={3}
                        />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="events" name="events" radius={[3, 3, 0, 0]}>
                          {data.byHour.map((_, i) => (
                            <Cell key={i} fill={`hsl(${160 + i * 2}, 70%, ${45 + (i % 3) * 5}%)`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Top Event Names */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <Card className="border-0 shadow-md bg-white dark:bg-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Top Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {data.eventCounts.slice(0, 8).map((e, i) => {
                        const max = data.eventCounts[0]?.count || 1;
                        const pct = Math.round((e.count / max) * 100);
                        return (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-700 dark:text-slate-300 truncate max-w-[70%]">{e.name}</span>
                              <span className="text-slate-500 dark:text-slate-400 font-mono">{e.count.toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {data.eventCounts.length === 0 && (
                        <p className="text-slate-400 text-sm text-center py-6">No events in this period</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Top Pages */}
            {data.topPages.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card className="border-0 shadow-md bg-white dark:bg-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-purple-500" />
                      Top Pages
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-400 border-b border-slate-100 dark:border-slate-700">
                            <th className="pb-2 font-medium">#</th>
                            <th className="pb-2 font-medium">Page</th>
                            <th className="pb-2 font-medium text-right">Views</th>
                            <th className="pb-2 font-medium text-right">Share</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                          {data.topPages.map((p, i) => (
                            <tr key={i}>
                              <td className="py-2 pr-3 text-slate-400">{i + 1}</td>
                              <td className="py-2 text-slate-800 dark:text-slate-200 font-medium">{p.page}</td>
                              <td className="py-2 text-right font-mono text-slate-600 dark:text-slate-300">{p.views.toLocaleString()}</td>
                              <td className="py-2 text-right text-slate-400">
                                {data.topPages[0]?.views
                                  ? `${Math.round((p.views / data.topPages[0].views) * 100)}%`
                                  : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Recent Events Feed */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
              <Card className="border-0 shadow-md bg-white dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    Recent Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                    {data.recentEvents.length === 0 && (
                      <p className="text-slate-400 text-sm text-center py-6">No events yet. Start tracking with base44.analytics.track()</p>
                    )}
                    {data.recentEvents.map((e, i) => (
                      <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-slate-800 dark:text-slate-200">{e.event_name}</span>
                            {e.page && <span className="text-xs text-slate-400 truncate">{e.page}</span>}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {format(new Date(e.timestamp), 'MMM d, h:mm:ss a')}
                            {e.user_id && ` · ${e.user_id}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}