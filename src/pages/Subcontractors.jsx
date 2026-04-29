import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HardHat,
  Plus,
  Search,
  Mail,
  Phone,
  Edit3,
  Trash2,
  ArrowLeft,
  FileSpreadsheet,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  listSubcontractors,
  deleteSubcontractor,
} from '@/api/subcontractors';
import { useOrg } from '@/lib/OrgContext';
import { useAuth } from '@/lib/AuthContext';
import { analytics } from '@/api/analytics';
import SubcontractorDialog from '@/components/SubcontractorDialog';
import PayoutReportDialog from '@/components/PayoutReportDialog';

export default function Subcontractors() {
  const navigate = useNavigate();
  const { activeOrg, loading: orgLoading } = useOrg();
  const { isAuthenticated, isLoadingAuth } = useAuth();

  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    analytics.track({
      eventName: 'page_view',
      properties: { page: 'Subcontractors' },
    });
  }, []);

  const reload = async () => {
    if (!activeOrg) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listSubcontractors(activeOrg.id, {
        activeOnly: !showInactive,
      });
      setSubs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrg?.id, showInactive]);

  const filtered = useMemo(() => {
    if (!query) return subs;
    const q = query.toLowerCase();
    return subs.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.business_name?.toLowerCase().includes(q) ||
        s.trade?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
    );
  }, [subs, query]);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteSubcontractor(pendingDelete.id);
      setSubs((prev) => prev.filter((s) => s.id !== pendingDelete.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingDelete(null);
    }
  };

  const handleSaved = (saved) => {
    setSubs((prev) => {
      const idx = prev.findIndex((s) => s.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  };

  if (isLoadingAuth || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !activeOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
        <div className="text-center max-w-md">
          <HardHat className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {!isAuthenticated ? 'Sign in to manage subs' : 'Set up your business first'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            {!isAuthenticated
              ? 'Subcontractor records live with your business account.'
              : 'Create a business to start tracking subcontractors.'}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <header
        className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate('/Estimates')}
            className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 select-none"
          >
            <ArrowLeft className="w-5 h-5" />
            <HardHat className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-slate-900 dark:text-white">
              Subcontractors
            </span>
          </button>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReportOpen(true)}
            >
              <FileSpreadsheet className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">1099 report</span>
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                setEditTarget(null);
                setEditorOpen(true);
              }}
            >
              <Plus className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Add sub</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name, business, trade, email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInactive((v) => !v)}
            className="sm:w-auto"
          >
            <EyeOff className="w-4 h-4 mr-2" />
            {showInactive ? 'Hide inactive' : 'Show inactive'}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-20 bg-white dark:bg-slate-800 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <HardHat className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {subs.length === 0 ? 'No subcontractors yet' : 'No matches'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              {subs.length === 0
                ? 'Add your first sub to start tracking work and 1099 payouts.'
                : 'Try a different search.'}
            </p>
            {subs.length === 0 && (
              <Button
                onClick={() => {
                  setEditTarget(null);
                  setEditorOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add subcontractor
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-start gap-4 hover:shadow-sm"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center font-semibold shrink-0">
                  {s.name?.charAt(0).toUpperCase() || '?'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {s.name}
                    </p>
                    {s.trade && (
                      <Badge variant="outline" className="text-xs">
                        {s.trade}
                      </Badge>
                    )}
                    {!s.is_active && (
                      <Badge
                        variant="secondary"
                        className="bg-slate-100 text-slate-500 text-xs"
                      >
                        Inactive
                      </Badge>
                    )}
                    {s.tax_id && (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-50 text-emerald-700 text-xs"
                      >
                        1099-ready
                      </Badge>
                    )}
                  </div>
                  {s.business_name && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {s.business_name}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-400">
                    {s.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {s.email}
                      </span>
                    )}
                    {s.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {s.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-emerald-600"
                    onClick={() => {
                      setEditTarget(s);
                      setEditorOpen(true);
                    }}
                    aria-label="Edit"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-red-600"
                    onClick={() => setPendingDelete(s)}
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <SubcontractorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        subcontractor={editTarget}
        onSaved={handleSaved}
      />
      <PayoutReportDialog open={reportOpen} onOpenChange={setReportOpen} />

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this subcontractor?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.name}" will be deleted. Past assignments
              referencing this sub will block deletion — make them inactive
              instead if you want to keep history.
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
