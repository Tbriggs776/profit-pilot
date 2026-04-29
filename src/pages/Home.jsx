import { Link } from 'react-router-dom';
import { Calculator, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import PullToRefresh from "../components/PullToRefresh";
import AccountSettings from "../components/AccountSettings";
import { analytics } from "@/api/analytics";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    analytics.track({ eventName: 'page_view', properties: { page: 'Home' } });
  }, []);

  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950/30 flex items-center justify-center p-6">
        {/* Settings Button */}
        <div className="absolute top-4 right-4" style={{ top: 'calc(env(safe-area-inset-top) + 1rem)' }}>
          <AccountSettings />
        </div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-2xl"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 mb-8 select-none">
          <Calculator className="w-10 h-10 text-white select-none" />
        </div>
        
        <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-4">
          Welcome to Price-Up Calculator
        </h1>
        
        <p className="text-xl text-slate-600 dark:text-slate-300 mb-8">
          Calculate your selling price with precision, including all costs, taxes, commissions, and desired margins.
        </p>
        
        <Link to="/PriceCalculator" onClick={() => analytics.track({ eventName: 'open_calculator_clicked' })}>
          <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-lg px-8">
            Open Calculator
            <ArrowRight className="ml-2 h-5 w-5 select-none" />
          </Button>
        </Link>
      </motion.div>
      </div>
    </PullToRefresh>
  );
}