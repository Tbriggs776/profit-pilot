import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Shield, LogOut, ArrowLeft, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/AuthContext';
import { useOrg, contractorTypeLabel } from '@/lib/OrgContext';
import { analytics } from '@/api/analytics';
import OrgOnboarding from '@/components/OrgOnboarding';
import OrgSettings from '@/components/OrgSettings';
import TeamMembers from '@/components/TeamMembers';

export default function Profile() {
  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    isLoadingAuth,
    logout,
    signInWithEmail,
    signUpWithEmail,
    navigateToLogin,
  } = useAuth();
  const { orgs, activeOrg, switchOrg, loading: orgsLoading } = useOrg();

  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  useEffect(() => {
    analytics.track({ eventName: 'page_view', properties: { page: 'Profile' } });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, fullName);
        setInfo('Check your email to confirm your account.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const renderSignInForm = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="pt-8 max-w-lg mx-auto"
    >
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 mb-6">
          <User className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {mode === 'signin' ? 'Sign in to your account' : 'Create an account'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          {mode === 'signin' ? 'Welcome back' : 'Get started with Profit Pilot'}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-white dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
      >
        {mode === 'signup' && (
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
        )}
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
        {info && (
          <div className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-lg">
            {info}
          </div>
        )}

        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          size="lg"
        >
          {submitting ? '…' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
        </Button>

        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-xs text-slate-400">or</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={navigateToLogin}
        >
          Continue with Google
        </Button>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 pt-2">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
              setInfo(null);
            }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </form>
    </motion.div>
  );

  const renderAccountTab = () => (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg shadow-emerald-500/30">
          {user?.full_name?.charAt(0)?.toUpperCase() ||
            user?.email?.charAt(0)?.toUpperCase() ||
            '?'}
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {user?.full_name}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {user?.email}
        </p>
        {user?.role === 'admin' && (
          <Badge className="mt-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            App Admin
          </Badge>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
        <div className="flex items-center gap-3 px-5 py-4">
          <User className="w-5 h-5 text-slate-400 shrink-0" />
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Full Name</p>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {user?.full_name || '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-4">
          <Mail className="w-5 h-5 text-slate-400 shrink-0" />
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Email</p>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {user?.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-4">
          <Shield className="w-5 h-5 text-slate-400 shrink-0" />
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Active Business</p>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {activeOrg
                ? `${activeOrg.business_name} · ${contractorTypeLabel(activeOrg.contractor_type)}`
                : 'None'}
            </p>
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
        onClick={() => logout(true)}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950/30">
      <nav
        className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors select-none"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>

          {isAuthenticated && orgs.length > 1 && activeOrg && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <Select value={activeOrg.id} onValueChange={switchOrg}>
                <SelectTrigger className="h-9 min-w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.business_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {isLoadingAuth || (isAuthenticated && orgsLoading) ? (
          <div className="flex justify-center pt-20">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !isAuthenticated ? (
          renderSignInForm()
        ) : !activeOrg ? (
          <OrgOnboarding />
        ) : (
          <Tabs defaultValue="business" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="business">Business</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>

            <TabsContent value="business" className="space-y-6">
              <OrgSettings />
            </TabsContent>

            <TabsContent value="team">
              <TeamMembers />
            </TabsContent>

            <TabsContent value="account">{renderAccountTab()}</TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
