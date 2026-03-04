import { generateId, getFromStorage } from '../utils/helpers';
import { formatarDataPtBr, formatarCPF, formatarTelefone } from '../utils/formatters';
import { UserCircle, Plus, Edit2, Trash2, Save, X, Search, Calendar, Briefcase, Eye, FileText, ClipboardCheck, Target, GraduationCap, CheckCircle2, Building2, UserX } from 'lucide-react';
import { useState, useEffect, useRef, type FormEvent, type MouseEvent } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { RegistroIntegracaoColaborador } from '../components/RegistroIntegracaoColaborador';
import { AvaliacaoExperienciaComponent } from '../components/AvaliacaoExperiencia';
import { AvaliacaoDesempenhoComponent } from '../components/AvaliacaoDesempenho';
import { getRequisitoStatusColor, getRequisitoStatusIcon } from '../utils/rh-helpers';
import { Colaborador } from '../types/config';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { MetricCard } from '../components/ui/metric-card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';

export function Colaboradores() {
  const [colaboradores, setColaboradores] = useLocalStorage<Colaborador[]>('sisteq-colaboradores', []);
  const [listaFuncoes, setListaFuncoes] = useState<string[]>([]);
  const [listaDepartamentos, setListaDepartamentos] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedColaborador, setSelectedColaborador] = useState<Colaborador | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    nomeCompleto?: string;
    dataContratacao?: string;
    funcao?: string;
  }>({});
  const lastFormTriggerRef = useRef<HTMLButtonElement | null>(null);
  const nomeCompletoInputRef = useRef<HTMLInputElement | null>(null);
  const dataContratacaoInputRef = useRef<HTMLInputElement | null>(null);
  const funcaoSelectRef = useRef<HTMLSelectElement | null>(null);

  // Form state
  const [formData, setFormData] = useState<Omit<Colaborador, 'id' | 'numero' | 'dataCriacao' | 'dataAtualizacao'>>({
    nomeCompleto: '',
    dataContratacao: '',
    funcao: '',
    departamento: '',
    email: '',
    telefone: '',
    cpf: '',
    status: 'ativo'
  });

  // Carregar dados
  useEffect(() => {
    // Carregar funções
    const funcoesData = getFromStorage<any[]>('funcoes', []);
    setListaFuncoes(funcoesData.filter((f: any) => f.ativo).map((f: any) => f.nome));

    // Carregar departamentos
    const deptData = getFromStorage<any[]>('departamentos', []);
    setListaDepartamentos(deptData.filter((d: any) => d.ativo).map((d: any) => d.nome));
  }, []);

  const generateNumero = () => {
    const nextNum = colaboradores.length + 1;
    return `COL${nextNum.toString().padStart(3, '0')}`;
  };

  const handleNew = (event?: MouseEvent<HTMLButtonElement>) => {
    lastFormTriggerRef.current = event?.currentTarget ?? null;
    setEditingId(null);
    setFormErrors({});
    setIsSaving(false);
    setFormData({
      nomeCompleto: '',
      dataContratacao: '',
      funcao: '',
      departamento: '',
      email: '',
      telefone: '',
      cpf: '',
      status: 'ativo'
    });
    setFormOpen(true);
  };

  const handleEdit = (colaborador: Colaborador, event?: MouseEvent<HTMLButtonElement>) => {
    lastFormTriggerRef.current = event?.currentTarget ?? null;
    setEditingId(colaborador.id);
    setFormErrors({});
    setIsSaving(false);
    setFormData({
      nomeCompleto: colaborador.nomeCompleto,
      dataContratacao: colaborador.dataContratacao,
      funcao: colaborador.funcao,
      departamento: colaborador.departamento,
      email: colaborador.email,
      telefone: colaborador.telefone,
      cpf: colaborador.cpf,
      status: colaborador.status
    });
    setFormOpen(true);
  };

  const handleView = (colaborador: Colaborador) => {
    setSelectedColaborador(colaborador);
    setViewMode('view');
  };

  const handleSave = async (event?: FormEvent) => {
    event?.preventDefault();
    if (isSaving) return;

    const nextErrors: typeof formErrors = {};
    if (!formData.nomeCompleto.trim()) nextErrors.nomeCompleto = 'Nome completo é obrigatório.';
    if (!formData.dataContratacao.trim()) nextErrors.dataContratacao = 'Data de contratação é obrigatória.';
    if (!formData.funcao.trim()) nextErrors.funcao = 'Função é obrigatória.';

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      toast.error('Preencha os campos obrigatórios.');
      if (nextErrors.nomeCompleto) {
        nomeCompletoInputRef.current?.focus();
      } else if (nextErrors.dataContratacao) {
        dataContratacaoInputRef.current?.focus();
      } else if (nextErrors.funcao) {
        funcaoSelectRef.current?.focus();
      }
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();

      if (editingId) {
        const updated = colaboradores.map(c =>
          c.id === editingId
            ? { ...c, ...formData, dataAtualizacao: now }
            : c
        );
        setColaboradores(updated);
        toast.success('Colaborador atualizado com sucesso.');
      } else {
        const newColaborador: Colaborador = {
          id: generateId(),
          numero: generateNumero(),
          ...formData,
          dataCriacao: now,
          dataAtualizacao: now
        };
        const updated = [...colaboradores, newColaborador];
        setColaboradores(updated);
        toast.success('Colaborador cadastrado com sucesso.');
      }

      handleCancel();
    } catch {
      toast.error('Não foi possível salvar o colaborador.');
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    const colaborador = colaboradores.find(c => c.id === id);
    if (colaborador && confirm(`Deseja realmente excluir o colaborador "${colaborador.nomeCompleto}"?`)) {
      const updated = colaboradores.filter(c => c.id !== id);
      setColaboradores(updated);
      toast.success('Colaborador excluído.');
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingId(null);
    setSelectedColaborador(null);
    setFormOpen(false);
    setIsSaving(false);
    setFormErrors({});
    setTimeout(() => {
      lastFormTriggerRef.current?.focus();
    }, 0);
  };

  const handleFormOpenChange = (open: boolean) => {
    if (open) {
      setFormOpen(true);
      return;
    }
    handleCancel();
  };

  // Filtrar colaboradores
  const filteredColaboradores = colaboradores.filter(c =>
    c.nomeCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.funcao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.departamento.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Colaboradores
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Gerencie o cadastro de colaboradores e acompanhe suas informações
          </p>
        </div>
        {viewMode === 'list' && (
          <Button
            onClick={(e) => handleNew(e)}
            className="gap-2 flex-shrink-0 ml-8"
          >
            <Plus className="w-4 h-4" />
            Novo Colaborador
          </Button>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={handleFormOpenChange}>
        <DialogContent
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            nomeCompletoInputRef.current?.focus();
          }}
          className="w-full sm:max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto p-0"
          aria-describedby="colaborador-form-description"
        >
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
            <DialogHeader className="gap-1">
              <DialogTitle>
                {editingId ? 'Editar Colaborador' : 'Novo Colaborador'}
              </DialogTitle>
              <DialogDescription id="colaborador-form-description">
                Preencha os dados do colaborador para salvar no cadastro.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSave} className="px-6 py-5 space-y-5 bg-white text-foreground">
            <div>
              <Label htmlFor="colaborador-nomeCompleto" className="mb-2 block">
                Nome Completo <span className="text-destructive">*</span>
              </Label>
              <Input
                ref={nomeCompletoInputRef}
                id="colaborador-nomeCompleto"
                value={formData.nomeCompleto}
                onChange={(e) => {
                  setFormData({ ...formData, nomeCompleto: e.target.value });
                  if (formErrors.nomeCompleto) setFormErrors({ ...formErrors, nomeCompleto: undefined });
                }}
                placeholder="Digite o nome completo"
                aria-invalid={!!formErrors.nomeCompleto}
                aria-describedby={formErrors.nomeCompleto ? 'colaborador-nome-erro' : undefined}
              />
              {formErrors.nomeCompleto && (
                <p id="colaborador-nome-erro" className="mt-1 text-xs text-destructive">
                  {formErrors.nomeCompleto}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="colaborador-dataContratacao" className="mb-2 block">
                  Data de Contratação <span className="text-destructive">*</span>
                </Label>
                <Input
                  ref={dataContratacaoInputRef}
                  id="colaborador-dataContratacao"
                  type="date"
                  value={formData.dataContratacao}
                  onChange={(e) => {
                    setFormData({ ...formData, dataContratacao: e.target.value });
                    if (formErrors.dataContratacao) setFormErrors({ ...formErrors, dataContratacao: undefined });
                  }}
                  aria-invalid={!!formErrors.dataContratacao}
                  aria-describedby={formErrors.dataContratacao ? 'colaborador-data-erro' : undefined}
                />
                {formErrors.dataContratacao && (
                  <p id="colaborador-data-erro" className="mt-1 text-xs text-destructive">
                    {formErrors.dataContratacao}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="colaborador-status" className="mb-2 block">Status</Label>
                <select
                  id="colaborador-status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ativo' | 'inativo' })}
                  className="border-input bg-input-background focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] flex h-9 w-full rounded-md border px-3 py-1 text-base outline-none transition-[color,box-shadow] md:text-sm"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="colaborador-funcao" className="mb-2 block">
                  Função <span className="text-destructive">*</span>
                </Label>
                <select
                  ref={funcaoSelectRef}
                  id="colaborador-funcao"
                  value={formData.funcao}
                  onChange={(e) => {
                    setFormData({ ...formData, funcao: e.target.value });
                    if (formErrors.funcao) setFormErrors({ ...formErrors, funcao: undefined });
                  }}
                  aria-invalid={!!formErrors.funcao}
                  aria-describedby={formErrors.funcao ? 'colaborador-funcao-erro' : undefined}
                  className="border-input bg-input-background focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] flex h-9 w-full rounded-md border px-3 py-1 text-base outline-none transition-[color,box-shadow] md:text-sm"
                >
                  <option value="">Selecione uma função</option>
                  {listaFuncoes.map((funcao) => (
                    <option key={funcao} value={funcao}>{funcao}</option>
                  ))}
                </select>
                {formErrors.funcao && (
                  <p id="colaborador-funcao-erro" className="mt-1 text-xs text-destructive">
                    {formErrors.funcao}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="colaborador-departamento" className="mb-2 block">Departamento</Label>
                <select
                  id="colaborador-departamento"
                  value={formData.departamento}
                  onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                  className="border-input bg-input-background focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] flex h-9 w-full rounded-md border px-3 py-1 text-base outline-none transition-[color,box-shadow] md:text-sm"
                >
                  <option value="">Selecione um departamento</option>
                  {listaDepartamentos.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="colaborador-email" className="mb-2 block">E-mail</Label>
                <Input
                  id="colaborador-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <Label htmlFor="colaborador-telefone" className="mb-2 block">Telefone</Label>
                <Input
                  id="colaborador-telefone"
                  type="tel"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="colaborador-cpf" className="mb-2 block">CPF</Label>
              <Input
                id="colaborador-cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="w-4 h-4" />
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="gap-2">
                <Save className="w-4 h-4" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MetricCards */}
      {viewMode === 'list' && colaboradores.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Total de Colaboradores"
            value={colaboradores.length}
            icon={UserCircle}
            variant="default"
          />
          <MetricCard
            label="Ativos"
            value={colaboradores.filter(c => c.status === 'ativo').length}
            icon={CheckCircle2}
            variant="success"
          />
          <MetricCard
            label="Inativos"
            value={colaboradores.filter(c => c.status === 'inativo').length}
            icon={UserX}
            variant="danger"
          />
        </div>
      )}

      {/* Lista de Colaboradores */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Busca */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar colaborador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Lista */}
          {filteredColaboradores.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredColaboradores.map((colaborador) => (
                <div key={colaborador.id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-xs border border-blue-100" style={{ fontWeight: 500 }}>
                          {colaborador.numero}
                        </span>
                        <h3 className="text-gray-900 truncate" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                          {colaborador.nomeCompleto}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs border ${
                          colaborador.status === 'ativo' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`} style={{ fontWeight: 500 }}>
                          {colaborador.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          <span>{colaborador.funcao}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          <span>{colaborador.departamento || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>Desde {formatarDataPtBr(colaborador.dataContratacao)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{colaborador.email || 'Sem e-mail'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(colaborador)}
                        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                        title="Visualizar"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleEdit(colaborador, e)}
                        className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(colaborador.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <UserCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">
                {searchTerm ? 'Nenhum colaborador encontrado.' : 'Nenhum colaborador cadastrado. Clique em "Novo Colaborador" para começar.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Visualização Detalhada */}
      {viewMode === 'view' && selectedColaborador && (
        <ColaboradorView 
          colaborador={selectedColaborador}
          onEdit={() => handleEdit(selectedColaborador)}
          onClose={handleCancel}
        />
      )}
    </div>
  );
}

// Componente de Visualização Detalhada
interface ColaboradorViewProps {
  colaborador: Colaborador;
  onEdit: () => void;
  onClose: () => void;
}

function ColaboradorView({ colaborador, onEdit, onClose }: ColaboradorViewProps) {
  const [descricaoFuncao, setDescricaoFuncao] = useState<any>(null);
  const [integracaoDepartamento, setIntegracaoDepartamento] = useState<any>(null);
  const [showVincularDescricaoModal, setShowVincularDescricaoModal] = useState(false);
  const [showVincularIntegracaoModal, setShowVincularIntegracaoModal] = useState(false);
  const [showViewDescricaoModal, setShowViewDescricaoModal] = useState(false);
  const [selectedIntegracaoId, setSelectedIntegracaoId] = useState('');
  const [todasDescricoes, setTodasDescricoes] = useState<any[]>([]);
  const [todasIntegracoes, setTodasIntegracoes] = useState<any[]>([]);
  const [requisitosAvaliacao, setRequisitosAvaliacao] = useState<Record<string, {
    status: 'atende' | 'nao-atende' | 'parcial' | 'pendente';
    observacao: string;
  }>>({});
  const lastVincularDescricaoTriggerRef = useRef<HTMLButtonElement | null>(null);
  const lastVincularIntegracaoTriggerRef = useRef<HTMLButtonElement | null>(null);
  const lastViewDescricaoTriggerRef = useRef<HTMLButtonElement | null>(null);

  const handleVincularDescricaoOpenChange = (open: boolean) => {
    setShowVincularDescricaoModal(open);
    if (!open) {
      setTimeout(() => lastVincularDescricaoTriggerRef.current?.focus(), 0);
    }
  };

  const handleVincularIntegracaoOpenChange = (open: boolean) => {
    setShowVincularIntegracaoModal(open);
    if (open) {
      setSelectedIntegracaoId('');
    }
    if (!open) {
      setTimeout(() => lastVincularIntegracaoTriggerRef.current?.focus(), 0);
    }
  };

  const handleViewDescricaoOpenChange = (open: boolean) => {
    setShowViewDescricaoModal(open);
    if (!open) {
      setTimeout(() => lastViewDescricaoTriggerRef.current?.focus(), 0);
    }
  };

  useEffect(() => {
    loadData();
  }, [colaborador]);

  const loadData = () => {
    // Carregar todas as descrições de funções
    const descricoes = getFromStorage<any[]>('sisteq-descricao-funcoes', []);
    setTodasDescricoes(descricoes);
    
    if (descricoes.length > 0) {
      // Buscar descrição vinculada ao colaborador
      const desc = descricoes.find((d: any) => 
        d.funcao.toLowerCase().trim() === colaborador.funcao.toLowerCase().trim()
      );
      setDescricaoFuncao(desc);
    }

    // Carregar todas as integrações
    const integracoes = getFromStorage<any[]>('sisteq-integracao-colaboradores', []);
    setTodasIntegracoes(integracoes);
    
    if (integracoes.length > 0 && colaborador.departamento) {
      const integ = integracoes.find((i: any) => 
        i.departamento.toLowerCase().trim() === colaborador.departamento.toLowerCase().trim()
      );
      setIntegracaoDepartamento(integ);
    }

    // Carregar avaliação de requisitos
    setRequisitosAvaliacao(
      getFromStorage<Record<string, { status: 'atende' | 'nao-atende' | 'parcial' | 'pendente'; observacao: string }>>(
        `sisteq-requisitos-${colaborador.id}`,
        {}
      )
    );
  };

  const handleVincularDescricao = (descricao: any) => {
    setDescricaoFuncao(descricao);
    handleVincularDescricaoOpenChange(false);
    toast.success(`Descrição "${descricao.funcao}" vinculada com sucesso!`);
  };

  const handleVincularIntegracao = (integracao: any) => {
    setIntegracaoDepartamento(integracao);
    handleVincularIntegracaoOpenChange(false);
    toast.success(`Integração do departamento "${integracao.departamento}" vinculada com sucesso!`);
  };

  const handleCriarDescricao = () => {
    // Redireciona para a página de descrição de funções
    window.location.href = '/recursos-humanos/descricao-funcoes';
  };

  const handleCriarIntegracao = () => {
    // Redireciona para a página de integração
    window.location.href = '/recursos-humanos/integracao';
  };

  const handleUpdateRequisito = (tipo: string, index: number, status: 'atende' | 'nao-atende' | 'parcial' | 'pendente', observacao: string = '') => {
    const key = `${tipo}-${index}`;
    const updated = {
      ...requisitosAvaliacao,
      [key]: { status, observacao }
    };
    setRequisitosAvaliacao(updated);
    localStorage.setItem(`sisteq-requisitos-${colaborador.id}`, JSON.stringify(updated));
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-md text-sm border border-blue-100" style={{ fontWeight: 500 }}>
                {colaborador.numero}
              </span>
              <h2 className="text-gray-900" style={{ fontSize: '1.5rem', fontWeight: 600 }}>{colaborador.nomeCompleto}</h2>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs border ${
                colaborador.status === 'ativo' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-red-50 text-red-700 border-red-200'
              }`} style={{ fontWeight: 500 }}>
                {colaborador.status === 'ativo' ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <p className="text-gray-500 text-sm">{colaborador.funcao}</p>
          </div>
          <Button
            onClick={onEdit}
            className="flex items-center gap-2 bg-gray-900 text-white hover:bg-gray-800 text-sm"
          >
            <Edit2 className="w-4 h-4" />
            Editar
          </Button>
        </div>
      </div>

      {/* Informações Básicas */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-gray-900 mb-4" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Informações Básicas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Data de Contratação</p>
            <p className="text-gray-900 font-medium">{formatarDataPtBr(colaborador.dataContratacao)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Departamento</p>
            <p className="text-gray-900 font-medium">{colaborador.departamento || 'Não informado'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">E-mail</p>
            <p className="text-gray-900 font-medium">{colaborador.email || 'Não informado'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Telefone</p>
            <p className="text-gray-900 font-medium">{colaborador.telefone ? formatarTelefone(colaborador.telefone) : 'Não informado'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">CPF</p>
            <p className="text-gray-900 font-medium">{colaborador.cpf ? formatarCPF(colaborador.cpf) : 'Não informado'}</p>
          </div>
        </div>
      </div>

      {/* Descrição da Função */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <h3 className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>Descrição da Função</h3>
          </div>
          <div className="flex items-center gap-2">
            {descricaoFuncao && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { lastViewDescricaoTriggerRef.current = e.currentTarget; setShowViewDescricaoModal(true); }}
                className="text-blue-600 hover:bg-blue-50"
                title="Visualizar descrição completa"
              >
                <Eye className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { lastVincularDescricaoTriggerRef.current = e.currentTarget; setShowVincularDescricaoModal(true); }}
              className="text-blue-600 hover:bg-blue-50"
              title={descricaoFuncao ? "Alterar descrição vinculada" : "Vincular descrição de função"}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {descricaoFuncao ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <h4 className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>{descricaoFuncao.funcao}</h4>
                <p className="text-sm text-gray-600">
                  {descricaoFuncao.numero} • {descricaoFuncao.escolaridades?.length || 0} escolaridade(s) • 
                  {descricaoFuncao.idiomas?.length || 0} idioma(s) • {descricaoFuncao.experiencias?.length || 0} experiência(s)
                </p>
              </div>
              <Button
                size="sm"
                onClick={(e) => { lastViewDescricaoTriggerRef.current = e.currentTarget; setShowViewDescricaoModal(true); }}
              >
                Ver Detalhes
              </Button>
            </div>

            {/* Checklist de Requisitos */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Atendimento aos Requisitos</h4>
              <div className="space-y-3">
                {/* Escolaridades */}
                {descricaoFuncao.escolaridades && descricaoFuncao.escolaridades.map((esc: any, idx: number) => {
                  const key = `escolaridade-${idx}`;
                  const avaliacao = requisitosAvaliacao[key] || { status: 'pendente', observacao: '' };
                  
                  return (
                    <div key={idx} className={`p-4 rounded-lg border-2 transition-all ${getRequisitoStatusColor(avaliacao.status)}`}>
                      <div className="flex items-start gap-3 mb-2">
                        {getRequisitoStatusIcon(avaliacao.status, 'md')}
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 mb-2">Escolaridade: {esc.nivel}</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-foreground">Status</Label>
                              <select
                                value={avaliacao.status}
                                onChange={(e) => handleUpdateRequisito('escolaridade', idx, e.target.value as any, avaliacao.observacao)}
                                className="border-input bg-input-background flex h-9 w-full rounded-md border px-3 py-1 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="pendente">Pendente</option>
                                <option value="atende">Atende</option>
                                <option value="parcial">Atende Parcialmente</option>
                                <option value="nao-atende">Não Atende</option>
                              </select>
                            </div>
                            <div>
                              <Label className="text-xs text-foreground">Ação/Observação</Label>
                              <Input
                                type="text"
                                value={avaliacao.observacao}
                                onChange={(e) => handleUpdateRequisito('escolaridade', idx, avaliacao.status, e.target.value)}
                                placeholder="Descreva ação ou observação..."
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Experiências */}
                {descricaoFuncao.experiencias && descricaoFuncao.experiencias.map((exp: any, idx: number) => {
                  const key = `experiencia-${idx}`;
                  const avaliacao = requisitosAvaliacao[key] || { status: 'pendente', observacao: '' };
                  
                  return (
                    <div key={idx} className={`p-4 rounded-lg border-2 transition-all ${getRequisitoStatusColor(avaliacao.status)}`}>
                      <div className="flex items-start gap-3 mb-2">
                        {getRequisitoStatusIcon(avaliacao.status, 'md')}
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 mb-2">Experiência: {exp.area} - {exp.tempo}</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-foreground">Status</Label>
                              <select
                                value={avaliacao.status}
                                onChange={(e) => handleUpdateRequisito('experiencia', idx, e.target.value as any, avaliacao.observacao)}
                                className="border-input bg-input-background flex h-9 w-full rounded-md border px-3 py-1 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="pendente">Pendente</option>
                                <option value="atende">Atende</option>
                                <option value="parcial">Atende Parcialmente</option>
                                <option value="nao-atende">Não Atende</option>
                              </select>
                            </div>
                            <div>
                              <Label className="text-xs text-foreground">Ação/Observação</Label>
                              <Input
                                type="text"
                                value={avaliacao.observacao}
                                onChange={(e) => handleUpdateRequisito('experiencia', idx, avaliacao.status, e.target.value)}
                                placeholder="Descreva ação ou observação..."
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Idiomas */}
                {descricaoFuncao.idiomas && descricaoFuncao.idiomas.map((idioma: any, idx: number) => {
                  const key = `idioma-${idx}`;
                  const avaliacao = requisitosAvaliacao[key] || { status: 'pendente', observacao: '' };
                  
                  return (
                    <div key={idx} className={`p-4 rounded-lg border-2 transition-all ${getRequisitoStatusColor(avaliacao.status)}`}>
                      <div className="flex items-start gap-3 mb-2">
                        {getRequisitoStatusIcon(avaliacao.status, 'md')}
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 mb-2">Idioma: {idioma.idioma} - Nível {idioma.nivel}</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-foreground">Status</Label>
                              <select
                                value={avaliacao.status}
                                onChange={(e) => handleUpdateRequisito('idioma', idx, e.target.value as any, avaliacao.observacao)}
                                className="border-input bg-input-background flex h-9 w-full rounded-md border px-3 py-1 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="pendente">Pendente</option>
                                <option value="atende">Atende</option>
                                <option value="parcial">Atende Parcialmente</option>
                                <option value="nao-atende">Não Atende</option>
                              </select>
                            </div>
                            <div>
                              <Label className="text-xs text-foreground">Ação/Observação</Label>
                              <Input
                                type="text"
                                value={avaliacao.observacao}
                                onChange={(e) => handleUpdateRequisito('idioma', idx, avaliacao.status, e.target.value)}
                                placeholder="Descreva ação ou observação..."
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Conhecimentos Técnicos */}
                {descricaoFuncao.conhecimentosTecnicos && descricaoFuncao.conhecimentosTecnicos.map((conhec: any, idx: number) => {
                  const key = `conhecimento-${idx}`;
                  const avaliacao = requisitosAvaliacao[key] || { status: 'pendente', observacao: '' };
                  
                  return (
                    <div key={idx} className={`p-4 rounded-lg border-2 transition-all ${getRequisitoStatusColor(avaliacao.status)}`}>
                      <div className="flex items-start gap-3 mb-2">
                        {getRequisitoStatusIcon(avaliacao.status, 'md')}
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 mb-2">Conhecimento: {conhec.conhecimento} - {conhec.nivel}</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-foreground">Status</Label>
                              <select
                                value={avaliacao.status}
                                onChange={(e) => handleUpdateRequisito('conhecimento', idx, e.target.value as any, avaliacao.observacao)}
                                className="border-input bg-input-background flex h-9 w-full rounded-md border px-3 py-1 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="pendente">Pendente</option>
                                <option value="atende">Atende</option>
                                <option value="parcial">Atende Parcialmente</option>
                                <option value="nao-atende">Não Atende</option>
                              </select>
                            </div>
                            <div>
                              <Label className="text-xs text-foreground">Ação/Observação</Label>
                              <Input
                                type="text"
                                value={avaliacao.observacao}
                                onChange={(e) => handleUpdateRequisito('conhecimento', idx, avaliacao.status, e.target.value)}
                                placeholder="Descreva ação ou observação..."
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-gray-500 text-sm">
              Nenhuma descrição de função encontrada para "{colaborador.funcao}".
            </p>
            <Button
              size="sm"
              onClick={(e) => { lastVincularDescricaoTriggerRef.current = e.currentTarget; setShowVincularDescricaoModal(true); }}
            >
              Vincular Descrição
            </Button>
          </div>
        )}
      </div>

      {/* Integração */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-green-600" />
          <h3 className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>Registro de Integração</h3>
        </div>
        
        <RegistroIntegracaoColaborador
          colaboradorId={colaborador.id}
          colaboradorNome={colaborador.nomeCompleto}
          departamentoColaborador={colaborador.departamento}
        />
      </div>

      {/* Avaliação de Experiência */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardCheck className="w-5 h-5 text-orange-600" />
          <h3 className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>Avaliação de Contrato de Experiência</h3>
        </div>
        <AvaliacaoExperienciaComponent 
          colaboradorId={colaborador.id} 
          colaboradorNome={colaborador.nomeCompleto}
          dataContratacao={colaborador.dataContratacao}
        />
      </div>

      {/* Avaliações de Desempenho */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-red-600" />
          <h3 className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>Avaliações de Desempenho</h3>
        </div>
        <AvaliacaoDesempenhoComponent 
          colaboradorId={colaborador.id} 
          colaboradorNome={colaborador.nomeCompleto}
          funcao={colaborador.funcao}
        />
      </div>

      {/* Botão Voltar */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={onClose}
          className="gap-2"
        >
          <X className="w-4 h-4" />
          Voltar
        </Button>
      </div>

      <Dialog open={showVincularIntegracaoModal} onOpenChange={handleVincularIntegracaoOpenChange}>
        <DialogContent className="p-0 w-full sm:max-w-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-white pr-14">
            <DialogHeader className="gap-1">
              <DialogTitle>Vincular Integração de Departamento</DialogTitle>
              <DialogDescription>
                Selecione uma integração para vincular ao departamento "{colaborador.departamento}" do colaborador "{colaborador.nomeCompleto}".
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-6 bg-input-background space-y-4">
            {todasIntegracoes.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="integracao-select">Integração</Label>
                <select
                  id="integracao-select"
                  value={selectedIntegracaoId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedIntegracaoId(id);
                    const integracao = todasIntegracoes.find((i: any) => i.id === id);
                    if (integracao) {
                      handleVincularIntegracao(integracao);
                    }
                  }}
                  className="border-input bg-input-background flex h-9 w-full rounded-md border px-3 py-1 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Selecione uma integração...</option>
                  {todasIntegracoes.map((integ: any) => (
                    <option key={integ.id} value={integ.id}>
                      {integ.departamento}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center">
                <p className="text-sm text-muted-foreground">Nenhuma integração cadastrada.</p>
                <Button type="button" variant="outline" onClick={handleCriarIntegracao} className="mt-3">
                  Criar Integração
                </Button>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-white">
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleVincularIntegracaoOpenChange(false)} className="gap-2">
                <X className="w-4 h-4" />
                Fechar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showVincularDescricaoModal} onOpenChange={handleVincularDescricaoOpenChange}>
        <DialogContent className="p-0 w-full sm:max-w-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-white pr-14">
            <DialogHeader className="gap-1">
              <DialogTitle>Vincular Descrição de Função</DialogTitle>
              <DialogDescription>
                Selecione uma descrição de função para vincular ao colaborador "{colaborador.nomeCompleto}".
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-6 bg-input-background">
            {todasDescricoes.length > 0 ? (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {todasDescricoes.map((desc: any) => (
                  <button
                    key={desc.id}
                    type="button"
                    onClick={() => handleVincularDescricao(desc)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all bg-white ${
                      descricaoFuncao?.id === desc.id
                        ? 'border-primary'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-foreground" style={{ fontWeight: 600 }}>{desc.funcao}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {desc.numero} • {desc.escolaridades?.length || 0} escolaridade(s) •{' '}
                      {desc.idiomas?.length || 0} idioma(s)
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-lg border border-dashed border-gray-300">
                <p className="text-muted-foreground text-sm mb-4">Nenhuma descrição de função cadastrada.</p>
                <Button type="button" onClick={handleCriarDescricao}>
                  Criar Descrição de Função
                </Button>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-white">
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleVincularDescricaoOpenChange(false)} className="gap-2">
                <X className="w-4 h-4" />
                Fechar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {descricaoFuncao && (
        <Dialog open={showViewDescricaoModal} onOpenChange={handleViewDescricaoOpenChange}>
          <DialogContent className="p-0 w-full sm:max-w-3xl max-h-[calc(100vh-2rem)] overflow-hidden">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-5 pr-14">
              <DialogHeader className="gap-1">
                <DialogTitle className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm" style={{ fontWeight: 600 }}>
                    {descricaoFuncao.numero}
                  </span>
                  <span className="min-w-0 truncate">{descricaoFuncao.funcao}</span>
                </DialogTitle>
                <DialogDescription>Descrição de função vinculada ao colaborador.</DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto bg-input-background px-6 py-6 space-y-6">
              {descricaoFuncao.escolaridades && descricaoFuncao.escolaridades.length > 0 && (
                <div>
                  <h3 className="text-foreground mb-3" style={{ fontWeight: 600 }}>Escolaridade</h3>
                  <div className="space-y-2">
                    {descricaoFuncao.escolaridades.map((esc: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <GraduationCap className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-foreground">{esc.nivel}</span>
                        {esc.curso && <span className="text-sm text-muted-foreground">• {esc.curso}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {descricaoFuncao.idiomas && descricaoFuncao.idiomas.length > 0 && (
                <div>
                  <h3 className="text-foreground mb-3" style={{ fontWeight: 600 }}>Idiomas</h3>
                  <div className="space-y-2">
                    {descricaoFuncao.idiomas.map((idioma: any, idx: number) => (
                      <div key={idx} className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="font-medium text-foreground">{idioma.idioma}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Nível: {idioma.nivel}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {descricaoFuncao.experiencias && descricaoFuncao.experiencias.length > 0 && (
                <div>
                  <h3 className="text-foreground mb-3" style={{ fontWeight: 600 }}>Experiências Profissionais</h3>
                  <div className="space-y-2">
                    {descricaoFuncao.experiencias.map((exp: any, idx: number) => (
                      <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="font-medium text-foreground">{exp.area}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {exp.tempo} • {exp.nivel}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {descricaoFuncao.conhecimentosTecnicos && descricaoFuncao.conhecimentosTecnicos.length > 0 && (
                <div>
                  <h3 className="text-foreground mb-3" style={{ fontWeight: 600 }}>Conhecimentos Técnicos</h3>
                  <div className="space-y-2">
                    {descricaoFuncao.conhecimentosTecnicos.map((conhec: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <CheckCircle2 className="w-4 h-4 text-orange-600" />
                        <span className="text-sm text-foreground">{conhec.conhecimento}</span>
                        <span className="text-xs text-muted-foreground">({conhec.nivel})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {descricaoFuncao.competencias && descricaoFuncao.competencias.length > 0 && (
                <div>
                  <h3 className="text-foreground mb-3" style={{ fontWeight: 600 }}>Competências</h3>
                  <div className="space-y-2">
                    {descricaoFuncao.competencias.map((comp: any, idx: number) => (
                      <div key={idx} className="p-3 bg-pink-50 rounded-lg border border-pink-200">
                        <div className="font-medium text-foreground">{comp.competencia}</div>
                        <div className="text-sm text-muted-foreground mt-1">{comp.descricao}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {descricaoFuncao.atividades && descricaoFuncao.atividades.length > 0 && (
                <div>
                  <h3 className="text-foreground mb-3" style={{ fontWeight: 600 }}>Atividades e Responsabilidades</h3>
                  <div className="space-y-2">
                    {descricaoFuncao.atividades.map((ativ: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                          {idx + 1}
                        </span>
                        <span className="text-sm text-foreground">{ativ}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
              <DialogFooter>
                <Button type="button" onClick={() => handleViewDescricaoOpenChange(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default Colaboradores;
