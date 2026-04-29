import { supabase } from './supabaseClient';
import { base44 } from './base44Client';

export const Query = {
  from: (table) => supabase.from(table),
};

export const User = base44.auth;
