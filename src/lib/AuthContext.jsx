import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

const SAFETY_TIMEOUT_MS = 6000;

const baseUserShape = (authUser) =>
  authUser
    ? {
        id: authUser.id,
        email: authUser.email,
        full_name:
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          authUser.email?.split('@')[0] ||
          '',
        role: 'user',
      }
    : null;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState({
    public_settings: { allow_anonymous: true },
  });

  const mountedRef = useRef(true);
  const profileLoadedForRef = useRef(null);

  // Apply a session: set tentative user from JWT data immediately, then
  // enrich with the profiles row in the background. This is the critical
  // pattern — never await DB queries while inside onAuthStateChange,
  // because that can deadlock with the Supabase auth lock during refresh.
  const applySession = useCallback((session) => {
    if (!mountedRef.current) return;
    const authUser = session?.user;
    if (authUser) {
      setUser(baseUserShape(authUser));
      setIsAuthenticated(true);

      // Enrich profile out-of-band (only once per user id)
      if (profileLoadedForRef.current !== authUser.id) {
        profileLoadedForRef.current = authUser.id;
        supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', authUser.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            if (!mountedRef.current || !profile) return;
            setUser((u) =>
              u && u.id === authUser.id
                ? {
                    ...u,
                    full_name: profile.full_name || u.full_name,
                    role: profile.role || 'user',
                  }
                : u
            );
          })
          .catch(() => {});
      }
    } else {
      profileLoadedForRef.current = null;
      setUser(null);
      setIsAuthenticated(false);
    }
    setIsLoadingAuth(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Hard safety net: if neither getSession nor onAuthStateChange resolves
    // within SAFETY_TIMEOUT_MS for any reason (ex: Supabase client hung on
    // a refresh), drop the spinner so the app still renders.
    const safetyTimer = setTimeout(() => {
      if (mountedRef.current) {
        console.warn(
          '[auth] safety timeout — forcing isLoadingAuth=false after',
          SAFETY_TIMEOUT_MS,
          'ms'
        );
        setIsLoadingAuth(false);
      }
    }, SAFETY_TIMEOUT_MS);

    // Subscribe FIRST so we don't miss INITIAL_SESSION
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // CRITICAL: defer to a microtask so we don't hold the auth lock
      // while running React state updates / DB queries
      setTimeout(() => {
        if (!mountedRef.current) return;
        applySession(session);
      }, 0);
    });

    // Read current session from local storage (no network call)
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mountedRef.current) return;
        applySession(session);
      })
      .catch((err) => {
        console.error('[auth] getSession failed:', err);
        if (mountedRef.current) {
          setAuthError({ type: 'unknown', message: err.message });
          setIsLoadingAuth(false);
        }
      });

    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimer);
      subscription?.unsubscribe();
    };
  }, [applySession]);

  const refreshUser = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    profileLoadedForRef.current = null; // force a profile re-fetch
    applySession(session);
  }, [applySession]);

  const logout = async (shouldRedirect = true) => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      window.location.href = '/';
    }
  };

  const navigateToLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      console.error('Login redirect failed:', error);
      setAuthError({ type: 'auth_required', message: error.message });
    }
  };

  const signInWithEmail = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Auth state listener will fire and call applySession
  };

  const signUpWithEmail = async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
  };

  const checkAppState = refreshUser;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        logout,
        navigateToLogin,
        signInWithEmail,
        signUpWithEmail,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
