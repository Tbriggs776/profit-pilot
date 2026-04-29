import { supabase } from './supabaseClient';

export const listCustomers = async (orgId) => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('org_id', orgId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
};

export const createCustomer = async ({ orgId, userId, ...rest }) => {
  const { data, error } = await supabase
    .from('customers')
    .insert({
      org_id: orgId,
      created_by: userId,
      name: rest.name,
      email: rest.email || null,
      phone: rest.phone || null,
      address: rest.address || null,
      notes: rest.notes || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

export const updateCustomer = async (id, patch) => {
  const { data, error } = await supabase
    .from('customers')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

export const deleteCustomer = async (id) => {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
};

export const searchCustomers = async (orgId, query) => {
  if (!query) return listCustomers(orgId);
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('org_id', orgId)
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true })
    .limit(20);
  if (error) throw error;
  return data;
};
