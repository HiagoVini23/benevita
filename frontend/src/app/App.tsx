import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { createBrowserRouter, createRoutesFromElements, RouterProvider } from 'react-router';
import { appRoutes } from './routes.tsx';
import { AppToaster } from './AppToaster.tsx';
import { ThemeProvider } from '@/app/theme/ThemeProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { createQueryClient } from '@/lib/query-client';

const router = createBrowserRouter(createRoutesFromElements(appRoutes));

export function App() {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <RouterProvider router={router} />
            <AppToaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
