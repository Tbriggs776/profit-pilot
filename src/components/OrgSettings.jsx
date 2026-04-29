import React, { useEffect, useState } from 'react';
import { Building2, Save, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import LogoUpload from '@/components/LogoUpload';
import { useOrg, CONTRACTOR_TYPES } from '@/lib/OrgContext';

const PERCENT_FIELDS = [
  ['default_tax_rate', 'Sales Tax (your cost) %', 'What you pay buying taxable supplies'],
  ['default_customer_tax_rate', 'Sales Tax (charge customer) %', 'Added to retail on taxable items'],
  ['default_margin', 'Gross Margin %', 'Default target profit margin'],
  ['default_commission', 'Commission %', 'Default commission rate'],
  ['default_warranty', 'Warranty %', 'Default warranty rate'],
  ['default_finance_rate', 'Finance Fee %', 'Default finance markup'],
];

export default function OrgSettings() {
  const { activeOrg, updateOrg, canEdit } = useOrg();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (activeOrg) {
      const { _role, created_at, updated_at, created_by, id, ...rest } =
        activeOrg;
      setForm(rest);
    }
  }, [activeOrg]);

  if (!activeOrg || !form) return null;

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const onSave = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    try {
      await updateOrg(activeOrg.id, {
        ...form,
        default_tax_rate: parseFloat(form.default_tax_rate) || 0,
        default_customer_tax_rate: parseFloat(form.default_customer_tax_rate) || 0,
        default_margin: parseFloat(form.default_margin) || 0,
        default_commission: parseFloat(form.default_commission) || 0,
        default_warranty: parseFloat(form.default_warranty) || 0,
        default_finance_rate: parseFloat(form.default_finance_rate) || 0,
      });
      setSavedAt(new Date());
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSave} className="space-y-6">
      <section className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-emerald-600" />
          Branding
          {!canEdit && <Lock className="w-3.5 h-3.5 text-slate-400 ml-1" />}
        </h3>

        <LogoUpload org={activeOrg} />

        <div className="space-y-4 mt-5">
          <div className="space-y-2">
            <Label>Business name</Label>
            <Input
              required
              disabled={!canEdit}
              value={form.business_name || ''}
              onChange={(e) => set('business_name', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Trade</Label>
            <Select
              value={form.contractor_type}
              onValueChange={(v) => set('contractor_type', v)}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTRACTOR_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                type="tel"
                disabled={!canEdit}
                value={form.phone || ''}
                onChange={(e) => set('phone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>License #</Label>
              <Input
                disabled={!canEdit}
                value={form.license_number || ''}
                onChange={(e) => set('license_number', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              disabled={!canEdit}
              value={form.address || ''}
              onChange={(e) => set('address', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Website</Label>
            <Input
              type="url"
              disabled={!canEdit}
              value={form.website || ''}
              onChange={(e) => set('website', e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
          Default rates
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Used to pre-fill new estimates and the calculator.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {PERCENT_FIELDS.map(([key, label, hint]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                disabled={!canEdit}
                value={form[key] ?? 0}
                onChange={(e) => set(key, e.target.value)}
              />
              <p className="text-xs text-slate-400">{hint}</p>
            </div>
          ))}
        </div>
      </section>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {canEdit && (
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          {savedAt && (
            <span className="text-sm text-emerald-600 dark:text-emerald-400">
              Saved
            </span>
          )}
        </div>
      )}

      {!canEdit && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Only owners and admins can edit business settings.
        </p>
      )}
    </form>
  );
}
