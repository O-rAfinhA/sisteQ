import { useState } from 'react';
import {
  Plus,
  Download,
  Filter,
  Search,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Eye,
  Edit2,
  Trash2,
  MoreHorizontal,
  HelpCircle,
  X,
  ChevronRight,
  Lightbulb,
  BookOpen,
  MessageCircle,
  ExternalLink,
  ArrowUpRight,
  Info,
  Layers,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

// ─────────────────────────────────────────────
// COMPONENTES V2 — Extraídos do Design System
// ─────────────────────────────────────────────

function PageHeaderV2({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between">
      <div className="min-w-0">
        <h1
          className="text-gray-900 tracking-tight"
          style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}
        >
          {title}
        </h1>
        <p
          className="text-gray-500 mt-1.5 max-w-xl"
          style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}
        >
          {description}
        </p>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0 ml-8 pt-1">
          {actions}
        </div>
      )}
    </div>
  );
}

function MetricCardV2({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  variant = 'default',
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const variantStyles = {
    default: {
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      valueColor: 'text-gray-900',
    },
    success: {
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      valueColor: 'text-gray-900',
    },
    warning: {
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      valueColor: 'text-gray-900',
    },
    danger: {
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
      valueColor: 'text-red-600',
    },
  };

  const trendStyles = {
    up: 'text-emerald-600',
    down: 'text-red-500',
    neutral: 'text-gray-500',
  };

  const s = variantStyles[variant];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 truncate">{label}</p>
          <p
            className={`mt-1 ${s.valueColor}`}
            style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.2 }}
          >
            {value}
          </p>
          {trendLabel && trend && (
            <div
              className={`flex items-center gap-1 mt-2.5 text-xs ${trendStyles[trend]}`}
            >
              {trend === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
              {trend === 'down' && (
                <TrendingUp className="w-3.5 h-3.5 rotate-180" />
              )}
              {trend === 'neutral' && <Clock className="w-3.5 h-3.5" />}
              <span style={{ fontWeight: 500 }}>{trendLabel}</span>
            </div>
          )}
        </div>
        <div
          className={`w-10 h-10 rounded-lg ${s.iconBg} flex items-center justify-center flex-shrink-0 ml-4 transition-transform duration-200 group-hover:scale-105`}
        >
          <Icon className={`w-5 h-5 ${s.iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function StatusBadgeV2({
  variant,
  children,
}: {
  variant: 'success' | 'info' | 'warning' | 'danger' | 'neutral';
  children: React.ReactNode;
}) {
  const styles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    neutral: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs ${styles[variant]}`}
      style={{ fontWeight: 500 }}
    >
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────

const MOCK_ITEMS = [
  {
    id: 'DOC-001',
    nome: 'Manual da Qualidade',
    tipo: 'Manual',
    departamento: 'Qualidade',
    responsavel: 'Ana Silva',
    revisao: '05',
    status: 'success' as const,
    statusLabel: 'Vigente',
    vencimento: '15/08/2026',
    progresso: 100,
  },
  {
    id: 'DOC-002',
    nome: 'Procedimento de Auditorias Internas',
    tipo: 'Procedimento',
    departamento: 'Qualidade',
    responsavel: 'Carlos Souza',
    revisao: '03',
    status: 'info' as const,
    statusLabel: 'Em Revisao',
    vencimento: '22/04/2026',
    progresso: 65,
  },
  {
    id: 'DOC-003',
    nome: 'Instrucao de Trabalho — Inspecao Final',
    tipo: 'IT',
    departamento: 'Producao',
    responsavel: 'Maria Santos',
    revisao: '02',
    status: 'warning' as const,
    statusLabel: 'Vence em 30d',
    vencimento: '18/03/2026',
    progresso: 100,
  },
  {
    id: 'DOC-004',
    nome: 'Politica de Seguranca da Informacao',
    tipo: 'Politica',
    departamento: 'TI',
    responsavel: 'Pedro Lima',
    revisao: '01',
    status: 'danger' as const,
    statusLabel: 'Vencido',
    vencimento: '10/01/2026',
    progresso: 100,
  },
  {
    id: 'DOC-005',
    nome: 'Procedimento de Controle de Registros',
    tipo: 'Procedimento',
    departamento: 'Qualidade',
    responsavel: 'Julia Costa',
    revisao: '04',
    status: 'success' as const,
    statusLabel: 'Vigente',
    vencimento: '30/11/2026',
    progresso: 100,
  },
  {
    id: 'DOC-006',
    nome: 'Plano de Contingencia Ambiental',
    tipo: 'Plano',
    departamento: 'Meio Ambiente',
    responsavel: 'Roberto Alves',
    revisao: '02',
    status: 'neutral' as const,
    statusLabel: 'Rascunho',
    vencimento: '—',
    progresso: 30,
  },
];

const SIDEBAR_TIPS = [
  {
    icon: Lightbulb,
    title: 'Dica rapida',
    text: 'Use o filtro por status para encontrar rapidamente documentos que precisam de atencao.',
  },
  {
    icon: BookOpen,
    title: 'Documentacao',
    text: 'Consulte o manual de procedimentos para entender o fluxo completo de criacao e aprovacao.',
  },
  {
    icon: MessageCircle,
    title: 'Suporte',
    text: 'Precisa de ajuda? Acesse o chat de suporte ou envie um ticket pelo modulo de atendimento.',
  },
];

const RECENT_ACTIVITY = [
  {
    action: 'Documento aprovado',
    item: 'Manual da Qualidade',
    user: 'Ana Silva',
    time: 'Ha 2h',
  },
  {
    action: 'Revisao iniciada',
    item: 'Proc. Auditorias Internas',
    user: 'Carlos Souza',
    time: 'Ha 4h',
  },
  {
    action: 'Comentario adicionado',
    item: 'IT — Inspecao Final',
    user: 'Maria Santos',
    time: 'Ontem',
  },
];

// ─────────────────────────────────────────────
// PAGINA PRINCIPAL — Layout Base V2
// ─────────────────────────────────────────────

export default function LayoutBaseV2() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchValue, setSearchValue] = useState('');

  return (
    <div className="min-h-screen bg-gray-50/80">
      {/* ══════════════════════════════════════
          BLUEPRINT BANNER — Identifica como template
          ══════════════════════════════════════ */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-[1400px] mx-auto px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-white/70" />
            </div>
            <div>
              <span
                className="text-xs text-white/50 tracking-wider uppercase"
                style={{ fontWeight: 600, letterSpacing: '0.08em' }}
              >
                SisteQ — Layout Base V2
              </span>
              <span className="text-xs text-white/30 ml-3">
                Template oficial de estrutura de pagina
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs text-white/50">max-w-[1400px]</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-xs text-white/50">p-8</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs text-white/50">gap-8</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          CONTENT SHELL
          ══════════════════════════════════════ */}
      <div className="max-w-[1400px] mx-auto px-8 py-8">
        <div
          className={`flex gap-8 transition-all duration-300 ${sidebarOpen ? '' : ''}`}
        >
          {/* ────────────────────────────────────
              MAIN CONTENT AREA
              ──────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* ═══ 1. PAGE HEADER ═══ */}
            <PageHeaderV2
              title="Documentos Internos"
              description="Gerencie procedimentos, instrucoes de trabalho e manuais do sistema de gestao."
              actions={
                <>
                  <Button
                    variant="outline"
                    className="border-gray-200 text-gray-600 hover:text-gray-900"
                  >
                    <Download className="w-4 h-4" />
                    Exportar
                  </Button>
                  <Button>
                    <Plus className="w-4 h-4" />
                    Novo Documento
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="text-gray-400 hover:text-gray-600 ml-1"
                    title={sidebarOpen ? 'Fechar ajuda' : 'Abrir ajuda'}
                  >
                    {sidebarOpen ? (
                      <PanelRightClose className="w-4 h-4" />
                    ) : (
                      <PanelRightOpen className="w-4 h-4" />
                    )}
                  </Button>
                </>
              }
            />

            {/* ═══ 2. METRIC CARDS ═══ */}
            <div className="grid grid-cols-4 gap-4">
              <MetricCardV2
                label="Total de Documentos"
                value={42}
                icon={FileText}
                trend="up"
                trendLabel="+3 este mes"
                variant="default"
              />
              <MetricCardV2
                label="Vigentes"
                value={35}
                icon={CheckCircle2}
                trend="up"
                trendLabel="83.3%"
                variant="success"
              />
              <MetricCardV2
                label="Vencem em 30 dias"
                value={4}
                icon={Clock}
                trend="neutral"
                trendLabel="Requer atencao"
                variant="warning"
              />
              <MetricCardV2
                label="Vencidos"
                value={3}
                icon={AlertTriangle}
                trend="down"
                trendLabel="Acao urgente"
                variant="danger"
              />
            </div>

            {/* ═══ 3. MAIN CONTENT — Table with toolbar ═══ */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Toolbar */}
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Buscar por nome ou codigo..."
                        className="pl-9 w-80"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                      />
                    </div>
                    <Select>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="vigente">Vigente</SelectItem>
                        <SelectItem value="revisao">Em Revisao</SelectItem>
                        <SelectItem value="vencido">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select>
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="Departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="qualidade">Qualidade</SelectItem>
                        <SelectItem value="producao">Producao</SelectItem>
                        <SelectItem value="ti">TI</SelectItem>
                        <SelectItem value="meio-ambiente">
                          Meio Ambiente
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="text-xs text-gray-400">
                    {MOCK_ITEMS.length} registros
                  </span>
                </div>
              </div>

              {/* Table */}
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/60 hover:bg-gray-50/60">
                    <TableHead className="pl-6 w-[100px]">Codigo</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead className="w-[120px]">Tipo</TableHead>
                    <TableHead className="w-[140px]">Responsavel</TableHead>
                    <TableHead className="w-[60px] text-center">Rev.</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[110px]">Vencimento</TableHead>
                    <TableHead className="text-right pr-6 w-[100px]">
                      Acoes
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_ITEMS.map((item) => (
                    <TableRow
                      key={item.id}
                      className="group cursor-pointer"
                    >
                      <TableCell className="pl-6">
                        <span
                          className="text-sm text-gray-900"
                          style={{ fontWeight: 500 }}
                        >
                          {item.id}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p
                            className="text-sm text-gray-900 truncate"
                            style={{ fontWeight: 450 }}
                          >
                            {item.nome}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {item.departamento}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {item.tipo}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {item.responsavel}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                          {item.revisao}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadgeV2 variant={item.status}>
                          {item.statusLabel}
                        </StatusBadgeV2>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {item.vencimento}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="w-4 h-4 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="w-4 h-4 text-gray-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination footer */}
              <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/40">
                <span className="text-xs text-gray-400">
                  Mostrando 1–6 de 42 registros
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" disabled className="text-xs">
                    Anterior
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 bg-gray-900 text-white hover:bg-gray-800 hover:text-white text-xs"
                  >
                    1
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-xs"
                  >
                    2
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-xs"
                  >
                    3
                  </Button>
                  <span className="text-xs text-gray-300 px-1">…</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-xs"
                  >
                    7
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs">
                    Proximo
                  </Button>
                </div>
              </div>
            </div>

            {/* ═══ 4. SECONDARY CONTENT AREA (Cards Grid) ═══ */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-gray-900"
                  style={{ fontSize: '1.125rem', fontWeight: 600 }}
                >
                  Visao por Departamento
                </h2>
                <Button
                  variant="ghost"
                  className="text-gray-500 text-sm gap-1"
                >
                  Ver todos
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    dept: 'Qualidade',
                    count: 18,
                    vigentes: 15,
                    revisao: 2,
                    vencidos: 1,
                    color: 'blue',
                  },
                  {
                    dept: 'Producao',
                    count: 12,
                    vigentes: 10,
                    revisao: 1,
                    vencidos: 1,
                    color: 'emerald',
                  },
                  {
                    dept: 'TI',
                    count: 7,
                    vigentes: 5,
                    revisao: 1,
                    vencidos: 1,
                    color: 'violet',
                  },
                ].map((dept) => (
                  <div
                    key={dept.dept}
                    className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3
                        className="text-gray-900"
                        style={{ fontSize: '0.9375rem', fontWeight: 600 }}
                      >
                        {dept.dept}
                      </h3>
                      <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>

                    <div className="flex items-end justify-between mb-4">
                      <div>
                        <p
                          className="text-gray-900"
                          style={{
                            fontSize: '1.5rem',
                            fontWeight: 600,
                            lineHeight: 1.2,
                          }}
                        >
                          {dept.count}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          documentos
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs text-gray-400">
                            Vigentes
                          </span>
                          <span
                            className="text-xs text-emerald-600"
                            style={{ fontWeight: 500 }}
                          >
                            {dept.vigentes}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs text-gray-400">
                            Em Revisao
                          </span>
                          <span
                            className="text-xs text-blue-600"
                            style={{ fontWeight: 500 }}
                          >
                            {dept.revisao}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs text-gray-400">
                            Vencidos
                          </span>
                          <span
                            className="text-xs text-red-500"
                            style={{ fontWeight: 500 }}
                          >
                            {dept.vencidos}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full">
                      <Progress
                        value={Math.round(
                          (dept.vigentes / dept.count) * 100
                        )}
                        className="h-1.5"
                        indicatorClassName={
                          dept.color === 'blue'
                            ? 'bg-blue-500'
                            : dept.color === 'emerald'
                              ? 'bg-emerald-500'
                              : 'bg-violet-500'
                        }
                      />
                      <p className="text-xs text-gray-400 mt-1.5">
                        {Math.round((dept.vigentes / dept.count) * 100)}%
                        conformidade
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ────────────────────────────────────
              CONTEXTUAL SIDEBAR (opcional)
              ──────────────────────────────────── */}
          {sidebarOpen && (
            <aside className="w-[300px] flex-shrink-0 space-y-5">
              {/* Sidebar header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                  <span
                    className="text-sm text-gray-600"
                    style={{ fontWeight: 500 }}
                  >
                    Ajuda Contextual
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </Button>
              </div>

              {/* Quick info card */}
              <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Info className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p
                      className="text-sm text-blue-900"
                      style={{ fontWeight: 500 }}
                    >
                      Sobre esta pagina
                    </p>
                    <p
                      className="text-xs text-blue-700/70 mt-1"
                      style={{ lineHeight: 1.5 }}
                    >
                      Aqui voce gerencia todos os documentos internos do
                      sistema de gestao. Documentos com vencimento proximo
                      aparecem em destaque.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p
                    className="text-xs text-gray-400 uppercase tracking-wider"
                    style={{ fontWeight: 600 }}
                  >
                    Dicas
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {SIDEBAR_TIPS.map((tip, i) => {
                    const Icon = tip.icon;
                    return (
                      <div key={i} className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p
                              className="text-sm text-gray-700"
                              style={{ fontWeight: 500 }}
                            >
                              {tip.title}
                            </p>
                            <p
                              className="text-xs text-gray-400 mt-0.5"
                              style={{ lineHeight: 1.5 }}
                            >
                              {tip.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent activity */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p
                    className="text-xs text-gray-400 uppercase tracking-wider"
                    style={{ fontWeight: 600 }}
                  >
                    Atividade Recente
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {RECENT_ACTIVITY.map((act, i) => (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-sm text-gray-700 truncate"
                            style={{ fontWeight: 450 }}
                          >
                            {act.action}
                          </p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {act.item} — {act.user}
                          </p>
                        </div>
                        <span className="text-xs text-gray-300 flex-shrink-0 ml-3">
                          {act.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick links */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p
                    className="text-xs text-gray-400 uppercase tracking-wider"
                    style={{ fontWeight: 600 }}
                  >
                    Links Rapidos
                  </p>
                </div>
                <div className="p-2">
                  {[
                    'Configurar Tipos de Documento',
                    'Relatorio de Conformidade',
                    'Guia de Revisao de Documentos',
                  ].map((link) => (
                    <button
                      key={link}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors text-left"
                    >
                      <span>{link}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-300" />
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          STRUCTURE REFERENCE FOOTER
          ══════════════════════════════════════ */}
      <div className="border-t border-gray-200 bg-white mt-8">
        <div className="max-w-[1400px] mx-auto px-8 py-8">
          <h3
            className="text-gray-900 mb-5"
            style={{ fontSize: '1rem', fontWeight: 600 }}
          >
            Anatomia da Pagina
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                num: '01',
                title: 'Page Header',
                desc: 'Titulo + descricao + botoes de acao. Sempre flex justify-between. mb-8 para separar do conteudo.',
                classes: 'flex items-start justify-between',
              },
              {
                num: '02',
                title: 'Metric Cards',
                desc: 'Grid de 3–4 cards de indicador. Cada card com icone, valor, label e trend opcional.',
                classes: 'grid grid-cols-4 gap-4',
              },
              {
                num: '03',
                title: 'Area Principal',
                desc: 'Tabela com toolbar (busca + filtros) ou grid de cards. Sempre dentro de container branco com rounded-xl.',
                classes: 'bg-white rounded-xl border',
              },
              {
                num: '04',
                title: 'Sidebar Contextual',
                desc: 'Opcional. 300px fixo, toggleavel. Dicas, atividade recente e links rapidos.',
                classes: 'w-[300px] flex-shrink-0',
              },
            ].map((block) => (
              <div
                key={block.num}
                className="bg-gray-50 rounded-xl border border-gray-200 p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-xs text-gray-400"
                    style={{ fontWeight: 600 }}
                  >
                    {block.num}
                  </span>
                  <span
                    className="text-sm text-gray-900"
                    style={{ fontWeight: 600 }}
                  >
                    {block.title}
                  </span>
                </div>
                <p
                  className="text-xs text-gray-500 mb-3"
                  style={{ lineHeight: 1.6 }}
                >
                  {block.desc}
                </p>
                <code className="text-xs bg-gray-200/60 text-gray-600 px-2 py-1 rounded font-mono block truncate">
                  {block.classes}
                </code>
              </div>
            ))}
          </div>

          {/* Spacing rules */}
          <div className="mt-6 grid grid-cols-6 gap-3">
            {[
              { label: 'Container', value: 'max-w-[1400px] mx-auto' },
              { label: 'Page padding', value: 'px-8 py-8' },
              { label: 'Secoes gap', value: 'space-y-8' },
              { label: 'Cards gap', value: 'gap-4' },
              { label: 'Border radius', value: 'rounded-xl' },
              { label: 'Sidebar width', value: 'w-[300px]' },
            ].map((rule) => (
              <div
                key={rule.label}
                className="bg-gray-900 rounded-lg px-3 py-2.5 text-center"
              >
                <p className="text-xs text-gray-400" style={{ fontWeight: 500 }}>
                  {rule.label}
                </p>
                <p
                  className="text-xs text-white mt-0.5 font-mono"
                  style={{ fontWeight: 500 }}
                >
                  {rule.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
