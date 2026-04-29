import React, { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Plus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { listCustomers, createCustomer, searchCustomers } from '@/api/customers';
import { useOrg } from '@/lib/OrgContext';
import { useAuth } from '@/lib/AuthContext';

export default function CustomerPicker({ value, onChange }) {
  const { activeOrg } = useOrg();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [creatingNew, setCreatingNew] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [savingNew, setSavingNew] = useState(false);
  const [error, setError] = useState(null);

  const selected = customers.find((c) => c.id === value);

  useEffect(() => {
    if (!activeOrg || !open) return;
    setLoading(true);
    (async () => {
      try {
        const data = query
          ? await searchCustomers(activeOrg.id, query)
          : await listCustomers(activeOrg.id);
        setCustomers(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeOrg, query, open]);

  // Always load the selected customer up-front (even when popover is closed) so
  // its name renders in the trigger button.
  useEffect(() => {
    if (!activeOrg || !value || customers.find((c) => c.id === value)) return;
    (async () => {
      const list = await listCustomers(activeOrg.id);
      setCustomers(list);
    })();
  }, [value, activeOrg, customers]);

  const handleCreate = async () => {
    if (!newCustomer.name.trim()) return;
    setSavingNew(true);
    setError(null);
    try {
      const created = await createCustomer({
        orgId: activeOrg.id,
        userId: user.id,
        ...newCustomer,
      });
      setCustomers((prev) => [created, ...prev]);
      onChange(created.id);
      setCreatingNew(false);
      setNewCustomer({ name: '', email: '', phone: '', address: '' });
      setOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to create customer');
    } finally {
      setSavingNew(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="flex items-center gap-2 truncate">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            {selected ? (
              <span className="truncate">{selected.name}</span>
            ) : (
              <span className="text-slate-400">Select customer (optional)</span>
            )}
          </span>
          <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        {creatingNew ? (
          <div className="p-3 space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              New customer
            </p>
            <div className="space-y-2">
              <Label className="text-xs">Name *</Label>
              <Input
                autoFocus
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer((c) => ({ ...c, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={newCustomer.email}
                onChange={(e) =>
                  setNewCustomer((c) => ({ ...c, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Phone</Label>
              <Input
                type="tel"
                value={newCustomer.phone}
                onChange={(e) =>
                  setNewCustomer((c) => ({ ...c, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Address</Label>
              <Input
                value={newCustomer.address}
                onChange={(e) =>
                  setNewCustomer((c) => ({ ...c, address: e.target.value }))
                }
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCreatingNew(false)}
                disabled={savingNew}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                onClick={handleCreate}
                disabled={savingNew || !newCustomer.name.trim()}
              >
                {savingNew ? 'Saving…' : 'Create & select'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="p-2 border-b border-slate-100 dark:border-slate-700">
              <Input
                autoFocus
                placeholder="Search customers…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {loading && (
                <p className="text-sm text-slate-400 px-3 py-4 text-center">
                  Loading…
                </p>
              )}
              {!loading && customers.length === 0 && (
                <p className="text-sm text-slate-400 px-3 py-4 text-center">
                  No customers yet
                </p>
              )}
              {!loading &&
                customers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onChange(c.id);
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Check
                      className={cn(
                        'w-4 h-4 text-emerald-600',
                        value === c.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {c.name}
                      </p>
                      {c.email && (
                        <p className="text-xs text-slate-400 truncate">
                          {c.email}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 border-t border-slate-100 dark:border-slate-700"
                >
                  Clear selection
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setCreatingNew(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-t border-slate-100 dark:border-slate-700"
            >
              <Plus className="w-4 h-4" />
              Create new customer
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
