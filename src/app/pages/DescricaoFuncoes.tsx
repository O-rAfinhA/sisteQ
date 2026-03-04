import {
  GraduationCap, Plus, Edit2, Trash2, Save, X, Languages, Clock,
  Brain, Shield, Eye, Search, CheckCircle2, Users, FileText,
  ChevronRight, AlertCircle, BookOpen
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { generateId, getFromStorage } from '../utils/helpers';
import { useLocalStorage } from '../hooks';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';

// ── Interfaces (não renomear) ─────────────────────────────────────────────────
interface Escolaridade {
  id: string;
  nivel: string;
  situacao: string;
  area: string;
}

interface Idioma {
  id: string;
  idioma: string;
  nivel: string;
}

interface Experiencia {
  id: string;
  tempo: string;
  area: string;
  detalhamento: string;
  tipoFuncao: string;
}

interface Responsabilidade {
  id: string;
  descricao: string;
  tipo: 'responsabilidade' | 'atividade' | 'autoridade';
}

interface DescricaoFuncao {
  id: string;
  numero: string;
  funcao: string;
  escolaridades: Escolaridade[];
  idiomas: Idioma[];
  experiencias: Experiencia[];
  conhecimentos: string;
  habilidades: string;
  treinamentos: string;
  responsabilidades: Responsabilidade[];
  dataCadastro: string;
  dataAtualizacao: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const NIVEL_CORES: Record<string, string> = {
  Básico: 'bg-gray-100 text-gray-600',
  Intermediário: 'bg-blue-50 text-blue-700',
  Avançado: 'bg-purple-50 text-purple-700',
  Fluente: 'bg-indigo-50 text-indigo-700',
  Nativo: 'bg-green-50 text-green-700',
};

function formatDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function completude(d: DescricaoFuncao): number {
  let pts = 0;
  if (d.escolaridades.length > 0) pts++;
  if (d.idiomas.length > 0) pts++;
  if (d.experiencias.length > 0) pts++;
  if (d.conhecimentos) pts++;
  if (d.habilidades) pts++;
  if (d.responsabilidades.length > 0) pts++;
  return Math.round((pts / 6) * 100);
}

// ── Componente principal ──────────────────────────────────────────────────────
export function DescricaoFuncoes() {
  const [descricoes, setDescricoes] = useLocalStorage<DescricaoFuncao[]>('sisteq-descricao-funcoes', []);
  const [funcoes, setFuncoes] = useState<string[]>([]);
  const [selectedFuncao, setSelectedFuncao] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'view'>('edit');

  const [modalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [funcaoSearch, setFuncaoSearch] = useState('');
  const funcaoSearchInputRef = useRef<HTMLInputElement | null>(null);
  const lastModalTriggerRef = useRef<HTMLElement | null>(null);

  // Toggle de seções abertas no formulário
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    escolaridade: true, idiomas: true, experiencia: true, cht: true, responsabilidades: true
  });

  // Formulários de adição
  const [showEscolaridadeForm, setShowEscolaridadeForm] = useState(false);
  const [showIdiomaForm, setShowIdiomaForm] = useState(false);
  const [showExperienciaForm, setShowExperienciaForm] = useState(false);
  const [showResponsabilidadeForm, setShowResponsabilidadeForm] = useState(false);

  const [currentDescricao, setCurrentDescricao] = useState<Omit<DescricaoFuncao, 'id' | 'dataCadastro' | 'dataAtualizacao'>>({
    numero: '', funcao: '', escolaridades: [], idiomas: [], experiencias: [],
    conhecimentos: '', habilidades: '', treinamentos: '', responsabilidades: []
  });

  const [escolaridadeForm, setEscolaridadeForm] = useState<Omit<Escolaridade, 'id'>>({ nivel: '', situacao: '', area: '' });
  const [idiomaForm, setIdiomaForm] = useState<Omit<Idioma, 'id'>>({ idioma: '', nivel: '' });
  const [experienciaForm, setExperienciaForm] = useState<Omit<Experiencia, 'id'>>({ tempo: '', area: '', detalhamento: '', tipoFuncao: '' });
  const [responsabilidadeForm, setResponsabilidadeForm] = useState<Omit<Responsabilidade, 'id'>>({ descricao: '', tipo: 'responsabilidade' });

  useEffect(() => {
    const funcoesData = getFromStorage<any[]>('funcoes', []);
    setFuncoes(funcoesData.filter((f: any) => f.ativo).map((f: any) => f.nome));
  }, []);

  const generateNextNumero = (): string => {
    if (descricoes.length === 0) return 'DC01';
    const numeros = descricoes.map(d => d.numero).filter(n => n.startsWith('DC'))
      .map(n => parseInt(n.substring(2))).filter(n => !isNaN(n));
    const maxNum = numeros.length > 0 ? Math.max(...numeros) : 0;
    return `DC${String(maxNum + 1).padStart(2, '0')}`;
  };

  const handleSelectFuncao = (funcao: string, mode: 'edit' | 'view' = 'edit') => {
    setSelectedFuncao(funcao);
    setViewMode(mode);
    const existing = descricoes.find(d => d.funcao === funcao);
    if (existing) {
      setEditingId(existing.id);
      setCurrentDescricao({
        numero: existing.numero, funcao: existing.funcao,
        escolaridades: existing.escolaridades, idiomas: existing.idiomas,
        experiencias: existing.experiencias, conhecimentos: existing.conhecimentos,
        habilidades: existing.habilidades, treinamentos: existing.treinamentos,
        responsabilidades: existing.responsabilidades
      });
    } else {
      setEditingId(null);
      setCurrentDescricao({
        numero: generateNextNumero(), funcao,
        escolaridades: [], idiomas: [], experiencias: [],
        conhecimentos: '', habilidades: '', treinamentos: '', responsabilidades: []
      });
    }
  };

  const handleNova = () => {
    handleCancel();
    setFuncaoSearch('');
    setModalOpen(true);
  };

  const handleEditCard = (funcao: string) => {
    handleSelectFuncao(funcao, 'edit');
    setModalOpen(true);
  };

  const handleViewCard = (funcao: string) => {
    handleSelectFuncao(funcao, 'view');
    setModalOpen(true);
  };

  const handleModalChange = (open: boolean) => {
    if (!open) {
      setModalOpen(false);
      handleCancel();
      setTimeout(() => {
        lastModalTriggerRef.current?.focus();
      }, 0);
    }
  };

  // ── Handlers Escolaridade ─────────────────────────────────────────────────
  const addEscolaridade = () => {
    if (!escolaridadeForm.nivel) { toast.error('Preencha pelo menos o nível de escolaridade'); return; }
    setCurrentDescricao({ ...currentDescricao, escolaridades: [...currentDescricao.escolaridades, { id: generateId(), ...escolaridadeForm }] });
    setEscolaridadeForm({ nivel: '', situacao: '', area: '' });
    setShowEscolaridadeForm(false);
  };
  const removeEscolaridade = (id: string) =>
    setCurrentDescricao({ ...currentDescricao, escolaridades: currentDescricao.escolaridades.filter(e => e.id !== id) });

  // ── Handlers Idioma ───────────────────────────────────────────────────────
  const addIdioma = () => {
    if (!idiomaForm.idioma || !idiomaForm.nivel) { toast.error('Preencha o idioma e o nível'); return; }
    setCurrentDescricao({ ...currentDescricao, idiomas: [...currentDescricao.idiomas, { id: generateId(), ...idiomaForm }] });
    setIdiomaForm({ idioma: '', nivel: '' });
    setShowIdiomaForm(false);
  };
  const removeIdioma = (id: string) =>
    setCurrentDescricao({ ...currentDescricao, idiomas: currentDescricao.idiomas.filter(i => i.id !== id) });

  // ── Handlers Experiência ──────────────────────────────────────────────────
  const addExperiencia = () => {
    if (!experienciaForm.tempo || !experienciaForm.area) { toast.error('Preencha o tempo e a área de experiência'); return; }
    setCurrentDescricao({ ...currentDescricao, experiencias: [...currentDescricao.experiencias, { id: generateId(), ...experienciaForm }] });
    setExperienciaForm({ tempo: '', area: '', detalhamento: '', tipoFuncao: '' });
    setShowExperienciaForm(false);
  };
  const removeExperiencia = (id: string) =>
    setCurrentDescricao({ ...currentDescricao, experiencias: currentDescricao.experiencias.filter(e => e.id !== id) });

  // ── Handlers Responsabilidade ─────────────────────────────────────────────
  const addResponsabilidade = () => {
    if (!responsabilidadeForm.descricao) { toast.error('Preencha a descrição'); return; }
    setCurrentDescricao({ ...currentDescricao, responsabilidades: [...currentDescricao.responsabilidades, { id: generateId(), ...responsabilidadeForm }] });
    setResponsabilidadeForm({ descricao: '', tipo: 'responsabilidade' });
    setShowResponsabilidadeForm(false);
  };
  const removeResponsabilidade = (id: string) =>
    setCurrentDescricao({ ...currentDescricao, responsabilidades: currentDescricao.responsabilidades.filter(r => r.id !== id) });

  // ── Salvar / Cancelar / Deletar ───────────────────────────────────────────
  const handleSave = () => {
    if (isSaving) return;
    if (!selectedFuncao) { toast.error('Selecione uma função'); return; }
    const now = new Date().toISOString();
    setIsSaving(true);
    try {
      if (editingId) {
        setDescricoes(descricoes.map(d => d.id === editingId ? { ...currentDescricao, id: editingId, dataCadastro: d.dataCadastro, dataAtualizacao: now } : d));
        toast.success('Descrição atualizada com sucesso.');
      } else {
        const newDesc: DescricaoFuncao = { id: generateId(), ...currentDescricao, dataCadastro: now, dataAtualizacao: now };
        setDescricoes([...descricoes, newDesc]);
        setEditingId(newDesc.id);
        toast.success('Descrição cadastrada com sucesso.');
      }
      setModalOpen(false);
      handleCancel();
    } catch {
      toast.error('Não foi possível salvar a descrição.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedFuncao('');
    setEditingId(null);
    setViewMode('edit');
    setCurrentDescricao({ numero: '', funcao: '', escolaridades: [], idiomas: [], experiencias: [], conhecimentos: '', habilidades: '', treinamentos: '', responsabilidades: [] });
    setShowEscolaridadeForm(false);
    setShowIdiomaForm(false);
    setShowExperienciaForm(false);
    setShowResponsabilidadeForm(false);
  };

  const handleDelete = (id: string) => {
    const desc = descricoes.find(d => d.id === id);
    if (desc && confirm(`Deseja realmente excluir a descrição da função "${desc.funcao}"?`)) {
      setDescricoes(descricoes.filter(d => d.id !== id));
    }
  };

  const toggleSection = (key: string) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Dados derivados ───────────────────────────────────────────────────────
  const funcoesComDesc = descricoes.length;
  const funcoesSemDesc = Math.max(0, funcoes.length - funcoesComDesc);
  const filteredFuncoes = funcoes.filter(f =>
    f.toLowerCase().includes(funcaoSearch.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Descrição de Funções
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Defina os requisitos, competências e responsabilidades de cada função
          </p>
        </div>
        <Button
          onClick={(e) => { lastModalTriggerRef.current = e.currentTarget; handleNova(); }}
          className="gap-2 flex-shrink-0 ml-8"
        >
          <Plus className="w-4 h-4" />
          Nova Descrição
        </Button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total de Funções</p>
            <p className="text-gray-900 mt-0.5" style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1 }}>{funcoes.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Com Descrição</p>
            <p className="text-gray-900 mt-0.5" style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1 }}>{funcoesComDesc}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Sem Descrição</p>
            <p className="text-gray-900 mt-0.5" style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1 }}>{funcoesSemDesc}</p>
          </div>
        </div>
      </div>

      {/* ── Lista de Descrições ── */}
      {descricoes.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-200">
            <FileText className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-900 mb-1.5" style={{ fontWeight: 600, fontSize: '1rem' }}>Nenhuma descrição cadastrada</p>
          <p className="text-gray-500 text-sm max-w-xs mb-5">
            Comece cadastrando a descrição de uma função para definir requisitos e responsabilidades.
          </p>
          <Button
            onClick={(e) => { lastModalTriggerRef.current = e.currentTarget; handleNova(); }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Cadastrar primeira descrição
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {descricoes.map((desc) => {
            const pct = completude(desc);
            const resp = desc.responsabilidades.filter(r => r.tipo === 'responsabilidade').length;
            const atv = desc.responsabilidades.filter(r => r.tipo === 'atividade').length;
            const aut = desc.responsabilidades.filter(r => r.tipo === 'autoridade').length;
            return (
              <div key={desc.id} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4 hover:border-blue-200 hover:shadow-sm transition-all">
                {/* Topo do card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs flex-shrink-0" style={{ fontWeight: 600 }}>
                      {desc.numero}
                    </span>
                    <h3 className="text-gray-900 truncate" style={{ fontWeight: 600, fontSize: '1rem' }}>
                      {desc.funcao}
                    </h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs flex-shrink-0 ${pct === 100 ? 'bg-green-50 text-green-700' : pct >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`} style={{ fontWeight: 500 }}>
                    {pct}% completo
                  </span>
                </div>

                {/* Barra de progresso */}
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Chips de resumo */}
                <div className="flex flex-wrap gap-1.5">
                  {desc.escolaridades.length > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs">
                      <GraduationCap className="w-3 h-3" />
                      {desc.escolaridades.length} escolaridade{desc.escolaridades.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {desc.idiomas.length > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-xs">
                      <Languages className="w-3 h-3" />
                      {desc.idiomas.length} idioma{desc.idiomas.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {desc.experiencias.length > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-md text-xs">
                      <Clock className="w-3 h-3" />
                      {desc.experiencias.length} exp.
                    </span>
                  )}
                  {(desc.conhecimentos || desc.habilidades || desc.treinamentos) && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 rounded-md text-xs">
                      <Brain className="w-3 h-3" />
                      CHT
                    </span>
                  )}
                  {desc.responsabilidades.length > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-xs">
                      <Shield className="w-3 h-3" />
                      {resp}R · {atv}A · {aut}Au
                    </span>
                  )}
                </div>

                {/* Rodapé do card */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Atualizado em {formatDate(desc.dataAtualizacao)}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => { lastModalTriggerRef.current = e.currentTarget; handleViewCard(desc.funcao); }}
                      title="Visualizar"
                    >
                      <Eye className="w-4 h-4 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => { lastModalTriggerRef.current = e.currentTarget; handleEditCard(desc.funcao); }}
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleDelete(desc.id)}
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4 text-gray-500" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL — Nova / Editar Descrição
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={modalOpen} onOpenChange={handleModalChange}>
        <DialogContent
          onOpenAutoFocus={(e) => {
            if (!selectedFuncao) {
              e.preventDefault();
              setTimeout(() => funcaoSearchInputRef.current?.focus(), 0);
            }
          }}
          className="p-0 flex flex-col gap-0 overflow-hidden w-full sm:max-w-5xl max-h-[calc(100vh-2rem)] text-foreground"
        >
          {/* ── Header do Modal ── */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 pr-14">
            <div className="flex items-start justify-between gap-4">
              <DialogHeader className="gap-1">
                {selectedFuncao ? (
                  <DialogTitle className="flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm" style={{ fontWeight: 600 }}>
                      {currentDescricao.numero || '—'}
                    </span>
                    <span className="min-w-0 truncate">{currentDescricao.funcao}</span>
                  </DialogTitle>
                ) : (
                  <DialogTitle>Nova Descrição de Função</DialogTitle>
                )}
                <DialogDescription>
                  {selectedFuncao
                    ? (viewMode === 'view' ? 'Visualização' : editingId ? 'Editando descrição' : 'Nova descrição de função')
                    : 'Selecione a função para continuar'}
                </DialogDescription>
              </DialogHeader>

              {selectedFuncao && (
                <div className="flex items-center gap-2">
                  {viewMode === 'view' && (
                    <Button variant="outline" size="sm" onClick={() => setViewMode('edit')} className="gap-1.5">
                      <Edit2 className="w-3.5 h-3.5" />
                      Editar
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      setSelectedFuncao('');
                      setViewMode('edit');
                      setTimeout(() => funcaoSearchInputRef.current?.focus(), 0);
                    }}
                  >
                    ← Trocar função
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ── Body scrollável ── */}
          <div className="flex-1 overflow-y-auto bg-gray-50/40">

            {/* ── STEP 1: Seletor de Função ── */}
            {!selectedFuncao && (
              <div className="p-6 space-y-4">
                <p className="text-xs text-muted-foreground mb-3">
                  Escolha a função para a qual deseja cadastrar ou editar a descrição de requisitos e responsabilidades.
                </p>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    ref={funcaoSearchInputRef}
                    type="text"
                    value={funcaoSearch}
                    onChange={e => setFuncaoSearch(e.target.value)}
                    placeholder="Buscar função..."
                    className="pl-9"
                  />
                </div>

                {/* Grid de funções */}
                {funcoes.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <Users className="w-8 h-8 text-gray-300 mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhuma função cadastrada no sistema.</p>
                    <p className="text-xs text-muted-foreground mt-1">Cadastre funções no módulo de Colaboradores primeiro.</p>
                  </div>
                ) : filteredFuncoes.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Search className="w-6 h-6 text-gray-300 mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma função encontrada para "{funcaoSearch}"</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {filteredFuncoes.map(funcao => {
                      const hasDesc = descricoes.some(d => d.funcao === funcao);
                      return (
                        <button
                          key={funcao}
                          onClick={() => handleSelectFuncao(funcao)}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all hover:shadow-sm group ${
                            hasDesc
                              ? 'border-green-200 bg-green-50/60 hover:border-green-400 hover:bg-green-50'
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            hasDesc ? 'bg-green-100' : 'bg-gray-100 group-hover:bg-blue-100'
                          }`}>
                            {hasDesc
                              ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                              : <Users className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate" style={{ fontWeight: 500 }}>{funcao}</p>
                            <p className={`text-xs mt-0.5 ${hasDesc ? 'text-green-600' : 'text-muted-foreground group-hover:text-blue-500'}`}>
                              {hasDesc ? 'Descrição cadastrada' : 'Sem descrição'}
                            </p>
                          </div>
                          <ChevronRight className={`w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${hasDesc ? 'text-green-500' : 'text-blue-500'}`} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 2: Formulário de Edição ── */}
            {selectedFuncao && viewMode === 'edit' && (
              <div className="p-6 space-y-3">

                {/* SEÇÃO: Escolaridade */}
                <SectionCard
                  icon={<GraduationCap className="w-4 h-4 text-blue-600" />}
                  iconBg="bg-blue-50"
                  title="Escolaridade"
                  count={currentDescricao.escolaridades.length}
                  open={openSections.escolaridade}
                  onToggle={() => toggleSection('escolaridade')}
                  onAdd={() => setShowEscolaridadeForm(true)}
                >
                  {showEscolaridadeForm && (
                    <InlineForm onConfirm={addEscolaridade} onCancel={() => setShowEscolaridadeForm(false)}>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-foreground mb-1" style={{ fontWeight: 500 }}>Nível *</label>
                          <select value={escolaridadeForm.nivel} onChange={e => setEscolaridadeForm({ ...escolaridadeForm, nivel: e.target.value })}
                            className="border-input bg-input-background flex h-9 w-full rounded-md border px-3 py-1 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50">
                            <option value="">Selecione...</option>
                            {['Ensino Fundamental','Ensino Médio','Ensino Técnico','Ensino Superior','Pós-Graduação','Mestrado','Doutorado'].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-foreground mb-1" style={{ fontWeight: 500 }}>Situação</label>
                          <select value={escolaridadeForm.situacao} onChange={e => setEscolaridadeForm({ ...escolaridadeForm, situacao: e.target.value })}
                            className="border-input bg-input-background flex h-9 w-full rounded-md border px-3 py-1 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50">
                            <option value="">Selecione...</option>
                            <option value="Em andamento">Em andamento</option>
                            <option value="Concluído">Concluído</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-foreground mb-1" style={{ fontWeight: 500 }}>Área / Curso</label>
                          <Input
                            type="text"
                            value={escolaridadeForm.area}
                            onChange={e => setEscolaridadeForm({ ...escolaridadeForm, area: e.target.value })}
                            placeholder="Ex: Administração..."
                          />
                        </div>
                      </div>
                    </InlineForm>
                  )}
                  {currentDescricao.escolaridades.length === 0 && !showEscolaridadeForm && (
                    <p className="text-xs text-muted-foreground py-2">Nenhuma escolaridade adicionada</p>
                  )}
                  {currentDescricao.escolaridades.map(esc => (
                    <ItemRow key={esc.id} onRemove={() => removeEscolaridade(esc.id)}>
                      <span className="text-sm text-foreground" style={{ fontWeight: 500 }}>{esc.nivel}</span>
                      {esc.situacao && <span className="text-xs text-muted-foreground">· {esc.situacao}</span>}
                      {esc.area && <span className="text-xs text-muted-foreground">· {esc.area}</span>}
                    </ItemRow>
                  ))}
                </SectionCard>

                {/* SEÇÃO: Idiomas */}
                <SectionCard
                  icon={<Languages className="w-4 h-4 text-purple-600" />}
                  iconBg="bg-purple-50"
                  title="Idiomas"
                  count={currentDescricao.idiomas.length}
                  open={openSections.idiomas}
                  onToggle={() => toggleSection('idiomas')}
                  onAdd={() => setShowIdiomaForm(true)}
                >
                  {showIdiomaForm && (
                    <InlineForm onConfirm={addIdioma} onCancel={() => setShowIdiomaForm(false)}>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-foreground mb-1" style={{ fontWeight: 500 }}>Idioma *</label>
                          <Input
                            type="text"
                            value={idiomaForm.idioma}
                            onChange={e => setIdiomaForm({ ...idiomaForm, idioma: e.target.value })}
                            placeholder="Ex: Inglês..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-foreground mb-1" style={{ fontWeight: 500 }}>Nível *</label>
                          <select value={idiomaForm.nivel} onChange={e => setIdiomaForm({ ...idiomaForm, nivel: e.target.value })}
                            className="border-input bg-input-background flex h-9 w-full rounded-md border px-3 py-1 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50">
                            <option value="">Selecione...</option>
                            {['Básico','Intermediário','Avançado','Fluente','Nativo'].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                      </div>
                    </InlineForm>
                  )}
                  {currentDescricao.idiomas.length === 0 && !showIdiomaForm && (
                    <p className="text-xs text-muted-foreground py-2">Nenhum idioma adicionado</p>
                  )}
                  {currentDescricao.idiomas.map(idioma => (
                    <ItemRow key={idioma.id} onRemove={() => removeIdioma(idioma.id)}>
                      <span className="text-sm text-foreground" style={{ fontWeight: 500 }}>{idioma.idioma}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${NIVEL_CORES[idioma.nivel] ?? 'bg-gray-100 text-gray-600'}`} style={{ fontWeight: 500 }}>{idioma.nivel}</span>
                    </ItemRow>
                  ))}
                </SectionCard>

                {/* SEÇÃO: Experiência */}
                <SectionCard
                  icon={<Clock className="w-4 h-4 text-green-600" />}
                  iconBg="bg-green-50"
                  title="Experiência Profissional"
                  count={currentDescricao.experiencias.length}
                  open={openSections.experiencia}
                  onToggle={() => toggleSection('experiencia')}
                  onAdd={() => setShowExperienciaForm(true)}
                >
                  {showExperienciaForm && (
                    <InlineForm onConfirm={addExperiencia} onCancel={() => setShowExperienciaForm(false)}>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-foreground mb-1" style={{ fontWeight: 500 }}>Tempo *</label>
                          <Input
                            type="text"
                            value={experienciaForm.tempo}
                            onChange={e => setExperienciaForm({ ...experienciaForm, tempo: e.target.value })}
                            placeholder="Ex: 2 anos..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-foreground mb-1" style={{ fontWeight: 500 }}>Área *</label>
                          <Input
                            type="text"
                            value={experienciaForm.area}
                            onChange={e => setExperienciaForm({ ...experienciaForm, area: e.target.value })}
                            placeholder="Ex: Logística..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-foreground mb-1" style={{ fontWeight: 500 }}>Tipo de Função</label>
                          <select value={experienciaForm.tipoFuncao} onChange={e => setExperienciaForm({ ...experienciaForm, tipoFuncao: e.target.value })}
                            className="border-input bg-input-background flex h-9 w-full rounded-md border px-3 py-1 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50">
                            <option value="">Selecione...</option>
                            {['Gestão','Supervisão','Coordenação','Operação','Técnica','Administrativa'].map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-foreground mb-1" style={{ fontWeight: 500 }}>Detalhamento</label>
                          <Input
                            type="text"
                            value={experienciaForm.detalhamento}
                            onChange={e => setExperienciaForm({ ...experienciaForm, detalhamento: e.target.value })}
                            placeholder="Detalhes..."
                          />
                        </div>
                      </div>
                    </InlineForm>
                  )}
                  {currentDescricao.experiencias.length === 0 && !showExperienciaForm && (
                    <p className="text-xs text-muted-foreground py-2">Nenhuma experiência adicionada</p>
                  )}
                  {currentDescricao.experiencias.map(exp => (
                    <ItemRow key={exp.id} onRemove={() => removeExperiencia(exp.id)}>
                      <span className="text-sm text-foreground" style={{ fontWeight: 500 }}>{exp.tempo} em {exp.area}</span>
                      {exp.tipoFuncao && <span className="text-xs text-muted-foreground">· {exp.tipoFuncao}</span>}
                    </ItemRow>
                  ))}
                </SectionCard>

                {/* SEÇÃO: CHT */}
                <SectionCard
                  icon={<Brain className="w-4 h-4 text-orange-600" />}
                  iconBg="bg-orange-50"
                  title="Conhecimentos, Habilidades e Treinamentos"
                  open={openSections.cht}
                  onToggle={() => toggleSection('cht')}
                  hideAdd
                >
                  <div className="space-y-3 pt-1">
                    {[
                      { key: 'conhecimentos', label: 'Conhecimentos', placeholder: 'Descreva os conhecimentos técnicos necessários...' },
                      { key: 'habilidades', label: 'Habilidades', placeholder: 'Descreva as habilidades comportamentais e técnicas...' },
                      { key: 'treinamentos', label: 'Treinamentos', placeholder: 'Liste os treinamentos necessários ou desejáveis...' },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="block text-xs text-foreground mb-1.5" style={{ fontWeight: 500 }}>{label}</label>
                        <Textarea
                          value={(currentDescricao as any)[key]}
                          onChange={e => setCurrentDescricao({ ...currentDescricao, [key]: e.target.value })}
                          rows={3}
                          placeholder={placeholder}
                        />
                      </div>
                    ))}
                  </div>
                </SectionCard>

                {/* SEÇÃO: Responsabilidades */}
                <SectionCard
                  icon={<Shield className="w-4 h-4 text-indigo-600" />}
                  iconBg="bg-indigo-50"
                  title="Responsabilidades e Autoridades"
                  count={currentDescricao.responsabilidades.length}
                  open={openSections.responsabilidades}
                  onToggle={() => toggleSection('responsabilidades')}
                  onAdd={() => setShowResponsabilidadeForm(true)}
                >
                  {showResponsabilidadeForm && (
                    <InlineForm onConfirm={addResponsabilidade} onCancel={() => setShowResponsabilidadeForm(false)}>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-foreground mb-1" style={{ fontWeight: 500 }}>Tipo *</label>
                          <div className="flex gap-2">
                            {(['responsabilidade', 'atividade', 'autoridade'] as const).map(t => (
                              <Button
                                key={t}
                                type="button"
                                size="sm"
                                variant={responsabilidadeForm.tipo === t ? "default" : "outline"}
                                onClick={() => setResponsabilidadeForm({ ...responsabilidadeForm, tipo: t })}
                                className="h-7 px-3 text-xs capitalize"
                              >
                                {t === 'responsabilidade' ? 'Responsabilidade' : t === 'atividade' ? 'Atividade' : 'Autoridade'}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-foreground mb-1" style={{ fontWeight: 500 }}>Descrição *</label>
                          <Textarea
                            value={responsabilidadeForm.descricao}
                            onChange={e => setResponsabilidadeForm({ ...responsabilidadeForm, descricao: e.target.value })}
                            rows={2}
                            placeholder="Descreva a responsabilidade, atividade ou autoridade..."
                          />
                        </div>
                      </div>
                    </InlineForm>
                  )}
                  {currentDescricao.responsabilidades.length === 0 && !showResponsabilidadeForm && (
                    <p className="text-xs text-muted-foreground py-2">Nenhuma responsabilidade ou autoridade adicionada</p>
                  )}
                  {(['responsabilidade', 'atividade', 'autoridade'] as const).map(tipo => {
                    const items = currentDescricao.responsabilidades.filter(r => r.tipo === tipo);
                    if (!items.length) return null;
                    const labels: Record<string, string> = { responsabilidade: 'Responsabilidades', atividade: 'Atividades', autoridade: 'Autoridades' };
                    const colors: Record<string, string> = { responsabilidade: 'text-indigo-600', atividade: 'text-blue-600', autoridade: 'text-purple-600' };
                    return (
                      <div key={tipo}>
                        <p className={`text-xs mb-1.5 mt-2 ${colors[tipo]}`} style={{ fontWeight: 600 }}>{labels[tipo]}</p>
                        {items.map(item => (
                          <ItemRow key={item.id} onRemove={() => removeResponsabilidade(item.id)}>
                            <span className="text-sm text-foreground">{item.descricao}</span>
                          </ItemRow>
                        ))}
                      </div>
                    );
                  })}
                </SectionCard>
              </div>
            )}

            {/* ── STEP 2b: Modo Visualização ── */}
            {selectedFuncao && viewMode === 'view' && (
              <div className="p-6 space-y-4">
                {/* Escolaridade */}
                {currentDescricao.escolaridades.length > 0 && (
                  <ViewSection icon={<GraduationCap className="w-4 h-4 text-blue-600" />} bg="bg-blue-50" title="Escolaridade">
                    <div className="grid grid-cols-2 gap-2">
                      {currentDescricao.escolaridades.map(esc => (
                        <div key={esc.id} className="p-3 bg-white rounded-lg border border-gray-200">
                          <p className="text-sm text-foreground" style={{ fontWeight: 600 }}>{esc.nivel}</p>
                          {esc.situacao && <p className="text-xs text-muted-foreground mt-0.5">Situação: {esc.situacao}</p>}
                          {esc.area && <p className="text-xs text-muted-foreground">Área: {esc.area}</p>}
                        </div>
                      ))}
                    </div>
                  </ViewSection>
                )}

                {/* Idiomas */}
                {currentDescricao.idiomas.length > 0 && (
                  <ViewSection icon={<Languages className="w-4 h-4 text-purple-600" />} bg="bg-purple-50" title="Idiomas">
                    <div className="flex flex-wrap gap-2">
                      {currentDescricao.idiomas.map(idioma => (
                        <div key={idioma.id} className="px-3 py-2 bg-white rounded-lg border border-gray-200 flex items-center gap-2">
                          <span className="text-sm text-foreground" style={{ fontWeight: 500 }}>{idioma.idioma}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${NIVEL_CORES[idioma.nivel] ?? 'bg-gray-100 text-gray-600'}`} style={{ fontWeight: 500 }}>{idioma.nivel}</span>
                        </div>
                      ))}
                    </div>
                  </ViewSection>
                )}

                {/* Experiência */}
                {currentDescricao.experiencias.length > 0 && (
                  <ViewSection icon={<Clock className="w-4 h-4 text-green-600" />} bg="bg-green-50" title="Experiência Profissional">
                    <div className="space-y-2">
                      {currentDescricao.experiencias.map(exp => (
                        <div key={exp.id} className="p-3 bg-white rounded-lg border border-gray-200">
                          <p className="text-sm text-foreground" style={{ fontWeight: 600 }}>{exp.tempo} em {exp.area}</p>
                          {exp.tipoFuncao && <p className="text-xs text-muted-foreground mt-0.5">Tipo: {exp.tipoFuncao}</p>}
                          {exp.detalhamento && <p className="text-xs text-muted-foreground">{exp.detalhamento}</p>}
                        </div>
                      ))}
                    </div>
                  </ViewSection>
                )}

                {/* CHT */}
                {(currentDescricao.conhecimentos || currentDescricao.habilidades || currentDescricao.treinamentos) && (
                  <ViewSection icon={<Brain className="w-4 h-4 text-orange-600" />} bg="bg-orange-50" title="Conhecimentos, Habilidades e Treinamentos">
                    <div className="space-y-2">
                      {currentDescricao.conhecimentos && (
                        <div className="p-3 bg-white rounded-lg border border-gray-200">
                          <p className="text-xs text-muted-foreground mb-1" style={{ fontWeight: 600 }}>CONHECIMENTOS</p>
                          <p className="text-sm text-foreground whitespace-pre-line">{currentDescricao.conhecimentos}</p>
                        </div>
                      )}
                      {currentDescricao.habilidades && (
                        <div className="p-3 bg-white rounded-lg border border-gray-200">
                          <p className="text-xs text-muted-foreground mb-1" style={{ fontWeight: 600 }}>HABILIDADES</p>
                          <p className="text-sm text-foreground whitespace-pre-line">{currentDescricao.habilidades}</p>
                        </div>
                      )}
                      {currentDescricao.treinamentos && (
                        <div className="p-3 bg-white rounded-lg border border-gray-200">
                          <p className="text-xs text-muted-foreground mb-1" style={{ fontWeight: 600 }}>TREINAMENTOS</p>
                          <p className="text-sm text-foreground whitespace-pre-line">{currentDescricao.treinamentos}</p>
                        </div>
                      )}
                    </div>
                  </ViewSection>
                )}

                {/* Responsabilidades */}
                {currentDescricao.responsabilidades.length > 0 && (
                  <ViewSection icon={<Shield className="w-4 h-4 text-indigo-600" />} bg="bg-indigo-50" title="Responsabilidades e Autoridades">
                    {(['responsabilidade', 'atividade', 'autoridade'] as const).map(tipo => {
                      const items = currentDescricao.responsabilidades.filter(r => r.tipo === tipo);
                      if (!items.length) return null;
                      const labels: Record<string, string> = { responsabilidade: 'Responsabilidades', atividade: 'Atividades', autoridade: 'Autoridades' };
                      return (
                        <div key={tipo} className="mb-3">
                          <p className="text-xs text-muted-foreground mb-1.5" style={{ fontWeight: 600 }}>{labels[tipo].toUpperCase()}</p>
                          <div className="space-y-1.5">
                            {items.map(item => (
                              <div key={item.id} className="flex items-start gap-2 p-2.5 bg-white rounded-lg border border-gray-200">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                                <p className="text-sm text-foreground">{item.descricao}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </ViewSection>
                )}
              </div>
            )}
          </div>

          {/* ── Footer fixo do Modal ── */}
          {selectedFuncao && viewMode === 'edit' && (
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white">
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setModalOpen(false); handleCancel(); }}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Salvando...' : 'Salvar Descrição'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-componentes internos ───────────────────────────────────────────────────

function SectionCard({
  icon, iconBg, title, count, open, onToggle, onAdd, hideAdd, children
}: {
  icon: React.ReactNode; iconBg: string; title: string;
  count?: number; open: boolean; onToggle: () => void;
  onAdd?: () => void; hideAdd?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/80 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
            {icon}
          </div>
          <span className="text-sm text-foreground" style={{ fontWeight: 600 }}>{title}</span>
          {typeof count === 'number' && count > 0 && (
            <span className="px-1.5 py-0.5 bg-gray-100 text-muted-foreground rounded-md text-xs" style={{ fontWeight: 600 }}>{count}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!hideAdd && onAdd && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={e => { e.stopPropagation(); onAdd(); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onAdd?.(); } }}
            className="h-7 px-2 text-xs"
          >
            <Plus className="w-3 h-3" />
            Adicionar
          </Button>
          )}
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

function InlineForm({
  children, onConfirm, onCancel
}: {
  children: React.ReactNode; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 mb-2 border border-gray-200">
      {children}
      <div className="flex gap-2 mt-3">
        <Button type="button" size="sm" onClick={onConfirm} className="h-7 px-3 text-xs">
          Confirmar
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} className="h-7 px-3 text-xs">
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function ItemRow({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
      <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">{children}</div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-gray-500 hover:text-destructive"
        onClick={onRemove}
        title="Remover"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

function ViewSection({ icon, bg, title, children }: { icon: React.ReactNode; bg: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>{icon}</div>
        <h3 className="text-sm text-foreground" style={{ fontWeight: 600 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}
