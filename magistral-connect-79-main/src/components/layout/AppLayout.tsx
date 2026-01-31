import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { RealtimeAlerts } from '@/components/RealtimeAlerts';
import { useAuth } from '@/contexts/AuthContext';
import { RequestsDataProvider } from '@/contexts/RequestsDataContext';
import { Navigate, useLocation } from 'react-router-dom';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  // Usar try-catch para lidar com problemas de hot-reload do Vite
  // Durante hot-reload, o AuthContext pode não estar disponível temporariamente
  let authContext;
  try {
    authContext = useAuth();
  } catch (error) {
    // Se o contexto não estiver disponível, mostrar tela de carregamento
    // Isso geralmente acontece durante hot-reload do Vite quando módulos são recarregados
    console.warn('AuthContext não disponível temporariamente (provavelmente hot-reload), aguardando...', error);
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const { isAuthenticated, isLoading } = authContext;
  const location = useLocation();

  // Aguardar o carregamento inicial antes de redirecionar
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <RequestsDataProvider>
      <SidebarProvider>
        <RealtimeAlerts />
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="flex flex-1 flex-col">
            <header className="flex h-14 items-center gap-4 border-b bg-card px-6">
              <SidebarTrigger className="-ml-2" />
            </header>
            <main key={location.pathname} className="flex-1 overflow-auto p-6">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </RequestsDataProvider>
  );
}
