import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  Plus,
  Search,
  Copy,
  Trash2,
  ChevronRight,
  Calculator,
  User,
  TrendingUp,
  Link2,
  Sparkles,
  HardHat,
} from 'lucide-react';
import TemplateGallery from '@/components/TemplateGallery';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  listEstimates,
  deleteEstimate,
  duplicateEstimate,
} from '@/api/estimates';
import { useOrg } from '@/lib/OrgContext';
import { useAuth } from '@/lib/AuthContext';
import { analytics } from '@/api/analytics';
import { format } from 'date-fns';

const STATUS_CLASSES = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  won: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  lost: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const formatCurrency = (n) =>
  Number(n || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

export default function Estimates() {
  const navigate = useNavigate();
  const { activeOrg, loading: orgLoading } = useOrg();
  const { isAuthenticated, isLoadingAuth } = useAuth();

  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [galleryOpen, setGalleryOpen] = useState(false);

  useEffect(() => {
    analytics.track({
      eventName: 'page_view',
      properties: { page: 'Estimates' },
    });
  }, []);

  const reload = async () => {
    if (!activeOrg) {
      setEstimates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listEstimates(activeOrg.id);
      setEstimates(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrg?.id]);

  const filtered = useMemo(() => {
    return estimates.filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        const inTitle = e.title?.toLowerCase().includes(q);
        const inCustomer = e.customer?.name?.toLowerCase().includes(q);
        if (!inTitle && !inCustomer) return false;
      }
      return true;
    });
  }, [estimates, query, statusFilter]);

  const totals = useMemo(() => {
    const won = estimates.filter((e) => e.status === 'won');
    const open = estimates.filter((e) => ['draft', 'sent'].includes(e.status));
    const wonValue = won.reduce((s, e) => s + Number(e.selling_price || 0), 0);
    const openValue = open.reduce((s, e) => s + Number(e.selling_price || 0), 0);
    return {
      total: estimates.length,
      won: won.length,
      open: open.length,
      wonValue,
      openValue,
    };
  }, [estimates]);

  const { user } = useAuth();
  const handleDuplicate = async (id) => {
    try {
      const dup = await duplicateEstimate(id, user.id);
      navigate(`/PriceCalculator?id=${dup.id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteEstimate(pendingDelete.id);
      setEstimates((prev) => prev.filter((e) => e.id !== pendingDelete.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingDelete(null);
    }
  };

  if (isLoadingAuth || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Sign in to save estimates
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Create an account to save your calculations as estimates and share
            them with clients.
          </p>
          <Link to="/Profile">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Go to Profile
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!activeOrg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Set up your business first
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Estimates are organized by business. Create yours to start.
          </p>
          <Link to="/Profile">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Set up business
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <header
        className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-slate-900 dark:text-white">
              Estimates
            </span>
            <span className="hidden sm:inline text-xs text-slate-400 truncate">
              · {activeOrg.business_name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/Subcontractors" className="hidden sm:block">
              <Button size="sm" variant="ghost">
                <HardHat className="w-4 h-4 mr-1 text-orange-600" />
                Subs
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setGalleryOpen(true)}
            >
              <Sparkles className="w-4 h-4 mr-1 text-emerald-600" />
              <span className="hidden sm:inline">Templates</span>
            </Button>
            <Link to="/PriceCalculator">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">New estimate</span>
                <span className="sm:hidden">New</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <TemplateGallery open={galleryOpen} onOpenChange={setGalleryOpen} />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile
            label="Total"
            value={totals.total}
            icon={FileText}
            color="bg-slate-500"
          />
          <StatTile
            label="Open"
            value={totals.open}
            sub={formatCurrency(totals.openValue)}
            icon={TrendingUp}
            color="bg-blue-500"
          />
          <StatTile
            label="Won"
            value={totals.won}
            sub={formatCurrency(totals.wonValue)}
            icon={TrendingUp}
            color="bg-emerald-500"
          />
          <StatTile
            label="Win rate"
            value={
              totals.total > 0
                ? `${Math.round((totals.won / totals.total) * 100)}%`
                : '—'
            }
            icon={TrendingUp}
            color="bg-amber-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by title or customer…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-white dark:bg-slate-800 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {estimates.length === 0
                ? 'No estimates yet'
                : 'No matches'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              {estimates.length === 0
                ? 'Build your first estimate from the calculator.'
                : 'Try a different search or status.'}
            </p>
            {estimates.length === 0 && (
              <Link to="/PriceCalculator">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  New estimate
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <EstimateCard
                  estimate={e}
                  onOpen={() => navigate(`/PriceCalculator?id=${e.id}`)}
                  onDuplicate={() => handleDuplicate(e.id)}
                  onDelete={() => setPendingDelete(e)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this estimate?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.title}" will be permanently deleted. This can't
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatTile({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            {label}
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>
          {sub && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${color} shrink-0`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  );
}

function EstimateCard({ estimate, onOpen, onDuplicate, onDelete }) {
  const updated = estimate.updated_at
    ? format(new Date(estimate.updated_at), 'MMM d, yyyy')
    : '';
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left p-4 flex items-center gap-4"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">
              {estimate.title}
            </h3>
            <Badge
              className={`${STATUS_CLASSES[estimate.status]} capitalize text-xs`}
              variant="secondary"
            >
              {estimate.status}
            </Badge>
            {estimate.is_public && (
              <Badge
                variant="secondary"
                className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs flex items-center gap-1"
              >
                <Link2 className="w-3 h-3" />
                Shared
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
            {estimate.customer?.name && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {estimate.customer.name}
              </span>
            )}
            <span>Updated {updated}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {formatCurrency(estimate.selling_price)}
          </p>
          <p className="text-xs text-slate-400">selling price</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
      </button>
      <div className="flex items-center gap-1 px-3 py-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDuplicate}
          className="text-slate-600 dark:text-slate-400 h-8"
        >
          <Copy className="w-3.5 h-3.5 mr-1.5" />
          Duplicate
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-red-600 hover:text-red-700 h-8"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}
