import { useState } from 'react';
import {
  TrendingUp,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  ArrowRight,
  Copy,
  Check,
  Palette,
  Type,
  Layout,
  Box,
  Table2,
  FormInput,
  Layers,
  ChevronRight,
  MoreHorizontal,
  Download,
  Filter,
  Settings,
  DollarSign,
  Target,
  BarChart3,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
// Design Tokens (Referência visual)
// ─────────────────────────────────────────────

const SPACING = [
  { name: 'xs', value: '4px', tw: 'p-1', usage: 'Ícones inline, micro gaps' },
  { name: 'sm', value: '8px', tw: 'p-2', usage: 'Gaps entre elementos, padding mínimo' },
  { name: 'md', value: '16px', tw: 'p-4', usage: 'Padding interno de cards, gaps de grid' },
  { name: 'lg', value: '24px', tw: 'p-6', usage: 'Padding de seções, CardHeader/CardContent' },
  { name: 'xl', value: '32px', tw: 'p-8', usage: 'Padding de página (p-8)' },
  { name: '2xl', value: '48px', tw: 'p-12', usage: 'Separação entre grandes seções' },
  { name: '3xl', value: '64px', tw: 'p-16', usage: 'Hero sections, espaçamento máximo' },
];

const SEMANTIC_COLORS = [
  { name: 'Sucesso', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', usage: 'Concluído, Vigente, Ativo, Aprovado' },
  { name: 'Info', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', usage: 'Em Andamento, Informativo, Links' },
  { name: 'Alerta', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', usage: 'Atenção, Vence em breve, Pendente' },
  { name: 'Erro', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', usage: 'Atrasado, Vencido, Bloqueado, NC' },
  { name: 'Neutro', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-400', usage: 'Não Iniciado, Rascunho, Desabilitado' },
  { name: 'Roxo', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500', usage: 'Avaliação, Revisão, Especial' },
];

// ─────────────────────────────────────────────
// Helper: Seção do DS
// ─────────────────────────────────────────────
function DSSection({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center">
          <Icon className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <h2 className="text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function CodeTag({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(children);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono hover:bg-gray-200 transition-colors cursor-pointer"
    >
      {children}
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 opacity-40" />}
    </button>
  );
}

function Swatch({ label, className, textClass }: { label: string; className: string; textClass?: string }) {
  return (
    <div className="text-center">
      <div className={`w-full h-14 rounded-lg border border-gray-200 ${className}`} />
      <p className={`text-xs mt-1.5 ${textClass || 'text-gray-500'}`}>{label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// MetricCard V2 — Componente padronizado
// ─────────────────────────────────────────────
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
    default: { iconBg: 'bg-gray-100', iconColor: 'text-gray-600', valueColor: 'text-gray-900' },
    success: { iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', valueColor: 'text-gray-900' },
    warning: { iconBg: 'bg-amber-50', iconColor: 'text-amber-600', valueColor: 'text-gray-900' },
    danger: { iconBg: 'bg-red-50', iconColor: 'text-red-600', valueColor: 'text-red-600' },
  };

  const trendStyles = {
    up: 'text-emerald-600',
    down: 'text-red-600',
    neutral: 'text-gray-500',
  };

  const s = variantStyles[variant];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 truncate">{label}</p>
          <p className={`text-2xl mt-1 ${s.valueColor}`} style={{ fontWeight: 600 }}>{value}</p>
          {trendLabel && trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${trendStyles[trend]}`}>
              {trend === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
              {trend === 'down' && <TrendingUp className="w-3.5 h-3.5 rotate-180" />}
              <span>{trendLabel}</span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg ${s.iconBg} flex items-center justify-center flex-shrink-0 ml-4`}>
          <Icon className={`w-5 h-5 ${s.iconColor}`} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PageHeader V2 — Header padronizado
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
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-gray-900" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>{title}</h1>
        <p className="text-gray-500 mt-1" style={{ fontSize: '0.9375rem' }}>{description}</p>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0 ml-6">{actions}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────
// StatusBadge V2 — Badge semântico padronizado
// ─────────────────────────────────────────────
function StatusBadgeV2({
  variant,
  children,
}: {
  variant: 'success' | 'info' | 'warning' | 'danger' | 'neutral' | 'purple';
  children: React.ReactNode;
}) {
  const styles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    neutral: 'bg-gray-100 text-gray-600 border-gray-200',
    purple: 'bg-violet-50 text-violet-700 border-violet-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs ${styles[variant]}`} style={{ fontWeight: 500 }}>
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────
// Página Principal
// ─────────────────────────────────────────────
export default function DesignSystemV2() {
  const [activeSection, setActiveSection] = useState('typography');

  const navItems = [
    { id: 'typography', label: 'Tipografia', icon: Type },
    { id: 'colors', label: 'Cores', icon: Palette },
    { id: 'spacing', label: 'Espaçamento', icon: Layout },
    { id: 'metric-cards', label: 'Cards de Indicador', icon: BarChart3 },
    { id: 'content-cards', label: 'Cards de Conteudo', icon: Box },
    { id: 'buttons', label: 'Botoes', icon: Layers },
    { id: 'badges', label: 'Badges de Status', icon: Target },
    { id: 'tables', label: 'Tabela', icon: Table2 },
    { id: 'forms', label: 'Formularios', icon: FormInput },
    { id: 'page-header', label: 'Page Header', icon: Layout },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-400 tracking-widest uppercase" style={{ fontWeight: 600, letterSpacing: '0.1em' }}>Design System</p>
              <h1 className="text-gray-900" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>SisteQ V2</h1>
            </div>
          </div>
          <p className="text-gray-500 max-w-2xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Guia de referencia visual para componentes, tipografia, cores e padroes do sistema.
            Todos os componentes seguem os principios de consistencia, clareza e hierarquia.
          </p>

          {/* Nav */}
          <div className="flex flex-wrap items-center gap-1 mt-6 -mb-px">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  style={{ fontWeight: isActive ? 500 : 400 }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-10 space-y-16">
        {/* ═══════════════════════════════════════
            1. TIPOGRAFIA
            ═══════════════════════════════════════ */}
        <DSSection
          id="typography"
          icon={Type}
          title="Tipografia"
          description="Escala tipografica oficial. Base 16px, escala harmoniza."
        >
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* H1 */}
            <div className="flex items-baseline justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex-1">
                <h1 className="text-gray-900" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
                  Titulo de Pagina (H1)
                </h1>
              </div>
              <div className="flex items-center gap-4 ml-8 flex-shrink-0">
                <span className="text-xs text-gray-400">28px / 600 / 1.3</span>
                <CodeTag>{'style={{ fontSize: "1.75rem", fontWeight: 600 }}'}</CodeTag>
              </div>
            </div>

            {/* H2 */}
            <div className="flex items-baseline justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex-1">
                <h2 className="text-gray-900" style={{ fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 }}>
                  Titulo de Secao (H2)
                </h2>
              </div>
              <div className="flex items-center gap-4 ml-8 flex-shrink-0">
                <span className="text-xs text-gray-400">20px / 600 / 1.4</span>
                <CodeTag>{'style={{ fontSize: "1.25rem", fontWeight: 600 }}'}</CodeTag>
              </div>
            </div>

            {/* H3 */}
            <div className="flex items-baseline justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex-1">
                <h3 className="text-gray-900" style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.5 }}>
                  Subtitulo / Card Title (H3)
                </h3>
              </div>
              <div className="flex items-center gap-4 ml-8 flex-shrink-0">
                <span className="text-xs text-gray-400">16px / 600 / 1.5</span>
                <CodeTag>{'style={{ fontSize: "1rem", fontWeight: 600 }}'}</CodeTag>
              </div>
            </div>

            {/* Body */}
            <div className="flex items-baseline justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex-1">
                <p className="text-gray-700" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
                  Corpo de texto padrao. Usado para descricoes, paragrafos e conteudo geral das telas. (Body)
                </p>
              </div>
              <div className="flex items-center gap-4 ml-8 flex-shrink-0">
                <span className="text-xs text-gray-400">15px / 400 / 1.6</span>
                <CodeTag>{'text-sm text-gray-700'}</CodeTag>
              </div>
            </div>

            {/* Label */}
            <div className="flex items-baseline justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex-1">
                <span className="text-gray-700" style={{ fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.5 }}>
                  Label de formulario / Rotulo de campo (Label)
                </span>
              </div>
              <div className="flex items-center gap-4 ml-8 flex-shrink-0">
                <span className="text-xs text-gray-400">14px / 500 / 1.5</span>
                <CodeTag>{'<Label>'}</CodeTag>
              </div>
            </div>

            {/* Caption */}
            <div className="flex items-baseline justify-between px-6 py-5">
              <div className="flex-1">
                <span className="text-gray-400" style={{ fontSize: '0.75rem', lineHeight: 1.5 }}>
                  Texto auxiliar, descricoes de campo, timestamps, metadados (Caption)
                </span>
              </div>
              <div className="flex items-center gap-4 ml-8 flex-shrink-0">
                <span className="text-xs text-gray-400">12px / 400 / 1.5</span>
                <CodeTag>{'text-xs text-gray-400'}</CodeTag>
              </div>
            </div>
          </div>
        </DSSection>

        {/* ═══════════════════════════════════════
            2. CORES
            ═══════════════════════════════════════ */}
        <DSSection
          id="colors"
          icon={Palette}
          title="Sistema de Cores"
          description="Paleta semantica — cada cor tem um significado funcional, nao decorativo."
        >
          {/* Core Palette */}
          <div className="mb-8">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3" style={{ fontWeight: 600 }}>Paleta Base</p>
            <div className="grid grid-cols-8 gap-3">
              <Swatch label="Gray 900" className="bg-gray-900" />
              <Swatch label="Gray 700" className="bg-gray-700" />
              <Swatch label="Gray 500" className="bg-gray-500" />
              <Swatch label="Gray 300" className="bg-gray-300" />
              <Swatch label="Gray 100" className="bg-gray-100" />
              <Swatch label="Gray 50" className="bg-gray-50" />
              <Swatch label="White" className="bg-white" />
              <Swatch label="Blue 600" className="bg-blue-600" />
            </div>
          </div>

          {/* Semantic Colors */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3" style={{ fontWeight: 600 }}>Cores Semanticas (Badges & Status)</p>
            <div className="grid grid-cols-1 gap-2">
              {SEMANTIC_COLORS.map((c) => (
                <div
                  key={c.name}
                  className={`flex items-center gap-4 px-4 py-3 rounded-lg border ${c.border} ${c.bg}`}
                >
                  <div className={`w-3 h-3 rounded-full ${c.dot} flex-shrink-0`} />
                  <span className={`text-sm ${c.text} w-20 flex-shrink-0`} style={{ fontWeight: 600 }}>{c.name}</span>
                  <span className={`text-sm ${c.text} flex-1`}>{c.usage}</span>
                  <div className="flex gap-2 flex-shrink-0">
                    <CodeTag>{c.bg}</CodeTag>
                    <CodeTag>{c.text}</CodeTag>
                    <CodeTag>{c.border}</CodeTag>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DSSection>

        {/* ═══════════════════════════════════════
            3. ESPAÇAMENTO
            ═══════════════════════════════════════ */}
        <DSSection
          id="spacing"
          icon={Layout}
          title="Sistema de Espacamento"
          description="Base 4px. Todas as distancias sao multiplos de 4. Padrao principal: base 8px."
        >
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {SPACING.map((sp, i) => (
              <div
                key={sp.name}
                className={`flex items-center gap-6 px-6 py-4 ${i < SPACING.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <span className="text-sm text-gray-900 w-10 flex-shrink-0" style={{ fontWeight: 600 }}>{sp.name}</span>
                <span className="text-sm text-gray-500 w-14 flex-shrink-0">{sp.value}</span>
                <div className="flex-1 flex items-center">
                  <div
                    className="bg-blue-100 border border-blue-200 rounded"
                    style={{ width: sp.value, height: '24px' }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-64 flex-shrink-0">{sp.usage}</span>
                <CodeTag>{sp.tw}</CodeTag>
              </div>
            ))}
          </div>

          {/* Visual reference */}
          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-4" style={{ fontWeight: 600 }}>Referencia Visual: Padrao de Pagina</p>
            <div className="border-2 border-dashed border-blue-200 rounded-xl p-8 bg-blue-50/30">
              <div className="text-xs text-blue-500 mb-2" style={{ fontWeight: 500 }}>Padding de pagina: p-8 (32px)</div>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="text-xs text-gray-400 mb-2" style={{ fontWeight: 500 }}>Card padding: p-6 (24px)</div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-xs text-gray-400" style={{ fontWeight: 500 }}>Conteudo interno: p-4 (16px)</div>
                </div>
              </div>
            </div>
          </div>
        </DSSection>

        {/* ═══════════════════════════════════════
            4. CARDS DE INDICADOR (Mini Dashboard)
            ═══════════════════════════════════════ */}
        <DSSection
          id="metric-cards"
          icon={BarChart3}
          title="Card de Indicador (MetricCard)"
          description="Componente padrao para KPIs e metricas. Grid de 4 colunas no desktop."
        >
          {/* Exemplo principal */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <MetricCardV2
              label="Total de Documentos"
              value={127}
              icon={FileText}
              trend="up"
              trendLabel="+12 este mes"
              variant="default"
            />
            <MetricCardV2
              label="Conformes"
              value={98}
              icon={CheckCircle2}
              trend="up"
              trendLabel="77.2%"
              variant="success"
            />
            <MetricCardV2
              label="Vencem em 30 dias"
              value={14}
              icon={Clock}
              trend="neutral"
              trendLabel="Acao necessaria"
              variant="warning"
            />
            <MetricCardV2
              label="Nao Conformidades"
              value={5}
              icon={AlertTriangle}
              trend="down"
              trendLabel="-2 vs. anterior"
              variant="danger"
            />
          </div>

          {/* Specs */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3" style={{ fontWeight: 600 }}>Especificacoes</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Container</span>
                <CodeTag>bg-white rounded-xl border border-gray-200 p-5</CodeTag>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Icone container</span>
                <CodeTag>w-10 h-10 rounded-lg</CodeTag>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Valor</span>
                <span className="text-gray-400 text-xs">text-2xl / fontWeight: 600</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Label</span>
                <CodeTag>text-sm text-gray-500</CodeTag>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Trend</span>
                <CodeTag>text-xs + icone 3.5</CodeTag>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Grid</span>
                <CodeTag>grid grid-cols-4 gap-4</CodeTag>
              </div>
            </div>
          </div>
        </DSSection>

        {/* ═══════════════════════════════════════
            5. CARDS DE CONTEUDO
            ═══════════════════════════════════════ */}
        <DSSection
          id="content-cards"
          icon={Box}
          title="Card de Conteudo"
          description="Card padrao para secoes, formularios e agrupamento de conteudo."
        >
          <div className="grid grid-cols-2 gap-6">
            {/* Card simples */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-6 pt-5 pb-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-gray-900" style={{ fontSize: '1rem', fontWeight: 600 }}>Titulo do Card</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Descricao breve do conteudo desta secao.</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </Button>
                </div>
              </div>
              <div className="px-6 py-5">
                <p className="text-sm text-gray-600" style={{ lineHeight: 1.6 }}>
                  Conteudo do card com padding padronizado de 24px (p-6) horizontal
                  e 20px (py-5) vertical. Border-radius de 12px (rounded-xl) em todos os cards.
                </p>
              </div>
            </div>

            {/* Card com destaque */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-6 pt-5 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-gray-900" style={{ fontSize: '1rem', fontWeight: 600 }}>Card com Icone</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Variante com icone no header.</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Progresso</span>
                      <span className="text-gray-900" style={{ fontWeight: 500 }}>72%</span>
                    </div>
                    <Progress value={72} className="h-2" indicatorClassName="bg-blue-600" />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">5 de 7 tarefas concluidas</span>
                  <StatusBadgeV2 variant="info">Em Andamento</StatusBadgeV2>
                </div>
              </div>
            </div>
          </div>

          {/* Specs */}
          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3" style={{ fontWeight: 600 }}>Especificacoes</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Container</span>
                <CodeTag>bg-white rounded-xl border border-gray-200</CodeTag>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Header padding</span>
                <CodeTag>px-6 pt-5 pb-4 border-b border-gray-100</CodeTag>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Body padding</span>
                <CodeTag>px-6 py-5</CodeTag>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Border-radius</span>
                <CodeTag>rounded-xl (12px)</CodeTag>
              </div>
            </div>
          </div>
        </DSSection>

        {/* ═══════════════════════════════════════
            6. BOTOES
            ═══════════════════════════════════════ */}
        <DSSection
          id="buttons"
          icon={Layers}
          title="Botoes"
          description="Sistema de botoes baseado no componente Button existente. 3 variantes principais."
        >
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {/* Primary */}
            <div className="mb-8">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3" style={{ fontWeight: 600 }}>Primary — Acao principal da pagina</p>
              <div className="flex items-center gap-3 flex-wrap">
                <Button>
                  <Plus className="w-4 h-4" />
                  Novo Registro
                </Button>
                <Button>
                  Salvar Alteracoes
                </Button>
                <Button size="sm">
                  <Plus className="w-4 h-4" />
                  Adicionar
                </Button>
                <Button size="lg">
                  <Download className="w-4 h-4" />
                  Exportar Relatorio
                </Button>
                <Button disabled>
                  Desabilitado
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Usar: <strong>1 por secao/pagina</strong>. Acao mais importante. Sempre com icone quando cria algo novo.
              </p>
            </div>

            {/* Secondary / Outline */}
            <div className="mb-8">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3" style={{ fontWeight: 600 }}>Outline — Acoes secundarias</p>
              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="outline">
                  <Filter className="w-4 h-4" />
                  Filtrar
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4" />
                  Exportar
                </Button>
                <Button variant="outline" size="sm">
                  <Edit2 className="w-4 h-4" />
                  Editar
                </Button>
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4" />
                  Visualizar
                </Button>
                <Button variant="outline" disabled>
                  Desabilitado
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Usar: acoes de suporte. Filtros, exportacoes, acoes secundarias em headers.
              </p>
            </div>

            {/* Ghost */}
            <div className="mb-8">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3" style={{ fontWeight: 600 }}>Ghost — Acoes terciarias e contextuais</p>
              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="ghost" size="sm">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                  Configurar
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Usar: acoes em linhas de tabela, icones de acao, menus contextuais. Minimo impacto visual.
              </p>
            </div>

            {/* Destructive */}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3" style={{ fontWeight: 600 }}>Destructive — Acoes perigosas</p>
              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4" />
                  Excluir Registro
                </Button>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4" />
                  Remover
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Usar: exclusoes, acoes irreversiveis. Sempre com confirmacao.
              </p>
            </div>
          </div>
        </DSSection>

        {/* ═══════════════════════════════════════
            7. BADGES DE STATUS
            ═══════════════════════════════════════ */}
        <DSSection
          id="badges"
          icon={Target}
          title="Badges de Status"
          description="Badges semanticos padronizados. Cada variante tem significado unico."
        >
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="grid grid-cols-3 gap-6">
              {/* Coluna 1 */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-3" style={{ fontWeight: 600 }}>Success</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <StatusBadgeV2 variant="success">Concluido</StatusBadgeV2>
                    <StatusBadgeV2 variant="success">Vigente</StatusBadgeV2>
                    <StatusBadgeV2 variant="success">Ativo</StatusBadgeV2>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-3" style={{ fontWeight: 600 }}>Info</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <StatusBadgeV2 variant="info">Em Andamento</StatusBadgeV2>
                    <StatusBadgeV2 variant="info">Em Analise</StatusBadgeV2>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-3" style={{ fontWeight: 600 }}>Warning</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <StatusBadgeV2 variant="warning">Pendente</StatusBadgeV2>
                    <StatusBadgeV2 variant="warning">Vence em 30d</StatusBadgeV2>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-3" style={{ fontWeight: 600 }}>Danger</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <StatusBadgeV2 variant="danger">Atrasado</StatusBadgeV2>
                    <StatusBadgeV2 variant="danger">Vencido</StatusBadgeV2>
                    <StatusBadgeV2 variant="danger">NC</StatusBadgeV2>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-3" style={{ fontWeight: 600 }}>Neutral</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <StatusBadgeV2 variant="neutral">Nao Iniciado</StatusBadgeV2>
                    <StatusBadgeV2 variant="neutral">Rascunho</StatusBadgeV2>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-3" style={{ fontWeight: 600 }}>Purple</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <StatusBadgeV2 variant="purple">Em Revisao</StatusBadgeV2>
                    <StatusBadgeV2 variant="purple">Avaliacao</StatusBadgeV2>
                  </div>
                </div>
              </div>
            </div>

            {/* Mapping table */}
            <div className="mt-8 border-t border-gray-100 pt-6">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3" style={{ fontWeight: 600 }}>Mapeamento de Status do Sistema</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2"><StatusBadgeV2 variant="success">success</StatusBadgeV2><span className="text-gray-500">Concluido, Vigente, Ativo, Regular, Homologado, Aprovado, Eficaz</span></div>
                  <div className="flex items-center gap-2"><StatusBadgeV2 variant="info">info</StatusBadgeV2><span className="text-gray-500">Em Andamento, Em Analise, Em Homologacao, Valido</span></div>
                  <div className="flex items-center gap-2"><StatusBadgeV2 variant="warning">warning</StatusBadgeV2><span className="text-gray-500">Pendente, Atencao, Vence em Breve, Aguardando Validacao</span></div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2"><StatusBadgeV2 variant="danger">danger</StatusBadgeV2><span className="text-gray-500">Atrasado, Vencido, Bloqueado, NC, Irregular, Reprovado</span></div>
                  <div className="flex items-center gap-2"><StatusBadgeV2 variant="neutral">neutral</StatusBadgeV2><span className="text-gray-500">Nao Iniciado, Rascunho, Obsoleto, Desatualizado</span></div>
                  <div className="flex items-center gap-2"><StatusBadgeV2 variant="purple">purple</StatusBadgeV2><span className="text-gray-500">Em Revisao, Avaliacao de Eficacia, Em Aprovacao, Em Renovacao</span></div>
                </div>
              </div>
            </div>
          </div>
        </DSSection>

        {/* ═══════════════════════════════════════
            8. TABELA PADRAO
            ═══════════════════════════════════════ */}
        <DSSection
          id="tables"
          icon={Table2}
          title="Tabela Padrao"
          description="Estrutura de tabela oficial para listagens. Usa componentes Table do shadcn/ui."
        >
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Table toolbar */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar registros..."
                    className="pl-9 w-72"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4" />
                  Filtros
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">5 registros</span>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4" />
                  Exportar
                </Button>
              </div>
            </div>

            {/* Table */}
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                  <TableHead className="pl-6">Codigo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Responsavel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead className="text-right pr-6">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { cod: 'PA-001', nome: 'Calibracao de instrumentos', dept: 'Qualidade', resp: 'Ana Silva', status: 'success' as const, statusLabel: 'Concluido', prazo: '15/02/2026' },
                  { cod: 'PA-002', nome: 'Treinamento ISO 9001', dept: 'RH', resp: 'Carlos Souza', status: 'info' as const, statusLabel: 'Em Andamento', prazo: '28/03/2026' },
                  { cod: 'PA-003', nome: 'Atualizacao de procedimento', dept: 'Producao', resp: 'Maria Santos', status: 'warning' as const, statusLabel: 'Pendente', prazo: '05/03/2026' },
                  { cod: 'PA-004', nome: 'Avaliacao fornecedor critico', dept: 'Compras', resp: 'Pedro Lima', status: 'danger' as const, statusLabel: 'Atrasado', prazo: '10/01/2026' },
                  { cod: 'PA-005', nome: 'Revisao de mapa de processos', dept: 'Qualidade', resp: 'Julia Costa', status: 'neutral' as const, statusLabel: 'Nao Iniciado', prazo: '20/04/2026' },
                ].map((row) => (
                  <TableRow key={row.cod}>
                    <TableCell className="pl-6">
                      <span className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{row.cod}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-700">{row.nome}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">{row.dept}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">{row.resp}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadgeV2 variant={row.status}>{row.statusLabel}</StatusBadgeV2>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">{row.prazo}</span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Eye className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Trash2 className="w-4 h-4 text-gray-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Table footer */}
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <span className="text-xs text-gray-400">Mostrando 5 de 5 registros</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" disabled>Anterior</Button>
                <Button variant="ghost" size="sm" className="bg-gray-900 text-white hover:bg-gray-800 hover:text-white">1</Button>
                <Button variant="ghost" size="sm">Proximo</Button>
              </div>
            </div>
          </div>
        </DSSection>

        {/* ═══════════════════════════════════════
            9. FORMULARIOS
            ═══════════════════════════════════════ */}
        <DSSection
          id="forms"
          icon={FormInput}
          title="Campos de Formulario"
          description="Padroes oficiais para campos de entrada, selects e textareas."
        >
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Input simples */}
              <div className="space-y-2">
                <Label>Nome do Documento *</Label>
                <Input placeholder="Ex: Procedimento de Calibracao" />
                <p className="text-xs text-gray-400">Campo obrigatorio. Texto auxiliar abaixo do campo.</p>
              </div>

              {/* Input com busca */}
              <div className="space-y-2">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input placeholder="Buscar por nome, codigo..." className="pl-9" />
                </div>
                <p className="text-xs text-gray-400">Variante com icone de busca integrado.</p>
              </div>

              {/* Select */}
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qualidade">Qualidade</SelectItem>
                    <SelectItem value="producao">Producao</SelectItem>
                    <SelectItem value="rh">Recursos Humanos</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">Select padrao com placeholder descritivo.</p>
              </div>

              {/* Input desabilitado */}
              <div className="space-y-2">
                <Label>Codigo (auto-gerado)</Label>
                <Input value="PA-006" disabled />
                <p className="text-xs text-gray-400">Campo somente leitura / desabilitado.</p>
              </div>

              {/* Textarea */}
              <div className="space-y-2 col-span-2">
                <Label>Descricao da Nao Conformidade</Label>
                <Textarea
                  placeholder="Descreva detalhadamente a nao conformidade identificada..."
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-gray-400">Textarea para textos longos. Altura minima de 4 linhas. Resize desabilitado.</p>
              </div>
            </div>

            {/* Padrao de formulario completo */}
            <div className="mt-8 border-t border-gray-100 pt-6">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-4" style={{ fontWeight: 600 }}>Padrao de Layout: Formulario</p>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Data Inicio</Label>
                  <Input type="date" defaultValue="2026-02-21" />
                </div>
                <div className="space-y-2">
                  <Label>Prazo Final</Label>
                  <Input type="date" defaultValue="2026-04-30" />
                </div>
                <div className="space-y-2">
                  <Label>Investimento</Label>
                  <Input placeholder="R$ 0,00" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <Button variant="outline">Cancelar</Button>
                <Button>Salvar Registro</Button>
              </div>
            </div>
          </div>

          {/* Specs */}
          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3" style={{ fontWeight: 600 }}>Regras de Formulario</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Gap entre Label e campo</span>
                <CodeTag>space-y-2 (8px)</CodeTag>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Gap entre campos (grid)</span>
                <CodeTag>gap-4 (16px) ou gap-6 (24px)</CodeTag>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Texto auxiliar</span>
                <CodeTag>text-xs text-gray-400</CodeTag>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Botoes de acao</span>
                <span className="text-xs text-gray-400">Sempre alinhados a direita, Outline + Primary</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Grid de campos</span>
                <CodeTag>grid-cols-2 ou grid-cols-3</CodeTag>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Campos obrigatorios</span>
                <span className="text-xs text-gray-400">Indicar com * no Label</span>
              </div>
            </div>
          </div>
        </DSSection>

        {/* ═══════════════════════════════════════
            10. PAGE HEADER PADRAO
            ═══════════════════════════════════════ */}
        <DSSection
          id="page-header"
          icon={Layout}
          title="Page Header Padrao"
          description="Header de pagina oficial. Padrao consistente para todas as telas."
        >
          <div className="space-y-6">
            {/* Exemplo 1: Simples */}
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-4" style={{ fontWeight: 600 }}>Variante 1: Header Simples</p>
              <div className="border border-dashed border-gray-300 rounded-lg p-8 bg-gray-50/30">
                <PageHeaderV2
                  title="Plano de Acoes (PA)"
                  description="Gerencie os planos de acoes vinculados a nao conformidades e melhorias."
                  actions={
                    <Button>
                      <Plus className="w-4 h-4" />
                      Novo Plano de Acoes
                    </Button>
                  }
                />
              </div>
            </div>

            {/* Exemplo 2: Com filtros */}
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-4" style={{ fontWeight: 600 }}>Variante 2: Header + Metricas + Filtros</p>
              <div className="border border-dashed border-gray-300 rounded-lg p-8 bg-gray-50/30">
                <PageHeaderV2
                  title="Documentos Internos"
                  description="Gerencie procedimentos, instrucoes e manuais da organizacao."
                  actions={
                    <>
                      <Button variant="outline">
                        <Download className="w-4 h-4" />
                        Exportar
                      </Button>
                      <Button>
                        <Plus className="w-4 h-4" />
                        Novo Documento
                      </Button>
                    </>
                  }
                />

                {/* Metric Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <MetricCardV2 label="Total" value={42} icon={FileText} variant="default" />
                  <MetricCardV2 label="Vigentes" value={35} icon={CheckCircle2} variant="success" />
                  <MetricCardV2 label="Em Revisao" value={4} icon={Clock} variant="warning" />
                  <MetricCardV2 label="Vencidos" value={3} icon={AlertTriangle} variant="danger" />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input placeholder="Buscar documentos..." className="pl-9" />
                  </div>
                  <Select>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="vigente">Vigente</SelectItem>
                      <SelectItem value="revisao">Em Revisao</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="qualidade">Qualidade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Container spec */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3" style={{ fontWeight: 600 }}>Regras de Container de Pagina</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Padding de pagina</span>
                  <CodeTag>p-8</CodeTag>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Max-width padrao</span>
                  <CodeTag>max-w-[1400px] mx-auto</CodeTag>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">H1 titulo</span>
                  <span className="text-xs text-gray-400">28px / 600 / text-gray-900</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Descricao</span>
                  <CodeTag>text-gray-500 mt-1</CodeTag>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Gap header → conteudo</span>
                  <CodeTag>mb-8</CodeTag>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Gap metricas → conteudo</span>
                  <CodeTag>mb-6</CodeTag>
                </div>
              </div>
            </div>
          </div>
        </DSSection>

        {/* ═══════════════════════════════════════
            RESUMO GLOBAL
            ═══════════════════════════════════════ */}
        <section className="bg-gray-900 rounded-2xl p-8 text-white">
          <h2 className="text-white mb-6" style={{ fontSize: '1.25rem', fontWeight: 600 }}>Resumo — Regras de Ouro</h2>
          <div className="grid grid-cols-3 gap-8">
            <div>
              <h3 className="text-white mb-3" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>Layout</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  Todas as paginas: <strong className="text-white">p-8 max-w-[1400px] mx-auto</strong>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  Cards: <strong className="text-white">rounded-xl border border-gray-200</strong>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  Sem shadow por padrao. <strong className="text-white">hover:shadow-sm</strong> nos MetricCards
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white mb-3" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>Cores</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  6 variantes semanticas: <strong className="text-white">success, info, warning, danger, neutral, purple</strong>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  Padrao: <strong className="text-white">bg-[cor]-50 text-[cor]-700 border-[cor]-200</strong>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  Accent color do sistema: <strong className="text-white">blue-600</strong>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white mb-3" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>Componentes</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  MetricCard: <strong className="text-white">grid-cols-4, max 4 por linha</strong>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  Tabela: <strong className="text-white">sempre com toolbar (busca + filtros)</strong>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  Botoes: <strong className="text-white">Primary (1/pag), Outline, Ghost, Destructive</strong>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
