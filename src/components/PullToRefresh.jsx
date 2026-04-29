import React, { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef(null);
  
  const threshold = 80;
  const maxPull = 120;

  const handleTouchStart = (e) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;
    
    if (distance > 0 && containerRef.current.scrollTop === 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance * 0.5, maxPull));
    }
  };

  const handleTouchEnd = async () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      }
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 500);
    } else {
      setPullDistance(0);
    }
  };

  useEffect(() => {
    if (!isDragging && !isRefreshing) {
      setPullDistance(0);
    }
  }, [isDragging, isRefreshing]);

  const progress = Math.min((pullDistance / threshold) * 100, 100);

  return (
    <div 
      ref={containerRef}
      className="relative h-full overflow-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull Indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-opacity"
        style={{
          height: `${Math.max(pullDistance, isRefreshing ? 60 : 0)}px`,
          opacity: pullDistance > 0 || isRefreshing ? 1 : 0,
        }}
      >
        <div className={`flex flex-col items-center ${isRefreshing ? 'mt-4' : ''}`}>
          <Loader2 
            className={`w-6 h-6 text-emerald-600 dark:text-emerald-400 select-none ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            style={{
              transform: !isRefreshing ? `rotate(${progress * 3.6}deg)` : undefined
            }}
          />
          {!isRefreshing && pullDistance > 0 && (
            <span className="text-xs text-slate-600 dark:text-slate-400 mt-2 select-none">
              {pullDistance >= threshold ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div 
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  );
}