import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calculator, BarChart2, UserCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// Store scroll positions for each page
const scrollPositions = {};

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const mainRef = useRef(null);
  
  // Restore scroll position when navigating back to a page
  useEffect(() => {
    if (mainRef.current && scrollPositions[currentPageName] !== undefined) {
      mainRef.current.scrollTop = scrollPositions[currentPageName];
    }
  }, [currentPageName]);
  
  // Save scroll position when leaving a page
  useEffect(() => {
    const handleScroll = () => {
      if (mainRef.current) {
        scrollPositions[currentPageName] = mainRef.current.scrollTop;
      }
    };
    
    const mainEl = mainRef.current;
    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll);
      return () => mainEl.removeEventListener('scroll', handleScroll);
    }
  }, [currentPageName]);
  
  const pageIndex = currentPageName === 'Home' ? 0 : currentPageName === 'PriceCalculator' ? 1 : currentPageName === 'Analytics' ? 2 : 3;
  
  return (
    <div className="flex flex-col min-h-screen overflow-hidden">
      <main ref={mainRef} className="flex-1 pb-20 overflow-auto">
        <AnimatePresence mode="wait" initial={false} custom={pageIndex}>
          <motion.div
            key={location.pathname}
            custom={pageIndex}
            initial={{ x: pageIndex > 0 ? '100%' : '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: pageIndex > 0 ? '-100%' : '100%', opacity: 0 }}
            transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 safe-area-bottom z-50">
        <div className="flex justify-around items-center h-16 max-w-screen-xl mx-auto px-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <Link 
            to="/" 
            className={`flex flex-col items-center justify-center flex-1 select-none ${
              currentPageName === 'Home' 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Home className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Home</span>
          </Link>
          
          <Link 
            to="/PriceCalculator" 
            className={`flex flex-col items-center justify-center flex-1 select-none ${
              currentPageName === 'PriceCalculator' 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Calculator className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Calculator</span>
          </Link>

          <Link 
            to="/Analytics" 
            className={`flex flex-col items-center justify-center flex-1 select-none ${
              currentPageName === 'Analytics' 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <BarChart2 className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Analytics</span>
          </Link>

          <Link 
            to="/Profile" 
            className={`flex flex-col items-center justify-center flex-1 select-none ${
              currentPageName === 'Profile' 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <UserCircle className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}