import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { 
  Building2, 
  Plus,
  Search,
  Edit2,
  PlayCircle,
  X,
  Save,
  AlertCircle,
  Ban,
  Eye,
  Trash2,
  Filter,
  MapPin,
  AlertTriangle,
  Clock,
  FileWarning,
  CalendarClock,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { useFornecedores } from '../../hooks/useFornecedores';
import { Fornecedor, TipoFornecedor, Criticidade, RegistroBloqueio, PeriodicidadeAvaliacao } from '../../types/fornecedor';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { MetricCard } from '../../components/ui/metric-card';
import { toast } from 'sonner';
import { getFornecedorStatusColor, getCriticidadeColor } from '../../utils/fornecedor-helpers';

// Helpers de alertas para a lista
function diasAteData(data: string | undefined): number | null {
  if (!data) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(data);
  alvo.setHours(0, 0, 0, 0);
  return Math.ceil((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

type AlertaAvaliacao = 'vencida' | 'proxima' | 'pendente' | null;
type AlertaDocumental = 'docs-vencidos' | 'docs-pendentes' | null;

function getAlertaAvaliacao(f: Fornecedor): AlertaAvaliacao {
  if (!f.proximaAvaliacao) {
    // Se tem avaliações mas sem próxima, pode ser pendente
    if (f.avaliacoes.length > 0) return 'pendente';
    // Se nunca foi avaliado e está homologado, é pendente
    if (f.status === 'Homologado' || f.status === 'Homologado com Restrição') return 'pendente';
    return null;
  }
  const dias = diasAteData(f.proximaAvaliacao);
  if (dias === null) return null;
  if (dias < 0) return 'vencida';
  if (dias <= 30) return 'proxima';
  return null;
}

function getAlertaDocumental(f: Fornecedor): AlertaDocumental {
  if (!f.homologacao?.analiseDocumental) return null;
  const docs = Object.values(f.homologacao.analiseDocumental);
  const aplicaveis = docs.filter(d => d.status === 'Aplicável');
  if (aplicaveis.length === 0) return null;

  const temVencido = aplicaveis.some(d => {
    const dias = diasAteData(d.dataValidade);
    return dias !== null && dias < 0;
  });
  if (temVencido) return 'docs-vencidos';

  const temPendente = aplicaveis.some(d => !d.conforme);
  if (temPendente) return 'docs-pendentes';

  return null;
}

export function FornecedorCadastro() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { fornecedores, addFornecedor, updateFornecedor, deleteFornecedor, configuracao } = useFornecedores();
  const [modalAberto, setModalAberto] = useState(false);
  const [modalFechando, setModalFechando] = useState(false);
  const [fornecedorEditando, setFornecedorEditando] = useState<Fornecedor | null>(null);
  const [busca, setBusca] = useState('');
  // Modal de Bloqueio/Desbloqueio
  const [modalBloqueio, setModalBloqueio] = useState<{
    aberto: boolean;
    fornecedor: Fornecedor | null;
    acao: 'Bloqueio' | 'Desbloqueio';
  }>({ aberto: false, fornecedor: null, acao: 'Bloqueio' });
  const [modalBloqueioFechando, setModalBloqueioFechando] = useState(false);
  const [bloqueioForm, setBloqueioForm] = useState({ motivo: '', responsavel: '' });
  const [filtros, setFiltros] = useState(() => {
    const alertaParam = typeof window !== 'undefined' 
      ? new URLSearchParams(window.location.search).get('alerta') || ''
      : '';
    return {
      busca: '',
      tipo: '',
      criticidade: '',
      status: '',
      cidade: '',
      estado: '',
      alerta: alertaParam
    };
  });

  const [formData, setFormData] = useState<{
    razaoSocial: string;
    nomeFantasia: string;
    cnpj: string;
    endereco: string;
    cidade: string;
    estado: string;
    cep: string;
    telefone: string;
    email: string;
    site: string;
    contatoPrincipal: string;
    tipo: (TipoFornecedor | string)[];
    departamentoVinculado: string;
    criticidade: Criticidade;
    periodicidadeAvaliacao: PeriodicidadeAvaliacao;
  }>({
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    telefone: '',
    email: '',
    site: '',
    contatoPrincipal: '',
    tipo: [],
    departamentoVinculado: '',
    criticidade: 'Não Crítico' as Criticidade,
    periodicidadeAvaliacao: 'Anual'
  });

  const resetForm = useCallback(() => {
    setFormData({
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
      telefone: '',
      email: '',
      site: '',
      contatoPrincipal: '',
      tipo: [],
      departamentoVinculado: '',
      criticidade: 'Não Crítico',
      periodicidadeAvaliacao: 'Anual'
    });
    setFornecedorEditando(null);
  }, []);

  const resetModalBloqueio = useCallback(() => {
    setModalBloqueio({ aberto: false, fornecedor: null, acao: 'Bloqueio' });
    setBloqueioForm({ motivo: '', responsavel: '' });
  }, []);

  const fecharModalCadastro = useCallback(() => {
    if (modalFechando) return;
    setModalFechando(true);
    setTimeout(() => {
      setModalAberto(false);
      setModalFechando(false);
      resetForm();
    }, 200);
  }, [modalFechando, resetForm]);

  const fecharModalBloqueio = useCallback(() => {
    if (modalBloqueioFechando) return;
    setModalBloqueioFechando(true);
    setTimeout(() => {
      resetModalBloqueio();
      setModalBloqueioFechando(false);
    }, 200);
  }, [modalBloqueioFechando, resetModalBloqueio]);

  useEffect(() => {
    if (!modalAberto && !modalBloqueio.aberto) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (modalBloqueio.aberto) {
        fecharModalBloqueio();
        return;
      }
      if (modalAberto) {
        fecharModalCadastro();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [fecharModalBloqueio, fecharModalCadastro, modalAberto, modalBloqueio.aberto]);

  const handleNovoFornecedor = () => {
    resetForm();
    setModalAberto(true);
  };

  const handleEditarFornecedor = (fornecedor: Fornecedor) => {
    setFornecedorEditando(fornecedor);
    setFormData({
      razaoSocial: fornecedor.razaoSocial,
      nomeFantasia: fornecedor.nomeFantasia,
      cnpj: fornecedor.cnpj,
      endereco: fornecedor.endereco,
      cidade: fornecedor.cidade,
      estado: fornecedor.estado,
      cep: fornecedor.cep,
      telefone: fornecedor.telefone,
      email: fornecedor.email,
      site: fornecedor.site || '',
      contatoPrincipal: fornecedor.contatoPrincipal || '',
      tipo: fornecedor.tipo,
      departamentoVinculado: fornecedor.departamentoVinculado,
      criticidade: fornecedor.criticidade,
      periodicidadeAvaliacao: fornecedor.periodicidadeAvaliacao
    });
    setModalAberto(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTipoChange = (tipo: TipoFornecedor) => {
    setFormData(prev => {
      const tipos = prev.tipo.includes(tipo)
        ? prev.tipo.filter(t => t !== tipo)
        : [...prev.tipo, tipo];
      return { ...prev, tipo: tipos };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.razaoSocial || !formData.cnpj || !formData.email) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    if (formData.tipo.length === 0) {
      toast.error('Selecione pelo menos um tipo de fornecedor');
      return;
    }

    if (fornecedorEditando) {
      updateFornecedor(fornecedorEditando.id, formData);
      toast.success('Fornecedor atualizado com sucesso');
    } else {
      // Fornecedores Não Críticos são homologados automaticamente
      const statusInicial = formData.criticidade === 'Não Crítico' ? 'Homologado' : 'Em Homologação';
      
      addFornecedor({
        ...formData,
        status: statusInicial
      });
      
      if (formData.criticidade === 'Não Crítico') {
        toast.success('Fornecedor cadastrado e homologado automaticamente (Não Crítico)');
      } else {
        toast.success('Fornecedor cadastrado com sucesso!');
      }
    }

    fecharModalCadastro();
  };

  const handleBloquear = (fornecedor: Fornecedor) => {
    setModalBloqueio({ aberto: true, fornecedor, acao: 'Bloqueio' });
  };

  const handleDesbloquear = (fornecedor: Fornecedor) => {
    setModalBloqueio({ aberto: true, fornecedor, acao: 'Desbloqueio' });
  };

  const handleIniciarHomologacao = (fornecedor: Fornecedor) => {
    navigate(`/fornecedores/homologacao/${fornecedor.id}`);
  };

  const handleExcluir = (fornecedor: Fornecedor) => {
    if (confirm(`Tem certeza que deseja excluir o fornecedor ${fornecedor.razaoSocial}?`)) {
      deleteFornecedor(fornecedor.id);
      toast.success('Fornecedor excluído');
    }
  };

  const limparFiltros = () => {
    setFiltros({
      busca: '',
      tipo: '',
      criticidade: '',
      status: '',
      cidade: '',
      estado: '',
      alerta: ''
    });
  };

  const filtrosAtivos = Object.values(filtros).filter(v => v !== '').length;

  // Obter cidades e estados únicos dos fornecedores
  const cidadesUnicas = Array.from(new Set(fornecedores.map(f => f.cidade).filter(Boolean)));
  const estadosUnicos = Array.from(new Set(fornecedores.map(f => f.estado).filter(Boolean)));

  // Filtrar fornecedores
  const fornecedoresFiltrados = fornecedores.filter(f => {
    // Filtro de busca
    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      const matchBusca = 
        f.razaoSocial.toLowerCase().includes(busca) ||
        f.nomeFantasia.toLowerCase().includes(busca) ||
        f.cnpj.includes(busca);
      if (!matchBusca) return false;
    }

    // Filtro de tipo
    if (filtros.tipo && !f.tipo.includes(filtros.tipo as TipoFornecedor)) return false;

    // Filtro de criticidade
    if (filtros.criticidade && f.criticidade !== filtros.criticidade) return false;

    // Filtro de status
    if (filtros.status && f.status !== filtros.status) return false;

    // Filtro de cidade
    if (filtros.cidade && f.cidade !== filtros.cidade) return false;

    // Filtro de estado
    if (filtros.estado && f.estado !== filtros.estado) return false;

    // Filtro de alertas
    if (filtros.alerta) {
      const alertaAval = getAlertaAvaliacao(f);
      const alertaDoc = getAlertaDocumental(f);
      if (filtros.alerta === 'aval-vencida' && alertaAval !== 'vencida') return false;
      if (filtros.alerta === 'aval-proxima' && alertaAval !== 'proxima') return false;
      if (filtros.alerta === 'aval-pendente' && alertaAval !== 'pendente') return false;
      if (filtros.alerta === 'docs-vencidos' && alertaDoc !== 'docs-vencidos') return false;
      if (filtros.alerta === 'docs-pendentes' && alertaDoc !== 'docs-pendentes') return false;
      if (filtros.alerta === 'bloqueados' && f.status !== 'Bloqueado') return false;
      if (filtros.alerta === 'com-alerta') {
        if (!alertaAval && !alertaDoc) return false;
      }
    }

    return true;
  });

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Lista de Fornecedores
          </h1>
          <p className="text-gray-500 mt-1.5" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Gerencie todos os fornecedores cadastrados
          </p>
        </div>
        
        <Button
          onClick={handleNovoFornecedor}
          className="gap-2 flex-shrink-0 ml-8"
        >
          <Plus className="w-4 h-4" />
          Novo Fornecedor
        </Button>
      </div>

      {/* C2: Resumo rápido */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Total de Fornecedores"
          value={fornecedores.length}
          icon={Building2}
          variant="info"
        />
        <MetricCard
          label="Críticos"
          value={fornecedores.filter(f => f.criticidade === 'Crítico').length}
          icon={AlertTriangle}
          variant="danger"
        />
        <MetricCard
          label="Homologados"
          value={fornecedores.filter(f => f.status === 'Homologado' || f.status === 'Homologado com Restrição').length}
          icon={ShieldCheck}
          variant="success"
        />
        <MetricCard
          label="Bloqueados"
          value={fornecedores.filter(f => f.status === 'Bloqueado').length}
          icon={Ban}
          variant={fornecedores.filter(f => f.status === 'Bloqueado').length > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* Filtros Avançados */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Filter className="w-4 h-4" />
            <span className="text-sm" style={{ fontWeight: 500 }}>Filtros</span>
            <span className="text-xs text-gray-400">
              {filtrosAtivos > 0 ? `${filtrosAtivos} ativo(s)` : ''} • {fornecedoresFiltrados.length} encontrado(s)
            </span>
          </div>
          {filtrosAtivos > 0 && (
            <Button
              onClick={limparFiltros}
              variant="ghost"
              size="sm"
              className="text-xs text-gray-400"
            >
              <X className="w-3 h-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        {/* Linha 1: Busca e Tipo */}
        <div className="grid grid-cols-5 gap-3 mb-3">
          <div className="col-span-2 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filtros.busca}
              onChange={e => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="Buscar por fornecedor ou CNPJ..."
            />
          </div>

          <select
            value={filtros.tipo}
            onChange={e => setFiltros(prev => ({ ...prev, tipo: e.target.value }))}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Todos os Tipos</option>
            {configuracao.tiposFornecedor.map((tipo) => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>

          <select
            value={filtros.criticidade}
            onChange={e => setFiltros(prev => ({ ...prev, criticidade: e.target.value }))}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Todas Criticidades</option>
            <option value="Crítico">Crítico</option>
            <option value="Não Crítico">Não Crítico</option>
          </select>

          <select
            value={filtros.status}
            onChange={e => setFiltros(prev => ({ ...prev, status: e.target.value }))}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Todos os Status</option>
            <option value="Homologado">Homologado</option>
            <option value="Bloqueado">Bloqueado</option>
            <option value="Em Homologação">Em Homologação</option>
          </select>
        </div>

        {/* Linha 2: Localização e Alertas */}
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-gray-400" />
            <select
              value={filtros.alerta}
              onChange={e => setFiltros(prev => ({ ...prev, alerta: e.target.value }))}
              className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                filtros.alerta ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200'
              }`}
            >
              <option value="">Todos (Sem filtro de alerta)</option>
              <option value="com-alerta">Com qualquer alerta</option>
              <option value="aval-vencida">Avaliacao vencida</option>
              <option value="aval-proxima">Avaliacao proxima de vencer</option>
              <option value="aval-pendente">Avaliacao pendente</option>
              <option value="docs-vencidos">Docs. vencidos</option>
              <option value="docs-pendentes">Docs. pendentes</option>
              <option value="bloqueados">Bloqueados</option>
            </select>
          </div>
          
          <div className="col-span-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <select
              value={filtros.cidade}
              onChange={e => setFiltros(prev => ({ ...prev, cidade: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Todas as Cidades</option>
              {cidadesUnicas.sort().map(cidade => (
                <option key={cidade} value={cidade}>{cidade}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <select
              value={filtros.estado}
              onChange={e => setFiltros(prev => ({ ...prev, estado: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Todos UF</option>
              {estadosUnicos.sort().map(estado => (
                <option key={estado} value={estado}>{estado}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Fornecedores */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
            Fornecedores Cadastrados
          </h3>
          <span className="text-xs text-gray-400">
            {fornecedoresFiltrados.length} {fornecedoresFiltrados.length === 1 ? 'fornecedor' : 'fornecedores'}
          </span>
        </div>

        {fornecedoresFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {filtros.busca ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado ainda'}
            </p>
            {!filtros.busca && (
              <Button
                onClick={handleNovoFornecedor}
                className="mt-4 gap-2"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Primeiro Fornecedor
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/60">
                  <th className="text-left py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Fornecedor</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>CNPJ</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Tipo</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Criticidade</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Status</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Alertas</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fornecedoresFiltrados.map((fornecedor) => (
                  <tr 
                    key={fornecedor.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      fornecedor.status === 'Bloqueado' ? 'bg-red-50/30' : (getAlertaAvaliacao(fornecedor) === 'vencida' || getAlertaDocumental(fornecedor) === 'docs-vencidos') ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{fornecedor.razaoSocial}</p>
                        <p className="text-xs text-gray-600">{fornecedor.nomeFantasia}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <p className="text-sm text-gray-700 font-mono">{fornecedor.cnpj}</p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {fornecedor.tipo.map((t, idx) => (
                          <Badge key={idx} className="bg-purple-100 text-purple-800 border-purple-200 border text-xs">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Badge className={`${getCriticidadeColor(fornecedor.criticidade)} border text-xs`}>
                        {fornecedor.criticidade}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Badge className={`${getFornecedorStatusColor(fornecedor.status)} border text-xs`}>
                        {fornecedor.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        {getAlertaAvaliacao(fornecedor) === 'vencida' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-red-100 text-red-700 border border-red-200" style={{ fontWeight: 500 }}>
                            <AlertTriangle className="w-3 h-3" />
                            Aval. Vencida
                          </span>
                        )}
                        {getAlertaAvaliacao(fornecedor) === 'proxima' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-amber-100 text-amber-700 border border-amber-200" style={{ fontWeight: 500 }}>
                            <Clock className="w-3 h-3" />
                            Aval. a Vencer
                          </span>
                        )}
                        {getAlertaAvaliacao(fornecedor) === 'pendente' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-600 border border-gray-200" style={{ fontWeight: 500 }}>
                            <CalendarClock className="w-3 h-3" />
                            Aval. Pendente
                          </span>
                        )}
                        {getAlertaDocumental(fornecedor) === 'docs-vencidos' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-red-100 text-red-700 border border-red-200" style={{ fontWeight: 500 }}>
                            <FileWarning className="w-3 h-3" />
                            Docs. Vencidos
                          </span>
                        )}
                        {getAlertaDocumental(fornecedor) === 'docs-pendentes' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-amber-100 text-amber-700 border border-amber-200" style={{ fontWeight: 500 }}>
                            <FileWarning className="w-3 h-3" />
                            Docs. Pendentes
                          </span>
                        )}
                        {!getAlertaAvaliacao(fornecedor) && !getAlertaDocumental(fornecedor) && (
                          <span className="text-xs text-gray-300">--</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/fornecedores/visualizar/${fornecedor.id}`)}
                          className="h-9 w-9 text-gray-600"
                          title="Visualizar"
                          aria-label="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditarFornecedor(fornecedor)}
                          className="h-9 w-9 text-primary"
                          title="Editar"
                          aria-label="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        
                        {fornecedor.status === 'Em Homologação' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleIniciarHomologacao(fornecedor)}
                            className="h-9 w-9 text-emerald-600"
                            title="Iniciar Homologação"
                            aria-label="Iniciar Homologação"
                          >
                            <PlayCircle className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {fornecedor.status !== 'Bloqueado' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleBloquear(fornecedor)}
                            className="h-9 w-9 text-red-600"
                            title="Bloquear"
                            aria-label="Bloquear"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDesbloquear(fornecedor)}
                            className="h-9 w-9 text-emerald-600"
                            title="Desbloquear"
                            aria-label="Desbloquear"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleExcluir(fornecedor)}
                          className="h-9 w-9 text-red-600"
                          title="Excluir"
                          aria-label="Excluir"
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
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      {(modalAberto || modalFechando) && (
        <div
          className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 ${modalFechando ? 'animate-out fade-out-0' : 'animate-in fade-in-0'} duration-200`}
          onClick={fecharModalCadastro}
        >
          <div
            className={`bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto ${modalFechando ? 'animate-out zoom-out-95' : 'animate-in zoom-in-95'} duration-200`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="fornecedor-cadastro-modal-title"
            onClick={e => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 id="fornecedor-cadastro-modal-title" className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                  {fornecedorEditando ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {fornecedorEditando ? 'Atualize as informações' : 'Preencha os dados do fornecedor'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  fecharModalCadastro();
                }}
                className="h-8 w-8"
                aria-label="Fechar"
              >
                <X className="w-4 h-4 text-gray-500" />
              </Button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-6">
                {/* Identificação */}
                <div>
                  <h3 className="text-gray-900 mb-4 flex items-center gap-2.5" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs">1</div>
                    Identificação
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 500 }}>
                        Razão Social <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="razaoSocial"
                        value={formData.razaoSocial}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors text-sm"
                        placeholder="Digite a razão social"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 500 }}>
                        Nome Fantasia
                      </label>
                      <input
                        type="text"
                        name="nomeFantasia"
                        value={formData.nomeFantasia}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors text-sm"
                        placeholder="Digite o nome fantasia"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 500 }}>
                        CNPJ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="cnpj"
                        value={formData.cnpj}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors text-sm"
                        placeholder="00.000.000/0000-00"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 500 }}>
                        CEP
                      </label>
                      <input
                        type="text"
                        name="cep"
                        value={formData.cep}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors text-sm"
                        placeholder="00000-000"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 500 }}>
                        Endereço
                      </label>
                      <input
                        type="text"
                        name="endereco"
                        value={formData.endereco}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors text-sm"
                        placeholder="Rua, número, bairro"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 500 }}>
                        Cidade
                      </label>
                      <input
                        type="text"
                        name="cidade"
                        value={formData.cidade}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors text-sm"
                        placeholder="Digite a cidade"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 500 }}>
                        Estado
                      </label>
                      <input
                        type="text"
                        name="estado"
                        value={formData.estado}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors text-sm"
                        placeholder="UF"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>

                {/* Contato */}
                <div>
                  <h3 className="text-gray-900 mb-4 flex items-center gap-2.5" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs">2</div>
                    Contato
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 500 }}>
                        E-mail <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors text-sm"
                        placeholder="email@exemplo.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 500 }}>
                        Telefone
                      </label>
                      <input
                        type="tel"
                        name="telefone"
                        value={formData.telefone}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors text-sm"
                        placeholder="(00) 00000-0000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 500 }}>
                        Site
                      </label>
                      <input
                        type="url"
                        name="site"
                        value={formData.site}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors text-sm"
                        placeholder="www.exemplo.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 500 }}>
                        Contato Principal
                      </label>
                      <input
                        type="text"
                        name="contatoPrincipal"
                        value={formData.contatoPrincipal}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors text-sm"
                        placeholder="Nome do contato"
                      />
                    </div>
                  </div>
                </div>

                {/* Classificação */}
                <div>
                  <h3 className="text-gray-900 mb-4 flex items-center gap-2.5" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs">3</div>
                    Classificação
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="col-span-1">
                      <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 500 }}>
                        Tipo de Fornecedor
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {configuracao.tiposFornecedor.map((tipo) => (
                          <label key={tipo} className="cursor-pointer">
                            <input
                              type="checkbox"
                              name="tipo"
                              value={tipo}
                              checked={formData.tipo.includes(tipo)}
                              onChange={() => handleTipoChange(tipo as TipoFornecedor)}
                              className="sr-only peer"
                            />
                            <div className="px-4 py-3 border-2 border-gray-200 rounded-lg peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all text-center">
                              <span className="text-sm font-semibold text-gray-900">{tipo}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 500 }}>
                        Departamento Vinculado
                      </label>
                      <input
                        type="text"
                        name="departamentoVinculado"
                        value={formData.departamentoVinculado}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors text-sm"
                        placeholder="Ex: Compras, Produção"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 500 }}>
                        Criticidade
                      </label>
                      <div className="flex gap-3">
                        <label className="flex-1 cursor-pointer">
                          <input
                            type="radio"
                            name="criticidade"
                            value="Crítico"
                            checked={formData.criticidade === 'Crítico'}
                            onChange={handleChange}
                            className="sr-only peer"
                          />
                          <div className="px-4 py-3 border-2 border-gray-200 rounded-lg peer-checked:border-red-500 peer-checked:bg-red-50 transition-all text-center">
                            <AlertCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                            <span className="text-sm font-semibold text-gray-900">Crítico</span>
                          </div>
                        </label>
                        <label className="flex-1 cursor-pointer">
                          <input
                            type="radio"
                            name="criticidade"
                            value="Não Crítico"
                            checked={formData.criticidade === 'Não Crítico'}
                            onChange={handleChange}
                            className="sr-only peer"
                          />
                          <div className="px-4 py-3 border-2 border-gray-200 rounded-lg peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all text-center">
                            <AlertCircle className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                            <span className="text-sm font-semibold text-gray-900">Não Crítico</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 500 }}>
                        Periodicidade de Avaliação
                      </label>
                      <select
                        name="periodicidadeAvaliacao"
                        value={formData.periodicidadeAvaliacao}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors text-sm"
                      >
                        <option value="Semestral">Semestral</option>
                        <option value="Anual">Anual</option>
                        <option value="Personalizado">Personalizado</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer do Modal */}
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    fecharModalCadastro();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  {fornecedorEditando ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Bloqueio/Desbloqueio */}
      {(modalBloqueio.aberto || modalBloqueioFechando) && (
        <div
          className={`fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 ${modalBloqueioFechando ? 'animate-out fade-out-0' : 'animate-in fade-in-0'} duration-200`}
          onClick={fecharModalBloqueio}
        >
          <div
            className={`bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto ${modalBloqueioFechando ? 'animate-out zoom-out-95' : 'animate-in zoom-in-95'} duration-200`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="fornecedor-bloqueio-modal-title"
            onClick={e => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 id="fornecedor-bloqueio-modal-title" className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                  {modalBloqueio.acao === 'Bloqueio' ? 'Bloquear Fornecedor' : 'Desbloquear Fornecedor'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {modalBloqueio.acao === 'Bloqueio' ? 'Preencha os motivos para o bloqueio' : 'Confirme para desbloquear'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  fecharModalBloqueio();
                }}
                className="h-8 w-8"
                aria-label="Fechar"
              >
                <X className="w-4 h-4 text-gray-500" />
              </Button>
            </div>

            {/* Formulário */}
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!bloqueioForm.motivo?.trim() || !bloqueioForm.responsavel?.trim()) {
                toast.error('Preencha todos os campos obrigatórios');
                return;
              }
              if (modalBloqueio.fornecedor) {
                const novoStatus = modalBloqueio.acao === 'Bloqueio' ? 'Bloqueado' : 'Homologado';
                const novoRegistro: RegistroBloqueio = {
                  data: new Date().toISOString(),
                  motivo: bloqueioForm.motivo.trim(),
                  responsavel: bloqueioForm.responsavel.trim(),
                  acao: modalBloqueio.acao
                };
                const historicoAtual = modalBloqueio.fornecedor.historicoBloqueios || [];
                updateFornecedor(modalBloqueio.fornecedor.id, {
                  status: novoStatus,
                  historicoBloqueios: [...historicoAtual, novoRegistro]
                });
                toast.success(`Fornecedor ${modalBloqueio.acao === 'Bloqueio' ? 'bloqueado' : 'desbloqueado'} com sucesso`);
                fecharModalBloqueio();
              }
            }}>
              <div className="p-6 space-y-6">
                {/* Info do fornecedor */}
                <div className={`rounded-xl p-4 border ${
                  modalBloqueio.acao === 'Bloqueio' 
                    ? 'bg-red-50/50 border-red-200' 
                    : 'bg-emerald-50/50 border-emerald-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      modalBloqueio.acao === 'Bloqueio' ? 'bg-red-100' : 'bg-emerald-100'
                    }`}>
                      {modalBloqueio.acao === 'Bloqueio' 
                        ? <Lock className="w-5 h-5 text-red-600" /> 
                        : <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      }
                    </div>
                    <div>
                      <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                        {modalBloqueio.fornecedor?.razaoSocial}
                      </p>
                      <p className="text-xs text-gray-500">
                        {modalBloqueio.fornecedor?.cnpj}
                        <span className="mx-1.5 text-gray-300">|</span>
                        Status atual: <span style={{ fontWeight: 500 }}>{modalBloqueio.fornecedor?.status}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Último bloqueio (mostrar no desbloqueio) */}
                {modalBloqueio.acao === 'Desbloqueio' && modalBloqueio.fornecedor?.historicoBloqueios && modalBloqueio.fornecedor.historicoBloqueios.length > 0 && (() => {
                  const ultimoBloqueio = [...modalBloqueio.fornecedor.historicoBloqueios]
                    .filter(r => r.acao === 'Bloqueio')
                    .pop();
                  if (!ultimoBloqueio) return null;
                  return (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <h4 className="text-xs text-gray-500 mb-2" style={{ fontWeight: 600 }}>MOTIVO DO BLOQUEIO ATUAL</h4>
                      <p className="text-sm text-gray-700 mb-2" style={{ lineHeight: 1.5 }}>{ultimoBloqueio.motivo}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>Responsavel: <span className="text-gray-600" style={{ fontWeight: 500 }}>{ultimoBloqueio.responsavel}</span></span>
                        <span>Data: <span className="text-gray-600" style={{ fontWeight: 500 }}>{new Date(ultimoBloqueio.data).toLocaleDateString('pt-BR')}</span></span>
                      </div>
                    </div>
                  );
                })()}

                {/* Formulário */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 500 }}>
                      Motivo do {modalBloqueio.acao} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={bloqueioForm.motivo}
                      onChange={e => setBloqueioForm(prev => ({ ...prev, motivo: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors text-sm resize-none"
                      placeholder={modalBloqueio.acao === 'Bloqueio'
                        ? 'Descreva o motivo do bloqueio deste fornecedor...'
                        : 'Descreva o motivo para desbloquear este fornecedor...'
                      }
                      rows={4}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 500 }}>
                      Responsavel <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={bloqueioForm.responsavel}
                      onChange={e => setBloqueioForm(prev => ({ ...prev, responsavel: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors text-sm"
                      placeholder="Nome do responsavel"
                      required
                    />
                  </div>
                </div>

                {/* Histórico de bloqueios/desbloqueios */}
                {modalBloqueio.fornecedor?.historicoBloqueios && modalBloqueio.fornecedor.historicoBloqueios.length > 0 && (
                  <div>
                    <h4 className="text-xs text-gray-500 mb-2" style={{ fontWeight: 600 }}>
                      HISTORICO ({modalBloqueio.fornecedor.historicoBloqueios.length})
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {[...modalBloqueio.fornecedor.historicoBloqueios].reverse().map((registro, idx) => (
                        <div key={idx} className={`rounded-lg p-3 border text-xs ${
                          registro.acao === 'Bloqueio'
                            ? 'bg-red-50/50 border-red-100'
                            : 'bg-emerald-50/50 border-emerald-100'
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`px-1.5 py-0.5 rounded ${
                              registro.acao === 'Bloqueio'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`} style={{ fontWeight: 600 }}>
                              {registro.acao}
                            </span>
                            <span className="text-gray-400">
                              {new Date(registro.data).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-gray-600 mb-0.5">{registro.motivo}</p>
                          <p className="text-gray-400">por {registro.responsavel}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer do Modal */}
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    fecharModalBloqueio();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant={modalBloqueio.acao === 'Bloqueio' ? 'destructive' : 'default'}
                  className="gap-2"
                >
                  {modalBloqueio.acao === 'Bloqueio' 
                    ? <><Ban className="w-4 h-4" /> Confirmar Bloqueio</>
                    : <><ShieldCheck className="w-4 h-4" /> Confirmar Desbloqueio</>
                  }
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
