import { supabase } from './supabaseClient';

/**
 * List all templates visible to the user:
 *   - org-saved templates for the active org
 *   - all built-in templates
 * Optionally filter built-ins by contractorType (NULL contractor_type = always shown).
 */
export const listTemplates = async ({ orgId, contractorType }) => {
  let query = supabase
    .from('estimate_templates')
    .select('id, org_id, contractor_type, name, description, is_built_in, sort_order, gross_margin_rate, commission_rate, warranty_rate, sales_tax_rate, finance_rate')
    .order('is_built_in', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (orgId) {
    // Built-in OR owned by this org
    query = query.or(`is_built_in.eq.true,org_id.eq.${orgId}`);
  } else {
    query = query.eq('is_built_in', true);
  }

  const { data, error } = await query;
  if (error) throw error;

  if (!contractorType) return data;
  return data.filter(
    (t) =>
      !t.is_built_in ||
      t.contractor_type == null ||
      t.contractor_type === contractorType
  );
};

export const getTemplateWithLines = async (id) => {
  const [{ data: template, error: e1 }, { data: lines, error: e2 }] =
    await Promise.all([
      supabase
        .from('estimate_templates')
        .select('*')
        .eq('id', id)
        .single(),
      supabase
        .from('estimate_template_lines')
        .select('*')
        .eq('template_id', id)
        .order('sort_order', { ascending: true }),
    ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return { template, lines: lines || [] };
};

/**
 * Build the in-memory line array used by the calculator from a template's lines.
 * Returns plain objects (no DB IDs) so a fresh save creates new line item rows.
 */
export const linesFromTemplate = (templateLines) =>
  (templateLines || []).map((l, idx) => ({
    category: l.category,
    description: l.description,
    quantity: Number(l.quantity) || 1,
    unit: l.unit || 'ea',
    unit_price: Number(l.unit_price) || 0,
    taxable: !!l.taxable,
    sort_order: idx,
  }));

/**
 * Save the current calculator state as a new org template.
 */
export const saveAsTemplate = async ({
  orgId,
  userId,
  contractorType,
  name,
  description,
  rates,
  lines,
}) => {
  const { data: tpl, error: tplErr } = await supabase
    .from('estimate_templates')
    .insert({
      org_id: orgId,
      contractor_type: contractorType || null,
      name,
      description: description || null,
      commission_rate: rates?.commission_rate ?? null,
      warranty_rate: rates?.warranty_rate ?? null,
      sales_tax_rate: rates?.sales_tax_rate ?? null,
      finance_rate: rates?.finance_rate ?? null,
      gross_margin_rate: rates?.gross_margin_rate ?? null,
      is_built_in: false,
      created_by: userId,
    })
    .select('*')
    .single();
  if (tplErr) throw tplErr;

  if (lines?.length) {
    const rows = lines.map((l, idx) => ({
      template_id: tpl.id,
      category: l.category,
      description: l.description || '',
      quantity: Number(l.quantity) || 0,
      unit: l.unit || 'ea',
      unit_price: Number(l.unit_price) || 0,
      taxable: !!l.taxable,
      sort_order: idx,
    }));
    const { error: linesErr } = await supabase
      .from('estimate_template_lines')
      .insert(rows);
    if (linesErr) throw linesErr;
  }
  return tpl;
};

export const deleteTemplate = async (id) => {
  const { error } = await supabase
    .from('estimate_templates')
    .delete()
    .eq('id', id);
  if (error) throw error;
};
