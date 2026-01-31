import { useEffect, useRef } from 'react';
import { createElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';
import { ToastAction } from '@/components/ui/toast';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const authUser = localStorage.getItem('magistral_auth_user');
    if (authUser) {
      const user = JSON.parse(authUser);
      return user?.token ?? null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** SSE para alertas em tempo real (Flash Deal, etc.). Só conecta se cooperado/master. */
export function useRealtimeAlerts(role: string | undefined) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (role !== 'cooperado' && role !== 'master') return;
    const token = getToken();
    if (!token) return;

    const base = getApiBaseUrl();
    const url = `${base}/notifications/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('flash-deal-created', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data ?? '{}') as {
          productName?: string;
          flashDealId?: string;
          link?: string;
        };
        const name = data.productName ?? 'Produto';
        const path = '/estoque-inteligente#flash-deals';
        toast({
          title: 'Novo Flash Deal',
          description: `${name} — oferta por tempo limitado.`,
          action: createElement(
            ToastAction,
            { altText: 'Abrir Flash Deal', onClick: () => navigate(path) },
            'Ver oferta'
          ),
        });
      } catch {
        toast({ title: 'Novo Flash Deal', description: 'Uma nova oferta foi publicada.' });
      }
    });

    es.addEventListener('transparency-news-approved', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data ?? '{}') as { title?: string; link?: string; page?: string };
        const title = data.title ?? 'Nova novidade';
        const path = '/transparencia?tab=news#novidades';
        toast({
          title: 'Nova novidade na Transparência',
          description: title,
          action: createElement(
            ToastAction,
            { altText: 'Abrir novidades da Transparência', onClick: () => navigate(path) },
            'Ver novidade'
          ),
        });
        // Avisar sidebar/contadores para recarregar (mesma aba)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('magistral-news-updated'));
        }
      } catch {
        toast({ title: 'Nova novidade na Transparência', description: 'Uma novidade foi publicada.' });
      }
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [role, toast, navigate]);
}
