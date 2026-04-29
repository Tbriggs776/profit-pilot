import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Loader2, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/api/supabaseClient';
import { downloadEstimatePDF } from '@/lib/pdf';
import { getCustomerFacingLines, lineTotal } from '@/api/estimates';
import { format } from 'date-fns';

const CATEGORY_LABELS = {
  equipment: 'Equipment',
  material: 'Material',
  labor: 'Labor',
  sub_contractor: 'Sub-contractor',
  custom_pass_through: 'Pass-through',
};

const formatCurrency = (n) =>
  Number(n || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function PublicEstimate() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Estimate via public_token (RLS allows anon SELECT when is_public)
        const { data: est, error: estErr } = await supabase
          .from('estimates')
          .select('*')
          .eq('public_token', token)
          .eq('is_public', true)
          .maybeSingle();
        if (estErr) throw estErr;
        if (!est) {
          if (!cancelled) {
            setError('not_found');
            setLoading(false);
          }
          return;
        }

        const [linesRes, orgRes, customerRes] = await Promise.all([
          supabase
            .from('estimate_line_items')
            .select('*')
            .eq('estimate_id', est.id)
            .order('sort_order', { ascending: true }),
          supabase
            .from('organizations')
            .select(
              'id, business_name, contractor_type, logo_url, phone, address, license_number, website'
            )
            .eq('id', est.org_id)
            .maybeSingle(),
          est.customer_id
            ? supabase
                .from('customers')
                .select('id, name, email, phone, address')
                .eq('id', est.customer_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        if (cancelled) return;
        setData({
          estimate: est,
          lines: linesRes.data || [],
          org: orgRes.data || null,
          customer: customerRes.data || null,
        });
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load estimate');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const customerLines = useMemo(
    () =>
      data ? getCustomerFacingLines(data.lines, data.estimate) : [],
    [data]
  );

  const grouped = useMemo(() => {
    const out = {};
    customerLines.forEach((l) => {
      if (!out[l.category]) out[l.category] = [];
      out[l.category].push(l);
    });
    return out;
  }, [customerLines]);

  const handleDownload = async () => {
    if (!data) return;
    setGenerating(true);
    try {
      // PDF generator applies its own customer-facing transform — pass raw lines
      await downloadEstimatePDF({
        estimate: data.estimate,
        lines: data.lines,
        org: data.org,
        customer: data.customer,
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error === 'not_found' || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            Estimate not available
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            This link may have been disabled or expired. Please contact the
            business that sent it to you for a new link.
          </p>
        </div>
      </div>
    );
  }

  const { estimate, org, customer } = data;
  const orderedCats = [
    'equipment',
    'material',
    'labor',
    'sub_contractor',
    'custom_pass_through',
  ].filter((c) => grouped[c]?.length);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Hero header with branding */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-6 py-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {org?.logo_url && (
              <img
                src={org.logo_url}
                alt=""
                className="w-14 h-14 rounded-lg object-contain bg-white p-1.5 shrink-0"
              />
            )}
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold truncate">
                {org?.business_name || 'Profit Pilot'}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {[org?.phone, org?.website].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <Button
            onClick={handleDownload}
            disabled={generating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            <span className="hidden sm:inline">Download PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>
        <div className="h-1 bg-emerald-500" />
      </header>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto px-4 sm:px-6"
      >
        {/* Title block */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 -mt-8 relative z-10 p-6 sm:p-8">
          <p className="text-xs font-bold tracking-wider text-emerald-600 uppercase mb-2">
            Proposal
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-1">
            {estimate.title}
          </h1>
          <p className="text-sm text-slate-400">
            {estimate.created_at &&
              format(new Date(estimate.created_at), 'MMMM d, yyyy')}
            {estimate.id && (
              <> · #{estimate.id.slice(0, 8).toUpperCase()}</>
            )}
          </p>

          {customer && (
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">
                Prepared for
              </p>
              <p className="font-semibold text-slate-900 dark:text-white">
                {customer.name}
              </p>
              {(customer.address ||
                customer.email ||
                customer.phone) && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {[customer.address, customer.email, customer.phone]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Line items */}
        <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Line items
            </h2>
          </div>
          {orderedCats.length === 0 ? (
            <p className="px-6 py-10 text-center text-slate-400 text-sm">
              No line items.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {orderedCats.map((cat) => (
                <div key={cat}>
                  <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                    {CATEGORY_LABELS[cat]}
                  </div>
                  <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {grouped[cat].map((line) => (
                      <div
                        key={line.id}
                        className="px-6 py-3 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                            {line.description ||
                              CATEGORY_LABELS[cat]}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {Number(line.quantity).toLocaleString()}{' '}
                            {line.unit || 'ea'} ·{' '}
                            {formatCurrency(line.unit_price)}
                          </p>
                        </div>
                        <p className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                          {formatCurrency(lineTotal(line))}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 sm:p-8 space-y-4">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-5">
              <p className="text-xs font-bold tracking-wider text-emerald-50 uppercase">
                Total
              </p>
              <p className="text-3xl sm:text-4xl font-bold text-white font-mono mt-1">
                {formatCurrency(estimate.selling_price)}
              </p>
            </div>

            {Number(estimate.finance_rate) > 0 &&
              Number(estimate.finance_price) > 0 && (
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-5">
                  <p className="text-xs font-bold tracking-wider text-blue-50 uppercase">
                    Finance Price (+{estimate.finance_rate}%)
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-white font-mono mt-1">
                    {formatCurrency(estimate.finance_price)}
                  </p>
                </div>
              )}
          </div>
        </div>

        {/* Notes */}
        {estimate.notes && (
          <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 sm:p-8">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-3">
              Notes
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
              {estimate.notes}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <Calculator className="w-3.5 h-3.5" />
          Estimate generated with Profit Pilot
        </div>
      </motion.div>
    </div>
  );
}
