import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';
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
import { useOrg, CONTRACTOR_TYPES } from '@/lib/OrgContext';

export default function OrgOnboarding({ onCreated }) {
  const { createOrg } = useOrg();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    business_name: '',
    contractor_type: 'general',
    phone: '',
    address: '',
    license_number: '',
    website: '',
  });

  const onChange = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target?.value ?? e }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const org = await createOrg(form);
      onCreated?.(org);
    } catch (err) {
      setError(err.message || 'Failed to create business');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto"
    >
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 mb-5">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Set up your business
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          This information appears on every estimate and proposal you create.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-5 bg-white dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
      >
        <div className="space-y-2">
          <Label>Business name *</Label>
          <Input
            required
            value={form.business_name}
            onChange={onChange('business_name')}
            placeholder="Acme Plumbing LLC"
          />
        </div>

        <div className="space-y-2">
          <Label>Trade *</Label>
          <Select
            value={form.contractor_type}
            onValueChange={(v) => setForm((f) => ({ ...f, contractor_type: v }))}
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
              value={form.phone}
              onChange={onChange('phone')}
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="space-y-2">
            <Label>License #</Label>
            <Input
              value={form.license_number}
              onChange={onChange('license_number')}
              placeholder="C-123456"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Address</Label>
          <Input
            value={form.address}
            onChange={onChange('address')}
            placeholder="123 Main St, City, ST 12345"
          />
        </div>

        <div className="space-y-2">
          <Label>Website</Label>
          <Input
            type="url"
            value={form.website}
            onChange={onChange('website')}
            placeholder="https://example.com"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={submitting || !form.business_name}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          size="lg"
        >
          {submitting ? 'Creating…' : 'Create business'}
        </Button>

        <p className="text-xs text-center text-slate-400">
          You can edit any of this later. You'll be the owner.
        </p>
      </form>
    </motion.div>
  );
}
