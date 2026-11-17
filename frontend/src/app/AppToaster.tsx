import { Toaster } from '@/components/ui/sonner';
import { useTheme } from '@/app/theme/theme-context';

export function AppToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} richColors closeButton position="top-right" />;
}
