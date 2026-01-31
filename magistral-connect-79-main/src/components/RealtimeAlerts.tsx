import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeAlerts } from '@/hooks/use-realtime-alerts';

/** Conecta ao SSE e exibe toasts em tempo real (Flash Deal, etc.) para cooperados. */
export function RealtimeAlerts() {
  // Usar try-catch para lidar com problemas de hot-reload do Vite
  let authContext;
  try {
    authContext = useAuth();
  } catch (error) {
    // Se o contexto não estiver disponível, simplesmente não renderizar nada
    // Isso geralmente acontece durante hot-reload do Vite
    console.warn('AuthContext não disponível temporariamente (provavelmente hot-reload), RealtimeAlerts desabilitado', error);
    return null;
  }

  const { user } = authContext;
  useRealtimeAlerts(user?.role);
  return null;
}
