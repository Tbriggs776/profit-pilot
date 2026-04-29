import { supabase } from './supabaseClient';

// =============================================================================
// Line item helpers
// =============================================================================

export const LINE_CATEGORIES = [
  'equipment',
  'material',
  'labor',
  'sub_contractor',
  'custom_pass_through',
];

// equipment / material are taxable by default; labor and sub are not.
// This matches the original calculator (sales tax applied to equipment + material only).
export const defaultTaxableForCategory = (cat) =>
  cat === 'equipment' || cat === 'material';

export const lineTotal = (line) =>
  (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);

export const sumByCategory = (lines, category) =>
  lines
    .filter((l) => l.category === category)
    .reduce((s, l) => s + lineTotal(l), 0);

/**
 * Sum of taxable subtotals across all line items (used for sales tax).
 * Falls back to "equipment + material" when caller didn't override taxability.
 */
export const taxableSubtotal = (lines) =>
  lines.filter((l) => l.taxable).reduce((s, l) => s + lineTotal(l), 0);

/**
 * Make a fresh empty line item shape for the editor.
 */
export const makeBlankLine = (category, sort_order = 0) => ({
  // No id => unsaved
  category,
  description: '',
  quantity: 1,
  unit: 'ea',
  unit_price: 0,
  taxable: defaultTaxableForCategory(category),
  sort_order,
});

// =============================================================================
// Iterative calculator math, now accepting structured line items
// =============================================================================

export const computeTotals = (i) => {
  const equipment = Number(i.equipment) || 0;
  const material = Number(i.material) || 0;
  const labor = Number(i.labor) || 0;
  const subContractor = Number(i.sub_contractor) || 0;
  const customPassThrough = Number(i.custom_pass_through) || 0;
  const taxable = i.taxable_subtotal != null
    ? Number(i.taxable_subtotal) || 0
    : equipment + material;
  const commissionRate = Number(i.commission_rate) || 0;
  const warrantyRate = Number(i.warranty_rate) || 0;
  const salesTaxRate = Number(i.sales_tax_rate) || 0;
  const financeRate = Number(i.finance_rate) || 0;
  const grossMarginRate = Number(i.gross_margin_rate) || 0;

  let sellingPrice = equipment + material + labor + subContractor;
  let previousPrice = 0;
  let iterations = 0;

  let commission = 0;
  let warranty = 0;
  let baseCosts = 0;
  let salesTax = 0;
  let directCosts = 0;
  let priceAfterMargin = 0;

  while (iterations < 100 && Math.abs(sellingPrice - previousPrice) > 0.01) {
    previousPrice = sellingPrice;
    commission = sellingPrice * (commissionRate / 100);
    baseCosts = equipment + material + labor + commission + subContractor;
    salesTax = taxable * (salesTaxRate / 100);
    directCosts = baseCosts + salesTax;
    const marginMultiplier = 1 - grossMarginRate / 100;
    priceAfterMargin = marginMultiplier > 0 ? directCosts / marginMultiplier : 0;
    warranty = sellingPrice * (warrantyRate / 100);
    sellingPrice = priceAfterMargin + warranty + customPassThrough;
    iterations++;
  }

  const marginAmount = priceAfterMargin - directCosts;

  // Customer-charged sales tax (separate from cost-side tax above).
  // Distribute selling_price across direct-cost lines pro-rata to find
  // the customer-facing retail of each line, then sum the taxable ones.
  const customerSalesTaxRate = Number(i.customer_sales_tax_rate) || 0;
  const customerLines =
    Array.isArray(i.lines) && i.lines.length
      ? distributeRetail(i.lines, sellingPrice, customPassThrough)
      : [];
  const customerTaxableRetail = customerLines
    .filter((l) => l.taxable)
    .reduce((s, l) => s + lineTotal(l), 0);
  const customerSalesTax = customerTaxableRetail * (customerSalesTaxRate / 100);
  const grandTotal = sellingPrice + customerSalesTax;

  // Finance fee marks up the grand total (what the customer actually pays).
  const financeMultiplier = 1 - financeRate / 100;
  const financePrice = financeMultiplier > 0 ? grandTotal / financeMultiplier : 0;
  const financeAmount = financePrice - grandTotal;
  const totalCosts = directCosts + warranty + customPassThrough + financeAmount;

  return {
    selling_price: sellingPrice,
    finance_price: financePrice,
    margin_amount: marginAmount,
    direct_costs: directCosts,
    total_costs: totalCosts,
    customer_sales_tax: customerSalesTax,
    grand_total: grandTotal,
  };
};

// Pure helper used by both computeTotals (for cached customer tax) and
// getCustomerFacingLines below. Allocates the marked-up sale across direct-
// cost lines pro-rata; pass-through lines stay at cost.
const distributeRetail = (lines, sellingPrice, totalPassThrough) => {
  const directLines = lines.filter((l) => l.category !== 'custom_pass_through');
  const totalDirectCost = directLines.reduce((s, l) => s + lineTotal(l), 0);
  const directRetailTotal = Math.max(0, Number(sellingPrice) - Number(totalPassThrough || 0));
  return lines.map((line) => {
    if (line.category === 'custom_pass_through') return { ...line };
    const cost = lineTotal(line);
    const share = totalDirectCost > 0 ? cost / totalDirectCost : 0;
    const customerLineTotal = share * directRetailTotal;
    const qty = Number(line.quantity) || 1;
    const customerUnitPrice = qty > 0 ? customerLineTotal / qty : 0;
    return { ...line, unit_price: customerUnitPrice };
  });
};

// Roll up line items into the lump-sum totals the estimate row caches.
export const rollupLines = (lines) => ({
  equipment: sumByCategory(lines, 'equipment'),
  material: sumByCategory(lines, 'material'),
  labor: sumByCategory(lines, 'labor'),
  sub_contractor: sumByCategory(lines, 'sub_contractor'),
  custom_pass_through: sumByCategory(lines, 'custom_pass_through'),
  taxable_subtotal: taxableSubtotal(lines),
});

// =============================================================================
// CRUD
// =============================================================================

const RATE_FIELDS = [
  'commission_rate',
  'warranty_rate',
  'sales_tax_rate',
  'customer_sales_tax_rate',
  'finance_rate',
  'gross_margin_rate',
];

const buildEstimatePayload = ({
  orgId,
  customerId,
  title,
  status,
  notes,
  rates,
  rollup,
  lines,
}) => {
  const totals = computeTotals({ ...rollup, ...rates, lines });
  const rateNumbers = RATE_FIELDS.reduce((acc, key) => {
    acc[key] = Number(rates[key]) || 0;
    return acc;
  }, {});
  return {
    org_id: orgId,
    customer_id: customerId || null,
    title,
    status: status || 'draft',
    notes: notes || null,
    equipment: rollup.equipment,
    material: rollup.material,
    labor: rollup.labor,
    sub_contractor: rollup.sub_contractor,
    custom_pass_through: rollup.custom_pass_through,
    ...rateNumbers,
    ...totals,
  };
};

export const listEstimates = async (orgId) => {
  const { data, error } = await supabase
    .from('estimates')
    .select('*, customer:customers(id, name, email)')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const getEstimateWithLines = async (id) => {
  const [{ data: estimate, error: e1 }, { data: lines, error: e2 }] =
    await Promise.all([
      supabase
        .from('estimates')
        .select('*, customer:customers(*)')
        .eq('id', id)
        .single(),
      supabase
        .from('estimate_line_items')
        .select('*')
        .eq('estimate_id', id)
        .order('sort_order', { ascending: true }),
    ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return { estimate, lines: lines || [] };
};

// Replace all line items for an estimate atomically-enough for our use case
// (delete-then-insert in two roundtrips; safe under per-org RLS).
const replaceLineItems = async ({ estimateId, orgId, lines }) => {
  const { error: delErr } = await supabase
    .from('estimate_line_items')
    .delete()
    .eq('estimate_id', estimateId);
  if (delErr) throw delErr;

  if (!lines.length) return [];

  const rows = lines.map((l, idx) => ({
    estimate_id: estimateId,
    org_id: orgId,
    category: l.category,
    description: l.description || '',
    quantity: Number(l.quantity) || 0,
    unit: l.unit || 'ea',
    unit_price: Number(l.unit_price) || 0,
    taxable: !!l.taxable,
    sort_order: idx,
  }));
  const { data, error } = await supabase
    .from('estimate_line_items')
    .insert(rows)
    .select('*');
  if (error) throw error;
  return data;
};

export const createEstimate = async ({
  orgId,
  userId,
  customerId,
  title,
  status,
  notes,
  rates,
  lines,
}) => {
  const rollup = rollupLines(lines);
  const payload = {
    ...buildEstimatePayload({
      orgId,
      customerId,
      title,
      status,
      notes,
      rates,
      rollup,
      lines,
    }),
    created_by: userId,
  };
  const { data: estimate, error } = await supabase
    .from('estimates')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  const savedLines = await replaceLineItems({
    estimateId: estimate.id,
    orgId,
    lines,
  });
  return { estimate, lines: savedLines };
};

export const updateEstimate = async ({
  id,
  orgId,
  customerId,
  title,
  status,
  notes,
  rates,
  lines,
}) => {
  const rollup = rollupLines(lines);
  const payload = buildEstimatePayload({
    orgId,
    customerId,
    title,
    status,
    notes,
    rates,
    rollup,
    lines,
  });
  const { data: estimate, error } = await supabase
    .from('estimates')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  const savedLines = await replaceLineItems({
    estimateId: id,
    orgId,
    lines,
  });
  return { estimate, lines: savedLines };
};

export const updateEstimateStatus = async (id, status) => {
  const { data, error } = await supabase
    .from('estimates')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

export const deleteEstimate = async (id) => {
  const { error } = await supabase.from('estimates').delete().eq('id', id);
  if (error) throw error;
};

export const duplicateEstimate = async (id, userId) => {
  const { estimate: original, lines } = await getEstimateWithLines(id);
  const {
    id: _id,
    created_at,
    updated_at,
    public_token,
    is_public,
    customer,
    ...copy
  } = original;
  const { data: dup, error } = await supabase
    .from('estimates')
    .insert({
      ...copy,
      title: `${original.title} (copy)`,
      status: 'draft',
      created_by: userId,
    })
    .select('*')
    .single();
  if (error) throw error;
  if (lines.length) {
    const cloned = lines.map((l, idx) => ({
      estimate_id: dup.id,
      org_id: dup.org_id,
      category: l.category,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      unit_price: l.unit_price,
      taxable: l.taxable,
      sort_order: idx,
    }));
    await supabase.from('estimate_line_items').insert(cloned);
  }
  return dup;
};

/**
 * Customer-facing view of line items.
 *
 * Internal lines store our COST per unit. The customer must never see those
 * raw costs — that would expose our margin. This helper pro-rata-allocates the
 * marked-up portion of the selling price across direct-cost lines so each
 * line displays the price the customer is actually charged.
 *
 * - Direct-cost categories (equipment, material, labor, sub_contractor) absorb
 *   their share of (selling_price - pass-through). Warranty and the implied
 *   sales-tax markup are baked in invisibly.
 * - Pass-through lines keep their original price (they're literally passed
 *   through at cost by definition).
 *
 * Sum of resulting line totals = estimate.selling_price.
 */
export const getCustomerFacingLines = (lines, estimate) => {
  if (!Array.isArray(lines) || !lines.length) return [];
  const sellingPrice = Number(estimate?.selling_price) || 0;
  const financeRate = Number(estimate?.finance_rate) || 0;
  const financePrice = Number(estimate?.finance_price) || 0;
  const passThroughTotal = Number(estimate?.custom_pass_through) || 0;

  // When financing applies, the single number the customer sees IS finance
  // price — line items must absorb every markup (margin, warranty, tax,
  // finance fee) so they sum to that one number. Pass-through gets marked
  // up here too: from the customer's perspective there's no distinction.
  if (financeRate > 0 && financePrice > 0) {
    return distributeAcrossAll(lines, financePrice);
  }
  // Otherwise: standard pro-rata of selling_price across direct-cost lines,
  // pass-through stays at cost, and customer tax is shown as a separate line.
  return distributeRetail(lines, sellingPrice, passThroughTotal);
};

// Allocates the customer total across ALL lines (including pass-through),
// used when financing applies because the finance markup applies to the
// whole bill, not just direct costs.
const distributeAcrossAll = (lines, customerTotal) => {
  const totalCost = lines.reduce((s, l) => s + lineTotal(l), 0);
  return lines.map((line) => {
    const cost = lineTotal(line);
    const share = totalCost > 0 ? cost / totalCost : 0;
    const customerLineTotal = share * Number(customerTotal || 0);
    const qty = Number(line.quantity) || 1;
    const customerUnitPrice = qty > 0 ? customerLineTotal / qty : 0;
    return { ...line, unit_price: customerUnitPrice };
  });
};

/**
 * Computed customer sales tax + grand total from a saved estimate.
 * Used for rendering on the PDF and public viewer when customer_sales_tax /
 * grand_total weren't cached yet (e.g. legacy estimates).
 */
export const computeCustomerTax = (lines, estimate) => {
  const rate = Number(estimate?.customer_sales_tax_rate) || 0;
  const sellingPrice = Number(estimate?.selling_price) || 0;
  if (!rate || !sellingPrice) {
    return {
      customer_sales_tax: Number(estimate?.customer_sales_tax) || 0,
      grand_total: Number(estimate?.grand_total) || sellingPrice,
    };
  }
  const customerLines = getCustomerFacingLines(lines, estimate);
  const taxableRetail = customerLines
    .filter((l) => l.taxable)
    .reduce((s, l) => s + lineTotal(l), 0);
  const tax = taxableRetail * (rate / 100);
  return {
    customer_sales_tax: tax,
    grand_total: sellingPrice + tax,
  };
};

// Backwards-compat helper: turn an estimate that has no line items
// into a default set (one line per category) using the lump-sum columns.
export const synthesizeLinesFromLumpSums = (estimate) => {
  const cats = [
    ['equipment', 'Equipment'],
    ['material', 'Material'],
    ['labor', 'Labor'],
    ['sub_contractor', 'Sub-contractor'],
    ['custom_pass_through', 'Custom pass-through'],
  ];
  return cats.map(([category, label], idx) => ({
    category,
    description: label,
    quantity: 1,
    unit: 'ea',
    unit_price: Number(estimate?.[category]) || 0,
    taxable: defaultTaxableForCategory(category),
    sort_order: idx,
  }));
};
