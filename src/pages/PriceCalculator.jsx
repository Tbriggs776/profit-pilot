import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calculator,
  CreditCard,
  FileText,
  Hammer,
  Loader2,
  Package,
  Percent,
  Receipt,
  Save,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
  Wrench,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import PullToRefresh from '@/components/PullToRefresh';
import LineItemEditor from '@/components/LineItemEditor';
import SaveEstimateDialog from '@/components/SaveEstimateDialog';
import { analytics } from '@/api/analytics';
import {
  computeTotals,
  createEstimate,
  getEstimateWithLines,
  makeBlankLine,
  rollupLines,
  synthesizeLinesFromLumpSums,
  updateEstimate,
} from '@/api/estimates';
import { useOrg } from '@/lib/OrgContext';
import { useAuth } from '@/lib/AuthContext';

const CATEGORY_CONFIG = [
  {
    category: 'equipment',
    label: 'Equipment',
    hint: 'Hardware, tools, machinery',
    icon: Package,
    iconColor: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  },
  {
    category: 'material',
    label: 'Material',
    hint: 'Raw materials, supplies',
    icon: Hammer,
    iconColor: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  },
  {
    category: 'labor',
    label: 'Labor',
    hint: 'Wages, in-house technician hours',
    icon: Users,
    iconColor: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  },
  {
    category: 'sub_contractor',
    label: 'Sub-contractor',
    hint: 'External contractor costs',
    icon: Wrench,
    iconColor: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  },
  {
    category: 'custom_pass_through',
    label: 'Pass-through Costs',
    hint: 'Permits, custom add-ons (added on top of margin)',
    icon: Tag,
    iconColor: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  },
];

const PercentInput = ({ label, value, onChange, icon: Icon, description }) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
      {label}
    </Label>
    {description && (
      <p className="text-xs text-slate-400 dark:text-slate-500">{description}</p>
    )}
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 select-none">
        <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
      </div>
      <Input
        type="number"
        min="0"
        max="100"
        step="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="pl-10 pr-10 text-lg font-medium bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20"
        placeholder="0"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 select-none">
        <Percent className="h-4 w-4 text-slate-400 dark:text-slate-500" />
      </div>
    </div>
  </div>
);

const BreakdownRow = ({ label, value, isTotal, isSubtotal, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.3 }}
    className={`flex justify-between items-center py-3 ${
      isTotal
        ? 'border-t-2 border-emerald-400 pt-4 mt-2'
        : isSubtotal
          ? 'border-t border-dashed border-slate-600 pt-3'
          : ''
    }`}
  >
    <span
      className={`${
        isTotal
          ? 'font-semibold text-slate-200 text-lg'
          : isSubtotal
            ? 'font-medium text-slate-300'
            : 'text-slate-400'
      }`}
    >
      {label}
    </span>
    <span
      className={`font-mono ${
        isTotal
          ? 'text-2xl font-bold text-emerald-400'
          : isSubtotal
            ? 'text-lg font-semibold text-white'
            : 'text-white font-semibold'
      }`}
    >
      ${(Number(value) || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </span>
  </motion.div>
);

// Build the initial scratch line set (one blank line per category)
const initialScratchLines = () => {
  const lines = [];
  CATEGORY_CONFIG.forEach((c, idx) => {
    lines.push({ ...makeBlankLine(c.category, idx), description: c.label });
  });
  return lines;
};

export default function PriceCalculator() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const estimateId = searchParams.get('id');
  const { activeOrg } = useOrg();
  const { user, isAuthenticated } = useAuth();

  const [lines, setLines] = useState(() => initialScratchLines());
  const [salesTaxRate, setSalesTaxRate] = useState(8.25);
  const [commissionRate, setCommissionRate] = useState(0);
  const [warrantyRate, setWarrantyRate] = useState(0);
  const [financeRate, setFinanceRate] = useState(0);
  const [grossMarginRate, setGrossMarginRate] = useState(25);

  const [loadedEstimate, setLoadedEstimate] = useState(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(null);

  useEffect(() => {
    analytics.track({
      eventName: 'page_view',
      properties: { page: 'PriceCalculator' },
    });
  }, []);

  // Apply org defaults — only on a fresh scratch session (not when editing)
  const appliedOrgRef = useRef(null);
  useEffect(() => {
    if (estimateId) return;
    if (!activeOrg || appliedOrgRef.current === activeOrg.id) return;
    appliedOrgRef.current = activeOrg.id;
    if (activeOrg.default_tax_rate != null)
      setSalesTaxRate(Number(activeOrg.default_tax_rate));
    if (activeOrg.default_margin != null)
      setGrossMarginRate(Number(activeOrg.default_margin));
    if (activeOrg.default_commission != null)
      setCommissionRate(Number(activeOrg.default_commission));
    if (activeOrg.default_warranty != null)
      setWarrantyRate(Number(activeOrg.default_warranty));
    if (activeOrg.default_finance_rate != null)
      setFinanceRate(Number(activeOrg.default_finance_rate));
  }, [activeOrg, estimateId]);

  // Load an estimate (with line items) when ?id= is present
  useEffect(() => {
    if (!estimateId) {
      setLoadedEstimate(null);
      return;
    }
    setLoadingEstimate(true);
    (async () => {
      try {
        const { estimate, lines: dbLines } = await getEstimateWithLines(estimateId);
        setLoadedEstimate(estimate);
        const usable = dbLines.length
          ? dbLines.map((l) => ({
              ...l,
              quantity: Number(l.quantity),
              unit_price: Number(l.unit_price),
            }))
          : synthesizeLinesFromLumpSums(estimate);
        setLines(usable);
        setSalesTaxRate(Number(estimate.sales_tax_rate) || 0);
        setCommissionRate(Number(estimate.commission_rate) || 0);
        setWarrantyRate(Number(estimate.warranty_rate) || 0);
        setFinanceRate(Number(estimate.finance_rate) || 0);
        setGrossMarginRate(Number(estimate.gross_margin_rate) || 25);
      } catch (err) {
        console.error('Failed to load estimate:', err);
      } finally {
        setLoadingEstimate(false);
      }
    })();
  }, [estimateId]);

  const calculations = useMemo(() => {
    const rollup = rollupLines(lines);
    const totals = computeTotals({
      ...rollup,
      commission_rate: commissionRate,
      warranty_rate: warrantyRate,
      sales_tax_rate: salesTaxRate,
      finance_rate: financeRate,
      gross_margin_rate: grossMarginRate,
    });

    const commission =
      totals.selling_price * (Number(commissionRate) / 100 || 0);
    const warranty =
      totals.selling_price * (Number(warrantyRate) / 100 || 0);
    const salesTax = rollup.taxable_subtotal * (Number(salesTaxRate) / 100 || 0);
    const baseCosts =
      rollup.equipment +
      rollup.material +
      rollup.labor +
      commission +
      rollup.sub_contractor;
    const financeMultiplier = 1 - Number(financeRate) / 100 || 0;
    const financeAmount =
      financeMultiplier > 0
        ? totals.selling_price / financeMultiplier - totals.selling_price
        : 0;

    return {
      ...rollup,
      commission,
      warranty,
      salesTax,
      baseCosts,
      financeAmount,
      ...totals,
    };
  }, [
    lines,
    commissionRate,
    warrantyRate,
    salesTaxRate,
    financeRate,
    grossMarginRate,
  ]);

  const ratesSnapshot = () => ({
    commission_rate: commissionRate,
    warranty_rate: warrantyRate,
    sales_tax_rate: salesTaxRate,
    finance_rate: financeRate,
    gross_margin_rate: grossMarginRate,
  });

  const handleSave = async ({ title, customerId, status, notes }) => {
    if (!activeOrg || !user) return;
    setSaving(true);
    try {
      if (loadedEstimate?.id) {
        const { estimate } = await updateEstimate({
          id: loadedEstimate.id,
          orgId: activeOrg.id,
          customerId,
          title,
          status,
          notes,
          rates: ratesSnapshot(),
          lines,
        });
        setLoadedEstimate(estimate);
      } else {
        const { estimate } = await createEstimate({
          orgId: activeOrg.id,
          userId: user.id,
          customerId,
          title,
          status,
          notes,
          rates: ratesSnapshot(),
          lines,
        });
        setLoadedEstimate(estimate);
        setSearchParams({ id: estimate.id }, { replace: true });
      }
      setSaveDialogOpen(false);
      setSavedFlash(Date.now());
      setTimeout(() => setSavedFlash(null), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setLines(initialScratchLines());
    setSalesTaxRate(Number(activeOrg?.default_tax_rate ?? 8.25));
    setGrossMarginRate(Number(activeOrg?.default_margin ?? 25));
    setCommissionRate(Number(activeOrg?.default_commission ?? 0));
    setWarrantyRate(Number(activeOrg?.default_warranty ?? 0));
    setFinanceRate(Number(activeOrg?.default_finance_rate ?? 0));
    await new Promise((resolve) => setTimeout(resolve, 600));
  };

  const canSave = isAuthenticated && activeOrg;
  const markupPct =
    calculations.total_costs > 0
      ? (calculations.margin_amount / calculations.total_costs) * 100
      : 0;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950/30">
        <nav
          className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
            <button
              onClick={() => navigate(canSave ? '/Estimates' : '/')}
              className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors select-none"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium hidden sm:inline">
                {canSave ? 'Estimates' : 'Home'}
              </span>
            </button>

            <div className="flex items-center gap-3 min-w-0">
              {activeOrg && (
                <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 min-w-0">
                  {activeOrg.logo_url && (
                    <img
                      src={activeOrg.logo_url}
                      alt=""
                      className="w-6 h-6 rounded object-contain shrink-0"
                    />
                  )}
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                    {activeOrg.business_name}
                  </span>
                </div>
              )}

              {loadingEstimate && (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              )}
              {savedFlash && (
                <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  Saved
                </span>
              )}

              {canSave ? (
                <Button
                  size="sm"
                  onClick={() => setSaveDialogOpen(true)}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Save className="w-4 h-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">
                    {loadedEstimate?.id ? 'Update' : 'Save'}
                  </span>
                </Button>
              ) : (
                <Link to="/Profile">
                  <Button size="sm" variant="outline">
                    <FileText className="w-4 h-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Sign in to save</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {loadedEstimate?.title && (
            <div className="max-w-6xl mx-auto px-4 pb-2 -mt-1">
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Editing:{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {loadedEstimate.title}
                </span>
                {loadedEstimate.customer?.name && (
                  <span> · {loadedEstimate.customer.name}</span>
                )}
              </p>
            </div>
          )}
        </nav>

        <SaveEstimateDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          initial={loadedEstimate}
          onSave={handleSave}
          saving={saving}
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {!loadedEstimate && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 mb-4">
                <Calculator className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                Price-Up Calculator
              </h1>
              <p className="text-slate-500 dark:text-slate-400">
                Itemize line items, set rates, get a sell-ready price.
              </p>
            </motion.div>
          )}

          <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
            {/* Inputs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-3 space-y-5"
            >
              {CATEGORY_CONFIG.map((cfg) => (
                <LineItemEditor
                  key={cfg.category}
                  category={cfg.category}
                  label={cfg.label}
                  hint={cfg.hint}
                  icon={cfg.icon}
                  iconColor={cfg.iconColor}
                  lines={lines}
                  onChange={setLines}
                  showTaxable={cfg.category !== 'custom_pass_through'}
                />
              ))}

              {/* Rates card */}
              <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                      <Percent className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    Rates &amp; Margins
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-6">
                  <PercentInput
                    label="Commission Rate"
                    value={commissionRate || ''}
                    onChange={setCommissionRate}
                    icon={Sparkles}
                    description="% of total selling price"
                  />
                  <PercentInput
                    label="Warranty Rate"
                    value={warrantyRate || ''}
                    onChange={setWarrantyRate}
                    icon={ShieldCheck}
                    description="% of total selling price"
                  />
                  <PercentInput
                    label="Sales Tax Rate"
                    value={salesTaxRate || ''}
                    onChange={setSalesTaxRate}
                    icon={Receipt}
                    description="Applied to taxable line items"
                  />
                  <PercentInput
                    label="Finance Fee"
                    value={financeRate || ''}
                    onChange={setFinanceRate}
                    icon={CreditCard}
                    description="% markup for financed deals"
                  />
                  <PercentInput
                    label="Gross Margin"
                    value={grossMarginRate || ''}
                    onChange={setGrossMarginRate}
                    icon={Sparkles}
                    description="Target profit margin"
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Results panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <Card className="border-0 shadow-xl shadow-emerald-900/10 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 text-white sticky top-20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-slate-200 dark:text-slate-100">
                    Price Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="space-y-1">
                    <BreakdownRow
                      label="Equipment"
                      value={calculations.equipment}
                      delay={0.05}
                    />
                    <BreakdownRow
                      label="Material"
                      value={calculations.material}
                      delay={0.1}
                    />
                    <BreakdownRow
                      label="Labor"
                      value={calculations.labor}
                      delay={0.15}
                    />
                    <BreakdownRow
                      label={`Commission (${commissionRate}%)`}
                      value={calculations.commission}
                      delay={0.2}
                    />
                    <BreakdownRow
                      label="Sub-contractor"
                      value={calculations.sub_contractor}
                      delay={0.25}
                    />
                  </div>

                  <div className="pt-2">
                    <BreakdownRow
                      label="Base Costs"
                      value={calculations.baseCosts}
                      isSubtotal
                      delay={0.3}
                    />
                  </div>

                  <BreakdownRow
                    label={`Sales Tax (${salesTaxRate}%)`}
                    value={calculations.salesTax}
                    delay={0.33}
                  />

                  <div className="pt-2">
                    <BreakdownRow
                      label="Direct Costs"
                      value={calculations.direct_costs}
                      isSubtotal
                      delay={0.36}
                    />
                  </div>

                  <BreakdownRow
                    label={`Margin (${grossMarginRate}%)`}
                    value={calculations.margin_amount}
                    delay={0.39}
                  />
                  <BreakdownRow
                    label={`Warranty (${warrantyRate}%)`}
                    value={calculations.warranty}
                    delay={0.42}
                  />
                  <BreakdownRow
                    label="Pass-through"
                    value={calculations.custom_pass_through}
                    delay={0.45}
                  />
                  <BreakdownRow
                    label={`Finance Fee (${financeRate}%)`}
                    value={calculations.financeAmount}
                    delay={0.48}
                  />

                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-emerald-50">
                        Selling Price
                      </span>
                      <span className="text-3xl font-bold text-white font-mono">
                        ${calculations.selling_price.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </motion.div>

                  {financeRate > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.55 }}
                      className="mt-3 p-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-blue-50">
                          Finance Price
                        </span>
                        <span className="text-3xl font-bold text-white font-mono">
                          ${calculations.finance_price.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-700">
                    <div className="text-center p-3 rounded-lg bg-slate-800/50">
                      <p className="text-xs text-slate-400 mb-1">Profit</p>
                      <p className="text-lg font-semibold text-emerald-400 font-mono">
                        ${calculations.margin_amount.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-slate-800/50">
                      <p className="text-xs text-slate-400 mb-1">Markup</p>
                      <p className="text-lg font-semibold text-amber-400 font-mono">
                        {markupPct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
}
