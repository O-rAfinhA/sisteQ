/**
 * Instrumentos de Medição — Listagem e Gestão de Instrumentos
 * Cadastro, detalhes, calibração, verificação, bloqueio
 */
import React, { useState, useMemo } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  Gauge, Plus, Eye, Edit2, Search, Lock, Unlock, FileText, Upload, Download,
  X, Save, ClipboardCheck, BookOpen, History, Ruler, AlertTriangle, AlertCircle, Link2, Minus, Trash2,
} from 'lucide-react';
import { formatarData, dataHojeISO } from '../utils/formatters';
import { generateId } from '../utils/helpers';
import { ResponsavelCombobox } from '../components/ResponsavelCombobox';
import {
  useInstrumentos,
  calcularStatus,
  calcularProximaValidade,
  calcularProximaCalibracao,
  calcularStatusPadrao,
  calcularDesvio,
  compararErroTolerancia,
  STATUS_CONFIG,
  TIPO_CONTROLE_CONFIG,
  CRITICIDADE_CONFIG,
  type Instrumento,
  type TipoControle,
  type Criticidade,
  type ResultadoCalibracao,
  type ResultadoVerificacao,
  type RegistroCalibracao,
  type RegistroBloqueio,
  type RegistroVerificacao,
  type MedicaoVerificacao,
} from '../hooks/useInstrumentos';

// ═══════════════════════════════════════════════════
// Componente Principal — Listagem de Instrumentos
// ═══════════════════════════════════════════════════

export default function InstrumentosMedicao() {
  const { instrumentos, setInstrumentos, padroes, tiposInstrumentos, usuariosDisponiveis, processosDisponiveis } = useInstrumentos();

  const [busca, setBusca] = useState('');
  const [filtroProcesso, setFiltroProcesso] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroCriticidade, setFiltroCriticidade] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  // Sheet states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingInst, setEditingInst] = useState<Instrumento | null>(null);
  const [viewingInst, setViewingInst] = useState<Instrumento | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Bloqueio dialog
  const [bloqueioDialog, setBloqueioDialog] = useState<{ id: string; tipo: 'bloqueio' | 'desbloqueio' } | null>(null);
  const [bloqueioJustificativa, setBloqueioJustificativa] = useState('');

  // Form state
  const [formData, setFormData] = useState(() => createEmptyInstrumento());
  const [liveFormErrors, setLiveFormErrors] = useState<{
    codigo?: string;
    descricao?: string;
    responsavel?: string;
    justificativaNaoAplicavel?: string;
  }>({});

  function createEmptyInstrumento() {
    return {
      codigo: '', descricao: '', fabricante: '', modelo: '', numSerie: '',
      localizacao: '', processoVinculado: '', departamento: '', responsavel: '',
      criticidade: 'media' as Criticidade, tipoControle: 'calibracao' as TipoControle,
      justificativaNaoAplicavel: '', unidade: '', observacoesTecnicas: '',
      periodicidadeCalibracao: 12, periodicidadeVerificacao: 6,
      padraoUtilizadoId: '', tolerancia: '', tipoInstrumentoId: '_none',
    };
  }

  function validateForm(next = formData) {
    const errors: typeof liveFormErrors = {};
    const codigo = next.codigo?.trim() ?? '';
    const descricao = next.descricao?.trim() ?? '';
    const responsavel = next.responsavel?.trim() ?? '';

    if (!codigo) errors.codigo = 'Informe o código do instrumento.';
    if (!descricao) errors.descricao = 'Informe a descrição.';
    if (!responsavel) errors.responsavel = 'Informe o responsável.';
    if (next.tipoControle === 'nao-aplicavel' && !next.justificativaNaoAplicavel?.trim()) {
      errors.justificativaNaoAplicavel = 'Informe a justificativa para "Não Aplicável".';
    }

    const duplicado = instrumentos.find(i => i.codigo === codigo && i.id !== editingInst?.id);
    if (codigo && duplicado) errors.codigo = 'Código já utilizado por outro instrumento.';

    return errors;
  }

  function handleFormOpenChange(open: boolean) {
    setIsFormOpen(open);
    if (!open) setLiveFormErrors({});
  }

  const processosLista = useMemo(() => {
    const fromInst = instrumentos.map(i => i.processoVinculado).filter(Boolean);
    return [...new Set([...processosDisponiveis, ...fromInst])].sort();
  }, [instrumentos, processosDisponiveis]);

  const filtrados = useMemo(() => {
    return instrumentos.filter(inst => {
      const status = calcularStatus(inst);
      const matchBusca = !busca || inst.codigo.toLowerCase().includes(busca.toLowerCase()) || inst.descricao.toLowerCase().includes(busca.toLowerCase()) || inst.responsavel.toLowerCase().includes(busca.toLowerCase());
      const matchProcesso = filtroProcesso === 'todos' || inst.processoVinculado === filtroProcesso;
      const matchTipo = filtroTipo === 'todos' || inst.tipoControle === filtroTipo;
      const matchCriticidade = filtroCriticidade === 'todos' || inst.criticidade === filtroCriticidade;
      const matchStatus = filtroStatus === 'todos' || status === filtroStatus;
      return matchBusca && matchProcesso && matchTipo && matchCriticidade && matchStatus;
    }).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [instrumentos, busca, filtroProcesso, filtroTipo, filtroCriticidade, filtroStatus]);

  function handleOpenNew() {
    setEditingInst(null);
    setFormData(createEmptyInstrumento());
    setLiveFormErrors({});
    setIsFormOpen(true);
  }

  function handleOpenEdit(inst: Instrumento) {
    setEditingInst(inst);
    setFormData({
      codigo: inst.codigo, descricao: inst.descricao, fabricante: inst.fabricante,
      modelo: inst.modelo, numSerie: inst.numSerie, localizacao: inst.localizacao,
      processoVinculado: inst.processoVinculado, departamento: inst.departamento,
      responsavel: inst.responsavel, criticidade: inst.criticidade, tipoControle: inst.tipoControle,
      justificativaNaoAplicavel: inst.justificativaNaoAplicavel, unidade: inst.unidade,
      observacoesTecnicas: inst.observacoesTecnicas, periodicidadeCalibracao: inst.periodicidadeCalibracao,
      periodicidadeVerificacao: inst.periodicidadeVerificacao, padraoUtilizadoId: inst.padraoUtilizadoId,
      tolerancia: inst.tolerancia, tipoInstrumentoId: inst.tipoInstrumentoId || '_none',
    });
    setLiveFormErrors({});
    setIsFormOpen(true);
  }

  // Handler para mudança de tipo de instrumento (carrega tolerância automaticamente)
  function handleTipoInstrumentoChange(tipoId: string) {
    setFormData(prev => {
      // Se selecionou "_none", apenas atualiza o ID sem carregar dados do tipo
      if (tipoId === '_none') {
        return { ...prev, tipoInstrumentoId: '' };
      }
      const tipo = tiposInstrumentos.find(t => t.id === tipoId);
      if (tipo) {
        return {
          ...prev,
          tipoInstrumentoId: tipoId,
          tolerancia: tipo.tolerancia,
          unidade: tipo.unidade,
        };
      }
      return { ...prev, tipoInstrumentoId: tipoId };
    });
  }

  function handleSave() {
    const errors = validateForm();
    setLiveFormErrors(errors);
    const firstError = Object.values(errors)[0];
    if (firstError) {
      toast.error(firstError);
      return;
    }

    const agora = dataHojeISO();
    if (editingInst) {
      setInstrumentos(prev => prev.map(i => i.id === editingInst.id ? {
        ...i, ...formData, codigo: formData.codigo.trim(), dataAtualizacao: agora,
      } : i));
      toast.success('Instrumento atualizado com sucesso.');
    } else {
      const novo: Instrumento = {
        id: generateId('inst-'), ...formData, codigo: formData.codigo.trim(),
        bloqueado: false, historicoCalibracao: [], historicoVerificacao: [],
        historicoBloqueio: [], dataCriacao: agora, dataAtualizacao: agora,
      };
      setInstrumentos(prev => [...prev, novo]);
      toast.success('Instrumento cadastrado com sucesso.');
    }
    setIsFormOpen(false);
  }

  function handleDelete() {
    if (!deleteId) return;
    setInstrumentos(prev => prev.filter(i => i.id !== deleteId));
    setDeleteId(null);
    toast.success('Instrumento excluído.');
  }

  function handleBloqueio() {
    if (!bloqueioDialog || !bloqueioJustificativa.trim()) { toast.error('Informe a justificativa.'); return; }
    const registro: RegistroBloqueio = {
      id: generateId('blq-'), data: dataHojeISO(), tipo: bloqueioDialog.tipo,
      justificativa: bloqueioJustificativa.trim(), usuario: 'Usuário do Sistema',
    };
    setInstrumentos(prev => prev.map(i => i.id === bloqueioDialog.id ? {
      ...i, bloqueado: bloqueioDialog.tipo === 'bloqueio',
      historicoBloqueio: [...i.historicoBloqueio, registro], dataAtualizacao: dataHojeISO(),
    } : i));
    toast.success(bloqueioDialog.tipo === 'bloqueio' ? 'Instrumento bloqueado.' : 'Instrumento desbloqueado.');
    setBloqueioDialog(null);
    setBloqueioJustificativa('');
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Instrumentos
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Cadastro, controle e rastreabilidade dos instrumentos de medição.
          </p>
        </div>
      </div>

      {/* Barra de ações */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por código, descrição ou responsável..." className="pl-9 h-9 text-sm" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filtroProcesso} onValueChange={setFiltroProcesso}>
            <SelectTrigger className="h-9 text-xs w-[150px]"><SelectValue placeholder="Processo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Processos</SelectItem>
              {processosLista.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="h-9 text-xs w-[150px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Tipos</SelectItem>
              <SelectItem value="calibracao">Calibração</SelectItem>
              <SelectItem value="verificacao">Verificação</SelectItem>
              <SelectItem value="nao-aplicavel">Não Aplicável</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroCriticidade} onValueChange={setFiltroCriticidade}>
            <SelectTrigger className="h-9 text-xs w-[120px]"><SelectValue placeholder="Criticidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="h-9 text-xs w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Status</SelectItem>
              <SelectItem value="valido">Válido</SelectItem>
              <SelectItem value="atencao">Vence em 30d</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
              <SelectItem value="bloqueado">Bloqueado</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleOpenNew} className="gap-2 h-9">
            <Plus className="w-4 h-4" /> Novo Instrumento
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 600 }}>Código</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 600 }}>Descrição</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 600 }}>Processo</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 600 }}>Tipo de Controle</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 600 }}>Criticidade</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 600 }}>Próxima Validade</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 600 }}>Status</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 600 }}>Responsável</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 600 }}>Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <Gauge className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Nenhum instrumento encontrado.</p>
                    <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={handleOpenNew}>
                      <Plus className="w-4 h-4" /> Cadastrar Instrumento
                    </Button>
                  </td>
                </tr>
              )}
              {filtrados.map(inst => {
                const status = calcularStatus(inst);
                const stCfg = STATUS_CONFIG[status];
                const tipoCfg = TIPO_CONTROLE_CONFIG[inst.tipoControle];
                const critCfg = CRITICIDADE_CONFIG[inst.criticidade];
                const proxValidade = calcularProximaValidade(inst);
                return (
                  <tr key={inst.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3"><span className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{inst.codigo}</span></td>
                    <td className="px-4 py-3"><span className="text-sm text-gray-700 line-clamp-1">{inst.descricao}</span></td>
                    <td className="px-4 py-3"><span className="text-xs text-gray-500">{inst.processoVinculado || '—'}</span></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${tipoCfg.bg} ${tipoCfg.text} ${tipoCfg.border}`} style={{ fontWeight: 500 }}>{tipoCfg.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${critCfg.bg} ${critCfg.text} ${critCfg.border}`} style={{ fontWeight: 500 }}>{critCfg.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center"><span className="text-xs text-gray-600">{proxValidade ? formatarData(proxValidade) : '—'}</span></td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${stCfg.bg} ${stCfg.text} ${stCfg.border}`} style={{ fontWeight: 500 }}>
                        <span className={`w-1.5 h-1.5 rounded-full ${stCfg.dotColor}`} />{stCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3"><span className="text-xs text-gray-600">{inst.responsavel}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setViewingInst(inst); setIsViewOpen(true); }}>
                          <Eye className="w-3.5 h-3.5 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleOpenEdit(inst)}>
                          <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setBloqueioDialog({ id: inst.id, tipo: inst.bloqueado ? 'desbloqueio' : 'bloqueio' }); setBloqueioJustificativa(''); }}>
                          {inst.bloqueado ? <Unlock className="w-3.5 h-3.5 text-emerald-500" /> : <Lock className="w-3.5 h-3.5 text-gray-500" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ Form Modal ═══ */}
      <Dialog open={isFormOpen} onOpenChange={handleFormOpenChange}>
        <DialogContent className="w-full sm:max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto p-0" aria-describedby="instrumento-form-description">
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-lg" style={{ fontWeight: 600 }}>
                {editingInst ? 'Editar Instrumento' : 'Novo Instrumento'}
              </DialogTitle>
              <DialogDescription id="instrumento-form-description">
                Preencha os dados do instrumento de medição.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="px-6 py-5 space-y-6"
          >
            {/* BLOCO 1 — Identificação */}
            <Card className="border-gray-200 rounded-xl">
              <CardContent className="p-5 space-y-4">
                <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Identificação</span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">Código *</Label>
                    <Input
                      value={formData.codigo}
                      onChange={e => {
                        const v = e.target.value;
                        setFormData(p => ({ ...p, codigo: v }));
                        if (liveFormErrors.codigo) setLiveFormErrors(prev => ({ ...prev, codigo: undefined }));
                      }}
                      placeholder="EX: IM-001"
                      className="mt-1 text-sm"
                      aria-invalid={!!liveFormErrors.codigo}
                    />
                    {liveFormErrors.codigo && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {liveFormErrors.codigo}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Descrição *</Label>
                    <Input
                      value={formData.descricao}
                      onChange={e => {
                        const v = e.target.value;
                        setFormData(p => ({ ...p, descricao: v }));
                        if (liveFormErrors.descricao) setLiveFormErrors(prev => ({ ...prev, descricao: undefined }));
                      }}
                      placeholder="Paquímetro digital"
                      className="mt-1 text-sm"
                      aria-invalid={!!liveFormErrors.descricao}
                    />
                    {liveFormErrors.descricao && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {liveFormErrors.descricao}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label className="text-xs text-gray-600">Fabricante</Label><Input value={formData.fabricante} onChange={e => setFormData(p => ({ ...p, fabricante: e.target.value }))} placeholder="Opcional" className="mt-1 text-sm" /></div>
                  <div><Label className="text-xs text-gray-600">Modelo</Label><Input value={formData.modelo} onChange={e => setFormData(p => ({ ...p, modelo: e.target.value }))} placeholder="Opcional" className="mt-1 text-sm" /></div>
                  <div><Label className="text-xs text-gray-600">Nº de Série</Label><Input value={formData.numSerie} onChange={e => setFormData(p => ({ ...p, numSerie: e.target.value }))} placeholder="Opcional" className="mt-1 text-sm" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs text-gray-600">Localização</Label><Input value={formData.localizacao} onChange={e => setFormData(p => ({ ...p, localizacao: e.target.value }))} placeholder="Setor, armário..." className="mt-1 text-sm" /></div>
                  <div>
                    <Label className="text-xs text-gray-600">Processo Vinculado</Label>
                    <Input value={formData.processoVinculado} onChange={e => setFormData(p => ({ ...p, processoVinculado: e.target.value }))} placeholder="Nome do processo" className="mt-1 text-sm" list="processos-list" />
                    <datalist id="processos-list">{processosLista.map(p => <option key={p} value={p} />)}</datalist>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label className="text-xs text-gray-600">Departamento</Label><Input value={formData.departamento} onChange={e => setFormData(p => ({ ...p, departamento: e.target.value }))} placeholder="Departamento" className="mt-1 text-sm" /></div>
                  <div>
                    <Label className="text-xs text-gray-600">Responsável *</Label>
                    <div className="mt-1">
                      <ResponsavelCombobox
                        value={formData.responsavel}
                        onChange={v => {
                          setFormData(p => ({ ...p, responsavel: v }));
                          if (liveFormErrors.responsavel) setLiveFormErrors(prev => ({ ...prev, responsavel: undefined }));
                        }}
                        usuarios={usuariosDisponiveis}
                        placeholder="Selecione"
                      />
                    </div>
                    {liveFormErrors.responsavel && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {liveFormErrors.responsavel}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Criticidade *</Label>
                    <Select value={formData.criticidade} onValueChange={v => setFormData(p => ({ ...p, criticidade: v as Criticidade }))}>
                      <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="baixa">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* BLOCO 2 — Tipo de Controle */}
            <Card className="border-gray-200 rounded-xl">
              <CardContent className="p-5 space-y-4">
                <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Tipo de Controle *</span>
                <div className="grid grid-cols-3 gap-3">
                  {(['calibracao', 'verificacao', 'nao-aplicavel'] as TipoControle[]).map(tipo => {
                    const cfg = TIPO_CONTROLE_CONFIG[tipo];
                    const selected = formData.tipoControle === tipo;
                    return (
                      <button
                        type="button"
                        key={tipo}
                        onClick={() => {
                          setFormData(p => ({ ...p, tipoControle: tipo }));
                          if (tipo !== 'nao-aplicavel' && liveFormErrors.justificativaNaoAplicavel) {
                            setLiveFormErrors(prev => ({ ...prev, justificativaNaoAplicavel: undefined }));
                          }
                        }}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${selected ? `${cfg.bg} ${cfg.border} ring-1 ring-offset-1` : 'border-gray-200 hover:border-gray-300'}`}>
                        <span className={`text-xs ${selected ? cfg.text : 'text-gray-600'}`} style={{ fontWeight: 600 }}>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
                {formData.tipoControle === 'nao-aplicavel' && (
                  <div><Label className="text-xs text-gray-600">Justificativa *</Label>
                    <Textarea
                      value={formData.justificativaNaoAplicavel}
                      onChange={e => {
                        const v = e.target.value;
                        setFormData(p => ({ ...p, justificativaNaoAplicavel: v }));
                        if (liveFormErrors.justificativaNaoAplicavel) setLiveFormErrors(prev => ({ ...prev, justificativaNaoAplicavel: undefined }));
                      }}
                      placeholder="Explique por que este instrumento não requer calibração/verificação..."
                      rows={3}
                      className="mt-1 text-sm"
                      aria-invalid={!!liveFormErrors.justificativaNaoAplicavel}
                    />
                    {liveFormErrors.justificativaNaoAplicavel && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {liveFormErrors.justificativaNaoAplicavel}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* BLOCO 3 — Dados Técnicos */}
            <Card className="border-gray-200 rounded-xl">
              <CardContent className="p-5 space-y-4">
                <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Dados Técnicos</span>
                {(formData.tipoControle === 'calibracao' || formData.tipoControle === 'verificacao') && (
                  <div>
                    <Label className="text-xs text-gray-600">Tipo de Instrumento</Label>
                    <Select value={formData.tipoInstrumentoId || '_none'} onValueChange={handleTipoInstrumentoChange}>
                      <SelectTrigger className="mt-1 text-sm">
                        <SelectValue placeholder="Selecione o tipo (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Nenhum (definir manualmente)</SelectItem>
                        {tiposInstrumentos.map(tipo => (
                          <SelectItem key={tipo.id} value={tipo.id}>
                            {tipo.codigo} — {tipo.descricao} ({tipo.tolerancia})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-gray-400 mt-1">Ao selecionar um tipo, a tolerância e unidade serão preenchidas automaticamente</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs text-gray-600">Unidade</Label><Input value={formData.unidade} onChange={e => setFormData(p => ({ ...p, unidade: e.target.value }))} placeholder="mm, °C, kg..." className="mt-1 text-sm" /></div>
                  {formData.tipoControle === 'calibracao' && (
                    <div><Label className="text-xs text-gray-600">Periodicidade (meses)</Label><Input type="number" min={1} value={formData.periodicidadeCalibracao} onChange={e => setFormData(p => ({ ...p, periodicidadeCalibracao: parseInt(e.target.value) || 12 }))} className="mt-1 text-sm" /></div>
                  )}
                  {formData.tipoControle === 'verificacao' && (
                    <div><Label className="text-xs text-gray-600">Periodicidade (meses)</Label><Input type="number" min={1} value={formData.periodicidadeVerificacao} onChange={e => setFormData(p => ({ ...p, periodicidadeVerificacao: parseInt(e.target.value) || 6 }))} className="mt-1 text-sm" /></div>
                  )}
                </div>
                {(formData.tipoControle === 'calibracao' || formData.tipoControle === 'verificacao') && (
                  <div><Label className="text-xs text-gray-600">Tolerância para Aceitação</Label><Input value={formData.tolerancia} onChange={e => setFormData(p => ({ ...p, tolerancia: e.target.value }))} placeholder="±0.05 mm" className="mt-1 text-sm" />
                    <p className="text-[10px] text-gray-400 mt-1">Tolerância máxima aceita para o erro do certificado (ex: ±0.05, 0.1, ±1 mm)</p>
                  </div>
                )}
                {formData.tipoControle === 'verificacao' && (
                  <div>
                    <Label className="text-xs text-gray-600">Padrão Utilizado</Label>
                    <Select value={formData.padraoUtilizadoId} onValueChange={v => setFormData(p => ({ ...p, padraoUtilizadoId: v }))}>
                      <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Selecione o padrão" /></SelectTrigger>
                      <SelectContent>{padroes.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.descricao}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div><Label className="text-xs text-gray-600">Observações Técnicas</Label>
                  <Textarea value={formData.observacoesTecnicas} onChange={e => setFormData(p => ({ ...p, observacoesTecnicas: e.target.value }))} placeholder="Observações adicionais..." rows={2} className="mt-1 text-sm" />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pb-2">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className="gap-2"><Save className="w-4 h-4" /> Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══ View Sheet ═══ */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="w-full sm:max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto p-0" aria-describedby={undefined}>
          <DialogHeader className="sr-only"><DialogTitle>{viewingInst?.descricao || 'Detalhes do Instrumento'}</DialogTitle></DialogHeader>
          {viewingInst && (
            <InstrumentoDetalhe
              instrumento={viewingInst}
              padroes={padroes}
              instrumentos={instrumentos}
              setInstrumentos={setInstrumentos}
              onEdit={() => { setIsViewOpen(false); handleOpenEdit(viewingInst); }}
              onClose={() => setIsViewOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir Instrumento</AlertDialogTitle><AlertDialogDescription>Esta ação é irreversível. Todo o histórico será perdido.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bloqueio Dialog */}
      <Dialog open={!!bloqueioDialog} onOpenChange={() => setBloqueioDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bloqueioDialog?.tipo === 'bloqueio' ? 'Bloquear Instrumento' : 'Desbloquear Instrumento'}</DialogTitle>
            <DialogDescription>Informe a justificativa para registrar no histórico.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea value={bloqueioJustificativa} onChange={e => setBloqueioJustificativa(e.target.value)} placeholder="Justificativa obrigatória..." rows={3} className="text-sm" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setBloqueioDialog(null)}>Cancelar</Button>
            <Button onClick={handleBloqueio} className={bloqueioDialog?.tipo === 'bloqueio' ? 'bg-red-600 hover:bg-red-700' : ''}>
              {bloqueioDialog?.tipo === 'bloqueio' ? 'Bloquear' : 'Desbloquear'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Detalhe do Instrumento (Sheet interno)
// ═══════════════════════════════════════════════════

function InstrumentoDetalhe({
  instrumento, padroes, instrumentos, setInstrumentos, onEdit, onClose,
}: {
  instrumento: Instrumento;
  padroes: import('../hooks/useInstrumentos').PadraoReferencia[];
  instrumentos: Instrumento[];
  setInstrumentos: React.Dispatch<React.SetStateAction<Instrumento[]>>;
  onEdit: () => void;
  onClose: () => void;
}) {
  const inst = useMemo(() => instrumentos.find(i => i.id === instrumento.id) || instrumento, [instrumentos, instrumento]);
  const status = calcularStatus(inst);
  const stCfg = STATUS_CONFIG[status];
  const tipoCfg = TIPO_CONTROLE_CONFIG[inst.tipoControle];
  const critCfg = CRITICIDADE_CONFIG[inst.criticidade];
  const proxValidade = calcularProximaValidade(inst);

  const [detalheTab, setDetalheTab] = useState<'info' | 'calibracao' | 'verificacao' | 'historico'>('info');

  // Calibração form
  const [showCalibracaoForm, setShowCalibracaoForm] = useState(false);
  const [editingCalibId, setEditingCalibId] = useState<string | null>(null);
  const [viewingCalibId, setViewingCalibId] = useState<string | null>(null);
  const [deleteCalibId, setDeleteCalibId] = useState<string | null>(null);
  const calibFormDefault = () => ({
    data: dataHojeISO(), numCertificado: '', resultado: 'aprovado' as ResultadoCalibracao,
    observacao: '', certificadoBase64: '', certificadoNome: '',
    padraoUtilizadoId: '', numCertificadoPadrao: '', erroEncontrado: '',
  });
  const [calibForm, setCalibForm] = useState(calibFormDefault());

  // Verificação form
  const [showVerificacaoForm, setShowVerificacaoForm] = useState(false);
  const createEmptyMedicoes = (n = 4): MedicaoVerificacao[] => Array.from({ length: n }, () => ({ valorPadrao: '', valorEncontrado: '', desvio: '' }));
  const [verifForm, setVerifForm] = useState({ data: dataHojeISO(), pontoVerificado: '', medicoes: createEmptyMedicoes(), resultado: 'conforme' as ResultadoVerificacao, observacao: '', anexoBase64: '', anexoNome: '' });

  // PDF preview
  const [pdfPreview, setPdfPreview] = useState<{ data: string; nome: string } | null>(null);

  const padraoVinculado = useMemo(() => padroes.find(p => p.id === inst.padraoUtilizadoId), [padroes, inst.padraoUtilizadoId]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, setter: (base64: string, nome: string) => void) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Arquivo deve ter no máximo 5 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setter(reader.result as string, file.name); };
    reader.readAsDataURL(file);
  }

  function resetCalibForm() {
    setCalibForm(calibFormDefault());
    setEditingCalibId(null);
    setShowCalibracaoForm(false);
  }

  function openEditCalibracao(cal: RegistroCalibracao) {
    setEditingCalibId(cal.id);
    setCalibForm({
      data: cal.data, numCertificado: cal.numCertificado, resultado: cal.resultado,
      observacao: cal.observacao || '', certificadoBase64: cal.certificadoBase64 || '',
      certificadoNome: cal.certificadoNome || '', padraoUtilizadoId: cal.padraoUtilizadoId || '',
      numCertificadoPadrao: cal.numCertificadoPadrao || '', erroEncontrado: cal.erroEncontrado || '',
    });
    setShowCalibracaoForm(true);
    setViewingCalibId(null);
  }

  function saveCalibracao() {
    if (!calibForm.data) { toast.error('Informe a data da calibração.'); return; }
    if (!calibForm.numCertificado.trim()) { toast.error('Informe o número do certificado.'); return; }
    const proxCalib = calcularProximaCalibracao(calibForm.data, inst.periodicidadeCalibracao);
    const padraoSelecionado = calibForm.padraoUtilizadoId ? padroes.find(p => p.id === calibForm.padraoUtilizadoId) : null;
    const numCertPadrao = padraoSelecionado ? padraoSelecionado.numCertificado : (calibForm.numCertificadoPadrao.trim() || undefined);

    if (editingCalibId) {
      // Editar existente
      setInstrumentos(prev => prev.map(i => i.id === inst.id ? {
        ...i,
        historicoCalibracao: i.historicoCalibracao.map(c => c.id === editingCalibId ? {
          ...c, data: calibForm.data, proximaCalibracao: proxCalib,
          numCertificado: calibForm.numCertificado.trim(), resultado: calibForm.resultado,
          certificadoBase64: calibForm.certificadoBase64 || undefined,
          certificadoNome: calibForm.certificadoNome || undefined,
          observacao: calibForm.observacao || undefined,
          padraoUtilizadoId: calibForm.padraoUtilizadoId || undefined,
          numCertificadoPadrao: numCertPadrao,
          erroEncontrado: calibForm.erroEncontrado.trim() || undefined,
        } : c),
        bloqueado: calibForm.resultado === 'reprovado' ? true : i.bloqueado,
        dataAtualizacao: dataHojeISO(),
      } : i));
      toast.success('Calibração atualizada.');
    } else {
      // Novo registro
      const registro: RegistroCalibracao = {
        id: generateId('cal-'), data: calibForm.data, proximaCalibracao: proxCalib,
        numCertificado: calibForm.numCertificado.trim(), resultado: calibForm.resultado,
        certificadoBase64: calibForm.certificadoBase64 || undefined,
        certificadoNome: calibForm.certificadoNome || undefined,
        observacao: calibForm.observacao || undefined,
        padraoUtilizadoId: calibForm.padraoUtilizadoId || undefined,
        numCertificadoPadrao: numCertPadrao,
        erroEncontrado: calibForm.erroEncontrado.trim() || undefined,
      };
      setInstrumentos(prev => prev.map(i => i.id === inst.id ? {
        ...i, historicoCalibracao: [...i.historicoCalibracao, registro],
        bloqueado: calibForm.resultado === 'reprovado' ? true : i.bloqueado, dataAtualizacao: dataHojeISO(),
      } : i));
      toast.success('Calibração registrada.');
    }
    if (calibForm.resultado === 'reprovado') toast.warning('Instrumento bloqueado automaticamente — resultado reprovado.');
    resetCalibForm();
  }

  function deleteCalibracao() {
    if (!deleteCalibId) return;
    setInstrumentos(prev => prev.map(i => i.id === inst.id ? {
      ...i, historicoCalibracao: i.historicoCalibracao.filter(c => c.id !== deleteCalibId),
      dataAtualizacao: dataHojeISO(),
    } : i));
    setDeleteCalibId(null);
    toast.success('Calibração excluída.');
  }

  function addVerificacao() {
    if (!verifForm.data) { toast.error('Informe a data.'); return; }
    if (padraoVinculado && calcularStatusPadrao(padraoVinculado) === 'vencido') {
      toast.error('O padrão de referência está VENCIDO. Atualize o padrão antes de registrar a verificação.');
      return;
    }
    // Calcular desvios e filtrar medições preenchidas
    const medicoesComDesvio = verifForm.medicoes.map(m => ({
      ...m,
      desvio: calcularDesvio(m.valorPadrao, m.valorEncontrado),
    }));
    const medicoesPreenchidas = medicoesComDesvio.filter(m => m.valorPadrao || m.valorEncontrado);
    // Campos legados (primeira medição preenchida para retrocompatibilidade)
    const primeira = medicoesPreenchidas[0] || { valorPadrao: '', valorEncontrado: '', desvio: '' };
    const registro: RegistroVerificacao = {
      id: generateId('ver-'), data: verifForm.data, padraoId: inst.padraoUtilizadoId,
      pontoVerificado: verifForm.pontoVerificado,
      valorPadrao: primeira.valorPadrao, valorEncontrado: primeira.valorEncontrado, desvio: primeira.desvio,
      resultado: verifForm.resultado,
      observacao: verifForm.observacao, anexoBase64: verifForm.anexoBase64 || undefined,
      anexoNome: verifForm.anexoNome || undefined,
      medicoes: medicoesPreenchidas.length > 0 ? medicoesPreenchidas : undefined,
    };
    setInstrumentos(prev => prev.map(i => i.id === inst.id ? {
      ...i, historicoVerificacao: [...i.historicoVerificacao, registro],
      bloqueado: verifForm.resultado === 'nao-conforme' ? true : i.bloqueado, dataAtualizacao: dataHojeISO(),
    } : i));
    setShowVerificacaoForm(false);
    setVerifForm({ data: dataHojeISO(), pontoVerificado: '', medicoes: createEmptyMedicoes(), resultado: 'conforme', observacao: '', anexoBase64: '', anexoNome: '' });
    toast.success('Verificação registrada.');
    if (verifForm.resultado === 'nao-conforme') toast.warning('Instrumento bloqueado automaticamente — resultado não conforme.');
  }

  const tabs = useMemo(() => {
    const t: { key: string; label: string; icon: typeof Gauge }[] = [{ key: 'info', label: 'Identificação', icon: FileText }];
    if (inst.tipoControle === 'calibracao') t.push({ key: 'calibracao', label: 'Calibração', icon: ClipboardCheck });
    if (inst.tipoControle === 'verificacao') t.push({ key: 'verificacao', label: 'Verificação', icon: Ruler });
    t.push({ key: 'historico', label: 'Histórico', icon: History });
    return t;
  }, [inst.tipoControle]);

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-slate-300 text-xs" style={{ fontWeight: 600 }}>{inst.codigo}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${stCfg.bg} ${stCfg.text} border ${stCfg.border}`} style={{ fontWeight: 500 }}>{stCfg.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${critCfg.bg} ${critCfg.text} border ${critCfg.border}`} style={{ fontWeight: 500 }}>{critCfg.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${tipoCfg.bg} ${tipoCfg.text} border ${tipoCfg.border}`} style={{ fontWeight: 500 }}>{tipoCfg.label}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onEdit} className="text-white hover:bg-white/10 gap-1.5"><Edit2 className="w-4 h-4" /> Editar</Button>
        </div>
        <h2 className="text-white mt-2" style={{ fontSize: '1.25rem', fontWeight: 600 }}>{inst.descricao}</h2>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-slate-300">
          {inst.responsavel && <span>{inst.responsavel}</span>}
          {inst.localizacao && <span>{inst.localizacao}</span>}
          {proxValidade && <span>Validade: {formatarData(proxValidade)}</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 px-6 flex gap-1">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setDetalheTab(tab.key as any)}
            className={`px-3 py-2.5 text-xs transition-colors relative ${detalheTab === tab.key ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            style={{ fontWeight: detalheTab === tab.key ? 600 : 400 }}>
            <div className="flex items-center gap-1.5"><tab.icon className="w-3.5 h-3.5" />{tab.label}</div>
            {detalheTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-t" />}
          </button>
        ))}
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* INFO */}
        {detalheTab === 'info' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Código', value: inst.codigo }, { label: 'Descrição', value: inst.descricao },
                { label: 'Fabricante', value: inst.fabricante || '—' }, { label: 'Modelo', value: inst.modelo || '—' },
                { label: 'Nº de Série', value: inst.numSerie || '—' }, { label: 'Localização', value: inst.localizacao || '—' },
                { label: 'Processo Vinculado', value: inst.processoVinculado || '—' }, { label: 'Departamento', value: inst.departamento || '—' },
                { label: 'Responsável', value: inst.responsavel }, { label: 'Unidade', value: inst.unidade || '—' },
                { label: 'Tolerância', value: inst.tolerancia || '—' },
              ].map(item => (
                <div key={item.label}><span className="text-xs text-gray-400">{item.label}</span><p className="text-sm text-gray-700" style={{ fontWeight: 500 }}>{item.value}</p></div>
              ))}
            </div>
            {inst.observacoesTecnicas && (<div><span className="text-xs text-gray-400">Observações Técnicas</span><p className="text-sm text-gray-600 whitespace-pre-wrap mt-1">{inst.observacoesTecnicas}</p></div>)}
            {inst.tipoControle === 'nao-aplicavel' && inst.justificativaNaoAplicavel && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200"><span className="text-xs text-gray-400">Justificativa (Não Aplicável)</span><p className="text-sm text-gray-600 mt-1">{inst.justificativaNaoAplicavel}</p></div>
            )}
          </div>
        )}

        {/* CALIBRAÇÃO */}
        {detalheTab === 'calibracao' && inst.tipoControle === 'calibracao' && (
          <div className="space-y-4">
            {/* Tolerância do instrumento */}
            {inst.tolerancia && (
              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg flex items-center gap-3">
                <Ruler className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div>
                  <span className="text-xs text-blue-700" style={{ fontWeight: 600 }}>Tolerância para Aceitação</span>
                  <p className="text-sm text-blue-900" style={{ fontWeight: 600 }}>{inst.tolerancia}</p>
                </div>
                <p className="text-[10px] text-blue-500 ml-auto">O erro do certificado será comparado com esta tolerância</p>
              </div>
            )}
            {!inst.tolerancia && (
              <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Tolerância não definida. Edite o instrumento para configurar a tolerância de aceitação.</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-blue-600" /><span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Calibrações</span><span className="text-xs text-gray-400">Periodicidade: {inst.periodicidadeCalibracao} meses</span></div>
              <Button size="sm" className="gap-1.5 h-8" onClick={() => { setEditingCalibId(null); setCalibForm(calibFormDefault()); setShowCalibracaoForm(true); }}><Plus className="w-3.5 h-3.5" /> Nova Calibração</Button>
            </div>
            {showCalibracaoForm && (
              <Card className="border-blue-200 bg-blue-50/30 rounded-xl"><CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between"><span className="text-xs text-blue-700" style={{ fontWeight: 600 }}>{editingCalibId ? 'Editar Calibração' : 'Registrar Calibração'}</span><Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={resetCalibForm}><X className="w-3.5 h-3.5" /></Button></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-xs">Data *</Label><Input type="date" value={calibForm.data} onChange={e => setCalibForm(p => ({ ...p, data: e.target.value }))} className="mt-1 text-xs h-8" /></div>
                  <div><Label className="text-xs">Nº Certificado *</Label><Input value={calibForm.numCertificado} onChange={e => setCalibForm(p => ({ ...p, numCertificado: e.target.value }))} className="mt-1 text-xs h-8" /></div>
                  <div><Label className="text-xs">Resultado *</Label><Select value={calibForm.resultado} onValueChange={v => setCalibForm(p => ({ ...p, resultado: v as ResultadoCalibracao }))}><SelectTrigger className="mt-1 text-xs h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="aprovado">Aprovado</SelectItem><SelectItem value="reprovado">Reprovado</SelectItem></SelectContent></Select></div>
                </div>
                <div><Label className="text-xs">Certificado (PDF)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 text-xs text-gray-600 transition-colors"><Upload className="w-3.5 h-3.5" />{calibForm.certificadoNome || 'Selecionar arquivo'}<input type="file" accept=".pdf" className="hidden" onChange={e => handleFileUpload(e, (b64, nome) => setCalibForm(p => ({ ...p, certificadoBase64: b64, certificadoNome: nome })))} /></label>
                    {calibForm.certificadoNome && <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setCalibForm(p => ({ ...p, certificadoBase64: '', certificadoNome: '' }))}><X className="w-3 h-3" /></Button>}
                  </div>
                </div>
                {/* Rastreabilidade do padrão utilizado pelo laboratório */}
                <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs text-gray-600" style={{ fontWeight: 600 }}>Padrão utilizado na calibração</span>
                    <span className="text-xs text-gray-400">(rastreabilidade)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Vincular da biblioteca</Label>
                      <Select
                        value={calibForm.padraoUtilizadoId || '_none'}
                        onValueChange={v => setCalibForm(p => ({ ...p, padraoUtilizadoId: v === '_none' ? '' : v, numCertificadoPadrao: '' }))}
                      >
                        <SelectTrigger className="mt-1 text-xs h-8"><SelectValue placeholder="Selecionar padrão..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Nenhum</SelectItem>
                          {padroes.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.numCertificado}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Ou informar nº certificado do padrão</Label>
                      <Input
                        value={calibForm.padraoUtilizadoId ? (padroes.find(p => p.id === calibForm.padraoUtilizadoId)?.numCertificado || '') : calibForm.numCertificadoPadrao}
                        onChange={e => setCalibForm(p => ({ ...p, numCertificadoPadrao: e.target.value }))}
                        disabled={!!calibForm.padraoUtilizadoId}
                        placeholder={calibForm.padraoUtilizadoId ? 'Preenchido via biblioteca' : 'Nº certificado do padrão'}
                        className="mt-1 text-xs h-8"
                      />
                    </div>
                  </div>
                  {calibForm.padraoUtilizadoId && (() => {
                    const pSel = padroes.find(p => p.id === calibForm.padraoUtilizadoId);
                    if (!pSel) return null;
                    const pStatus = calcularStatusPadrao(pSel);
                    return (
                      <div className={`mt-1 p-2 rounded-md text-xs flex items-center gap-2 ${pStatus === 'vencido' ? 'bg-red-50 text-red-700' : pStatus === 'atencao' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{pSel.codigo} — {pSel.descricao}</span>
                        <span className="ml-auto" style={{ fontWeight: 500 }}>Validade: {formatarData(pSel.validade)}</span>
                        {pStatus === 'vencido' && <span className="px-1.5 py-0.5 bg-red-100 rounded text-red-700" style={{ fontWeight: 600 }}>VENCIDO</span>}
                      </div>
                    );
                  })()}
                </div>
                {/* Erro encontrado vs Tolerância */}
                <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs text-gray-600" style={{ fontWeight: 600 }}>Análise do Erro</span>
                    {inst.tolerancia && <span className="text-xs text-gray-400">(Tolerância: {inst.tolerancia})</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Erro Encontrado (certificado)</Label>
                      <Input
                        value={calibForm.erroEncontrado}
                        onChange={e => setCalibForm(p => ({ ...p, erroEncontrado: e.target.value }))}
                        placeholder="Ex: +0.03, -0.02, 0.05"
                        className="mt-1 text-xs h-8"
                      />
                    </div>
                    <div className="flex items-end">
                      {(() => {
                        const comp = compararErroTolerancia(calibForm.erroEncontrado, inst.tolerancia);
                        if (!calibForm.erroEncontrado.trim()) return <span className="text-[10px] text-gray-400 pb-2">Informe o erro do certificado para comparar</span>;
                        if (comp === null) return <span className="text-[10px] text-amber-600 pb-2">Não foi possível comparar — verifique a tolerância do instrumento</span>;
                        if (comp === 'dentro') return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 mb-0.5" style={{ fontWeight: 500 }}>✓ Dentro da tolerância</span>;
                        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-red-50 text-red-700 border border-red-200 mb-0.5" style={{ fontWeight: 500 }}>✗ Fora da tolerância</span>;
                      })()}
                    </div>
                  </div>
                </div>
                <div><Label className="text-xs">Observação</Label><Textarea value={calibForm.observacao} onChange={e => setCalibForm(p => ({ ...p, observacao: e.target.value }))} rows={2} className="mt-1 text-xs" placeholder="Opcional" /></div>
                <div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={resetCalibForm}>Cancelar</Button><Button size="sm" className="gap-1" onClick={saveCalibracao}><Save className="w-3.5 h-3.5" /> {editingCalibId ? 'Atualizar' : 'Salvar'}</Button></div>
              </CardContent></Card>
            )}
            {[...inst.historicoCalibracao].sort((a, b) => b.data.localeCompare(a.data)).map(cal => {
              const erroComp = cal.erroEncontrado ? compararErroTolerancia(cal.erroEncontrado, inst.tolerancia) : null;
              const isFora = erroComp === 'fora';
              return (
              <div key={cal.id} className={`border rounded-lg p-4 transition-all ${isFora ? 'border-red-300 bg-red-50/30 border-l-4 border-l-red-500' : cal.resultado === 'aprovado' ? 'border-emerald-200 bg-emerald-50/20' : 'border-red-200 bg-red-50/20'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>{formatarData(cal.data)}</span><span className={`px-2 py-0.5 rounded-full text-xs ${cal.resultado === 'aprovado' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`} style={{ fontWeight: 500 }}>{cal.resultado === 'aprovado' ? 'Aprovado' : 'Reprovado'}</span></div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Próx: {formatarData(cal.proximaCalibracao)}</span>
                    <div className="flex items-center gap-0.5 ml-2">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Visualizar" onClick={() => setViewingCalibId(cal.id)}><Eye className="w-3 h-3 text-gray-400" /></Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Editar" onClick={() => openEditCalibracao(cal)}><Edit2 className="w-3 h-3 text-gray-400" /></Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Excluir" onClick={() => setDeleteCalibId(cal.id)}><Trash2 className="w-3 h-3 text-red-400" /></Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>Cert: {cal.numCertificado}</span>
                  {cal.erroEncontrado && (() => {
                    return (
                      <span className="flex items-center gap-1">
                        <Ruler className="w-3 h-3 text-gray-400" />
                        Erro: <span style={{ fontWeight: 500 }}>{cal.erroEncontrado}</span>
                        {erroComp === 'dentro' && <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700" style={{ fontWeight: 500 }}>OK</span>}
                        {erroComp === 'fora' && <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700" style={{ fontWeight: 500 }}>FORA</span>}
                      </span>
                    );
                  })()}
                  {(cal.numCertificadoPadrao || cal.padraoUtilizadoId) && (
                    <span className="flex items-center gap-1">
                      <Link2 className="w-3 h-3 text-gray-400" />
                      Padrão: {cal.padraoUtilizadoId ? (() => {
                        const p = padroes.find(px => px.id === cal.padraoUtilizadoId);
                        return p ? `${p.codigo} (${p.numCertificado})` : cal.numCertificadoPadrao || '—';
                      })() : cal.numCertificadoPadrao}
                    </span>
                  )}
                  {cal.certificadoBase64 && <button className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors" onClick={() => setPdfPreview({ data: cal.certificadoBase64!, nome: cal.certificadoNome || 'certificado.pdf' })}><Eye className="w-3 h-3" /> Ver certificado</button>}
                </div>
                {cal.observacao && <p className="text-xs text-gray-500 mt-2">{cal.observacao}</p>}
              </div>
              );
            })}
            {inst.historicoCalibracao.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Nenhuma calibração registrada.</p>}

            {/* Dialog de Visualização de Calibração */}
            <Dialog open={!!viewingCalibId} onOpenChange={() => setViewingCalibId(null)}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-blue-600" /> Detalhes da Calibração</DialogTitle>
                  <DialogDescription>Registro completo da calibração.</DialogDescription>
                </DialogHeader>
                {(() => {
                  const cal = inst.historicoCalibracao.find(c => c.id === viewingCalibId);
                  if (!cal) return null;
                  const erroCompView = cal.erroEncontrado ? compararErroTolerancia(cal.erroEncontrado, inst.tolerancia) : null;
                  const padraoLib = cal.padraoUtilizadoId ? padroes.find(p => p.id === cal.padraoUtilizadoId) : null;
                  return (
                    <div className="space-y-4 py-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div><span className="text-xs text-gray-400">Data da Calibração</span><p className="text-sm text-gray-700" style={{ fontWeight: 500 }}>{formatarData(cal.data)}</p></div>
                        <div><span className="text-xs text-gray-400">Próxima Calibração</span><p className="text-sm text-gray-700" style={{ fontWeight: 500 }}>{formatarData(cal.proximaCalibracao)}</p></div>
                        <div><span className="text-xs text-gray-400">Nº do Certificado</span><p className="text-sm text-gray-700" style={{ fontWeight: 500 }}>{cal.numCertificado}</p></div>
                        <div><span className="text-xs text-gray-400">Resultado</span><p className="text-sm" style={{ fontWeight: 500 }}><span className={`px-2 py-0.5 rounded-full text-xs ${cal.resultado === 'aprovado' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{cal.resultado === 'aprovado' ? 'Aprovado' : 'Reprovado'}</span></p></div>
                      </div>
                      {cal.erroEncontrado && (
                        <div className={`p-3 rounded-lg border ${erroCompView === 'fora' ? 'bg-red-50 border-red-200' : erroCompView === 'dentro' ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center gap-2">
                            <Ruler className="w-3.5 h-3.5 text-gray-500" />
                            <span className="text-xs text-gray-600" style={{ fontWeight: 600 }}>Análise do Erro</span>
                          </div>
                          <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
                            <div><span className="text-gray-400">Erro Encontrado</span><p className="text-gray-700" style={{ fontWeight: 600 }}>{cal.erroEncontrado}</p></div>
                            <div><span className="text-gray-400">Tolerância</span><p className="text-gray-700" style={{ fontWeight: 500 }}>{inst.tolerancia || '—'}</p></div>
                            <div><span className="text-gray-400">Resultado</span>
                              {erroCompView === 'dentro' && <p className="text-emerald-700" style={{ fontWeight: 600 }}>✓ Dentro da tolerância</p>}
                              {erroCompView === 'fora' && <p className="text-red-700" style={{ fontWeight: 600 }}>✗ Fora da tolerância</p>}
                              {erroCompView === null && <p className="text-gray-400">Não calculável</p>}
                            </div>
                          </div>
                        </div>
                      )}
                      {(cal.padraoUtilizadoId || cal.numCertificadoPadrao) && (
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-2 mb-2"><Link2 className="w-3.5 h-3.5 text-gray-500" /><span className="text-xs text-gray-600" style={{ fontWeight: 600 }}>Padrão Utilizado</span></div>
                          {padraoLib ? (
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              <div><span className="text-gray-400">Código</span><p className="text-gray-700" style={{ fontWeight: 500 }}>{padraoLib.codigo}</p></div>
                              <div><span className="text-gray-400">Descrição</span><p className="text-gray-700" style={{ fontWeight: 500 }}>{padraoLib.descricao}</p></div>
                              <div><span className="text-gray-400">Nº Certificado</span><p className="text-gray-700" style={{ fontWeight: 500 }}>{padraoLib.numCertificado}</p></div>
                            </div>
                          ) : (
                            <div className="text-xs"><span className="text-gray-400">Nº Certificado do Padrão</span><p className="text-gray-700" style={{ fontWeight: 500 }}>{cal.numCertificadoPadrao || '—'}</p></div>
                          )}
                        </div>
                      )}
                      {cal.observacao && (<div><span className="text-xs text-gray-400">Observação</span><p className="text-sm text-gray-600 mt-1">{cal.observacao}</p></div>)}
                      {cal.certificadoBase64 && (
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { setPdfPreview({ data: cal.certificadoBase64!, nome: cal.certificadoNome || 'certificado.pdf' }); setViewingCalibId(null); }}><Eye className="w-3.5 h-3.5" /> Ver Certificado</Button>
                          <a href={cal.certificadoBase64} download={cal.certificadoNome || 'certificado.pdf'} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600 transition-colors"><Download className="w-3.5 h-3.5" /> Download</a>
                        </div>
                      )}
                      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { const c = inst.historicoCalibracao.find(x => x.id === viewingCalibId); if (c) openEditCalibracao(c); }}><Edit2 className="w-3.5 h-3.5" /> Editar</Button>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50" onClick={() => { setDeleteCalibId(viewingCalibId); setViewingCalibId(null); }}><Trash2 className="w-3.5 h-3.5" /> Excluir</Button>
                      </div>
                    </div>
                  );
                })()}
              </DialogContent>
            </Dialog>

            {/* AlertDialog de exclusão de calibração */}
            <AlertDialog open={!!deleteCalibId} onOpenChange={() => setDeleteCalibId(null)}>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Excluir Calibração</AlertDialogTitle><AlertDialogDescription>Esta ação é irreversível. O registro de calibração será removido permanentemente do histórico.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={deleteCalibracao} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* VERIFICAÇÃO */}
        {detalheTab === 'verificacao' && inst.tipoControle === 'verificacao' && (
          <div className="space-y-4">
            {padraoVinculado && (
              <div className={`p-4 rounded-lg border ${calcularStatusPadrao(padraoVinculado) === 'vencido' ? 'border-red-200 bg-red-50/30' : 'border-purple-200 bg-purple-50/30'}`}>
                <div className="flex items-center gap-2 mb-2"><BookOpen className="w-4 h-4 text-purple-600" /><span className="text-xs text-purple-700" style={{ fontWeight: 600 }}>Padrão de Referência</span>
                  {calcularStatusPadrao(padraoVinculado) === 'vencido' && <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 border border-red-200" style={{ fontWeight: 500 }}>VENCIDO</span>}
                </div>
                <div className="grid grid-cols-4 gap-3 text-xs">
                  <div><span className="text-gray-400">Código</span><p className="text-gray-700" style={{ fontWeight: 500 }}>{padraoVinculado.codigo}</p></div>
                  <div><span className="text-gray-400">Certificado</span><p className="text-gray-700" style={{ fontWeight: 500 }}>{padraoVinculado.numCertificado}</p></div>
                  <div><span className="text-gray-400">Validade</span><p className="text-gray-700" style={{ fontWeight: 500 }}>{formatarData(padraoVinculado.validade)}</p></div>
                  <div><span className="text-gray-400">Tolerância</span><p className="text-gray-700" style={{ fontWeight: 500 }}>{inst.tolerancia || '—'}</p></div>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Ruler className="w-4 h-4 text-purple-600" /><span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Verificações Internas</span><span className="text-xs text-gray-400">Periodicidade: {inst.periodicidadeVerificacao} meses</span></div>
              <Button size="sm" className="gap-1.5 h-8" onClick={() => setShowVerificacaoForm(true)}><Plus className="w-3.5 h-3.5" /> Nova Verificação</Button>
            </div>
            {showVerificacaoForm && (
              <Card className="border-purple-200 bg-purple-50/30 rounded-xl"><CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between"><span className="text-xs text-purple-700" style={{ fontWeight: 600 }}>Registrar Verificação</span><Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowVerificacaoForm(false)}><X className="w-3.5 h-3.5" /></Button></div>
                {padraoVinculado && calcularStatusPadrao(padraoVinculado) === 'vencido' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />O padrão de referência está vencido. Atualize o padrão antes de registrar.</div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Data *</Label><Input type="date" value={verifForm.data} onChange={e => setVerifForm(p => ({ ...p, data: e.target.value }))} className="mt-1 text-xs h-8" /></div>
                  <div><Label className="text-xs">Ponto/Trecho Verificado</Label><Input value={verifForm.pontoVerificado} onChange={e => setVerifForm(p => ({ ...p, pontoVerificado: e.target.value }))} className="mt-1 text-xs h-8" placeholder="Opcional" /></div>
                </div>
                {/* Medições múltiplas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Medições ({verifForm.medicoes.length})</Label>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={verifForm.medicoes.length <= 1} onClick={() => setVerifForm(p => ({ ...p, medicoes: p.medicoes.slice(0, -1) }))} title="Remover última medição"><Minus className="w-3 h-3" /></Button>
                      <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setVerifForm(p => ({ ...p, medicoes: [...p.medicoes, { valorPadrao: '', valorEncontrado: '', desvio: '' }] }))} title="Adicionar medição"><Plus className="w-3 h-3" /></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-x-2 gap-y-1 items-end">
                    <span className="text-[10px] text-gray-400 pb-1">#</span>
                    <span className="text-[10px] text-gray-500 pb-1">Valor Padrão</span>
                    <span className="text-[10px] text-gray-500 pb-1">Valor Encontrado</span>
                    <span className="text-[10px] text-gray-500 pb-1">Desvio</span>
                    {verifForm.medicoes.map((med, idx) => (
                      <div key={idx} style={{ display: 'contents' }}>
                        <span className="text-[10px] text-gray-400 h-8 flex items-center justify-center">{idx + 1}</span>
                        <Input value={med.valorPadrao} onChange={e => { const v = e.target.value; setVerifForm(p => ({ ...p, medicoes: p.medicoes.map((m, i) => i === idx ? { ...m, valorPadrao: v } : m) })); }} className="text-xs h-8" placeholder="Opcional" />
                        <Input value={med.valorEncontrado} onChange={e => { const v = e.target.value; setVerifForm(p => ({ ...p, medicoes: p.medicoes.map((m, i) => i === idx ? { ...m, valorEncontrado: v } : m) })); }} className="text-xs h-8" placeholder="Opcional" />
                        <Input value={calcularDesvio(med.valorPadrao, med.valorEncontrado)} readOnly className="text-xs h-8 bg-gray-50" placeholder="Auto" />
                      </div>
                    ))}
                  </div>
                </div>
                <div><Label className="text-xs">Resultado *</Label><Select value={verifForm.resultado} onValueChange={v => setVerifForm(p => ({ ...p, resultado: v as ResultadoVerificacao }))}><SelectTrigger className="mt-1 text-xs h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="conforme">Conforme</SelectItem><SelectItem value="nao-conforme">Não Conforme</SelectItem></SelectContent></Select></div>
                <div><Label className="text-xs">Observação</Label><Textarea value={verifForm.observacao} onChange={e => setVerifForm(p => ({ ...p, observacao: e.target.value }))} rows={2} className="mt-1 text-xs" placeholder="Opcional" /></div>
                <div><Label className="text-xs">Anexo (foto/arquivo)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 text-xs text-gray-600 transition-colors"><Upload className="w-3.5 h-3.5" />{verifForm.anexoNome || 'Selecionar arquivo'}<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => handleFileUpload(e, (b64, nome) => setVerifForm(p => ({ ...p, anexoBase64: b64, anexoNome: nome })))} /></label>
                  </div>
                </div>
                <div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => setShowVerificacaoForm(false)}>Cancelar</Button><Button size="sm" className="gap-1" onClick={addVerificacao}><Save className="w-3.5 h-3.5" /> Salvar</Button></div>
              </CardContent></Card>
            )}
            {[...inst.historicoVerificacao].sort((a, b) => b.data.localeCompare(a.data)).map(ver => (
              <div key={ver.id} className={`border rounded-lg p-4 ${ver.resultado === 'conforme' ? 'border-emerald-200 bg-emerald-50/20' : 'border-red-200 bg-red-50/20'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>{formatarData(ver.data)}</span><span className={`px-2 py-0.5 rounded-full text-xs ${ver.resultado === 'conforme' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`} style={{ fontWeight: 500 }}>{ver.resultado === 'conforme' ? 'Conforme' : 'Não Conforme'}</span></div>
                </div>
                {ver.pontoVerificado && <div className="text-xs text-gray-500 mb-1">Ponto: {ver.pontoVerificado}</div>}
                {/* Medições — retrocompatível: usa medicoes[] se existir, senão campos legados */}
                {(() => {
                  const meds = ver.medicoes && ver.medicoes.length > 0
                    ? ver.medicoes
                    : (ver.valorPadrao || ver.valorEncontrado ? [{ valorPadrao: ver.valorPadrao, valorEncontrado: ver.valorEncontrado, desvio: ver.desvio }] : []);
                  if (meds.length === 0) return null;
                  return (
                    <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden">
                      <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-0 text-[10px] text-gray-500 bg-gray-50/80">
                        <span className="px-2 py-1 border-r border-gray-200">#</span>
                        <span className="px-2 py-1 border-r border-gray-200">Padrão</span>
                        <span className="px-2 py-1 border-r border-gray-200">Encontrado</span>
                        <span className="px-2 py-1">Desvio</span>
                      </div>
                      {meds.map((m, mi) => (
                        <div key={mi} className="grid grid-cols-[auto_1fr_1fr_1fr] gap-0 text-xs text-gray-600 border-t border-gray-100">
                          <span className="px-2 py-1 border-r border-gray-100 text-gray-400">{mi + 1}</span>
                          <span className="px-2 py-1 border-r border-gray-100">{m.valorPadrao || '—'}</span>
                          <span className="px-2 py-1 border-r border-gray-100">{m.valorEncontrado || '—'}</span>
                          <span className="px-2 py-1">{m.desvio || '—'}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {ver.observacao && <p className="text-xs text-gray-500 mt-2">{ver.observacao}</p>}
              </div>
            ))}
            {inst.historicoVerificacao.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Nenhuma verificação registrada.</p>}
          </div>
        )}

        {/* HISTÓRICO */}
        {detalheTab === 'historico' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3"><History className="w-4 h-4 text-gray-500" /><span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Histórico Cronológico</span></div>
            {(() => {
              const eventos: { data: string; tipo: string; desc: string; color: string }[] = [];
              inst.historicoCalibracao.forEach(c => {
                const erroInfo = c.erroEncontrado ? ` — Erro: ${c.erroEncontrado}` : '';
                const compInfo = c.erroEncontrado && inst.tolerancia ? (() => { const r = compararErroTolerancia(c.erroEncontrado, inst.tolerancia); return r === 'dentro' ? ' (OK)' : r === 'fora' ? ' (FORA)' : ''; })() : '';
                eventos.push({ data: c.data, tipo: 'Calibração', desc: `Cert: ${c.numCertificado} — ${c.resultado === 'aprovado' ? 'Aprovado' : 'Reprovado'}${erroInfo}${compInfo}`, color: c.resultado === 'aprovado' ? 'text-emerald-600' : 'text-red-600' });
              });
              inst.historicoVerificacao.forEach(v => { const nMed = v.medicoes?.length || (v.valorPadrao || v.valorEncontrado ? 1 : 0); eventos.push({ data: v.data, tipo: 'Verificação', desc: `${v.resultado === 'conforme' ? 'Conforme' : 'Não Conforme'}${nMed > 0 ? ` (${nMed} med.)` : ''}${v.pontoVerificado ? ` — ${v.pontoVerificado}` : ''}`, color: v.resultado === 'conforme' ? 'text-emerald-600' : 'text-red-600' }); });
              inst.historicoBloqueio.forEach(b => eventos.push({ data: b.data, tipo: b.tipo === 'bloqueio' ? 'Bloqueio' : 'Desbloqueio', desc: `${b.justificativa} (${b.usuario})`, color: b.tipo === 'bloqueio' ? 'text-red-600' : 'text-emerald-600' }));
              eventos.sort((a, b) => b.data.localeCompare(a.data));
              if (eventos.length === 0) return <p className="text-sm text-gray-400 text-center py-6">Nenhum evento registrado.</p>;
              return eventos.map((ev, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                  <span className="text-xs text-gray-400 w-16 flex-shrink-0 pt-0.5">{formatarData(ev.data)}</span>
                  <div className="flex-1"><span className={`text-xs ${ev.color}`} style={{ fontWeight: 600 }}>{ev.tipo}</span><p className="text-xs text-gray-600">{ev.desc}</p></div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {/* PDF Preview */}
      <Dialog open={!!pdfPreview} onOpenChange={() => setPdfPreview(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{pdfPreview?.nome}</span>
              {pdfPreview?.data && <a href={pdfPreview.data} download={pdfPreview.nome} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"><Download className="w-4 h-4" /> Download</a>}
            </DialogTitle>
            <DialogDescription>Visualização do certificado em PDF.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0">{pdfPreview?.data && <iframe src={pdfPreview.data} className="w-full h-full rounded-lg border" title="Preview do certificado" />}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
