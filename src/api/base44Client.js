import { supabase } from './supabaseClient';
import { analytics } from './analytics';

const invokeFunction = async (name, body = {}) => {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  return { data };
};

const me = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) {
    const err = new Error('Not authenticated');
    err.status = 401;
    throw err;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email,
    full_name:
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      '',
    role: profile?.role || 'user',
  };
};

const redirectToLogin = async (returnTo = window.location.href) => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: returnTo },
  });
  if (error) {
    window.location.href = '/login';
  }
};

const logout = async (redirectTo) => {
  await supabase.auth.signOut();
  if (redirectTo) {
    window.location.href = redirectTo;
  }
};

const appLogs = {
  logUserInApp: async (pageName) => {
    return analytics.track({
      eventName: 'user_in_app',
      properties: { page: pageName },
    });
  },
};

export const base44 = {
  auth: { me, redirectToLogin, logout },
  analytics,
  functions: { invoke: invokeFunction },
  appLogs,
};
