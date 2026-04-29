import React, { useRef, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useOrg } from '@/lib/OrgContext';

const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';
const MAX_BYTES = 10 * 1024 * 1024;

export default function LogoUpload({ org, onChange }) {
  const { updateOrg } = useOrg();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > MAX_BYTES) {
      setError('Logo must be under 10MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${org.id}/logo-${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('org-logos')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });
      if (uploadErr) throw uploadErr;

      const { data: pub } = supabase.storage.from('org-logos').getPublicUrl(path);
      const logoUrl = pub.publicUrl;

      await updateOrg(org.id, { logo_url: logoUrl });
      onChange?.(logoUrl);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!org.logo_url) return;
    setError(null);
    try {
      await updateOrg(org.id, { logo_url: null });
      onChange?.(null);
    } catch (err) {
      setError(err.message || 'Failed to remove logo');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
          {org.logo_url ? (
            <img
              src={org.logo_url}
              alt="Business logo"
              className="w-full h-full object-contain"
            />
          ) : (
            <ImageIcon className="w-7 h-7 text-slate-400" />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={handleFile}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {org.logo_url ? 'Replace logo' : 'Upload logo'}
          </Button>

          {org.logo_url && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
              className="text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4 mr-2" />
              Remove
            </Button>
          )}

          <p className="text-xs text-slate-400">PNG, JPG, WebP or SVG · max 10MB</p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
