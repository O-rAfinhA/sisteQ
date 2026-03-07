import { useEffect, useRef, useState } from 'react';
import { User, Settings, Bell, HelpCircle, LogOut, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { formatRoleWithOrganization, isAdminRole, resetApplication, setUserRoleToSession } from '../utils/helpers';

type UserState = {
  name: string;
  email: string;
  role: string;
  organizationName: string;
  language: 'pt-BR' | 'en-US';
  avatarUrl: string | null;
  notifications: number;
};

export function UserMenu() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserState>({
    name: '',
    email: '',
    role: '',
    organizationName: '',
    language: 'pt-BR',
    avatarUrl: null,
    notifications: 0,
  });
  const [open, setOpen] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [loading, setLoading] = useState(false);
  const didHydrateRef = useRef(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const flush = (globalThis as any).__SISTEQ_FLUSH_WRITES__;
      if (typeof flush === 'function') await flush();
    } catch {
    }
    try {
      toast.success('Logout realizado');
      await resetApplication({ redirectTo: '/login?logout=1' });
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao sair');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function hydrateUser() {
      if (didHydrateRef.current) return;
      didHydrateRef.current = true;
      setHydrating(true);
      try {
        const meRes = await fetch('/api/profile/me', { method: 'GET', credentials: 'same-origin' });
        const meData = await meRes.json().catch(() => null);
        if (!meRes.ok) {
          if (meRes.status === 401) return;
          throw new Error(meData?.error || 'Falha ao carregar usuário');
        }
        if (cancelled) return;
        const role = typeof meData?.user?.role === 'string' ? meData.user.role : null;
        setUserRoleToSession(role);
        setUser(prev => {
          const next = {
            name: meData?.user?.name ?? prev.name,
            email: meData?.user?.email ?? prev.email,
            role: meData?.user?.role ?? prev.role,
            organizationName: meData?.user?.organizationName ?? prev.organizationName,
            language: meData?.user?.preferences?.language === 'en-US' ? 'en-US' : 'pt-BR',
            avatarUrl: meData?.user?.avatarUrl ?? prev.avatarUrl,
            notifications: prev.notifications,
          } satisfies UserState;
          return next;
        });

        if (isAdminRole(role)) {
          const ntfRes = await fetch('/api/profile/notifications', { credentials: 'same-origin' });
          const ntfData = await ntfRes.json().catch(() => null);
          if (!ntfRes.ok) {
            if (ntfRes.status === 401) return;
            throw new Error(ntfData?.error || 'Falha ao carregar notificações');
          }
          if (cancelled) return;
          setUser(prev => ({ ...prev, notifications: ntfData.unreadCount ?? 0 }));
        } else {
          setUser(prev => ({ ...prev, notifications: 0 }));
        }
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message || 'Falha ao carregar usuário');
      } finally {
        if (!cancelled) setHydrating(false);
      }
    }
    if (open) hydrateUser();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const title = user.name || 'Conta';

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-3 px-3 py-2 h-auto bg-white hover:bg-gray-50 transition-colors rounded-lg shadow-md border border-gray-200"
          title={hydrating ? 'Carregando...' : title}
          aria-label={hydrating ? 'Carregando...' : title}
          disabled={loading}
        >
          {/* Avatar */}
          <div className="relative">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={title}
                className="w-10 h-10 rounded-full border-2 border-blue-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-full border-2 border-blue-200 bg-gray-100 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-500" />
              </div>
            )}
            {user.notifications > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                <span className="text-xs text-white font-bold">{user.notifications}</span>
              </div>
            )}
          </div>

          {/* Informações do Usuário */}
          <div className="hidden md:flex flex-col items-start">
            <span className="text-sm font-semibold text-gray-900">{title}</span>
            {!!user.role && (
              <span className="text-xs text-gray-500 whitespace-normal break-words">
                {formatRoleWithOrganization({
                  role: user.role,
                  organizationName: user.organizationName,
                  language: user.language,
                })}
              </span>
            )}
          </div>

          {/* Ícone de dropdown */}
          <ChevronDown className="w-4 h-4 text-gray-500 hidden md:block" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 mt-2">
        {/* Cabeçalho com informações do usuário */}
        <DropdownMenuLabel>
          <div className="flex items-center gap-3 py-2">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={title}
                className="w-12 h-12 rounded-full border-2 border-blue-200"
              />
            ) : (
              <div className="w-12 h-12 rounded-full border-2 border-blue-200 bg-gray-100 flex items-center justify-center">
                <User className="w-6 h-6 text-gray-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
              {!!user.email && <p className="text-xs text-gray-500 truncate">{user.email}</p>}
              {!!user.role && (
                <Badge variant="secondary" className="mt-1 text-xs bg-blue-100 text-blue-700 whitespace-normal break-words">
                  {formatRoleWithOrganization({
                    role: user.role,
                    organizationName: user.organizationName,
                    language: user.language,
                  })}
                </Badge>
              )}
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Meu Perfil */}
        <DropdownMenuItem
          className="cursor-pointer py-2.5"
          onSelect={() => {
            navigate('/perfil?tab=profile');
          }}
        >
          <User className="w-4 h-4 mr-3 text-gray-600" />
          <span>Meu Perfil</span>
        </DropdownMenuItem>

        {/* Configurações */}
        {isAdminRole(user.role) && (
          <DropdownMenuItem
            className="cursor-pointer py-2.5"
            onSelect={() => {
              navigate('/perfil?tab=preferences');
            }}
          >
            <Settings className="w-4 h-4 mr-3 text-gray-600" />
            <span>Configurações</span>
          </DropdownMenuItem>
        )}

        {isAdminRole(user.role) && (
          <DropdownMenuItem
            className="cursor-pointer py-2.5"
            onSelect={() => {
              navigate('/perfil?tab=notifications');
            }}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <Bell className="w-4 h-4 mr-3 text-gray-600" />
                <span>Notificações</span>
              </div>
              {user.notifications > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {user.notifications}
                </Badge>
              )}
            </div>
          </DropdownMenuItem>
        )}

        {/* Ajuda e Suporte */}
        <DropdownMenuItem
          className="cursor-pointer py-2.5"
          onSelect={() => {
            navigate('/perfil?tab=support');
          }}
        >
          <HelpCircle className="w-4 h-4 mr-3 text-gray-600" />
          <span>Ajuda e Suporte</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Sair */}
        <DropdownMenuItem
          onSelect={handleLogout}
          className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 py-2.5"
        >
          <LogOut className="w-4 h-4 mr-3" />
          <span className="font-semibold">Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
