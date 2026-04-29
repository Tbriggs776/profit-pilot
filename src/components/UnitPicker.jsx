import React, { useEffect, useRef, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const COMMON_UNITS = [
  'ea',
  'hr',
  'day',
  'sq ft',
  'lin ft',
  'cu yd',
  'lb',
  'box',
  'lot',
  'gal',
  'roll',
  'sheet',
];

const CUSTOM = '__custom__';

/**
 * Mobile-friendly unit picker that always shows the full list.
 * Uses Radix Select for the dropdown; "Custom…" swaps the row to a free-text input.
 */
export default function UnitPicker({
  value,
  onChange,
  className = '',
  size = 'md', // 'sm' | 'md'
  ariaLabel = 'Unit',
}) {
  const isCommon = !value || COMMON_UNITS.includes(value);
  const [customMode, setCustomMode] = useState(!isCommon);
  const inputRef = useRef(null);

  useEffect(() => {
    setCustomMode(!isCommon);
  }, [isCommon]);

  // Focus the input when entering custom mode
  useEffect(() => {
    if (customMode && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [customMode]);

  const heightClass = size === 'sm' ? 'h-9 text-sm' : 'h-11 text-base';

  if (customMode) {
    return (
      <div className={`relative flex items-center ${className}`}>
        <Input
          ref={inputRef}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Custom unit"
          className={`${heightClass} pr-9`}
          aria-label={ariaLabel}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            onChange('ea');
            setCustomMode(false);
          }}
          className="absolute right-0.5 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-slate-600"
          title="Pick from list"
          aria-label="Back to list"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <Select
      value={value || 'ea'}
      onValueChange={(v) => {
        if (v === CUSTOM) {
          setCustomMode(true);
          onChange('');
          return;
        }
        onChange(v);
      }}
    >
      <SelectTrigger className={`${heightClass} ${className}`} aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {COMMON_UNITS.map((u) => (
          <SelectItem key={u} value={u}>
            {u}
          </SelectItem>
        ))}
        <SelectSeparator />
        <SelectItem value={CUSTOM}>Custom…</SelectItem>
      </SelectContent>
    </Select>
  );
}
