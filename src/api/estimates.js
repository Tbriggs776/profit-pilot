import { supabase } from './supabaseClient';

/**
 * Compute the same iterative selling-price math the calculator uses.
 * Kept here so we can save a complete totals snapshot when persisting.
 */
export const computeTotals = (i) => {
  const equipment = Number(i.equipment) || 0;
  const material = Number(i.material) || 0;
  const labor = Number(i.labor) || 0;
  const subContractor = Number(i.sub_contractor) || 0;
  const customPassThrough = Number(i.custom_pass_through) || 0;
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
    salesTax = (equipment + material) * (salesTaxRate / 100);
    directCosts = baseCosts + salesTax;
    const marginMultiplier = 1 - grossMarginRate / 100;
    priceAfterMargin = marginMultiplier > 0 ? directCosts / marginMultiplier : 0;
    warranty = sellingPrice * (warrantyRate / 100);
    sellingPrice = priceAfterMargin + warranty + customPassThrough;
    iterations++;
  }

  const marginAmount = priceAfterMargin - directCosts;
  const financeMultiplier = 1 - financeRate / 100;
  const financePrice = financeMultiplier > 0 ? sellingPrice / financeMultiplier : 0;
  const financeAmount = financePrice - sellingPrice;
  const totalCosts = directCosts + warranty + customPassThrough + financeAmount;

  return {
    selling_price: sellingPrice,
    finance_price: financePrice,
    margin_amount: marginAmount,
    direct_costs: directCosts,
    total_costs: totalCosts,
  };
};

const ESTIMATE_FIELDS = [
  'equipment',
  'material',
  'labor',
  'sub_contractor',
  'custom_pass_through',
  'commission_rate',
  'warranty_rate',
  'sales_tax_rate',
  'finance_rate',
  'gross_margin_rate',
];

const buildPayload = ({ orgId, customerId, title, status, notes, inputs }) => {
  const totals = computeTotals(inputs);
  const numericInputs = ESTIMATE_FIELDS.reduce((acc, key) => {
    acc[key] = Number(inputs[key]) || 0;
    return acc;
  }, {});

  return {
    org_id: orgId,
    customer_id: customerId || null,
    title,
    status: status || 'draft',
    notes: notes || null,
    ...numericInputs,
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

export const getEstimate = async (id) => {
  const { data, error } = await supabase
    .from('estimates')
    .select('*, customer:customers(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
};

export const createEstimate = async ({ orgId, userId, ...rest }) => {
  const payload = { ...buildPayload({ orgId, ...rest }), created_by: userId };
  const { data, error } = await supabase
    .from('estimates')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

export const updateEstimate = async ({ id, orgId, ...rest }) => {
  const payload = buildPayload({ orgId, ...rest });
  const { data, error } = await supabase
    .from('estimates')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
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
  const original = await getEstimate(id);
  const {
    id: _id,
    created_at,
    updated_at,
    public_token,
    is_public,
    customer,
    ...copy
  } = original;
  const { data, error } = await supabase
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
  return data;
};
