import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/atoms/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
import { setAuthToken } from '@/api/client';
import '@/lib/firebase';
import './index.css';
import App from './App.tsx';

setAuthToken(localStorage.getItem('token'));

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="kite-ui-theme">
          <TooltipProvider delayDuration={200} skipDelayDuration={0}>
            <App />
            <Toaster richColors closeButton position="top-center" />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
