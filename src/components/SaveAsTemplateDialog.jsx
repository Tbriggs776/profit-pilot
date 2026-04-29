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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles } from 'lucide-react';
import { saveAsTemplate } from '@/api/templates';
import { useOrg, CONTRACTOR_TYPES } from '@/lib/OrgContext';
import { useAuth } from '@/lib/AuthContext';

export default function SaveAsTemplateDialog({
  open,
  onOpenChange,
  defaultName,
  rates,
  lines,
  onSaved,
}) {
  const { activeOrg } = useOrg();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contractorType, setContractorType] = useState('any');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setName(defaultName || '');
      setDescription('');
      setContractorType(activeOrg?.contractor_type || 'any');
      setError(null);
    }
  }, [open, defaultName, activeOrg]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !activeOrg || !user) return;
    setSaving(true);
    setError(null);
    try {
      const tpl = await saveAsTemplate({
        orgId: activeOrg.id,
        userId: user.id,
        contractorType: contractorType === 'any' ? null : contractorType,
        name: name.trim(),
        description: description.trim() || null,
        rates,
        lines,
      });
      onSaved?.(tpl);
      onOpenChange(false);
    } catch (err) {
      setError(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Save as template
            </DialogTitle>
            <DialogDescription>
              Capture the current line items and rates so you can spin up
              similar estimates in seconds.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Template name *</Label>
              <Input
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Standard furnace swap"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What kind of job is this for?"
              />
            </div>
            <div className="space-y-2">
              <Label>Trade</Label>
              <Select value={contractorType} onValueChange={setContractorType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any trade</SelectItem>
                  {CONTRACTOR_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              disabled={saving || !name.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? 'Saving…' : 'Save template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
