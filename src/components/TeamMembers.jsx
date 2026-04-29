import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrg } from '@/lib/OrgContext';
import { useAuth } from '@/lib/AuthContext';

export default function TeamMembers() {
  const { activeOrg, canEdit, activeRole } = useOrg();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!activeOrg) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('org_members')
      .select('user_id, role, created_at')
      .eq('org_id', activeOrg.id);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const userIds = (data || []).map((m) => m.user_id);
    let profiles = [];
    if (userIds.length) {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      profiles = profileRows || [];
    }

    const merged = (data || []).map((m) => ({
      ...m,
      profile: profiles.find((p) => p.id === m.user_id),
    }));
    setMembers(merged);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [activeOrg?.id]);

  const removeMember = async (userId) => {
    if (!confirm('Remove this member from the business?')) return;
    const { error } = await supabase
      .from('org_members')
      .delete()
      .eq('org_id', activeOrg.id)
      .eq('user_id', userId);
    if (error) return alert(error.message);
    load();
  };

  if (!activeOrg) return null;

  return (
    <section className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-600" />
          Team ({members.length})
        </h3>
        {canEdit && (
          <Button variant="outline" size="sm" disabled title="Coming soon">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {members.map((m) => {
            const isSelf = m.user_id === user?.id;
            return (
              <li
                key={m.user_id}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center text-sm font-semibold">
                    {(m.profile?.full_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {m.profile?.full_name || 'Unknown'}
                      {isSelf && (
                        <span className="text-slate-400 font-normal text-xs ml-2">
                          (you)
                        </span>
                      )}
                    </p>
                    <Badge
                      variant="secondary"
                      className="mt-0.5 capitalize text-xs"
                    >
                      {m.role}
                    </Badge>
                  </div>
                </div>
                {canEdit && !isSelf && m.role !== 'owner' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMember(m.user_id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-slate-400 mt-4">
        Invite-by-email is coming in a future update. For now, share your
        Supabase signup link and add them here once they create an account.
      </p>
    </section>
  );
}
