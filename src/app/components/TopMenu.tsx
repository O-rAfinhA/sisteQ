import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { modules, Module } from '../config/modules';
import { ChevronDown, Menu } from 'lucide-react';
import { UserMenuMinimized } from './UserMenuMinimized';
import { useFornecedores } from '../hooks/useFornecedores';
import { canAccessModule, getUserIdFromSession, getUserRoleFromSession, isAdminRole, setUserIdToSession, setUserRoleToSession } from '../utils/helpers';

interface TopMenuProps {
  activeModule: Module | undefined;
  onModuleChange: (module: Module) => void;
}

export function TopMenu({ activeModule, onModuleChange }: TopMenuProps) {
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isPointerInside, setIsPointerInside] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rbacVersion, setRbacVersion] = useState(0);
  const isPointerInsideRef = useRef(false);
  const isProfileMenuOpenRef = useRef(false);
  const suppressCloseUntilRef = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { configuracao } = useFornecedores();

  useEffect(() => {
    let cancelled = false;
    const cachedRole = getUserRoleFromSession();
    if (cachedRole) setIsAdmin(isAdminRole(cachedRole));

    async function hydrateRole() {
      try {
        const res = await fetch('/api/profile/me', { method: 'GET', credentials: 'same-origin' });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          if (res.status === 401) return;
          return;
        }
        const role = typeof data?.user?.role === 'string' ? data.user.role : null;
        const userId = String(data?.user?.id ?? '').trim() || null;
        if (cancelled) return;
        setUserRoleToSession(role);
        setUserIdToSession(userId);
        setIsAdmin(isAdminRole(role));
      } catch {
      }
    }

    if (!cachedRole || !getUserIdFromSession()) hydrateRole();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onChanged = () => setRbacVersion(v => v + 1);
    try {
      window.addEventListener('sisteq:rbac-changed', onChanged as any);
    } catch {
    }
    return () => {
      try {
        window.removeEventListener('sisteq:rbac-changed', onChanged as any);
      } catch {
      }
    };
  }, []);

  // Filtrar seções de módulos baseado em configurações
  const getFilteredSections = (mod: Module) => {
    if (mod.id === 'fornecedores' && !configuracao.habilitarPedidoCompras) {
      return mod.sections.filter(s => s.id !== 'fornecedores-pedidos');
    }
    return mod.sections;
  };

  const handleModuleClick = (module: Module) => {
    onModuleChange(module);
    navigate(module.defaultPath);
  };

  const handleSectionClick = (path: string, module: Module) => {
    onModuleChange(module);
    navigate(path);
    setHoveredModule(null);
  };

  const closeMenu = () => {
    setIsMenuVisible(false);
    setHoveredModule(null);
  };

  const closeMenuImmediately = () => {
    setIsMenuVisible(false);
    setHoveredModule(null);
    isProfileMenuOpenRef.current = false;
    setIsProfileMenuOpen(false);
  };

  return (
    <div 
      className="relative z-50"
      data-rbac-version={rbacVersion}
      onMouseEnter={() => {
        setIsPointerInside(true);
        isPointerInsideRef.current = true;
        setIsMenuVisible(true);
      }}
      onMouseLeave={() => {
        setIsPointerInside(false);
        isPointerInsideRef.current = false;

        window.setTimeout(() => {
          if (Date.now() < suppressCloseUntilRef.current) return;
          if (isProfileMenuOpenRef.current) return;
          closeMenu();
        }, 0);
      }}
    >
      {/* Lapela de Acionamento - SEMPRE VISÍVEL */}
      <div className={`transition-opacity duration-300 ${
        isMenuVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        <div className="h-10 bg-gradient-to-b from-blue-500/10 to-transparent cursor-pointer flex items-center justify-between px-6 pt-2">
          <div className="flex-1"></div>
          <div
            className="px-8 py-2 rounded-b-lg text-xs font-medium flex items-center gap-2 shadow-lg transition-colors bg-[var(--module-menu-bg)] text-[var(--module-menu-fg)] hover:bg-[var(--module-menu-bg-hover)] active:bg-[var(--module-menu-bg-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--module-menu-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            role="button"
            tabIndex={0}
            aria-label="Menu de Módulos"
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              setIsMenuVisible(true);
            }}
            onClick={() => setIsMenuVisible(true)}
          >
            <Menu className="w-3.5 h-3.5" />
            <span>Menu de Módulos</span>
          </div>
          <div className="flex-1"></div>
        </div>
      </div>

      {/* Barra de Menu Completa */}
      <div 
        className={`bg-white border-b border-gray-200 shadow-md transition-all duration-300 absolute top-0 left-0 right-0 ${
          isMenuVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}
      >
        <div className="flex items-center h-14 px-6 justify-between">
          {/* Módulos principais */}
          <div className="flex items-center">
            {modules
              .filter((module) => module.id !== 'configuracoes')
              .filter((module) => canAccessModule(module.id as any, 'ver'))
              .map((module) => {
                const Icon = module.icon;
                const isActive = activeModule?.id === module.id;

                return (
                  <div
                    key={module.id}
                    className="relative"
                    onMouseEnter={() => setHoveredModule(module.id)}
                    onMouseLeave={() => setHoveredModule(null)}
                  >
                    <button
                      onClick={() => handleModuleClick(module)}
                      className={`group flex items-center gap-1.5 px-3 py-3 text-xs font-medium rounded-md transition-all duration-200 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                        isActive
                          ? 'text-blue-800 bg-blue-100/70 shadow-sm ring-1 ring-blue-200'
                          : 'text-gray-700 hover:text-blue-800 hover:bg-blue-100/60 hover:shadow-sm hover:ring-1 hover:ring-blue-200/70 active:bg-blue-100/80'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 transition-colors duration-200 motion-reduce:transition-none ${isActive ? 'text-blue-700' : 'text-gray-500 group-hover:text-blue-700'}`} />
                      <span>{module.label}</span>
                      {module.sections.length > 1 && (
                        <ChevronDown
                          className={`w-3 h-3 transition-all duration-200 motion-reduce:transition-none ${
                            hoveredModule === module.id ? 'rotate-180 text-blue-700' : 'text-gray-400 group-hover:text-blue-600'
                          }`}
                        />
                      )}
                    </button>

                    {/* Dropdown ao hover */}
                    {hoveredModule === module.id && module.sections.length > 1 && (
                      <div className="absolute top-full left-0 mt-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-2">
                        {getFilteredSections(module).map((section) => {
                          const SectionIcon = section.icon;
                          const isSectionActive = location.pathname === section.path;

                          return (
                            <div key={section.id}>
                              <button
                                onClick={() => handleSectionClick(section.path, module)}
                                className={`group w-[calc(100%-0.5rem)] mx-1 flex items-center gap-2.5 px-3.5 py-2 text-xs text-left rounded-md transition-all duration-200 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                                  isSectionActive
                                    ? 'bg-blue-100/70 text-blue-900 ring-1 ring-blue-200'
                                    : 'text-gray-700 hover:bg-blue-100/60 hover:text-blue-900 hover:ring-1 hover:ring-blue-200/70 active:bg-blue-100/80'
                                }`}
                              >
                                <SectionIcon className={`w-3.5 h-3.5 ${section.color} transition-transform duration-200 motion-reduce:transition-none group-hover:scale-105`} />
                                <span>{section.label}</span>
                              </button>
                              {section.separatorAfter && (
                                <div className="my-1.5 mx-3 border-t border-gray-200"></div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {/* Configurações e UserMenu no extremo direito */}
          <div className="flex items-center gap-3">
            {modules
              .filter((module) => module.id === 'configuracoes' && isAdmin)
              .map((module) => {
                const Icon = module.icon;
                const isActive = activeModule?.id === module.id;

                return (
                  <div
                    key={module.id}
                    className="relative"
                    onMouseEnter={() => setHoveredModule(module.id)}
                    onMouseLeave={() => setHoveredModule(null)}
                  >
                    <button
                      onClick={() => handleModuleClick(module)}
                      className={`group flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                        isActive
                          ? 'text-blue-800 bg-blue-100/70 shadow-sm ring-1 ring-blue-200'
                          : 'text-gray-700 hover:text-blue-800 hover:bg-blue-100/60 hover:shadow-sm hover:ring-1 hover:ring-blue-200/70 active:bg-blue-100/80'
                      }`}
                      title="Configurações"
                    >
                      <Icon className={`w-5 h-5 transition-colors duration-200 motion-reduce:transition-none ${isActive ? 'text-blue-700' : 'text-gray-500 group-hover:text-blue-700'}`} />
                    </button>

                    {/* Dropdown ao hover */}
                    {hoveredModule === module.id && (
                      <div className="absolute top-full right-0 mt-0 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-2">
                        {module.sections.map((section) => {
                          const SectionIcon = section.icon;
                          const isSectionActive = location.pathname === section.path;

                          return (
                            <button
                              key={section.id}
                              onClick={() => handleSectionClick(section.path, module)}
                              className={`group w-[calc(100%-0.5rem)] mx-1 flex items-center gap-2.5 px-3.5 py-2 text-xs text-left rounded-md transition-all duration-200 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                                isSectionActive
                                  ? 'bg-blue-100/70 text-blue-900 ring-1 ring-blue-200'
                                  : 'text-gray-700 hover:bg-blue-100/60 hover:text-blue-900 hover:ring-1 hover:ring-blue-200/70 active:bg-blue-100/80'
                              }`}
                            >
                              <SectionIcon className={`w-3.5 h-3.5 ${section.color} transition-transform duration-200 motion-reduce:transition-none group-hover:scale-105`} />
                              <span>{section.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            
            {/* UserMenu sempre visível na barra expandida */}
            {isMenuVisible && (
              <UserMenuMinimized
                onTriggerPointerDownCapture={() => {
                  suppressCloseUntilRef.current = Date.now() + 300;
                }}
                onItemSelect={closeMenuImmediately}
                onOpenChange={(open) => {
                  isProfileMenuOpenRef.current = open;
                  setIsProfileMenuOpen(open);
                  if (open) {
                    setIsMenuVisible(true);
                    return;
                  }
                  window.setTimeout(() => {
                    if (!isPointerInsideRef.current) closeMenu();
                  }, 0);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
