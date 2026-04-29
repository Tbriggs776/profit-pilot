import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  ArrowRight,
  Search,
  Sparkles,
  Trash2,
  FileText,
  Loader2,
} from 'lucide-react';
import {
  listTemplates,
  deleteTemplate,
} from '@/api/templates';
import { useOrg, contractorTypeLabel, CONTRACTOR_TYPES } from '@/lib/OrgContext';

export default function TemplateGallery({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { activeOrg } = useOrg();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [tradeFilter, setTradeFilter] = useState('all');

  const reload = async () => {
    if (!activeOrg) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listTemplates({
        orgId: activeOrg.id,
        contractorType: tradeFilter === 'matching'
          ? activeOrg.contractor_type
          : undefined,
      });
      setTemplates(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setTradeFilter('matching');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tradeFilter, activeOrg?.id]);

  const filtered = useMemo(() => {
    let list = templates;
    if (tradeFilter !== 'all' && tradeFilter !== 'matching') {
      list = list.filter(
        (t) =>
          !t.is_built_in ||
          t.contractor_type == null ||
          t.contractor_type === tradeFilter
      );
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [templates, query, tradeFilter]);

  const userTemplates = filtered.filter((t) => !t.is_built_in);
  const builtIns = filtered.filter((t) => t.is_built_in);

  const handlePick = (id) => {
    onOpenChange(false);
    navigate(`/PriceCalculator?template=${id}`);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this template? Existing estimates created from it are unaffected.')) {
      return;
    }
    try {
      await deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Start from a template
          </DialogTitle>
          <DialogDescription>
            Pick a template to prefill the calculator with line items, or
            start blank.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-2 py-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              autoFocus
              placeholder="Search templates…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={tradeFilter} onValueChange={setTradeFilter}>
            <SelectTrigger className="sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="matching">My trade only</SelectItem>
              <SelectItem value="all">All trades</SelectItem>
              {CONTRACTOR_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-4 pb-4">
          {/* Blank option */}
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              navigate('/PriceCalculator');
            }}
            className="w-full text-left p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  Blank estimate
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Start fresh with empty line items.
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-600" />
            </div>
          </button>

          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          )}

          {userTemplates.length > 0 && (
            <div>
              <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2 mt-2">
                Your templates
              </h3>
              <div className="space-y-2">
                {userTemplates.map((t) => (
                  <TemplateRow
                    key={t.id}
                    template={t}
                    onPick={() => handlePick(t.id)}
                    onDelete={() => handleDelete(t.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {!loading && (
            <div>
              <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2 mt-2">
                Built-in templates
              </h3>
              {builtIns.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  No matching templates. Try a different trade filter.
                </p>
              ) : (
                <div className="space-y-2">
                  {builtIns.map((t) => (
                    <TemplateRow
                      key={t.id}
                      template={t}
                      onPick={() => handlePick(t.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TemplateRow({ template, onPick, onDelete }) {
  return (
    <div className="group flex items-start gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-emerald-400 hover:shadow-sm transition-all">
      <button
        type="button"
        onClick={onPick}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-slate-900 dark:text-white">
            {template.name}
          </p>
          {template.is_built_in ? (
            <Badge
              variant="secondary"
              className="bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs"
            >
              Built-in
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs"
            >
              Yours
            </Badge>
          )}
          {template.contractor_type && (
            <Badge
              variant="outline"
              className="text-xs text-slate-500 dark:text-slate-400"
            >
              {contractorTypeLabel(template.contractor_type)}
            </Badge>
          )}
        </div>
        {template.description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {template.description}
          </p>
        )}
      </button>

      {onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-8 w-8 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 shrink-0"
          aria-label="Delete template"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}

      <Button
        type="button"
        size="sm"
        onClick={onPick}
        className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
      >
        <FileText className="w-3.5 h-3.5 mr-1.5" />
        Use
      </Button>
    </div>
  );
}
