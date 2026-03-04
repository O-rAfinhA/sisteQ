import { useState } from 'react';
import { NavLink } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Module } from '../config/modules';
import logoSisteQ from '@/assets/1616e31d08200cd9b4972fe7b1780df810c21f8a.png';

interface ModularSidebarProps {
  module: Module;
  topContent?: React.ReactNode;
  bottomContent?: React.ReactNode;
}

export function ModularSidebar({ module, topContent, bottomContent }: ModularSidebarProps) {
  const Icon = module.icon;
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`bg-white border-r border-gray-200 flex flex-col h-full transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Logo e Nome do Módulo */}
      <div className={`p-6 border-b border-gray-200 flex-shrink-0 ${isCollapsed ? 'p-4' : ''}`}>
        {!isCollapsed ? (
          <>
            <NavLink
              to="/"
              end
              title="Ir para a página inicial"
              className="inline-flex rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white hover:opacity-90 active:opacity-80"
            >
              <img 
                src={(logoSisteQ as any).src ?? (logoSisteQ as any)} 
                alt="SisteQ" 
                className="h-20 w-auto mb-2"
              />
            </NavLink>
            <div className="flex items-center gap-2 mt-2">
              <Icon className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-700" style={{ fontWeight: 600 }}>{module.label}</p>
            </div>
          </>
        ) : (
          <div className="flex justify-center">
            <NavLink
              to="/"
              end
              title="Ir para a página inicial"
              className="inline-flex rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white hover:opacity-90 active:opacity-80"
            >
              <Icon className="w-6 h-6 text-blue-600" />
            </NavLink>
          </div>
        )}
      </div>

      {/* Conteúdo Customizado Topo (ex: YearSelector) */}
      {topContent && !isCollapsed && (
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          {topContent}
        </div>
      )}
      
      {/* Navegação das Seções - COM SCROLL */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {module.sections.map((section) => {
          const SectionIcon = section.icon;
          
          return (
            <div key={section.id}>
              <NavLink
                to={section.path}
                end={section.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  } ${isCollapsed ? 'justify-center' : ''}`
                }
                title={isCollapsed ? section.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <SectionIcon className={`w-4 h-4 ${isActive ? section.color.replace('500', '600') : section.color} ${isCollapsed ? '' : 'flex-shrink-0'}`} />
                    {!isCollapsed && <span className="text-xs">{section.label}</span>}
                  </>
                )}
              </NavLink>
              {section.separatorAfter && !isCollapsed && (
                <div className="my-3 border-t border-gray-300"></div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer com Conteúdo Customizado (ex: Botão PDF) */}
      {!isCollapsed && bottomContent && (
        <div className="p-4 border-t border-gray-200 space-y-3 flex-shrink-0">
          {bottomContent}
        </div>
      )}

      {/* Botão de Toggle (Recolher/Expandir) */}
      <div className="p-2 border-t border-gray-200 flex-shrink-0">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs">Recolher</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
