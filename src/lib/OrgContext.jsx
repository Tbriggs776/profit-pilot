import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from './AuthContext';

const OrgContext = createContext();

export const CONTRACTOR_TYPES = [
  { value: 'general', label: 'General Contractor' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'painting', label: 'Painting' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'drywall', label: 'Drywall' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'other', label: 'Other' },
];

export const contractorTypeLabel = (value) =>
  CONTRACTOR_TYPES.find((t) => t.value === value)?.label || 'General Contractor';

export const OrgProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [activeOrg, setActiveOrg] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadOrgs = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setOrgs([]);
      setActiveOrg(null);
      setActiveRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: memberships, error: memErr } = await supabase
      .from('org_members')
      .select('role, org_id, organizations(*)')
      .eq('user_id', user.id);

    if (memErr) {
      console.error('Failed to load orgs:', memErr);
      setLoading(false);
      return;
    }

    const orgList = (memberships || [])
      .filter((m) => m.organizations)
      .map((m) => ({ ...m.organizations, _role: m.role }));
    setOrgs(orgList);

    const { data: profile } = await supabase
      .from('profiles')
      .select('active_org_id')
      .eq('id', user.id)
      .maybeSingle();

    const desiredId = profile?.active_org_id || orgList[0]?.id || null;
    const chosen = orgList.find((o) => o.id === desiredId) || orgList[0] || null;
    setActiveOrg(chosen || null);
    setActiveRole(chosen?._role || null);

    if (chosen && profile?.active_org_id !== chosen.id) {
      await supabase
        .from('profiles')
        .update({ active_org_id: chosen.id })
        .eq('id', user.id);
    }

    setLoading(false);
  }, [user, isAuthenticated]);

  useEffect(() => {
    loadOrgs();
  }, [loadOrgs]);

  const switchOrg = async (orgId) => {
    const next = orgs.find((o) => o.id === orgId);
    if (!next) return;
    setActiveOrg(next);
    setActiveRole(next._role);
    if (user) {
      await supabase
        .from('profiles')
        .update({ active_org_id: orgId })
        .eq('id', user.id);
    }
  };

  const createOrg = async (input) => {
    if (!user) throw new Error('Not signed in');
    const payload = {
      business_name: input.business_name,
      contractor_type: input.contractor_type || 'general',
      phone: input.phone || null,
      address: input.address || null,
      license_number: input.license_number || null,
      website: input.website || null,
      created_by: user.id,
    };
    const { data, error } = await supabase
      .from('organizations')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    await loadOrgs();
    return data;
  };

  const updateOrg = async (orgId, patch) => {
    const { data, error } = await supabase
      .from('organizations')
      .update(patch)
      .eq('id', orgId)
      .select('*')
      .single();
    if (error) throw error;
    setActiveOrg((prev) => (prev?.id === orgId ? { ...prev, ...data } : prev));
    setOrgs((prev) => prev.map((o) => (o.id === orgId ? { ...o, ...data } : o)));
    return data;
  };

  const refresh = loadOrgs;

  return (
    <OrgContext.Provider
      value={{
        orgs,
        activeOrg,
        activeRole,
        loading,
        switchOrg,
        createOrg,
        updateOrg,
        refresh,
        canEdit: activeRole === 'owner' || activeRole === 'admin',
      }}
    >
      {children}
    </OrgContext.Provider>
  );
};

export const useOrg = () => {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within an OrgProvider');
  return ctx;
};
