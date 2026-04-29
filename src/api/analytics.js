import { supabase } from './supabaseClient';

const SESSION_STORAGE_KEY = 'pp_session_id';

const getOrCreateSessionId = () => {
  if (typeof window === 'undefined') return null;
  let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
};

export const track = async ({ eventName, properties = {} }) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const page = properties?.page ?? null;

    const { error } = await supabase.from('analytics_events').insert({
      event_name: eventName,
      page,
      user_id: user?.id ?? null,
      session_id: getOrCreateSessionId(),
      properties,
    });

    if (error) {
      console.warn('analytics.track failed:', error.message);
    }
  } catch (err) {
    console.warn('analytics.track exception:', err);
  }
};

export const analytics = { track };
