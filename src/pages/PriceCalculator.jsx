import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  DollarSign, 
  Percent, 
  Calculator, 
  Package, 
  Hammer, 
  Users, 
  TrendingUp,
  Receipt,
  Sparkles,
  Wrench,
  ShieldCheck,
  CreditCard,
  Tag
} from "lucide-react";
import { motion } from "framer-motion";

const CurrencyInput = ({ label, value, onChange, icon: Icon, description }) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</Label>
    {description && <p className="text-xs text-slate-400 dark:text-slate-500">{description}</p>}
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 select-none">
        <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500 select-none" />
        <span className="text-slate-400 dark:text-slate-500 text-sm">$</span>
      </div>
      <Input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="pl-14 text-lg font-medium bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all"
        placeholder="0.00"
      />
    </div>
  </div>
);

const PercentInput = ({ label, value, onChange, icon: Icon, description }) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</Label>
    {description && <p className="text-xs text-slate-400 dark:text-slate-500">{description}</p>}
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 select-none">
        <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500 select-none" />
      </div>
      <Input
        type="number"
        min="0"
        max="100"
        step="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="pl-10 pr-10 text-lg font-medium bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all"
        placeholder="0"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 select-none">
        <Percent className="h-4 w-4 text-slate-400 dark:text-slate-500 select-none" />
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
    <span className={`${isTotal ? 'font-semibold text-slate-200 text-lg' : isSubtotal ? 'font-medium text-slate-300' : 'text-slate-400'}`}>
      {label}
    </span>
    <span className={`font-mono ${isTotal ? 'text-2xl font-bold text-emerald-400' : isSubtotal ? 'text-lg font-semibold text-white' : 'text-white font-semibold'}`}>
      ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  </motion.div>
);

import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PullToRefresh from "../components/PullToRefresh";
import { analytics } from "@/api/analytics";
import { useEffect, useRef } from "react";
import { useOrg } from "@/lib/OrgContext";
import { useAuth } from "@/lib/AuthContext";
import {
  getEstimate,
  createEstimate,
  updateEstimate,
} from "@/api/estimates";
import SaveEstimateDialog from "@/components/SaveEstimateDialog";

export default function PriceCalculator() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const estimateId = searchParams.get('id');
  const { activeOrg } = useOrg();
  const { user, isAuthenticated } = useAuth();

  const [loadedEstimate, setLoadedEstimate] = useState(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(null);

  useEffect(() => {
    analytics.track({ eventName: 'page_view', properties: { page: 'PriceCalculator' } });
  }, []);
  const [equipment, setEquipment] = useState(0);
  const [material, setMaterial] = useState(0);
  const [labor, setLabor] = useState(0);
  const [commissionRate, setCommissionRate] = useState(0);
  const [subContractor, setSubContractor] = useState(0);
  const [warrantyRate, setWarrantyRate] = useState(0);
  const [customPassThrough, setCustomPassThrough] = useState(0);
  const [salesTaxRate, setSalesTaxRate] = useState(8.25);
  const [financeRate, setFinanceRate] = useState(0);
  const [grossMarginRate, setGrossMarginRate] = useState(25);

  // Apply org defaults when an org becomes active (only once per org, and only when not editing)
  const appliedOrgRef = useRef(null);
  useEffect(() => {
    if (estimateId) return; // editing — don't override with org defaults
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

  // Load estimate from URL param
  useEffect(() => {
    if (!estimateId) {
      setLoadedEstimate(null);
      return;
    }
    setLoadingEstimate(true);
    (async () => {
      try {
        const est = await getEstimate(estimateId);
        setLoadedEstimate(est);
        setEquipment(Number(est.equipment) || 0);
        setMaterial(Number(est.material) || 0);
        setLabor(Number(est.labor) || 0);
        setSubContractor(Number(est.sub_contractor) || 0);
        setCustomPassThrough(Number(est.custom_pass_through) || 0);
        setCommissionRate(Number(est.commission_rate) || 0);
        setWarrantyRate(Number(est.warranty_rate) || 0);
        setSalesTaxRate(Number(est.sales_tax_rate) || 0);
        setFinanceRate(Number(est.finance_rate) || 0);
        setGrossMarginRate(Number(est.gross_margin_rate) || 25);
      } catch (err) {
        console.error('Failed to load estimate:', err);
      } finally {
        setLoadingEstimate(false);
      }
    })();
  }, [estimateId]);

  const inputsSnapshot = () => ({
    equipment,
    material,
    labor,
    sub_contractor: subContractor,
    custom_pass_through: customPassThrough,
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
        const updated = await updateEstimate({
          id: loadedEstimate.id,
          orgId: activeOrg.id,
          customerId,
          title,
          status,
          notes,
          inputs: inputsSnapshot(),
        });
        setLoadedEstimate(updated);
      } else {
        const created = await createEstimate({
          orgId: activeOrg.id,
          userId: user.id,
          customerId,
          title,
          status,
          notes,
          inputs: inputsSnapshot(),
        });
        setLoadedEstimate(created);
        setSearchParams({ id: created.id }, { replace: true });
      }
      setSaveDialogOpen(false);
      setSavedFlash(Date.now());
      setTimeout(() => setSavedFlash(null), 2000);
    } finally {
      setSaving(false);
    }
  };

  const canSave = isAuthenticated && activeOrg;

  const calculations = useMemo(() => {
    // Iterative calculation (commission and warranty depend on selling price)
    let sellingPrice = equipment + material + labor + subContractor;
    let previousPrice = 0;
    let iterations = 0;
    const maxIterations = 100;
    const convergenceThreshold = 0.01;
    
    let commission = 0;
    let warranty = 0;
    let baseCosts = 0;
    let salesTax = 0;
    let directCosts = 0;
    let priceAfterMargin = 0;
    
    while (iterations < maxIterations && Math.abs(sellingPrice - previousPrice) > convergenceThreshold) {
      previousPrice = sellingPrice;
      
      // Calculate commission based on current selling price
      commission = sellingPrice * (commissionRate / 100);
      
      // Calculate base costs (including commission)
      baseCosts = equipment + material + labor + commission + subContractor;
      
      // Calculate sales tax on taxable items (equipment + material only)
      const taxableAmount = equipment + material;
      salesTax = taxableAmount * (salesTaxRate / 100);
      
      // Direct costs (base costs + sales tax)
      directCosts = baseCosts + salesTax;
      
      // Apply margin to direct costs
      const marginMultiplier = 1 - (grossMarginRate / 100);
      priceAfterMargin = marginMultiplier > 0 ? directCosts / marginMultiplier : 0;
      
      // Calculate warranty based on current selling price
      warranty = sellingPrice * (warrantyRate / 100);
      
      // Calculate new selling price
      sellingPrice = priceAfterMargin + warranty + customPassThrough;
      
      iterations++;
    }
    
    // Final calculations
    const taxableAmount = equipment + material;
    const passThroughCosts = warranty + customPassThrough;
    const marginAmount = priceAfterMargin - directCosts;
    
    // Calculate finance price and finance amount
    const financeMultiplier = 1 - (financeRate / 100);
    const financePrice = financeMultiplier > 0 ? sellingPrice / financeMultiplier : 0;
    const financeAmount = financePrice - sellingPrice;
    
    // Total costs
    const totalCosts = directCosts + passThroughCosts + financeAmount;

    return {
      baseCosts,
      taxableAmount,
      salesTax,
      directCosts,
      commission,
      warranty,
      passThroughCosts,
      financeAmount,
      totalCosts,
      marginAmount,
      sellingPrice,
      financePrice
    };
  }, [equipment, material, labor, commissionRate, subContractor, warrantyRate, customPassThrough, salesTaxRate, financeRate, grossMarginRate]);

  const handleRefresh = async () => {
    // Reset to org defaults (or app defaults if no org)
    setEquipment(0);
    setMaterial(0);
    setLabor(0);
    setSubContractor(0);
    setCustomPassThrough(0);
    setSalesTaxRate(Number(activeOrg?.default_tax_rate ?? 8.25));
    setGrossMarginRate(Number(activeOrg?.default_margin ?? 25));
    setCommissionRate(Number(activeOrg?.default_commission ?? 0));
    setWarrantyRate(Number(activeOrg?.default_warranty ?? 0));
    setFinanceRate(Number(activeOrg?.default_finance_rate ?? 0));
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950/30">
      {/* Top Navigation Bar */}
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(canSave ? '/Estimates' : '/')}
            className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors select-none"
          >
            <ArrowLeft className="w-5 h-5 select-none" />
            <span className="font-medium hidden sm:inline">{canSave ? 'Estimates' : 'Home'}</span>
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
              Editing: <span className="font-medium text-slate-700 dark:text-slate-300">{loadedEstimate.title}</span>
              {loadedEstimate.customer?.name && <span> · {loadedEstimate.customer.name}</span>}
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
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 sm:mb-14"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 mb-6 select-none">
            <Calculator className="w-8 h-8 text-white select-none" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-3">
            Price-Up Calculator
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl mx-auto">
            Calculate your selling price with all costs, taxes, and desired margin
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Input Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3 space-y-6"
          >
            {/* Direct Costs */}
            <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 select-none">
                    <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400 select-none" />
                  </div>
                  Direct Costs
                </CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-6">
                <CurrencyInput
                  label="Equipment"
                  value={equipment || ''}
                  onChange={setEquipment}
                  icon={Package}
                  description="Hardware, tools, machinery"
                />
                <CurrencyInput
                  label="Material"
                  value={material || ''}
                  onChange={setMaterial}
                  icon={Hammer}
                  description="Raw materials, supplies"
                />
                <CurrencyInput
                  label="Labor"
                  value={labor || ''}
                  onChange={setLabor}
                  icon={Users}
                  description="Wages, contractor fees"
                />
                <PercentInput
                  label="Commission Rate"
                  value={commissionRate || ''}
                  onChange={setCommissionRate}
                  icon={TrendingUp}
                  description="% of total selling price"
                />
                <CurrencyInput
                  label="Sub Contractor"
                  value={subContractor || ''}
                  onChange={setSubContractor}
                  icon={Wrench}
                  description="External contractor costs"
                />
              </CardContent>
            </Card>

            {/* Pass Through Costs */}
            <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30 select-none">
                    <Receipt className="w-5 h-5 text-purple-600 dark:text-purple-400 select-none" />
                  </div>
                  Pass Through Costs
                </CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-6">
                <PercentInput
                  label="Warranty Rate"
                  value={warrantyRate || ''}
                  onChange={setWarrantyRate}
                  icon={ShieldCheck}
                  description="% of total selling price"
                />
                <CurrencyInput
                  label="Custom Pass Through"
                  value={customPassThrough || ''}
                  onChange={setCustomPassThrough}
                  icon={Tag}
                  description="Other pass through costs"
                />
              </CardContent>
            </Card>

            {/* Rates */}
            <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 select-none">
                    <Percent className="w-5 h-5 text-amber-600 dark:text-amber-400 select-none" />
                  </div>
                  Rates & Margins
                </CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-6">
                <PercentInput
                  label="Sales Tax Rate"
                  value={salesTaxRate || ''}
                  onChange={setSalesTaxRate}
                  icon={Receipt}
                  description="Applied to equipment & material"
                />
                <PercentInput
                  label="Finance Fee"
                  value={financeRate || ''}
                  onChange={setFinanceRate}
                  icon={CreditCard}
                  description="% of total selling price"
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

          {/* Results Section */}
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
                <div className="space-y-1 text-slate-300">
                  <BreakdownRow label="Equipment" value={equipment} delay={0.1} />
                  <BreakdownRow label="Material" value={material} delay={0.15} />
                  <BreakdownRow label="Labor" value={labor} delay={0.2} />
                  <BreakdownRow 
                    label={`Commission (${commissionRate}%)`} 
                    value={calculations.commission} 
                    delay={0.25} 
                  />
                  <BreakdownRow label="Sub Contractor" value={subContractor} delay={0.28} />
                </div>
                
                <div className="pt-2">
                  <BreakdownRow 
                    label="Base Costs" 
                    value={calculations.baseCosts} 
                    isSubtotal 
                    delay={0.3}
                  />
                </div>

                <div className="space-y-1 text-slate-300">
                  <BreakdownRow 
                    label={`Sales Tax (${salesTaxRate}%)`} 
                    value={calculations.salesTax} 
                    delay={0.33}
                  />
                </div>

                <div className="pt-2">
                  <BreakdownRow 
                    label="Direct Costs" 
                    value={calculations.directCosts} 
                    isSubtotal 
                    delay={0.36}
                  />
                </div>

                <div className="space-y-1 text-slate-300">
                  <BreakdownRow 
                    label={`Margin (${grossMarginRate}%)`} 
                    value={calculations.marginAmount} 
                    delay={0.39}
                  />
                  <BreakdownRow 
                    label={`Warranty (${warrantyRate}%)`} 
                    value={calculations.warranty} 
                    delay={0.42} 
                  />
                  <BreakdownRow label="Custom Pass Through" value={customPassThrough} delay={0.45} />
                  <BreakdownRow 
                    label={`Finance Fee (${financeRate}%)`} 
                    value={calculations.financeAmount} 
                    delay={0.48}
                  />
                </div>

                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-emerald-50">Selling Price</span>
                    <span className="text-3xl font-bold text-white font-mono">
                      ${calculations.sellingPrice.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
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
                      <span className="font-semibold text-blue-50">Finance Price</span>
                      <span className="text-3xl font-bold text-white font-mono">
                        ${calculations.financePrice.toLocaleString('en-US', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-700">
                  <div className="text-center p-3 rounded-lg bg-slate-800/50">
                    <p className="text-xs text-slate-400 mb-1">Profit Amount</p>
                    <p className="text-lg font-semibold text-emerald-400 font-mono">
                      ${calculations.marginAmount.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-800/50">
                    <p className="text-xs text-slate-400 mb-1">Markup %</p>
                    <p className="text-lg font-semibold text-amber-400 font-mono">
                      {calculations.totalCosts > 0 
                        ? ((calculations.marginAmount / calculations.totalCosts) * 100).toFixed(1)
                        : '0.0'
                      }%
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