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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Copy, Check, Link2, ExternalLink } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';

export default function ShareEstimate({
  open,
  onOpenChange,
  estimate,
  onChanged,
}) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [localEstimate, setLocalEstimate] = useState(estimate);

  useEffect(() => {
    setLocalEstimate(estimate);
    setError(null);
    setCopied(false);
  }, [estimate, open]);

  const publicUrl = localEstimate?.public_token
    ? `${window.location.origin}/p/${localEstimate.public_token}`
    : null;

  const handleEnable = async () => {
    setWorking(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc(
        'estimate_enable_public',
        { estimate_id: estimate.id }
      );
      if (rpcError) throw rpcError;
      const updated = { ...localEstimate, public_token: data, is_public: true };
      setLocalEstimate(updated);
      onChanged?.(updated);
    } catch (err) {
      setError(err.message || 'Failed to enable sharing');
    } finally {
      setWorking(false);
    }
  };

  const handleDisable = async () => {
    setWorking(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc(
        'estimate_disable_public',
        { estimate_id: estimate.id }
      );
      if (rpcError) throw rpcError;
      const updated = { ...localEstimate, is_public: false };
      setLocalEstimate(updated);
      onChanged?.(updated);
    } catch (err) {
      setError(err.message || 'Failed to disable sharing');
    } finally {
      setWorking(false);
    }
  };

  const handleToggle = (checked) => {
    if (checked) handleEnable();
    else handleDisable();
  };

  const handleCopy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const isShared = !!localEstimate?.is_public && !!localEstimate?.public_token;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-emerald-600" />
            Share with client
          </DialogTitle>
          <DialogDescription>
            Generate a public link your client can open in any browser — no
            login required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div>
              <Label className="text-sm font-medium">Public sharing</Label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isShared
                  ? 'Anyone with the link can view this estimate.'
                  : 'Disabled — only your team can see this estimate.'}
              </p>
            </div>
            <Switch
              checked={isShared}
              onCheckedChange={handleToggle}
              disabled={working}
            />
          </div>

          {isShared && publicUrl && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-500">Shareable link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={publicUrl}
                  onFocus={(e) => e.target.select()}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                  aria-label="Copy link"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  asChild
                  className="shrink-0"
                  aria-label="Open in new tab"
                >
                  <a href={publicUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
              <p className="text-xs text-slate-400">
                The recipient sees your branding, the line items, and the total
                — but can't edit anything.
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
