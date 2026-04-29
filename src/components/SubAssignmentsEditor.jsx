import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HardHat,
  Plus,
  ChevronsUpDown,
  Check,
  Trash2,
  CheckCircle2,
  Clock,
  CircleDollarSign,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  listAssignments,
  createAssignment,
  updateAssignment,
  markAssignmentPaid,
  deleteAssignment,
  listSubcontractors,
} from '@/api/subcontractors';
import { useOrg } from '@/lib/OrgContext';

const fmtCurrency = (n) =>
  Number(n || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const STATUS_BADGE = {
  unpaid: {
    label: 'Unpaid',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    icon: Clock,
  },
  partial: {
    label: 'Partial',
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    icon: CircleDollarSign,
  },
  paid: {
    label: 'Paid',
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    icon: CheckCircle2,
  },
};

export default function SubAssignmentsEditor({ estimateId, orgId }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  const reload = async () => {
    if (!estimateId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setAssignments(await listAssignments(estimateId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimateId]);

  const handleCreate = async ({ subcontractorId, scope, amount }) => {
    setError(null);
    try {
      const created = await createAssignment({
        orgId,
        estimateId,
        subcontractorId,
        scope,
        amount,
      });
      setAssignments((prev) => [...prev, created]);
      setAdding(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdate = async (id, patch) => {
    setError(null);
    try {
      const updated = await updateAssignment(id, patch);
      setAssignments((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMarkPaid = async (assignment) => {
    const updated = await markAssignmentPaid(
      assignment.id,
      assignment.amount,
      assignment.amount
    );
    setAssignments((prev) =>
      prev.map((a) => (a.id === assignment.id ? updated : a))
    );
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this sub assignment?')) return;
    await deleteAssignment(id);
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  };

  if (!estimateId) {
    return (
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-2xl border-0 shadow-lg shadow-slate-200/50 p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/30">
            <HardHat className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Sub-contractor assignments
          </h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Save the estimate first to assign subs and track payouts.
        </p>
      </div>
    );
  }

  const totalAmount = assignments.reduce(
    (s, a) => s + Number(a.amount || 0),
    0
  );
  const totalPaid = assignments.reduce(
    (s, a) => s + Number(a.amount_paid || 0),
    0
  );

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-2xl border-0 shadow-lg shadow-slate-200/50 overflow-hidden">
      <div className="p-5 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/30 shrink-0">
            <HardHat className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Sub-contractor assignments
            </h3>
            <p className="text-xs text-slate-400 truncate">
              Track which subs do what and what you owe.
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-slate-400">Paid / committed</p>
          <p className="text-sm font-semibold font-mono text-slate-700 dark:text-slate-200">
            {fmtCurrency(totalPaid)}{' '}
            <span className="text-slate-400 font-normal">/</span>{' '}
            {fmtCurrency(totalAmount)}
          </p>
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-2">
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : assignments.length === 0 && !adding ? (
          <p className="text-sm text-slate-400 text-center py-3">
            No assignments yet.
          </p>
        ) : (
          assignments.map((a) => (
            <AssignmentRow
              key={a.id}
              assignment={a}
              onUpdate={(patch) => handleUpdate(a.id, patch)}
              onMarkPaid={() => handleMarkPaid(a)}
              onDelete={() => handleDelete(a.id)}
            />
          ))
        )}

        {adding ? (
          <NewAssignmentRow
            orgId={orgId}
            onCancel={() => setAdding(false)}
            onCreate={handleCreate}
          />
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAdding(true)}
            className="w-full text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 border border-dashed border-slate-200 dark:border-slate-700 mt-2"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Assign sub
          </Button>
        )}
      </div>
    </div>
  );
}

function AssignmentRow({ assignment, onUpdate, onMarkPaid, onDelete }) {
  const [scope, setScope] = useState(assignment.scope || '');
  const [amount, setAmount] = useState(assignment.amount || 0);
  const [amountPaid, setAmountPaid] = useState(assignment.amount_paid || 0);

  useEffect(() => {
    setScope(assignment.scope || '');
    setAmount(assignment.amount || 0);
    setAmountPaid(assignment.amount_paid || 0);
  }, [assignment.id, assignment.scope, assignment.amount, assignment.amount_paid]);

  const StatusIcon = STATUS_BADGE[assignment.status]?.icon || Clock;
  const sub = assignment.subcontractor;

  const commitField = (field, value) => {
    if (value === assignment[field]) return;
    if (field === 'amount_paid') {
      let nextStatus = 'unpaid';
      if (Number(value) >= Number(assignment.amount) && Number(amount) > 0)
        nextStatus = 'paid';
      else if (Number(value) > 0) nextStatus = 'partial';
      onUpdate({
        amount_paid: value,
        status: nextStatus,
        paid_at: Number(value) > 0 ? new Date().toISOString() : null,
      });
    } else {
      onUpdate({ [field]: value });
    }
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-start p-2 rounded-lg bg-slate-50/40 dark:bg-slate-900/20">
      {/* Sub identity */}
      <div className="col-span-12 sm:col-span-3 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center text-xs font-semibold shrink-0">
            {sub?.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
              {sub?.name || 'Unknown sub'}
            </p>
            {sub?.trade && (
              <p className="text-xs text-slate-400 truncate">{sub.trade}</p>
            )}
          </div>
        </div>
      </div>

      {/* Scope */}
      <div className="col-span-12 sm:col-span-3">
        <Input
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          onBlur={() => commitField('scope', scope)}
          placeholder="Scope of work"
          className="h-9 text-sm"
        />
      </div>

      {/* Amount */}
      <div className="col-span-6 sm:col-span-2 relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
          $
        </span>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          onBlur={() => commitField('amount', amount)}
          className="h-9 text-sm pl-6 text-right"
          aria-label="Amount due"
        />
      </div>

      {/* Paid */}
      <div className="col-span-6 sm:col-span-2 relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
          $
        </span>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={amountPaid}
          onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
          onBlur={() => commitField('amount_paid', amountPaid)}
          className="h-9 text-sm pl-6 text-right"
          aria-label="Amount paid"
        />
      </div>

      {/* Status + actions */}
      <div className="col-span-12 sm:col-span-2 flex items-center justify-between sm:justify-end gap-1">
        <Badge
          variant="secondary"
          className={cn(
            'capitalize text-xs flex items-center gap-1 shrink-0',
            STATUS_BADGE[assignment.status]?.className
          )}
        >
          <StatusIcon className="w-3 h-3" />
          {STATUS_BADGE[assignment.status]?.label}
        </Badge>
        {assignment.status !== 'paid' && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onMarkPaid}
            className="h-8 text-emerald-600 hover:text-emerald-700"
            title="Mark fully paid"
          >
            Pay
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-8 w-8 text-slate-400 hover:text-red-600"
          aria-label="Remove"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function NewAssignmentRow({ orgId, onCancel, onCreate }) {
  const [subcontractorId, setSubcontractorId] = useState(null);
  const [subcontractor, setSubcontractor] = useState(null);
  const [scope, setScope] = useState('');
  const [amount, setAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!subcontractorId) return;
    setSubmitting(true);
    await onCreate({ subcontractorId, scope, amount });
    setSubmitting(false);
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-start p-2 rounded-lg border border-dashed border-orange-200 dark:border-orange-900/50">
      <div className="col-span-12 sm:col-span-4">
        <SubcontractorPicker
          orgId={orgId}
          value={subcontractorId}
          onChange={(id, sub) => {
            setSubcontractorId(id);
            setSubcontractor(sub);
          }}
        />
      </div>
      <div className="col-span-12 sm:col-span-3">
        <Input
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          placeholder="Scope of work"
          className="h-9 text-sm"
        />
      </div>
      <div className="col-span-6 sm:col-span-2 relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
          $
        </span>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          placeholder="0.00"
          className="h-9 text-sm pl-6 text-right"
        />
      </div>
      <div className="col-span-12 sm:col-span-3 flex justify-end gap-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={submit}
          disabled={!subcontractorId || submitting}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {submitting ? '…' : 'Add'}
        </Button>
      </div>
    </div>
  );
}

function SubcontractorPicker({ orgId, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const selected = subs.find((s) => s.id === value);

  useEffect(() => {
    if (!open || !orgId) return;
    setLoading(true);
    listSubcontractors(orgId)
      .then(setSubs)
      .finally(() => setLoading(false));
  }, [open, orgId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between font-normal h-9"
        >
          <span className="flex items-center gap-2 truncate text-sm">
            <HardHat className="w-4 h-4 text-slate-400 shrink-0" />
            {selected ? (
              <span className="truncate">{selected.name}</span>
            ) : (
              <span className="text-slate-400">Pick a sub</span>
            )}
          </span>
          <ChevronsUpDown className="w-4 h-4 text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="max-h-64 overflow-y-auto">
          {loading && (
            <p className="text-sm text-slate-400 px-3 py-4 text-center">
              Loading…
            </p>
          )}
          {!loading && subs.length === 0 && (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-slate-400 mb-2">No subs yet.</p>
              <Link to="/Subcontractors" target="_blank">
                <Button size="sm" variant="outline">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Add one
                </Button>
              </Link>
            </div>
          )}
          {!loading &&
            subs.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onChange(s.id, s);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Check
                  className={cn(
                    'w-4 h-4 text-emerald-600',
                    value === s.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                    {s.name}
                  </p>
                  {s.trade && (
                    <p className="text-xs text-slate-400 truncate">{s.trade}</p>
                  )}
                </div>
              </button>
            ))}
        </div>
        <div className="border-t border-slate-100 dark:border-slate-700">
          <Link to="/Subcontractors" target="_blank">
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <ExternalLink className="w-4 h-4" />
              Manage subcontractors
            </button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
