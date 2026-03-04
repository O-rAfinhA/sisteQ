import { useLocation } from 'react-router';
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
import { getTenantIdFromSession, installTenantLocalStorageShim, setTenantIdToSession } from '../utils/helpers';

export default function RootLayout({ children }: { children: ReactNode }) {
  const [tenantReady, setTenantReady] = useState(() => {
    const existingTenantId = getTenantIdFromSession();
    if (existingTenantId) installTenantLocalStorageShim(existingTenantId);
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
        const tenantId = String(data?.tenant?.id ?? data?.tenantId ?? '').trim();
        if (!tenantId) throw new Error('Missing tenantId');
        setTenantIdToSession(tenantId);
        installTenantLocalStorageShim(tenantId);
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

  if (!tenantReady) {
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
  const [activeModule, setActiveModule] = useState<Module | undefined>(getModuleByPath(location.pathname) || modules[0]);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const { configuracao } = useFornecedores();

  useEffect(() => {
    const moduleInfo = getModuleByPath(location.pathname);
    if (moduleInfo) {
      setActiveModule(moduleInfo);
    }
  }, [location.pathname]);

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
