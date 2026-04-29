import * as React from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export function SelectMobile({ value, onValueChange, children, placeholder, className, disabled }) {
  const [open, setOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Extract options from SelectItem children
  const options = React.useMemo(() => {
    const opts = [];
    React.Children.forEach(children, (child) => {
      if (child?.type === SelectItem || child?.props?.value) {
        opts.push({
          value: child.props.value,
          label: child.props.children,
        });
      }
    });
    return opts;
  }, [children]);

  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption?.label || placeholder;

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={cn("w-full justify-between h-11", className)}
      >
        <span className={cn(!value && "text-muted-foreground")}>{displayValue}</span>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="h-4 w-4 opacity-50">
          <path d="M4.93179 5.43179C4.75605 5.60753 4.75605 5.89245 4.93179 6.06819C5.10753 6.24392 5.39245 6.24392 5.56819 6.06819L7.49999 4.13638L9.43179 6.06819C9.60753 6.24392 9.89245 6.24392 10.0682 6.06819C10.2439 5.89245 10.2439 5.60753 10.0682 5.43179L7.81819 3.18179C7.73379 3.0974 7.61933 3.04999 7.49999 3.04999C7.38064 3.04999 7.26618 3.0974 7.18179 3.18179L4.93179 5.43179ZM10.0682 9.56819C10.2439 9.39245 10.2439 9.10753 10.0682 8.93179C9.89245 8.75606 9.60753 8.75606 9.43179 8.93179L7.49999 10.8636L5.56819 8.93179C5.39245 8.75606 5.10753 8.75606 4.93179 8.93179C4.75605 9.10753 4.75605 9.39245 4.93179 9.56819L7.18179 11.8182C7.35753 11.9939 7.64245 11.9939 7.81819 11.8182L10.0682 9.56819Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
        </svg>
      </Button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DrawerHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
            <DrawerTitle className="text-slate-900 dark:text-white">{placeholder || 'Select'}</DrawerTitle>
          </DrawerHeader>
          <div className="max-h-[60vh] overflow-auto pb-4">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-6 py-4 text-left transition-colors select-none border-b border-slate-100 dark:border-slate-800 last:border-0",
                  "active:bg-slate-100 dark:active:bg-slate-800",
                  value === option.value && "bg-emerald-50 dark:bg-emerald-950/30"
                )}
              >
                <span className={cn(
                  "text-base",
                  value === option.value 
                    ? "font-medium text-emerald-600 dark:text-emerald-400" 
                    : "text-slate-900 dark:text-slate-100"
                )}>{option.label}</span>
                {value === option.value && (
                  <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400 select-none" />
                )}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}