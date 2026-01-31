import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubstanceProvider } from "@/contexts/SubstanceContext";
import { LaudoProvider } from "@/contexts/LaudoContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Laudos from "./pages/Laudos";
import Marketplace from "./pages/Marketplace";
import Solicitacoes from "./pages/Solicitacoes";
import ListaCompras from "./pages/ListaCompras";
import Usuarios from "./pages/Usuarios";
import Configuracoes from "./pages/Configuracoes";
import Transparencia from "./pages/Transparencia";
import Gestao from "./pages/Gestao";
import SolicitarSaida from "./pages/SolicitarSaida";
import Fornecedores from "./pages/Fornecedores";
import Perfil from "./pages/Perfil";
import EstoqueInteligente from "./pages/EstoqueInteligente";
import MarketplaceFlashDeals from "./pages/MarketplaceFlashDeals";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubstanceProvider>
          <LaudoProvider>
            <NotificationProvider>
              <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  
                  {/* Protected Routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <AppLayout>
                        <Dashboard />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/laudos"
                    element={
                      <AppLayout>
                        <Laudos />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/marketplace"
                    element={
                      <AppLayout>
                        <Marketplace />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/marketplace/flash-deals"
                    element={
                      <AppLayout>
                        <MarketplaceFlashDeals />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/estoque-inteligente"
                    element={
                      <AppLayout>
                        <EstoqueInteligente />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/lista-compras"
                    element={
                      <AppLayout>
                        <ListaCompras />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/fornecedores"
                    element={
                      <AppLayout>
                        <Fornecedores />
                      </AppLayout>
                    }
                  />
                  <Route path="/notificacoes" element={<Navigate to="/dashboard?view=notifications" replace />} />
                  <Route
                    path="/solicitacoes"
                    element={
                      <AppLayout>
                        <Solicitacoes />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/usuarios"
                    element={
                      <AppLayout>
                        <Usuarios />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/configuracoes"
                    element={
                      <AppLayout>
                        <Configuracoes />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/transparencia"
                    element={
                      <AppLayout>
                        <Transparencia />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/gestao"
                    element={
                      <AppLayout>
                        <Gestao />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/solicitar-saida"
                    element={
                      <AppLayout>
                        <SolicitarSaida />
                      </AppLayout>
                    }
                  />
                  
                  <Route
                    path="/perfil"
                    element={
                      <AppLayout>
                        <Perfil />
                      </AppLayout>
                    }
                  />
                  
                  {/* Catch-all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
            </NotificationProvider>
          </LaudoProvider>
        </SubstanceProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
