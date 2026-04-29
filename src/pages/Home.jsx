import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calculator,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  HardHat,
  Layers,
  Link2,
  Receipt,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/AuthContext';
import { useOrg } from '@/lib/OrgContext';
import { analytics } from '@/api/analytics';
import PullToRefresh from '../components/PullToRefresh';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5, ease: 'easeOut' },
};

const stagger = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5, delay, ease: 'easeOut' },
});

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { activeOrg } = useOrg();

  useEffect(() => {
    analytics.track({ eventName: 'page_view', properties: { page: 'Home' } });
  }, []);

  const handleRefresh = async () => {
    await new Promise((r) => setTimeout(r, 500));
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 selection:bg-emerald-200/50 dark:selection:bg-emerald-500/30">
        {/* Top utility nav */}
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-100 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/30">
                <Calculator className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold tracking-tight">Profit Pilot</span>
              <Badge
                variant="secondary"
                className="ml-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px] font-semibold uppercase tracking-wider"
              >
                Beta · Free
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <Link to={activeOrg ? '/Estimates' : '/Profile'}>
                  <Button
                    size="sm"
                    className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white"
                  >
                    {activeOrg ? 'Go to dashboard' : 'Finish setup'}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/Profile" className="hidden sm:block">
                    <Button size="sm" variant="ghost">
                      Sign in
                    </Button>
                  </Link>
                  <Link to="/Profile">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Get started — free
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        <Hero isAuthenticated={isAuthenticated} hasOrg={!!activeOrg} />
        <SocialProofBand />
        <ProblemSection />
        <FeaturesGrid />
        <HowItWorks />
        <ResultsSection />
        <PricingSection />
        <FAQSection />
        <FinalCTA />
        <Footer />
      </div>
    </PullToRefresh>
  );
}

// ============================================================================
function Hero({ isAuthenticated, hasOrg }) {
  return (
    <section className="relative overflow-hidden">
      {/* background glow */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[700px] bg-gradient-radial from-emerald-200/40 dark:from-emerald-500/10 to-transparent blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-24">
        <motion.div {...fadeUp} className="max-w-3xl mx-auto text-center">
          <Badge
            variant="secondary"
            className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 mb-5"
          >
            <Sparkles className="w-3 h-3 mr-1.5" />
            For contractors and sub-contractors
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
            Price every job{' '}
            <span className="bg-gradient-to-r from-emerald-500 to-emerald-700 dark:from-emerald-400 dark:to-emerald-500 bg-clip-text text-transparent">
              to profit.
            </span>
          </h1>
          <p className="mt-5 sm:mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
            Itemize costs, hit your margin, and send branded estimates clients
            actually sign — in minutes, not hours.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to={isAuthenticated && hasOrg ? '/Estimates' : '/Profile'}>
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-base h-12 px-6 shadow-lg shadow-emerald-500/30"
              >
                {isAuthenticated && hasOrg ? 'Open dashboard' : 'Start free — no card'}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
            <Link to="/PriceCalculator">
              <Button
                size="lg"
                variant="outline"
                className="text-base h-12 px-6 border-slate-300 dark:border-slate-700"
              >
                Try the calculator
                <ArrowUpRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            <Check className="w-4 h-4 inline mr-1 text-emerald-600" />
            Free during beta · No credit card · Works on any device
          </p>
        </motion.div>

        {/* Hero visual: stylized estimate preview */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
          className="mt-14 sm:mt-20 max-w-5xl mx-auto"
        >
          <HeroPreview />
        </motion.div>
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative">
      {/* Estimate card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-slate-900/20 dark:shadow-black/40 border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
              <HardHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">Acme HVAC LLC</p>
              <p className="text-[11px] text-slate-400">License #C-123456</p>
            </div>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-0">
            PROPOSAL
          </Badge>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-6">
            <div>
              <p className="text-xs text-emerald-600 font-bold tracking-wider uppercase mb-1">
                Prepared for Smith Residence
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Furnace Replacement
              </h3>
            </div>
            <p className="text-xs text-slate-400">EST #A4F8B2C1</p>
          </div>

          <div className="space-y-2 mb-6">
            {[
              ['Equipment', '80k BTU 95% AFUE furnace', '$1,800.00'],
              ['Equipment', 'Smart thermostat', '$220.00'],
              ['Material', 'Vent pipe + fittings', '$95.00'],
              ['Labor', 'Removal + install (6 hr)', '$660.00'],
            ].map(([cat, desc, price], i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">
                    {cat}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-200 truncate">
                    {desc}
                  </p>
                </div>
                <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 text-sm shrink-0 ml-4">
                  {price}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-4 flex items-center justify-between text-white">
            <div>
              <p className="text-[11px] font-bold tracking-wider uppercase opacity-90">
                Total
              </p>
              <p className="text-xs opacity-80">Includes 30% margin</p>
            </div>
            <p className="text-2xl sm:text-3xl font-bold font-mono">
              $4,287.50
            </p>
          </div>
        </div>
      </div>

      {/* Floating margin badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, x: -20 }}
        whileInView={{ opacity: 1, scale: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="hidden sm:flex absolute -top-4 -left-4 lg:-left-12 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 px-4 py-3 items-center gap-3"
      >
        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30">
          <Target className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Margin locked
          </p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            $1,286 profit
          </p>
        </div>
      </motion.div>

      {/* Floating share badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, x: 20 }}
        whileInView={{ opacity: 1, scale: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="hidden sm:flex absolute -bottom-4 -right-4 lg:-right-12 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 px-4 py-3 items-center gap-3"
      >
        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
          <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Public link
          </p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            Shared with client
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
function SocialProofBand() {
  const stats = [
    { value: '12', label: 'Built-in trade templates' },
    { value: '<60s', label: 'From blank to branded PDF' },
    { value: '6', label: 'Cost categories tracked' },
    { value: '$600', label: '1099 threshold flagging' },
  ];
  return (
    <section className="border-y border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            {...stagger(i * 0.05)}
            className="text-center"
          >
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {s.value}
            </p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {s.label}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
function ProblemSection() {
  const pains = [
    {
      icon: TrendingDown,
      color: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      title: 'Quoted too low, ate the margin',
      body: "Commission and warranty depend on selling price — get the math wrong once and you've worked for free.",
    },
    {
      icon: Clock,
      color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      title: 'Three hours to write each proposal',
      body: 'Cobbling spreadsheets and Word docs every time the phone rings. Slow quotes lose jobs to faster bidders.',
    },
    {
      icon: Receipt,
      color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      title: "Lost track of what subs you've paid",
      body: "January rolls around and you're hunting through bank statements to put 1099s together. Painful.",
    },
  ];

  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div {...fadeUp} className="max-w-2xl mx-auto text-center mb-14">
          <p className="text-sm font-bold tracking-wider uppercase text-emerald-600 mb-3">
            The problem
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Spreadsheets are killing your margin.
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            Every contractor we talk to has lived through one of these.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {pains.map((p, i) => (
            <motion.div
              key={p.title}
              {...stagger(i * 0.1)}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <div className={`inline-flex p-2.5 rounded-xl ${p.color}`}>
                <p.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold mt-4 text-lg">{p.title}</h3>
              <p className="text-slate-600 dark:text-slate-300 mt-2 text-sm leading-relaxed">
                {p.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
function FeaturesGrid() {
  const features = [
    {
      icon: Calculator,
      iconColor:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      title: 'Iterative pricing engine',
      body: "Commission, warranty, and finance fees all depend on the selling price. We solve the loop so you don't have to.",
    },
    {
      icon: Layers,
      iconColor:
        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
      title: 'Itemized line items',
      body: 'Per-line qty × unit price across equipment, material, labor, subs, and pass-through costs. Smart taxable defaults per category.',
    },
    {
      icon: FileText,
      iconColor:
        'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
      title: 'Branded PDF proposals',
      body: 'Your logo, license #, and contact info on every page. Signature line for in-person closes. Ready to print or email.',
    },
    {
      icon: Link2,
      iconColor:
        'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
      title: 'Public share links',
      body: 'Send clients a link instead of a 3MB email attachment. Toggle off anytime to revoke access.',
    },
    {
      icon: Sparkles,
      iconColor:
        'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      title: 'Trade-specific templates',
      body: 'HVAC, plumbing, electrical, roofing, painting — start from realistic line items. Save your own to build a personal library.',
    },
    {
      icon: HardHat,
      iconColor:
        'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
      title: 'Sub tracking + 1099 prep',
      body: 'Mark subs paid as you go. Year-end CSV flags everyone over the $600 threshold for 1099-NEC. Hand it to your accountant.',
    },
    {
      icon: Users,
      iconColor:
        'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
      title: 'Team-ready',
      body: 'Owner / admin / member roles. Multiple businesses per user. Customer and estimate data scoped per business with row-level security.',
    },
    {
      icon: ShieldCheck,
      iconColor:
        'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
      title: 'Your data, locked down',
      body: 'Postgres + Supabase row-level security under the hood. Only your team sees your customers, estimates, and pricing.',
    },
    {
      icon: Zap,
      iconColor:
        'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
      title: 'Mobile-first',
      body: 'Built for jobsite phones, not just desks. Pull-to-refresh, safe-area aware, fast on any connection.',
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-slate-50/60 dark:bg-slate-800/30 border-y border-slate-100 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div {...fadeUp} className="max-w-2xl mx-auto text-center mb-14">
          <p className="text-sm font-bold tracking-wider uppercase text-emerald-600 mb-3">
            Everything in one place
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            From quote to cash, without the spreadsheet.
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              {...stagger(i * 0.04)}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
            >
              <div className={`inline-flex p-2.5 rounded-xl ${f.iconColor}`}>
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold mt-4 text-base">{f.title}</h3>
              <p className="text-slate-600 dark:text-slate-300 mt-1.5 text-sm leading-relaxed">
                {f.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
function HowItWorks() {
  const steps = [
    {
      step: '01',
      title: 'Set up your business',
      body: 'Logo, license number, default tax rate, target margin. The data you fill in once flows into every estimate forever.',
      icon: HardHat,
    },
    {
      step: '02',
      title: 'Build the estimate',
      body: 'Start from a trade template or blank. Itemize costs, attach a customer, set status. The calculator hits your margin automatically.',
      icon: Calculator,
    },
    {
      step: '03',
      title: 'Send & track',
      body: 'Branded PDF, public link, or both. Update status as you go (sent → won → paid). Year-end you have the 1099 numbers ready.',
      icon: TrendingUp,
    },
  ];

  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div {...fadeUp} className="max-w-2xl mx-auto text-center mb-14">
          <p className="text-sm font-bold tracking-wider uppercase text-emerald-600 mb-3">
            How it works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            From blank screen to branded proposal in 60 seconds.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 relative">
          {/* connecting line on desktop */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />

          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              {...stagger(i * 0.1)}
              className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/30">
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-3xl font-black tracking-tighter text-slate-200 dark:text-slate-700">
                  {s.step}
                </span>
              </div>
              <h3 className="font-bold text-lg">{s.title}</h3>
              <p className="text-slate-600 dark:text-slate-300 mt-2 text-sm leading-relaxed">
                {s.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
function ResultsSection() {
  const benefits = [
    'Win bids faster — clients open a link, not a 4MB email attachment',
    'Stop margin leakage — iterative math accounts for commission and warranty correctly',
    'Send proposals from the truck — every feature works on your phone',
    'Year-end 1099 prep takes minutes, not days',
    'Templates per trade — HVAC, plumbing, electrical, roofing, painting',
    "Your team, your rates, your customers — invisible to anyone outside your business",
  ];
  return (
    <section className="py-20 sm:py-28 bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
        <motion.div {...fadeUp}>
          <p className="text-sm font-bold tracking-wider uppercase text-emerald-400 mb-3">
            Why contractors love it
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-5">
            Charge what the job is worth.{' '}
            <span className="text-emerald-400">Every time.</span>
          </h2>
          <p className="text-lg text-slate-300 leading-relaxed mb-8">
            Built by people who've seen exactly how a contractor's day actually
            goes — and how easy it is for $200 of margin to slip through the
            cracks of a paper estimate.
          </p>
          <Link to="/Profile">
            <Button
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/30"
            >
              Start free
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </motion.div>

        <div className="space-y-3">
          {benefits.map((b, i) => (
            <motion.div
              key={b}
              {...stagger(i * 0.06)}
              className="flex items-start gap-3 bg-slate-800/60 rounded-xl p-4 border border-slate-700"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-sm sm:text-base text-slate-200">{b}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
function PricingSection() {
  const features = [
    'Unlimited estimates',
    'Unlimited customers',
    'Unlimited subcontractors',
    'Branded PDF proposals',
    'Public share links',
    'Trade templates (built-in + custom)',
    '1099 payout report + CSV export',
    'Team accounts (multiple roles)',
    'Mobile + desktop',
  ];
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-3xl mx-auto px-4">
        <motion.div {...fadeUp} className="text-center mb-12">
          <p className="text-sm font-bold tracking-wider uppercase text-emerald-600 mb-3">
            Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Free during beta.{' '}
            <span className="text-slate-400">No catch.</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            We're a small team learning what contractors need. While we
            build, the whole product is free for everyone.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp}
          className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-emerald-500 shadow-2xl shadow-emerald-500/10 p-8 sm:p-10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-bl-2xl">
            Beta
          </div>

          <div className="flex items-baseline gap-3 mb-2">
            <p className="text-5xl sm:text-6xl font-black tracking-tighter">
              $0
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              / month, all features
            </p>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            No credit card required. No usage limits. Cancel anytime — though
            there's nothing to cancel.
          </p>

          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 mb-8">
            {features.map((f) => (
              <div key={f} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 mt-1 shrink-0" />
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  {f}
                </span>
              </div>
            ))}
          </div>

          <Link to="/Profile">
            <Button
              size="lg"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-base h-12 shadow-lg shadow-emerald-500/30"
            >
              Get started
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
          <p className="text-center text-xs text-slate-400 mt-4">
            We'll grandfather beta users into a generous plan when paid tiers
            ship.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
function FAQSection() {
  const items = [
    {
      q: 'Do I need a credit card to start?',
      a: 'No. Sign up with email or Google, fill in your business name, and you can build estimates immediately.',
    },
    {
      q: 'Is the calculator accurate for finance fees and commissions?',
      a: 'Yes. Commission and warranty rates compound off the selling price, which itself depends on those rates. Profit Pilot iterates the math until it converges so the final selling price hits your target margin exactly.',
    },
    {
      q: 'Can my crew use it too?',
      a: 'Yes — every business supports multiple team members with owner / admin / member roles. Estimates, customers, and subs are scoped per business so contractors with multiple companies can keep them separate.',
    },
    {
      q: 'What about my client\'s data — is it private?',
      a: 'Absolutely. Every customer, estimate, and sub record is locked to your business via Postgres row-level security. Public estimate links are the only thing visible outside your team, and they\'re behind random tokens you can revoke anytime.',
    },
    {
      q: 'How do I get my data out if I leave?',
      a: 'CSV export is available for the 1099 payout report today. Full data export is on the roadmap. Your data is yours, period.',
    },
    {
      q: 'When will it cost money?',
      a: "Eventually. We'll add paid tiers when we add features that genuinely warrant them — likely things like e-signature, deposit collection via Stripe, or QuickBooks sync. Beta users will keep generous limits forever.",
    },
  ];
  return (
    <section className="py-20 sm:py-28 bg-slate-50/60 dark:bg-slate-800/30 border-y border-slate-100 dark:border-slate-800">
      <div className="max-w-3xl mx-auto px-4">
        <motion.div {...fadeUp} className="text-center mb-12">
          <p className="text-sm font-bold tracking-wider uppercase text-emerald-600 mb-3">
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Questions, answered.
          </h2>
        </motion.div>

        <div className="space-y-3">
          {items.map((item, i) => (
            <motion.details
              key={item.q}
              {...stagger(i * 0.04)}
              className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <summary className="flex items-center justify-between p-5 cursor-pointer list-none select-none">
                <span className="font-semibold text-slate-900 dark:text-white">
                  {item.q}
                </span>
                <ChevronRight className="w-5 h-5 text-slate-400 group-open:rotate-90 transition-transform shrink-0 ml-3" />
              </summary>
              <div className="px-5 pb-5 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                {item.a}
              </div>
            </motion.details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
function FinalCTA() {
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          {...fadeUp}
          className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-10 sm:p-16 text-center overflow-hidden"
        >
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <Sparkles className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
              Stop guessing.{' '}
              <span className="text-emerald-400">Start pricing.</span>
            </h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8">
              The next estimate you write could be the one that finally pays
              you what your work is worth.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/Profile">
                <Button
                  size="lg"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/40 text-base h-12 px-8"
                >
                  Get started — free
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
              <Link to="/PriceCalculator">
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-white hover:bg-white/10 text-base h-12 px-8"
                >
                  Try the calculator first
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
function Footer() {
  return (
    <footer className="border-t border-slate-100 dark:border-slate-800 py-10 mb-8">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
            <Calculator className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-slate-900 dark:text-white">
            Profit Pilot
          </span>
          <span>· Built for contractors</span>
        </div>
        <div className="flex items-center gap-5">
          <Link
            to="/PriceCalculator"
            className="hover:text-emerald-600 transition-colors"
          >
            Calculator
          </Link>
          <Link
            to="/Estimates"
            className="hover:text-emerald-600 transition-colors"
          >
            Estimates
          </Link>
          <Link
            to="/Profile"
            className="hover:text-emerald-600 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}
