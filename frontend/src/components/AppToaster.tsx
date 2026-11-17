import { Toaster } from '@/components/ui/sonner';
import { useTheme } from '@/lib/theme-context';

/** Toasts follow the app theme and can always be dismissed with their close button. */
export function AppToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} richColors closeButton position="top-right" />;
}
