import React from 'react';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  defaultTaxableForCategory,
  lineTotal,
  makeBlankLine,
} from '@/api/estimates';

const COMMON_UNITS = ['ea', 'hr', 'day', 'sq ft', 'lin ft', 'cu yd', 'lb', 'box', 'lot'];

const formatCurrency = (n) =>
  Number(n || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function LineItemEditor({
  category,
  label,
  hint,
  icon: Icon,
  iconColor,
  lines,
  onChange,
  showTaxable = true,
}) {
  const categoryLines = lines
    .map((line, originalIndex) => ({ line, originalIndex }))
    .filter(({ line }) => line.category === category);

  const updateLine = (originalIndex, patch) => {
    const next = [...lines];
    next[originalIndex] = { ...next[originalIndex], ...patch };
    onChange(next);
  };

  const removeLine = (originalIndex) => {
    const next = lines.filter((_, i) => i !== originalIndex);
    onChange(next);
  };

  const addLine = () => {
    const fresh = makeBlankLine(category, lines.length);
    onChange([...lines, fresh]);
  };

  const subtotal = categoryLines.reduce(
    (s, { line }) => s + lineTotal(line),
    0
  );

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-2xl border-0 shadow-lg shadow-slate-200/50 overflow-hidden">
      <div className="p-5 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className={`p-2 rounded-lg ${iconColor || 'bg-slate-100 dark:bg-slate-700'} shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              {label}
            </h3>
            {hint && (
              <p className="text-xs text-slate-400 truncate">{hint}</p>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-slate-400">Subtotal</p>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-200 font-mono">
            {formatCurrency(subtotal)}
          </p>
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-2">
        {categoryLines.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">
            No line items.
          </p>
        ) : (
          categoryLines.map(({ line, originalIndex }) => (
            <LineRow
              key={originalIndex}
              line={line}
              showTaxable={showTaxable}
              onUpdate={(patch) => updateLine(originalIndex, patch)}
              onRemove={() => removeLine(originalIndex)}
            />
          ))
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addLine}
          className="w-full text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-dashed border-slate-200 dark:border-slate-700 mt-2"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add line
        </Button>
      </div>
    </div>
  );
}

function LineRow({ line, showTaxable, onUpdate, onRemove }) {
  const total = lineTotal(line);
  const wasManuallyTaxable = line.taxable !== defaultTaxableForCategory(line.category);

  return (
    <div className="grid grid-cols-12 gap-2 items-start p-2 rounded-lg hover:bg-slate-50/70 dark:hover:bg-slate-900/30 transition-colors">
      <div className="hidden sm:flex col-span-1 items-center justify-center pt-2.5 text-slate-300">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Description */}
      <div className="col-span-12 sm:col-span-4">
        <Input
          value={line.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Description"
          className="h-9 text-sm"
        />
      </div>

      {/* Qty */}
      <div className="col-span-3 sm:col-span-1">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={line.quantity}
          onChange={(e) =>
            onUpdate({ quantity: parseFloat(e.target.value) || 0 })
          }
          className="h-9 text-sm text-right"
          aria-label="Quantity"
        />
      </div>

      {/* Unit */}
      <div className="col-span-3 sm:col-span-2">
        <Input
          list="line-unit-options"
          value={line.unit || ''}
          onChange={(e) => onUpdate({ unit: e.target.value })}
          placeholder="ea"
          className="h-9 text-sm"
          aria-label="Unit"
        />
      </div>

      {/* Unit price */}
      <div className="col-span-6 sm:col-span-2 relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
          $
        </span>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={line.unit_price}
          onChange={(e) =>
            onUpdate({ unit_price: parseFloat(e.target.value) || 0 })
          }
          className="h-9 text-sm pl-6 text-right"
          aria-label="Unit price"
        />
      </div>

      {/* Total + remove */}
      <div className="col-span-12 sm:col-span-2 flex items-center justify-between sm:justify-end gap-2">
        <span className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-200 sm:flex-1 sm:text-right">
          {formatCurrency(total)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0"
          aria-label="Remove line"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {showTaxable && (
        <div className="col-span-12 sm:col-start-2 sm:col-span-11 flex items-center gap-2 pl-1 -mt-1">
          <Checkbox
            id={`taxable-${line.category}-${line.sort_order ?? line.id ?? Math.random()}`}
            checked={!!line.taxable}
            onCheckedChange={(checked) => onUpdate({ taxable: !!checked })}
          />
          <label
            htmlFor={`taxable-${line.category}-${line.sort_order ?? line.id ?? Math.random()}`}
            className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none"
          >
            Taxable
            {wasManuallyTaxable && (
              <span className="ml-1 text-amber-500">(non-default)</span>
            )}
          </label>
        </div>
      )}

      <datalist id="line-unit-options">
        {COMMON_UNITS.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>
    </div>
  );
}
