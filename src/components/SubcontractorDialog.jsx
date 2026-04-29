import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Save, HardHat } from 'lucide-react';
import {
  createSubcontractor,
  updateSubcontractor,
} from '@/api/subcontractors';
import { useOrg } from '@/lib/OrgContext';
import { useAuth } from '@/lib/AuthContext';

const EMPTY = {
  name: '',
  business_name: '',
  email: '',
  phone: '',
  address: '',
  tax_id: '',
  trade: '',
  notes: '',
  is_active: true,
};

export default function SubcontractorDialog({
  open,
  onOpenChange,
  subcontractor,
  onSaved,
}) {
  const { activeOrg } = useOrg();
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm(
      subcontractor
        ? {
            ...EMPTY,
            ...subcontractor,
            is_active: subcontractor.is_active !== false,
          }
        : EMPTY
    );
    setError(null);
  }, [open, subcontractor]);

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target?.value ?? e }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !activeOrg) return;
    setSaving(true);
    setError(null);
    try {
      let saved;
      if (subcontractor?.id) {
        saved = await updateSubcontractor(subcontractor.id, {
          name: form.name,
          business_name: form.business_name || null,
          email: form.email || null,
          phone: form.phone || null,
          address: form.address || null,
          tax_id: form.tax_id || null,
          trade: form.trade || null,
          notes: form.notes || null,
          is_active: form.is_active,
        });
      } else {
        saved = await createSubcontractor({
          orgId: activeOrg.id,
          userId: user.id,
          ...form,
        });
      }
      onSaved?.(saved);
      onOpenChange(false);
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardHat className="w-5 h-5 text-emerald-600" />
              {subcontractor?.id ? 'Edit subcontractor' : 'Add subcontractor'}
            </DialogTitle>
            <DialogDescription>
              Track sub contacts and 1099 info in one place.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Contact name *</Label>
              <Input
                required
                autoFocus
                value={form.name}
                onChange={set('name')}
                placeholder="Bob Smith"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Business name</Label>
                <Input
                  value={form.business_name}
                  onChange={set('business_name')}
                  placeholder="Bob's Electric LLC"
                />
              </div>
              <div className="space-y-2">
                <Label>Trade</Label>
                <Input
                  value={form.trade}
                  onChange={set('trade')}
                  placeholder="Electrician"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={set('address')} />
            </div>

            <div className="space-y-2">
              <Label>EIN / SSN (1099)</Label>
              <Input
                value={form.tax_id}
                onChange={set('tax_id')}
                placeholder="XX-XXXXXXX"
                autoComplete="off"
              />
              <p className="text-xs text-slate-400">
                Used for 1099 prep. Visible only to your team.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={set('notes')}
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-4">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-slate-400">
                  Inactive subs are hidden from pickers but kept for history.
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
