import { 
  Target, 
  Building2, 
  TrendingUp, 
  Users, 
  ClipboardList, 
  Crosshair, 
  ListChecks,
  AlertCircle,
  FileText,
  UserCircle,
  Truck,
  BarChart3,
  ShieldAlert,
  MessageSquare,
  Settings,
  UserCog,
  Briefcase,
  BookOpen,
  UserSquare,
  Workflow,
  Map,
  FileBarChart,
  FileType,
  FileCheck,
  FileCheck2,
  LayoutDashboard,
  GraduationCap,
  ClipboardCheck,
  Grid3x3,
  Calendar,
  CalendarDays,
  BookMarked,
  Palette,
  Layout,
  Package,
  ShoppingCart,
  Crown,
  Gauge,
  Ruler,
  Wrench,
  HardHat,
  History,
  Activity,
  type LucideIcon
} from 'lucide-react';

export interface ModuleSection {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  color: string;
  separatorAfter?: boolean; // Adiciona linha de separação após esta seção
}

export interface Module {
  id: string;
  label: string;
  icon: LucideIcon;
  sections: ModuleSection[];
  defaultPath: string;
}

export const modules: Module[] = [
  {
    id: 'gestao-estrategica',
    label: 'Estratégia',
    icon: Target,
    defaultPath: '/',
    sections: [
      {
        id: 'direcionamento',
        label: 'Direcionamento Estratégico',
        icon: Target,
        path: '/',
        color: 'text-blue-500'
      },
      {
        id: 'cenario',
        label: 'Contexto Organizacional',
        icon: Building2,
        path: '/gestao-estrategica/cenario',
        color: 'text-purple-500'
      },
      {
        id: 'partes-interessadas',
        label: 'Partes Interessadas',
        icon: Users,
        path: '/gestao-estrategica/partes-interessadas',
        color: 'text-green-500'
      },
      {
        id: 'swot',
        label: 'Análise SWOT',
        icon: TrendingUp,
        path: '/gestao-estrategica/swot',
        color: 'text-orange-500'
      },
      {
        id: 'objetivos',
        label: 'Objetivos Estratégicos',
        icon: Crosshair,
        path: '/gestao-estrategica/objetivos',
        color: 'text-red-500',
        separatorAfter: true
      },
      {
        id: 'plano-comunicacao',
        label: 'Plano de Comunicação',
        icon: MessageSquare,
        path: '/gestao-estrategica/comunicacao',
        color: 'text-indigo-500'
      },
      {
        id: 'plano-acao',
        label: 'Plano Estratégico (PE)',
        icon: ClipboardList,
        path: '/gestao-estrategica/plano-acao',
        color: 'text-emerald-500'
      },
      {
        id: 'tarefas',
        label: 'Gestão de Tarefas (PE)',
        icon: ListChecks,
        path: '/gestao-estrategica/tarefas',
        color: 'text-teal-500',
        separatorAfter: true
      },
      {
        id: 'analise-critica',
        label: 'Análise Crítica pela Direção',
        icon: Crown,
        path: '/gestao-estrategica/analise-critica',
        color: 'text-indigo-500'
      }
    ]
  },
  {
    id: 'processos',
    label: 'Processos',
    icon: Workflow,
    defaultPath: '/processos/mapa',
    sections: [
      {
        id: 'processos-mapa',
        label: 'Lista de Processos',
        icon: Map,
        path: '/processos/mapa',
        color: 'text-blue-500'
      },
      {
        id: 'processos-lista',
        label: 'Mapas de Processos',
        icon: Workflow,
        path: '/processos',
        color: 'text-cyan-500'
      }
    ]
  },
  {
    id: 'indicadores',
    label: 'KPI',
    icon: BarChart3,
    defaultPath: '/kpi',
    sections: [
      {
        id: 'kpi',
        label: 'Central de Indicadores',
        icon: Target,
        path: '/kpi',
        color: 'text-blue-600'
      },
      {
        id: 'matriz-kpi',
        label: 'Matriz Mensal',
        icon: Calendar,
        path: '/matriz-kpi',
        color: 'text-purple-600'
      }
    ]
  },
  {
    id: 'gestao-riscos',
    label: 'Riscos',
    icon: ShieldAlert,
    defaultPath: '/gestao-riscos',
    sections: [
      {
        id: 'riscos-dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        path: '/gestao-riscos',
        color: 'text-blue-600'
      },
      {
        id: 'riscos-registro',
        label: 'Registro de Riscos',
        icon: ShieldAlert,
        path: '/gestao-riscos/registro',
        color: 'text-amber-500'
      },
      {
        id: 'riscos-matriz',
        label: 'Matriz de Riscos',
        icon: Grid3x3,
        path: '/gestao-riscos/matriz',
        color: 'text-purple-500'
      },
      {
        id: 'riscos-tratamento',
        label: 'Plano de Tratamento',
        icon: ClipboardCheck,
        path: '/gestao-riscos/tratamento',
        color: 'text-green-500'
      },
      {
        id: 'riscos-historico',
        label: 'Histórico de Revisões',
        icon: Calendar,
        path: '/gestao-riscos/historico',
        color: 'text-indigo-500'
      }
    ]
  },
  {
    id: 'acoes-corretivas',
    label: 'Ações e Tarefas',
    icon: AlertCircle,
    defaultPath: '/acoes-corretivas/plano-acao',
    sections: [
      {
        id: 'plano-acao-corretiva',
        label: 'Plano de Ações (PA)',
        icon: ClipboardList,
        path: '/acoes-corretivas/plano-acao',
        color: 'text-orange-500'
      },
      {
        id: 'tarefas-consolidadas',
        label: 'Gestão de Tarefas (PE + PA)',
        icon: ListChecks,
        path: '/acoes-corretivas/tarefas',
        color: 'text-teal-500'
      }
    ]
  },
  {
    id: 'documentos',
    label: 'Documentos',
    icon: FileText,
    defaultPath: '/documentos/dashboard',
    sections: [
      {
        id: 'documentos-dashboard',
        label: 'Dashboard de Documentos',
        icon: LayoutDashboard,
        path: '/documentos/dashboard',
        color: 'text-blue-600',
        separatorAfter: true
      },
      {
        id: 'documentos-internos',
        label: 'Documentos Internos',
        icon: FileText,
        path: '/documentos/internos',
        color: 'text-blue-500'
      },
      {
        id: 'documentos-clientes',
        label: 'Documentos de Clientes',
        icon: UserSquare,
        path: '/documentos/clientes',
        color: 'text-purple-500'
      },
      {
        id: 'documentos-externos',
        label: 'Documentos Externos',
        icon: BookOpen,
        path: '/documentos/externos',
        color: 'text-indigo-500'
      },
      {
        id: 'documentos-licencas',
        label: 'Licenças e Obrigações Legais',
        icon: FileCheck,
        path: '/documentos/licencas',
        color: 'text-green-500'
      },
      {
        id: 'documentos-certidoes',
        label: 'Certidões e Regularidade Fiscal',
        icon: FileCheck2,
        path: '/documentos/certidoes',
        color: 'text-cyan-500',
        separatorAfter: true
      },
      {
        id: 'tipos-documentos',
        label: 'Configuração (documentos)',
        icon: Settings,
        path: '/documentos/tipos',
        color: 'text-orange-500'
      }
    ]
  },
  {
    id: 'recursos-humanos',
    label: 'Pessoas',
    icon: UserCircle,
    defaultPath: '/recursos-humanos/colaboradores',
    sections: [
      {
        id: 'dashboard-pessoas',
        label: 'Dashboard Pessoas',
        icon: LayoutDashboard,
        path: '/recursos-humanos/dashboard',
        color: 'text-blue-600',
        separatorAfter: true
      },
      {
        id: 'colaboradores',
        label: 'Colaboradores',
        icon: UserCircle,
        path: '/recursos-humanos/colaboradores',
        color: 'text-purple-500'
      },
      {
        id: 'descricao-funcoes',
        label: 'Descrição de Funções',
        icon: GraduationCap,
        path: '/recursos-humanos/descricao-funcoes',
        color: 'text-blue-500'
      },
      {
        id: 'integracao-colaboradores',
        label: 'Integração de Colaboradores',
        icon: Users,
        path: '/recursos-humanos/integracao',
        color: 'text-green-500'
      },
      {
        id: 'avaliacao-experiencia',
        label: 'Avaliação de Contrato de Experiência',
        icon: ClipboardCheck,
        path: '/recursos-humanos/avaliacao-experiencia',
        color: 'text-orange-500'
      },
      {
        id: 'avaliacao-desempenho',
        label: 'Avaliação de Desempenho',
        icon: Target,
        path: '/recursos-humanos/avaliacao-desempenho',
        color: 'text-red-500',
        separatorAfter: true
      },
      {
        id: 'matriz-qualificacao',
        label: 'Matriz de Qualificação',
        icon: Grid3x3,
        path: '/recursos-humanos/matriz-qualificacao',
        color: 'text-pink-600'
      },
      {
        id: 'plano-qualificacao',
        label: 'Plano de Qualificação',
        icon: BookMarked,
        path: '/recursos-humanos/plano-qualificacao',
        color: 'text-indigo-600'
      }
    ]
  },
  {
    id: 'fornecedores',
    label: 'Fornecedores',
    icon: Truck,
    defaultPath: '/fornecedores',
    sections: [
      {
        id: 'fornecedores-dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        path: '/fornecedores',
        color: 'text-blue-600'
      },
      {
        id: 'fornecedores-cadastro',
        label: 'Fornecedores',
        icon: UserCog,
        path: '/fornecedores/cadastro',
        color: 'text-purple-500'
      },
      {
        id: 'fornecedores-homologacao',
        label: 'Homologação',
        icon: ClipboardCheck,
        path: '/fornecedores/homologacao',
        color: 'text-green-500'
      },
      {
        id: 'fornecedores-avaliacoes',
        label: 'Avaliações',
        icon: Target,
        path: '/fornecedores/avaliacoes',
        color: 'text-orange-500'
      },
      {
        id: 'fornecedores-rof',
        label: 'ROF',
        icon: AlertCircle,
        path: '/fornecedores/rof',
        color: 'text-red-500'
      },
      {
        id: 'fornecedores-pedidos',
        label: 'Pedido de Compras',
        icon: ShoppingCart,
        path: '/fornecedores/pedidos',
        color: 'text-blue-500'
      },
      {
        id: 'fornecedores-recebimento',
        label: 'Recebimento',
        icon: Package,
        path: '/fornecedores/recebimento',
        color: 'text-cyan-500'
      },
      {
        id: 'fornecedores-ranking',
        label: 'Ranking',
        icon: TrendingUp,
        path: '/fornecedores/ranking',
        color: 'text-indigo-500',
        separatorAfter: true
      },
      {
        id: 'fornecedores-configuracoes',
        label: 'Configurações (Tipos)',
        icon: Settings,
        path: '/fornecedores/configuracoes',
        color: 'text-gray-600'
      }
    ]
  },
  {
    id: 'instrumentos-medicao',
    label: 'Calibração',
    icon: Gauge,
    defaultPath: '/instrumentos-medicao',
    sections: [
      {
        id: 'instrumentos-dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        path: '/instrumentos-medicao',
        color: 'text-blue-600',
        separatorAfter: true
      },
      {
        id: 'instrumentos',
        label: 'Instrumentos',
        icon: Gauge,
        path: '/instrumentos-medicao/instrumentos',
        color: 'text-slate-600'
      },
      {
        id: 'instrumentos-tipos',
        label: 'Tipos de Instrumentos',
        icon: Ruler,
        path: '/instrumentos-medicao/tipos',
        color: 'text-indigo-500'
      },
      {
        id: 'padroes',
        label: 'Lista de Padrões',
        icon: BookOpen,
        path: '/instrumentos-medicao/padroes',
        color: 'text-purple-500',
        separatorAfter: true
      },
      {
        id: 'calendario-calibracoes',
        label: 'Calendário de Calibrações',
        icon: Calendar,
        path: '/instrumentos-medicao/calendario',
        color: 'text-orange-500'
      }
    ]
  },
  {
    id: 'manutencao',
    label: 'Manutenção',
    icon: Wrench,
    defaultPath: '/manutencao',
    sections: [
      {
        id: 'manutencao-dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        path: '/manutencao',
        color: 'text-blue-600',
        separatorAfter: true,
      },
      {
        id: 'manutencao-equipamentos',
        label: 'Equipamentos',
        icon: HardHat,
        path: '/manutencao/equipamentos',
        color: 'text-slate-600',
      },
      {
        id: 'manutencao-plano',
        label: 'Planos Preventivos',
        icon: ClipboardList,
        path: '/manutencao/plano',
        color: 'text-blue-500',
      },
      {
        id: 'manutencao-agenda',
        label: 'Agenda de Manutenção',
        icon: CalendarDays,
        path: '/manutencao/agenda',
        color: 'text-blue-600',
      },
      {
        id: 'manutencao-os',
        label: 'OS - Preventivas',
        icon: ClipboardCheck,
        path: '/manutencao/os',
        color: 'text-amber-500',
      },
      {
        id: 'manutencao-corretivas',
        label: 'OS - Corretivas',
        icon: Wrench,
        path: '/manutencao/corretivas',
        color: 'text-red-500',
        separatorAfter: true,
      },
      {
        id: 'manutencao-historico',
        label: 'Histórico de Equipamentos',
        icon: History,
        path: '/manutencao/historico',
        color: 'text-purple-500',
      },
      {
        id: 'manutencao-configuracao',
        label: 'Configurações',
        icon: Settings,
        path: '/manutencao/configuracao',
        color: 'text-gray-500',
      },
    ],
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: Settings,
    defaultPath: '/configuracoes/usuarios',
    sections: [
      {
        id: 'usuarios',
        label: 'Usuários e Pessoas',
        icon: UserCog,
        path: '/configuracoes/usuarios',
        color: 'text-blue-500'
      },
      {
        id: 'departamentos',
        label: 'Departamentos',
        icon: Building2,
        path: '/configuracoes/departamentos',
        color: 'text-purple-500'
      },
      {
        id: 'funcoes',
        label: 'Cadastro de Funções',
        icon: Briefcase,
        path: '/configuracoes/funcoes',
        color: 'text-orange-500'
      },
      {
        id: 'design-system',
        label: 'Design System V2',
        icon: Palette,
        path: '/design-system',
        color: 'text-pink-500'
      },
      {
        id: 'layout-base',
        label: 'Layout Base V2',
        icon: Layout,
        path: '/layout-base',
        color: 'text-cyan-500'
      }
    ]
  }
];

export function getModuleById(moduleId: string): Module | undefined {
  return modules.find(m => m.id === moduleId);
}

export function getModuleByPath(path: string): Module | undefined {
  // Caso especial: rota raiz pertence ao módulo de Gestão Estratégica
  if (path === '/') {
    return modules[0]; // Gestão Estratégica
  }
  
  return modules.find(m => 
    m.sections.some(s => path === s.path || (s.path !== '/' && path.startsWith(s.path)))
  );
}