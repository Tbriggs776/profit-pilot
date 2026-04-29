import { supabase } from './supabaseClient';

// ============================================================================
// Subcontractor directory
// ============================================================================

export const listSubcontractors = async (orgId, { activeOnly = true } = {}) => {
  let query = supabase
    .from('subcontractors')
    .select('*')
    .eq('org_id', orgId)
    .order('name', { ascending: true });
  if (activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const searchSubcontractors = async (orgId, query) => {
  if (!query) return listSubcontractors(orgId);
  const { data, error } = await supabase
    .from('subcontractors')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true })
    .limit(20);
  if (error) throw error;
  return data;
};

export const getSubcontractor = async (id) => {
  const { data, error } = await supabase
    .from('subcontractors')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
};

export const createSubcontractor = async ({ orgId, userId, ...rest }) => {
  const { data, error } = await supabase
    .from('subcontractors')
    .insert({
      org_id: orgId,
      created_by: userId,
      name: rest.name,
      business_name: rest.business_name || null,
      email: rest.email || null,
      phone: rest.phone || null,
      address: rest.address || null,
      tax_id: rest.tax_id || null,
      trade: rest.trade || null,
      notes: rest.notes || null,
      is_active: rest.is_active !== false,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

export const updateSubcontractor = async (id, patch) => {
  const { data, error } = await supabase
    .from('subcontractors')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

export const deleteSubcontractor = async (id) => {
  const { error } = await supabase.from('subcontractors').delete().eq('id', id);
  if (error) throw error;
};

// ============================================================================
// Per-estimate assignments
// ============================================================================

export const listAssignments = async (estimateId) => {
  const { data, error } = await supabase
    .from('estimate_subcontractor_assignments')
    .select('*, subcontractor:subcontractors(id, name, business_name, trade)')
    .eq('estimate_id', estimateId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
};

export const createAssignment = async ({
  orgId,
  estimateId,
  subcontractorId,
  scope,
  amount,
  status,
  notes,
}) => {
  const { data, error } = await supabase
    .from('estimate_subcontractor_assignments')
    .insert({
      org_id: orgId,
      estimate_id: estimateId,
      subcontractor_id: subcontractorId,
      scope: scope || null,
      amount: Number(amount) || 0,
      status: status || 'unpaid',
      notes: notes || null,
    })
    .select('*, subcontractor:subcontractors(id, name, business_name, trade)')
    .single();
  if (error) throw error;
  return data;
};

export const updateAssignment = async (id, patch) => {
  const cleaned = { ...patch };
  if (cleaned.amount != null) cleaned.amount = Number(cleaned.amount) || 0;
  if (cleaned.amount_paid != null)
    cleaned.amount_paid = Number(cleaned.amount_paid) || 0;
  const { data, error } = await supabase
    .from('estimate_subcontractor_assignments')
    .update(cleaned)
    .eq('id', id)
    .select('*, subcontractor:subcontractors(id, name, business_name, trade)')
    .single();
  if (error) throw error;
  return data;
};

/**
 * Mark an assignment paid: sets amount_paid = amount, status = paid, paid_at = now.
 * Pass amount_paid to record a partial payment.
 */
export const markAssignmentPaid = async (id, amountPaid, fullAmount) => {
  const numericPaid = Number(amountPaid) || 0;
  const numericFull = Number(fullAmount) || 0;
  let status = 'unpaid';
  if (numericPaid >= numericFull && numericFull > 0) status = 'paid';
  else if (numericPaid > 0) status = 'partial';
  return updateAssignment(id, {
    amount_paid: numericPaid,
    status,
    paid_at: numericPaid > 0 ? new Date().toISOString() : null,
  });
};

export const deleteAssignment = async (id) => {
  const { error } = await supabase
    .from('estimate_subcontractor_assignments')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ============================================================================
// Year-end payout report (1099 prep)
// ============================================================================

export const getAnnualPayouts = async (orgId, year) => {
  const { data, error } = await supabase
    .from('subcontractor_annual_payouts')
    .select('*')
    .eq('org_id', orgId)
    .eq('payout_year', year)
    .order('total_paid', { ascending: false });
  if (error) throw error;
  return data;
};
