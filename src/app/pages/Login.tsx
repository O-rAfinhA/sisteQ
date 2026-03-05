import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { installTenantFetchShim, installTenantLocalStorageShim, setTenantIdToSession } from '../utils/helpers';

type Mode = 'login' | 'forgot' | 'register';

async function apiJson<T>(url: string, init: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Erro HTTP ${res.status}`);
  return data as T;
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const defaultTenant = useMemo(() => {
    const raw = searchParams.get('tenant') || '';
    return raw.trim();
  }, [searchParams]);

  const verified = useMemo(() => {
    return (searchParams.get('verified') || '').trim() === '1';
  }, [searchParams]);

  const next = useMemo(() => {
    const raw = searchParams.get('next') || '/';
    if (!raw.startsWith('/')) return '/';
    return raw;
  }, [searchParams]);

  const [mode, setMode] = useState<Mode>('login');
  const [tenantSlug, setTenantSlug] = useState(defaultTenant);
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const hydrateTenantScope = async () => {
    try {
      const meRes = await fetch('/api/profile/me', { method: 'GET', credentials: 'same-origin' });
      const meData = await meRes.json().catch(() => null);
      if (!meRes.ok) return;
      const tenantId = String(meData?.user?.tenant?.id ?? meData?.tenant?.id ?? meData?.tenantId ?? meData?.user?.tenantId ?? '').trim();
      if (!tenantId) return;
      setTenantIdToSession(tenantId);
      installTenantLocalStorageShim(tenantId);
      installTenantFetchShim(tenantId);
      return tenantId;
    } catch {
    }
    return null;
  };

  const authHeaders = useMemo(() => {
    const slug = tenantSlug.trim();
    const headers: Record<string, string> = {};
    if (slug) headers['x-tenant'] = slug;
    return headers;
  }, [tenantSlug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowResend(false);
    try {
      await apiJson<{ user: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        headers: authHeaders,
      });
      const tenantId = await hydrateTenantScope();
      if (tenantId) {
        const inner = next.startsWith('/empresa/') ? '/' : next;
        const destination = inner === '/' ? `/empresa/${encodeURIComponent(tenantId)}` : `/empresa/${encodeURIComponent(tenantId)}${inner}`;
        navigate(destination, { replace: true });
      } else {
        navigate(next, { replace: true });
      }
    } catch (err: any) {
      const msg = String(err?.message || 'Falha ao entrar');
      if (/e-?mail não verificado/i.test(msg)) setShowResend(true);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const emailTrim = email.trim();
    if (!emailTrim) {
      toast.error('Informe o e-mail para reenviar a verificação');
      return;
    }
    setResendLoading(true);
    try {
      const result = await apiJson<{ ok: true; verificationUrl?: string }>('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: emailTrim }),
        headers: authHeaders,
      });
      if (result?.verificationUrl) {
        window.location.href = result.verificationUrl;
        return;
      }
      toast.success('Se o e-mail existir, enviaremos o link de verificação.');
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao reenviar verificação');
    } finally {
      setResendLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiJson<{ ok: true }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
        headers: authHeaders,
      });
      toast.success('Se o e-mail existir, enviaremos instruções.');
      setMode('login');
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao solicitar recuperação');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('As senhas não conferem');
      return;
    }
    setLoading(true);
    setShowResend(false);
    try {
      const result = await apiJson<{
        ok: true;
        emailSent?: boolean;
        emailVerified?: boolean;
        verificationUrl?: string;
        dev?: { verificationToken?: string };
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          tenantSlug,
          companyName,
          name,
          email,
          password,
        }),
      });

      const verificationToken = result?.dev?.verificationToken;
      if (verificationToken) {
        await apiJson<{ ok: true }>('/api/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ token: verificationToken }),
        });
        await apiJson<{ user: any }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
          headers: authHeaders,
        });
        await hydrateTenantScope();
        navigate(next, { replace: true });
        return;
      }

      if (result?.emailVerified) {
        await apiJson<{ user: any }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
          headers: authHeaders,
        });
        await hydrateTenantScope();
        navigate(next, { replace: true });
        return;
      }

      if (result?.verificationUrl) {
        window.location.href = result.verificationUrl;
        return;
      }

      toast.success('Conta criada. Verifique seu e-mail para ativar o acesso.');
      if (result?.emailSent === false) toast.error('Não foi possível enviar o e-mail agora. Use "Reenviar verificação".');
      setMode('login');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'login' ? 'Entrar' : mode === 'forgot' ? 'Recuperar senha' : 'Criar conta';
  const description =
    mode === 'login'
      ? 'Acesse sua conta para continuar.'
      : mode === 'forgot'
        ? 'Informe seu e-mail para receber instruções de recuperação.'
        : 'Crie sua conta para começar.';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {verified && (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 mb-4">
              E-mail confirmado com sucesso. Você já pode entrar.
            </div>
          )}
          <form
            onSubmit={mode === 'login' ? handleLogin : mode === 'forgot' ? handleForgot : handleRegister}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="tenantSlug">Organização</Label>
              <Input
                id="tenantSlug"
                value={tenantSlug}
                onChange={e => setTenantSlug(e.target.value)}
                placeholder="sua-organizacao"
                autoComplete="organization"
                required
                disabled={loading}
              />
            </div>

            {mode === 'register' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Empresa</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Nome da empresa"
                    autoComplete="organization"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoComplete="name"
                    required
                    disabled={loading}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            {(mode === 'login' || mode === 'register') && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  disabled={loading}
                />
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={loading}
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'login' ? 'Entrar' : mode === 'forgot' ? 'Enviar instruções' : 'Criar conta'}
            </Button>

            {mode === 'login' && showResend && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={loading || resendLoading}
                onClick={handleResendVerification}
              >
                {resendLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reenviar verificação de e-mail
              </Button>
            )}

            {mode === 'login' && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={() => {
                  window.location.href = `/api/auth/google/start?next=${encodeURIComponent(next)}`;
                }}
              >
                Entrar com Google
              </Button>
            )}

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                {mode === 'login' ? (
                  <button
                    type="button"
                    className="text-blue-700 hover:underline"
                    onClick={() => setMode('forgot')}
                    disabled={loading}
                  >
                    Esqueci minha senha
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-blue-700 hover:underline"
                    onClick={() => setMode('login')}
                    disabled={loading}
                  >
                    Voltar para login
                  </button>
                )}

                {mode === 'login' && (
                  <button
                    type="button"
                    className="text-blue-700 hover:underline"
                    onClick={() => setMode('register')}
                    disabled={loading}
                  >
                    Criar conta
                  </button>
                )}
              </div>
              <button
                type="button"
                className="text-gray-600 hover:underline"
                onClick={() => navigate('/', { replace: true })}
                disabled={loading}
              >
                Início
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
