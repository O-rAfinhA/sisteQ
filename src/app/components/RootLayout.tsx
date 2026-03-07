import { useLocation, useNavigate, useParams } from 'react-router';
import { useEffect, useState, useMemo, type ReactNode } from 'react';
import { FileDown } from 'lucide-react';
import { StrategicProvider } from '../context/StrategicContext';
import { YearSelector } from './YearSelector';
import { Button } from './ui/button';
import { PDFExportDialog } from './PDFExportDialog';
import { TopMenu } from './TopMenu';
import { ModularSidebar } from './ModularSidebar';
import { modules, Module, getModuleByPath } from '../config/modules';
import { useFornecedores } from '../hooks/useFornecedores';
import {
  canAccessModule,
  getTenantIdFromSession,
  setActiveModuleIdToSession,
  installTenantFetchShim,
  installTenantLocalStorageShim,
  setTenantIdToSession,
  setUserIdToSession,
  setUserRoleToSession,
  waitForTenantKvHydration,
} from '../utils/helpers';
import { toast } from 'sonner';

export default function RootLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ companyId?: string }>();
  const urlCompanyId = String(params.companyId ?? '').trim() || null;

  const [activeTenantId, setActiveTenantId] = useState<string | null>(() => {
    const fromUrl = (() => {
      if (typeof window === 'undefined') return null;
      const m = /^\/empresa\/([^/]+)(\/.*)?$/.exec(window.location.pathname || '');
      const raw = m?.[1] ? decodeURIComponent(m[1]) : '';
      const v = String(raw || '').trim();
      return v || null;
    })();
    return fromUrl ?? getTenantIdFromSession();
  });

  const [kvReady, setKvReady] = useState(() => !activeTenantId);

  const [tenantReady, setTenantReady] = useState(() => {
    const fromUrl = (() => {
      if (typeof window === 'undefined') return null;
      const m = /^\/empresa\/([^/]+)(\/.*)?$/.exec(window.location.pathname || '');
      const raw = m?.[1] ? decodeURIComponent(m[1]) : '';
      const v = String(raw || '').trim();
      return v || null;
    })();
    const existingTenantId = fromUrl ?? getTenantIdFromSession();
    if (existingTenantId) {
      setTenantIdToSession(existingTenantId);
      installTenantLocalStorageShim(existingTenantId);
      installTenantFetchShim(existingTenantId);
    }
    return Boolean(existingTenantId);
  });

  useEffect(() => {
    if (tenantReady) return;
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch('/api/profile/me', { credentials: 'same-origin' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as any;
        const tenantId = String(data?.user?.tenant?.id ?? data?.tenant?.id ?? data?.tenantId ?? data?.user?.tenantId ?? '').trim();
        const userId = String(data?.user?.id ?? '').trim();
        const role = typeof data?.user?.role === 'string' ? data.user.role : null;
        if (!tenantId) throw new Error('Missing tenantId');
        setTenantIdToSession(tenantId);
        setUserIdToSession(userId || null);
        setUserRoleToSession(role);
        installTenantLocalStorageShim(tenantId);
        installTenantFetchShim(tenantId);
        setKvReady(false);
        setActiveTenantId(tenantId);
      } catch {
      } finally {
        if (!cancelled) setTenantReady(true);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [tenantReady]);

  useEffect(() => {
    if (!urlCompanyId) return;
    if (activeTenantId === urlCompanyId) {
      const sessionTenantId = getTenantIdFromSession();
      if (sessionTenantId !== urlCompanyId) setTenantIdToSession(urlCompanyId);
      installTenantLocalStorageShim(urlCompanyId);
      installTenantFetchShim(urlCompanyId);
      return;
    }
    const sessionTenantId = getTenantIdFromSession();
    if (sessionTenantId === urlCompanyId) {
      installTenantLocalStorageShim(urlCompanyId);
      installTenantFetchShim(urlCompanyId);
      setKvReady(false);
      setActiveTenantId(urlCompanyId);
      return;
    }
    setTenantIdToSession(urlCompanyId);
    installTenantLocalStorageShim(urlCompanyId);
    installTenantFetchShim(urlCompanyId);
    setKvReady(false);
    setActiveTenantId(urlCompanyId);
    try {
      window.dispatchEvent(new CustomEvent('sisteq:reset', { detail: { persist: false } }));
    } catch {
      try {
        window.dispatchEvent(new Event('sisteq:reset'));
      } catch {
      }
    }
  }, [urlCompanyId, activeTenantId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const tid = String(activeTenantId ?? '').trim();
      if (!tid) {
        if (!cancelled) setKvReady(true);
        return;
      }
      if (!cancelled) setKvReady(false);
      try {
        await waitForTenantKvHydration(tid);
      } finally {
        if (!cancelled) setKvReady(true);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [activeTenantId]);

  if (!tenantReady || !kvReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-700">
        Carregando...
      </div>
    );
  }

  return <InnerRootLayout>{children}</InnerRootLayout>;
}

function InnerRootLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<Module | undefined>(getModuleByPath(location.pathname) || modules[0]);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const { configuracao } = useFornecedores();
  const [rbacTick, setRbacTick] = useState(0);

  useEffect(() => {
    const moduleInfo = getModuleByPath(location.pathname);
    if (moduleInfo) {
      setActiveModule(moduleInfo);
    }
  }, [location.pathname]);

  useEffect(() => {
    const moduleInfo = getModuleByPath(location.pathname);
    if (!moduleInfo) return;
    setActiveModuleIdToSession(moduleInfo.id);

    if (moduleInfo.id === 'configuracoes') return;
    const allowed = canAccessModule(moduleInfo.id as any, 'ver');
    if (allowed) {
      return;
    }

    const actionLabel = 'ver';
    toast.error(`Sem permissão para ${actionLabel} o módulo "${moduleInfo.label}".`);

    const firstAllowed = modules.find(m => m.id !== 'configuracoes' && canAccessModule(m.id as any, 'ver'));
    navigate(firstAllowed?.defaultPath || '/perfil', { replace: true });
  }, [location.pathname, navigate, rbacTick]);

  useEffect(() => {
    const onDenied = (evt: Event) => {
      const d = (evt as any)?.detail ?? {};
      const moduleId = String(d?.moduleId ?? '').trim();
      const action = String(d?.action ?? '').trim();
      const mod = modules.find(m => m.id === moduleId);
      const label = mod?.label || moduleId || 'módulo';
      const a = action || 'executar';
      toast.error(`Sem permissão para ${a} em "${label}".`);
    };
    const onChanged = () => setRbacTick(v => v + 1);
    try {
      window.addEventListener('sisteq:rbac-denied', onDenied as any);
      window.addEventListener('sisteq:rbac-changed', onChanged as any);
    } catch {
    }
    return () => {
      try {
        window.removeEventListener('sisteq:rbac-denied', onDenied as any);
        window.removeEventListener('sisteq:rbac-changed', onChanged as any);
      } catch {
      }
    };
  }, []);

  const filteredModule = useMemo(() => {
    if (!activeModule) return undefined;
    if (activeModule.id === 'fornecedores' && !configuracao.habilitarPedidoCompras) {
      return {
        ...activeModule,
        sections: activeModule.sections.filter(s => s.id !== 'fornecedores-pedidos'),
      };
    }
    return activeModule;
  }, [activeModule, configuracao.habilitarPedidoCompras]);

  return (
    <StrategicProvider>
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Menu Superior */}
        <TopMenu activeModule={activeModule} onModuleChange={setActiveModule} />
        
        {/* Layout Principal: Sidebar + Conteúdo */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Modular */}
          {filteredModule && (
            <ModularSidebar 
              module={filteredModule}
              topContent={
                filteredModule.id === 'gestao-estrategica' ? (
                  <YearSelector />
                ) : undefined
              }
              bottomContent={
                filteredModule.id === 'gestao-estrategica' ? (
                  <Button 
                    onClick={() => setPdfDialogOpen(true)}
                    variant="outline"
                    className="w-full gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                    size="sm"
                  >
                    <FileDown className="w-4 h-4" />
                    Gerar PDF
                  </Button>
                ) : undefined
              }
            />
          )}

          {/* Conteúdo Principal */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>

        {/* Dialog de Exportação de PDF */}
        <PDFExportDialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen} />
      </div>
    </StrategicProvider>
  );
}
