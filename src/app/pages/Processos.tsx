import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, FileText, Edit3, Trash2, Eye, CheckCircle2, Clock, Archive, Save } from 'lucide-react';
import { useStrategic } from '../context/StrategicContext';
import { AtividadeProcesso, Processo, StatusProcesso } from '../types/strategic';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { formatarDataPtBr } from '../utils/formatters';
import { MetricCard } from '../components/ui/metric-card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';

export default function Processos() {
  const { dados, deleteProcesso, addProcesso } = useStrategic();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusProcesso | 'todos'>('todos');
  const [departamentoFilter, setDepartamentoFilter] = useState('todos');
  const [isNovoProcessoOpen, setIsNovoProcessoOpen] = useState(false);

  const processos = dados.processos || [];

  const gerarCodigoMP = () => {
    const numeroAtual = processos.length + 1;
    return `MP${numeroAtual.toString().padStart(2, '0')}`;
  };

  const createInitialFormData = (): Partial<Processo> => ({
    codigo: gerarCodigoMP(),
    nome: '',
    departamento: '',
    tipo: 'Operacional',
    status: 'Rascunho',
    objetivo: '',
    versaoAtual: '1.0',
    atividades: [],
  });

  const [formData, setFormData] = useState<Partial<Processo>>(createInitialFormData);
  const [novaAtividade, setNovaAtividade] = useState({ nome: '', descricao: '' });
  const [liveFormErrors, setLiveFormErrors] = useState<{
    nome?: string;
    departamento?: string;
    atividadeNome?: string;
  }>({});

  const lastNovoProcessoTriggerRef = useRef<HTMLButtonElement | null>(null);
  const nomeInputRef = useRef<HTMLInputElement | null>(null);
  const departamentoInputRef = useRef<HTMLInputElement | null>(null);
  const atividadeNomeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isNovoProcessoOpen) return;
    setFormData(prev => ({ ...prev, codigo: gerarCodigoMP() }));
  }, [isNovoProcessoOpen, processos.length]);

  const processosFiltrados = processos.filter(processo => {
    const matchSearch = 
      processo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      processo.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      processo.departamento.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = statusFilter === 'todos' || processo.status === statusFilter;
    const matchDepartamento = departamentoFilter === 'todos' || processo.departamento === departamentoFilter;
    
    return matchSearch && matchStatus && matchDepartamento;
  });

  const departamentos = Array.from(new Set(processos.map(p => p.departamento))).sort();

  const getStatusColor = (status: StatusProcesso) => {
    switch (status) {
      case 'Ativo':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Rascunho':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Arquivado':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const handleNovoProcessoOpenChange = (open: boolean) => {
    setIsNovoProcessoOpen(open);
    if (open) {
      setFormData(createInitialFormData());
      setNovaAtividade({ nome: '', descricao: '' });
      setLiveFormErrors({});
      return;
    }
    setTimeout(() => {
      lastNovoProcessoTriggerRef.current?.focus();
    }, 0);
  };

  const handleNovoProcesso = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e?.currentTarget) lastNovoProcessoTriggerRef.current = e.currentTarget;
    handleNovoProcessoOpenChange(true);
  };

  const handleVerProcesso = (id: string) => {
    navigate(`/processos/${id}`);
  };

  const handleEditProcesso = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/processos/${id}`);
  };

  const handleDeleteProcesso = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir este processo? Esta ação não pode ser desfeita.')) {
      deleteProcesso(id);
      toast.success('Processo excluído com sucesso!');
    }
  };

  const validateForm = () => {
    const errors: {
      nome?: string;
      departamento?: string;
    } = {};

    if (!String(formData.nome ?? '').trim()) errors.nome = 'Informe o nome do processo.';
    if (!String(formData.departamento ?? '').trim()) errors.departamento = 'Informe o departamento.';

    setLiveFormErrors(prev => ({ ...prev, ...errors, atividadeNome: prev.atividadeNome }));
    return errors;
  };

  const handleSalvarNovoProcesso = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm();

    if (errors.nome) {
      toast.error('Preencha todos os campos obrigatórios');
      nomeInputRef.current?.focus();
      return;
    }
    if (errors.departamento) {
      toast.error('Preencha todos os campos obrigatórios');
      departamentoInputRef.current?.focus();
      return;
    }

    const novoProcesso: Processo = {
      id: crypto.randomUUID(),
      codigo: String(formData.codigo ?? gerarCodigoMP()),
      nome: String(formData.nome ?? '').trim(),
      departamento: String(formData.departamento ?? '').trim(),
      tipo: (formData.tipo as any) || 'Operacional',
      status: (formData.status as any) || 'Rascunho',
      objetivo: String(formData.objetivo ?? ''),
      versaoAtual: '1.0',
      dataCriacao: new Date().toISOString(),
      ultimaAtualizacao: new Date().toISOString(),
      atividades: (formData.atividades as AtividadeProcesso[]) || [],
      entradas: [],
      saidas: [],
      funcoes: [],
      recursos: [],
      indicadores: [],
      riscos: [],
      documentos: [],
      registros: [],
      versoes: [],
    };

    addProcesso(novoProcesso);
    toast.success('Processo criado com sucesso!');
    setIsNovoProcessoOpen(false);
    navigate(`/processos/${novoProcesso.id}`);
  };

  const handleAddAtividade = () => {
    const nome = String(novaAtividade.nome ?? '').trim();
    if (!nome) {
      setLiveFormErrors(prev => ({ ...prev, atividadeNome: 'Informe o nome da atividade.' }));
      toast.error('Preencha o nome da atividade');
      atividadeNomeInputRef.current?.focus();
      return;
    }

    const atividade: AtividadeProcesso = {
      id: crypto.randomUUID(),
      nome,
      descricao: String(novaAtividade.descricao ?? ''),
      responsavel: '',
      ordem: ((formData.atividades as AtividadeProcesso[])?.length || 0) + 1,
    };

    setFormData(prev => ({
      ...prev,
      atividades: [...(((prev.atividades as AtividadeProcesso[]) || []) as AtividadeProcesso[]), atividade],
    }));
    setNovaAtividade({ nome: '', descricao: '' });
    setLiveFormErrors(prev => ({ ...prev, atividadeNome: undefined }));
    toast.success('Atividade adicionada!');
  };

  const handleRemoveAtividade = (id: string) => {
    setFormData(prev => ({
      ...prev,
      atividades: (((prev.atividades as AtividadeProcesso[]) || []) as AtividadeProcesso[]).filter(
        (a: AtividadeProcesso) => a.id !== id,
      ),
    }));
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* ═══ PAGE HEADER ═══ */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Mapas de Processos
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Gerencie a estrutura e organização dos processos da empresa
          </p>
        </div>
        <Button onClick={(e) => handleNovoProcesso(e)} className="gap-2 flex-shrink-0 ml-8">
          <Plus className="w-4 h-4" />
          Novo Processo
        </Button>
      </div>

      <Dialog
        open={isNovoProcessoOpen}
        onOpenChange={handleNovoProcessoOpenChange}
      >
        <DialogContent
          className="w-full sm:max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto p-0"
          aria-describedby="novo-processo-description"
        >
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-lg" style={{ fontWeight: 600 }}>
                Novo Processo
              </DialogTitle>
              <DialogDescription id="novo-processo-description">
                Preencha as informações do processo para cadastrar no sistema.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSalvarNovoProcesso} className="px-6 py-5 space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h3 className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                Informações Básicas
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="novo-processo-codigo" className="block text-xs text-gray-600">
                    Código do Processo *
                  </label>
                  <Input
                    id="novo-processo-codigo"
                    value={String(formData.codigo ?? '')}
                    disabled
                    className="mt-1 text-sm bg-gray-50"
                    placeholder="Gerado automaticamente"
                  />
                  <p className="text-xs text-gray-500 mt-1">Código gerado automaticamente</p>
                </div>

                <div>
                  <label htmlFor="novo-processo-nome" className="block text-xs text-gray-600">
                    Nome do Processo *
                  </label>
                  <Input
                    id="novo-processo-nome"
                    ref={nomeInputRef}
                    value={String(formData.nome ?? '')}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData(prev => ({ ...prev, nome: v }));
                      if (liveFormErrors.nome) setLiveFormErrors(prev => ({ ...prev, nome: undefined }));
                    }}
                    className="mt-1 text-sm"
                    placeholder="Ex: Gestão de Vendas"
                    aria-invalid={!!liveFormErrors.nome}
                    autoFocus
                  />
                  {liveFormErrors.nome && (
                    <p className="text-xs text-red-500 mt-1">
                      {liveFormErrors.nome}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="novo-processo-departamento" className="block text-xs text-gray-600">
                    Departamento *
                  </label>
                  <Input
                    id="novo-processo-departamento"
                    ref={departamentoInputRef}
                    value={String(formData.departamento ?? '')}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData(prev => ({ ...prev, departamento: v }));
                      if (liveFormErrors.departamento) setLiveFormErrors(prev => ({ ...prev, departamento: undefined }));
                    }}
                    className="mt-1 text-sm"
                    placeholder="Ex: Comercial"
                    aria-invalid={!!liveFormErrors.departamento}
                  />
                  {liveFormErrors.departamento && (
                    <p className="text-xs text-red-500 mt-1">
                      {liveFormErrors.departamento}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="novo-processo-tipo" className="block text-xs text-gray-600">
                    Tipo de Processo
                  </label>
                  <select
                    id="novo-processo-tipo"
                    value={String(formData.tipo ?? 'Operacional')}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value as any }))}
                    className="mt-1 w-full h-9 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="Estratégico">Estratégico</option>
                    <option value="Operacional">Operacional</option>
                    <option value="Suporte">Suporte</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="novo-processo-status" className="block text-xs text-gray-600">
                    Status
                  </label>
                  <select
                    id="novo-processo-status"
                    value={String(formData.status ?? 'Rascunho')}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="mt-1 w-full h-9 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="Rascunho">Rascunho</option>
                    <option value="Ativo">Ativo</option>
                    <option value="Arquivado">Arquivado</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="novo-processo-objetivo" className="block text-xs text-gray-600">
                  Objetivo
                </label>
                <textarea
                  id="novo-processo-objetivo"
                  value={String(formData.objetivo ?? '')}
                  onChange={(e) => setFormData(prev => ({ ...prev, objetivo: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Descreva o objetivo deste processo..."
                  rows={3}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h3 className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                Atividades do Processo
              </h3>

              {Array.isArray(formData.atividades) && formData.atividades.length > 0 && (
                <div className="space-y-3">
                  {(formData.atividades as AtividadeProcesso[]).map((atividade, index) => (
                    <div
                      key={atividade.id}
                      className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{atividade.nome}</p>
                        {atividade.descricao && (
                          <p className="text-sm text-gray-600 mt-1">{atividade.descricao}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAtividade(atividade.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        aria-label="Remover atividade"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Adicionar Atividade
                </h4>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="novo-processo-atividade-nome" className="block text-xs text-gray-600">
                      Nome da Atividade *
                    </label>
                    <Input
                      id="novo-processo-atividade-nome"
                      ref={atividadeNomeInputRef}
                      value={novaAtividade.nome}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNovaAtividade(prev => ({ ...prev, nome: v }));
                        if (liveFormErrors.atividadeNome) setLiveFormErrors(prev => ({ ...prev, atividadeNome: undefined }));
                      }}
                      className="mt-1 text-sm"
                      placeholder="Ex: Análise de requisitos"
                      aria-invalid={!!liveFormErrors.atividadeNome}
                    />
                    {liveFormErrors.atividadeNome && (
                      <p className="text-xs text-red-500 mt-1">
                        {liveFormErrors.atividadeNome}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="novo-processo-atividade-descricao" className="block text-xs text-gray-600">
                      Descrição (opcional)
                    </label>
                    <textarea
                      id="novo-processo-atividade-descricao"
                      value={novaAtividade.descricao}
                      onChange={(e) => setNovaAtividade(prev => ({ ...prev, descricao: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      placeholder="Descreva detalhes sobre esta atividade..."
                      rows={2}
                    />
                  </div>
                  <Button type="button" variant="outline" onClick={handleAddAtividade} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Adicionar Atividade
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-1 pb-1">
              <Button type="button" variant="outline" onClick={() => handleNovoProcessoOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2">
                <Save className="w-4 h-4" />
                Criar Processo
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══ MetricCards ═══ */}
      {processos.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            label="Total de Processos"
            value={processos.length}
            icon={FileText}
            variant="default"
          />
          <MetricCard
            label="Ativos"
            value={processos.filter(p => p.status === 'Ativo').length}
            icon={CheckCircle2}
            variant="success"
          />
          <MetricCard
            label="Rascunhos"
            value={processos.filter(p => p.status === 'Rascunho').length}
            icon={Clock}
            variant="warning"
          />
          <MetricCard
            label="Arquivados"
            value={processos.filter(p => p.status === 'Arquivado').length}
            icon={Archive}
            variant="default"
          />
        </div>
      )}

      {/* ═══ FILTROS ═══ */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por código, nome ou departamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusProcesso | 'todos')}
          className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="todos">Todos os Status</option>
          <option value="Ativo">Ativo</option>
          <option value="Rascunho">Rascunho</option>
          <option value="Arquivado">Arquivado</option>
        </select>

        <select
          value={departamentoFilter}
          onChange={(e) => setDepartamentoFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="todos">Todos Depto.</option>
          {departamentos.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      {/* ═══ TABELA DE PROCESSOS ═══ */}
      {processosFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12">
          <div className="text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-900 mb-1" style={{ fontSize: '1rem', fontWeight: 600 }}>
              {processos.length === 0 ? 'Nenhum processo cadastrado' : 'Nenhum processo encontrado'}
            </p>
            <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
              {processos.length === 0 
                ? 'Comece criando seu primeiro processo para estruturar a gestão da empresa.'
                : 'Tente ajustar os filtros para encontrar o que procura.'
              }
            </p>
            {processos.length === 0 && (
              <div className="flex gap-3 justify-center">
                <Button onClick={(e) => handleNovoProcesso(e)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Criar Primeiro Processo
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
              Processos Cadastrados
            </h3>
            <span className="text-xs text-gray-400">
              {processosFiltrados.length} de {processos.length} processo(s)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="bg-gray-50/60">
                  <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap" style={{ fontWeight: 500 }}>
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap" style={{ fontWeight: 500 }}>
                    Nome do Processo
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap" style={{ fontWeight: 500 }}>
                    Departamento
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap" style={{ fontWeight: 500 }}>
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap" style={{ fontWeight: 500 }}>
                    Versão
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap" style={{ fontWeight: 500 }}>
                    Última Atualização
                  </th>
                  <th className="px-4 py-3 text-center text-xs text-gray-500 whitespace-nowrap" style={{ fontWeight: 500 }}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {processosFiltrados.map((processo) => (
                  <tr 
                    key={processo.id}
                    className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                    onClick={() => handleVerProcesso(processo.id)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-mono text-blue-600" style={{ fontWeight: 500 }}>
                        {processo.codigo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900" style={{ fontWeight: 500 }}>
                        {processo.nome}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {processo.departamento}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs ${getStatusColor(processo.status)}`} style={{ fontWeight: 500 }}>
                        {processo.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-500">
                        {processo.versaoAtual}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-500">
                        {formatarDataPtBr(processo.ultimaAtualizacao)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVerProcesso(processo.id);
                          }}
                          className="h-8 w-8 p-0"
                          title="Visualizar processo"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleEditProcesso(e, processo.id)}
                          className="h-8 w-8 p-0"
                          title="Editar processo"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteProcesso(e, processo.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Excluir processo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
