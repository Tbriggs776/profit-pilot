import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

export function MobileSelect({ value, onValueChange, children, placeholder, label }) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [options, setOptions] = useState([]);
  const [displayValue, setDisplayValue] = useState(placeholder);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Extract options from children
  useEffect(() => {
    const extractedOptions = [];
    React.Children.forEach(children, (child) => {
      if (child?.props?.value) {
        extractedOptions.push({
          value: child.props.value,
          label: child.props.children,
        });
      }
    });
    setOptions(extractedOptions);
    
    // Update display value
    const selected = extractedOptions.find(opt => opt.value === value);
    setDisplayValue(selected ? selected.label : placeholder);
  }, [children, value, placeholder]);

  const handleSelect = (selectedValue) => {
    onValueChange(selectedValue);
    setOpen(false);
  };

  if (!isMobile) {
    // Return original Select component on desktop
    return React.cloneElement(
      React.Children.only(children),
      { value, onValueChange }
    );
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full justify-between h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
      >
        <span className={cn(!value && "text-muted-foreground")}>{displayValue}</span>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50">
          <path d="M4.93179 5.43179C4.75605 5.60753 4.75605 5.89245 4.93179 6.06819C5.10753 6.24392 5.39245 6.24392 5.56819 6.06819L7.49999 4.13638L9.43179 6.06819C9.60753 6.24392 9.89245 6.24392 10.0682 6.06819C10.2439 5.89245 10.2439 5.60753 10.0682 5.43179L7.81819 3.18179C7.73379 3.0974 7.61933 3.04999 7.49999 3.04999C7.38064 3.04999 7.26618 3.0974 7.18179 3.18179L4.93179 5.43179ZM10.0682 9.56819C10.2439 9.39245 10.2439 9.10753 10.0682 8.93179C9.89245 8.75606 9.60753 8.75606 9.43179 8.93179L7.49999 10.8636L5.56819 8.93179C5.39245 8.75606 5.10753 8.75606 4.93179 8.93179C4.75605 9.10753 4.75605 9.39245 4.93179 9.56819L7.18179 11.8182C7.35753 11.9939 7.64245 11.9939 7.81819 11.8182L10.0682 9.56819Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
        </svg>
      </Button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DrawerHeader className="border-b border-slate-200 dark:border-slate-700">
            <DrawerTitle className="text-slate-900 dark:text-white">{label || 'Select an option'}</DrawerTitle>
          </DrawerHeader>
          <div className="max-h-[60vh] overflow-auto">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "w-full flex items-center justify-between px-6 py-4 text-left transition-colors select-none",
                  "hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700",
                  value === option.value && "bg-emerald-50 dark:bg-emerald-950/30"
                )}
              >
                <span className="text-slate-900 dark:text-white">{option.label}</span>
                {value === option.value && (
                  <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                )}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}