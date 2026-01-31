import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FlaskConical, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Credenciais inválidas ou backend offline. Verifique email/senha e se o servidor está rodando.');
      }
    } catch (err) {
      console.error('Erro no login:', err);
      setError('Erro de conexão. Verifique se o backend está rodando em http://localhost:3001');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-elevated">
            <FlaskConical className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Cooperativa Magistral</h1>
          <p className="text-muted-foreground">Sistema de Gestão de Laudos</p>
        </div>

        <Card className="card-pharmaceutical-elevated">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Acesso ao Sistema</CardTitle>
            <CardDescription>Entre com suas credenciais para acessar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="animate-fade-in">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-11 w-full gradient-primary text-primary-foreground hover:opacity-90"
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 rounded-lg bg-muted/50 p-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Credenciais de demonstração:</p>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span className="font-medium">Admin:</span>
                  <span>admin@magistral.com / admin123</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Cooperado:</span>
                  <span>cooperado@magistral.com / coop123</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Roseiras:</span>
                  <span>roseiras@magistral.com / roseiras123</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Farmagna:</span>
                  <span>farmagna@magistral.com / farmagna123</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Natural:</span>
                  <span>natural@magistral.com / natural123</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Padrão:</span>
                  <span>usuario@magistral.com / user123</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
