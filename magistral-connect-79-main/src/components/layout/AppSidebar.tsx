import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  ShoppingBag,
  Package,
  TrendingUp,
  Bell,
  Users,
  User,
  Settings,
  LogOut,
  FlaskConical,
  Eye,
  Vote,
  Gavel,
  Building2,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useUserNotifications } from '@/contexts/NotificationContext';
import { useSubstances } from '@/contexts/SubstanceContext';
import { useRequestsDataContext } from '@/contexts/RequestsDataContext';
import { api } from '@/lib/api';
import { getReadNewsIds } from '@/lib/transparencyNewsRead';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const mainNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, roles: ['master', 'cooperado', 'padrao'] },
  { title: 'Inventário', url: '/laudos', icon: Package, roles: ['master', 'cooperado'] },
  { title: 'Estoque Inteligente', url: '/estoque-inteligente', icon: TrendingUp, roles: ['master', 'cooperado'] },
  { title: 'Mercado', url: '/marketplace', icon: ShoppingCart, roles: ['master', 'cooperado'] },
  { title: 'Fornecedores', url: '/fornecedores', icon: Building2, roles: ['master', 'cooperado'] },
  { title: 'Compras', url: '/lista-compras', icon: ShoppingBag, roles: ['master', 'cooperado'] },
  { title: 'Governança', url: '/transparencia', icon: Eye, roles: ['master', 'cooperado'] },
];

const adminNavItems = [
  { title: 'Solicitações', url: '/solicitacoes', icon: Bell, roles: ['master'] },
  { title: 'Usuários', url: '/usuarios', icon: Users, roles: ['master'] },
  { title: 'Gestão', url: '/gestao', icon: Gavel, roles: ['master'] },
  { title: 'Configurações', url: '/configuracoes', icon: Settings, roles: ['master'] },
];

export function AppSidebar() {
  // Usar try-catch para lidar com problemas de hot-reload do Vite
  // Durante hot-reload, os contextos podem não estar disponíveis temporariamente
  let authContext, substancesContext, notificationsContext;
  
  try {
    authContext = useAuth();
  } catch (error) {
    console.warn('AuthContext não disponível temporariamente (provavelmente hot-reload), aguardando...', error);
    // Retornar sidebar vazia durante hot-reload
    return (
      <Sidebar collapsible="icon" className="border-r-0">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
              <FlaskConical className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2">
          <div className="flex items-center justify-center p-4">
            <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-sidebar-foreground/50 border-r-transparent"></div>
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  try {
    substancesContext = useSubstances();
  } catch (error) {
    console.warn('SubstanceContext não disponível temporariamente (provavelmente hot-reload), usando valores padrão...', error);
    substancesContext = { suggestions: [] };
  }

  try {
    notificationsContext = useUserNotifications(authContext.user?.id || null);
  } catch (error) {
    console.warn('NotificationContext não disponível temporariamente (provavelmente hot-reload), usando valores padrão...', error);
    notificationsContext = { unreadCount: 0 };
  }

  const { user, logout, hasRole } = authContext;
  const { unreadCount } = notificationsContext;
  const [unreadNewsCount, setUnreadNewsCount] = useState(0);
  const [pendingVotingsCount, setPendingVotingsCount] = useState(0);
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { suggestions } = substancesContext;
  const { bankDataRequests, extraUsersRequests, exitRequests, supplierRequests } = useRequestsDataContext();

  useEffect(() => {
    if (!user?.id) {
      setUnreadNewsCount(0);
      setPendingVotingsCount(0);
      return;
    }

    let cancelled = false;
    const compute = async () => {
      try {
        // Novidades
        const newsRes = await api.get<{ news: Array<{ id: string; status?: string; page?: string; createdAt: string }> }>(
          '/transparency/news'
        );
        const approved = (newsRes.news || []).filter((n) => n.status === 'approved' || !n.status);
        const readIds = getReadNewsIds(user.id);
        const unreadNews = approved.filter((n) => !readIds.has(n.id)).length;
        if (!cancelled) setUnreadNewsCount(unreadNews);

        // Votações pendentes (abertas e que o usuário ainda não votou)
        const votingsStored = localStorage.getItem('magistral_votings');
        const votesStored = localStorage.getItem('magistral_votes');
        
        if (votingsStored) {
          const votings = JSON.parse(votingsStored);
          const votes = votesStored ? JSON.parse(votesStored) : [];
          
          const pendingVotings = votings.filter((v: any) => {
            if (v.status !== 'open') return false;
            if (v.deadline && new Date() > new Date(v.deadline)) return false;
            const hasVoted = votes.some((vote: any) => vote.votingId === v.id && vote.userId === user.id);
            return !hasVoted;
          }).length;
          
          if (!cancelled) setPendingVotingsCount(pendingVotings);
        }
      } catch {
        if (!cancelled) {
          setUnreadNewsCount(0);
          setPendingVotingsCount(0);
        }
      }
    };

    compute();
    const iv = setInterval(compute, 60000);

    const onUpdated = () => compute();
    window.addEventListener('magistral-news-updated', onUpdated as any);
    window.addEventListener('magistral-news-read-updated', onUpdated as any);
    window.addEventListener('magistral-votings-updated', onUpdated as any);

    return () => {
      cancelled = true;
      clearInterval(iv);
      window.removeEventListener('magistral-news-updated', onUpdated as any);
      window.removeEventListener('magistral-news-read-updated', onUpdated as any);
      window.removeEventListener('magistral-votings-updated', onUpdated as any);
    };
  }, [user?.id]);

  const governanceBadgeCount = unreadNewsCount + (hasRole(['cooperado']) ? pendingVotingsCount : 0);

  const pendingRequestsCount =
    suggestions.filter((s) => s.status === 'pending' && new Date(s.expiresAt) > new Date()).length +
    supplierRequests.filter((r) => r.status === 'pending').length +
    bankDataRequests.filter((r) => !r.status || r.status === 'pending').length +
    extraUsersRequests.filter((r) => r.status === 'pending').length +
    exitRequests.filter((r) => r.status === 'pending').length;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'master':
        return 'Admin';
      case 'cooperado':
        return 'Cooperado';
      default:
        return 'Padrão';
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
            <FlaskConical className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground">Cooperativa</span>
              <span className="text-xs text-sidebar-foreground/70">Magistral</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-0">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0">
              {mainNavItems
                .filter((item) => hasRole(item.roles as any))
                .map((item) => {
                  const showTransparencyBadge = item.title === 'Governança' && governanceBadgeCount > 0;
                  const showNotificationBadge = item.title === 'Notificações' && unreadCount > 0;
                  const badgeCount = item.title === 'Governança' ? governanceBadgeCount : unreadCount;
                  const showBadge = showTransparencyBadge || showNotificationBadge;

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground relative"
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                        >
                          <div className="relative flex shrink-0 items-center justify-center">
                            <item.icon className="h-5 w-5 shrink-0" />
                            {showBadge && (
                              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-sidebar-background">
                                {badgeCount > 99 ? '99+' : badgeCount}
                              </span>
                            )}
                          </div>
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}

              {hasRole(['master']) && (
                <div className="pt-2">
                  {adminNavItems.map((item) => {
                    const showBadge = item.title === 'Solicitações' && pendingRequestsCount > 0;
                    
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild tooltip={item.title}>
                          <NavLink
                            to={item.url}
                            className="flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground relative"
                            activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                          >
                            <div className="relative flex shrink-0 items-center justify-center">
                              <item.icon className="h-5 w-5 shrink-0" />
                              {showBadge && (
                                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-sidebar-background">
                                  {pendingRequestsCount > 99 ? '99+' : pendingRequestsCount}
                                </span>
                              )}
                            </div>
                          {!collapsed && <span className="truncate min-w-0">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto pb-2">
          <Separator className="mx-1.5 my-2 bg-sidebar-border/50" />
          <SidebarGroup className="p-1">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Perfil">
                    <NavLink
                      to="/perfil"
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground relative"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <User className="h-5 w-5 shrink-0" />
                      {!collapsed && <span className="truncate min-w-0">Perfil</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {hasRole(['master', 'cooperado']) && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Solicitar Saída">
                      <NavLink
                        to="/solicitar-saida"
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground relative"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <LogOut className="h-5 w-5 shrink-0" />
                        {!collapsed && <span className="truncate min-w-0">Solicitar Saída</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Separator className="mb-4 bg-sidebar-border" />
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border-2 border-sidebar-accent">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-sm">
              {user ? getInitials(user.name) : '?'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && user && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-sidebar-foreground">
                {user.name}
              </span>
              <span className="text-xs text-sidebar-foreground/60">
                {getRoleBadge(user.role)}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="shrink-0 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
