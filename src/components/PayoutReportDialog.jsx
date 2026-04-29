import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { getAnnualPayouts } from '@/api/subcontractors';
import { useOrg } from '@/lib/OrgContext';

const fmtCurrency = (n) =>
  Number(n || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const csvEscape = (val) => {
  if (val == null) return '';
  const s = String(val);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export default function PayoutReportDialog({ open, onOpenChange }) {
  const { activeOrg } = useOrg();
  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => [currentYear, currentYear - 1, currentYear - 2, currentYear - 3],
    [currentYear]
  );
  const [year, setYear] = useState(currentYear);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !activeOrg) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAnnualPayouts(activeOrg.id, year);
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, year, activeOrg?.id]);

  const total = useMemo(
    () => rows.reduce((s, r) => s + Number(r.total_paid || 0), 0),
    [rows]
  );

  const flagged = rows.filter((r) => Number(r.total_paid) >= 600);

  const handleExport = () => {
    const header = [
      'Contact name',
      'Business name',
      'Trade',
      'Tax ID',
      'Total paid',
      'Assignments',
      'Year',
    ];
    const lines = [header.map(csvEscape).join(',')];
    rows.forEach((r) => {
      lines.push(
        [
          r.name,
          r.business_name,
          r.trade,
          r.tax_id,
          Number(r.total_paid).toFixed(2),
          r.assignment_count,
          r.payout_year,
        ]
          .map(csvEscape)
          .join(',')
      );
    });
    const blob = new Blob([lines.join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subcontractor-payouts-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Subcontractor payouts ({year})
          </DialogTitle>
          <DialogDescription>
            Total paid per sub for the selected year. Anyone you paid $600 or
            more typically requires a 1099-NEC.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 py-2">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!rows.length}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex-1 overflow-y-auto -mx-6 px-6 border-t border-slate-100 dark:border-slate-700">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">
              No payouts recorded in {year}.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                <tr className="text-left text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  <th className="py-2 font-medium">Sub</th>
                  <th className="py-2 font-medium">Trade</th>
                  <th className="py-2 font-medium">Tax ID</th>
                  <th className="py-2 font-medium text-right">Paid</th>
                  <th className="py-2 font-medium text-right">Jobs</th>
                  <th className="py-2 font-medium text-center">1099?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {rows.map((r) => (
                  <tr key={r.subcontractor_id}>
                    <td className="py-3">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {r.name}
                      </p>
                      {r.business_name && (
                        <p className="text-xs text-slate-400">
                          {r.business_name}
                        </p>
                      )}
                    </td>
                    <td className="py-3 text-slate-500 dark:text-slate-400">
                      {r.trade || '—'}
                    </td>
                    <td className="py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {r.tax_id || '—'}
                    </td>
                    <td className="py-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {fmtCurrency(r.total_paid)}
                    </td>
                    <td className="py-3 text-right text-slate-500 dark:text-slate-400">
                      {r.assignment_count}
                    </td>
                    <td className="py-3 text-center">
                      {Number(r.total_paid) >= 600 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          Yes
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 dark:border-slate-700 font-semibold">
                  <td className="py-3" colSpan={3}>
                    Total ({rows.length} subs · {flagged.length} flagged for 1099)
                  </td>
                  <td className="py-3 text-right font-mono text-emerald-600">
                    {fmtCurrency(total)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
