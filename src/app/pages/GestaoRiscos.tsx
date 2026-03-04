import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { PlanoAcaoCorretivaSelector } from '../components/PlanoAcaoCorretivaSelector';
import { PADetailsDialog } from '../components/PADetailsDialog';
import { QuickPADialog } from '../components/QuickPADialog';
import { useStrategic } from '../context/StrategicContext';
import { Risco } from '../types/strategic';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { 
  ShieldAlert, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Building2,
  X
} from 'lucide-react';
import { calcularClassificacao, getNivelColor } from '../utils/risk-helpers';
import { formatarDataPtBr, dataHojeISO } from '../utils/formatters';

function criarFormInicial() {
  return {
    departamento: '',
    processo: '',
    descricaoRisco: '',
    controlesExistentes: [] as string[],
    impactoInicial: 1 as 1 | 2 | 3,
    probabilidadeInicial: 1 as 1 | 2 | 3,
    status: 'Aceitar' as 'Aceitar' | 'Tratar' | 'Transferir',
    planoAcaoVinculado: '',
    transferidoPara: '',
    observacaoTransferencia: '',
    impactoResidual: 1 as 1 | 2 | 3,
    probabilidadeResidual: 1 as 1 | 2 | 3,
    dataReavaliacao: '',
    observacoesReavaliacao: ''
  };
}

export function GestaoRiscos() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { dados, addPlanoAcoes, addRisco, updateRisco, deleteRisco } = useStrategic();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false);
  const [isPADialogOpen, setIsPADialogOpen] = useState(false);
  const [isQuickPADialogOpen, setIsQuickPADialogOpen] = useState(false);
  const [selectedPA, setSelectedPA] = useState<any>(null);
  const [riscoSelecionado, setRiscoSelecionado] = useState<Risco | null>(null);
  const [riscoEditando, setRiscoEditando] = useState<Risco | null>(null);
  const [expandirReavaliacao, setExpandirReavaliacao] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroDepartamento, setFiltroDepartamento] = useState('todos');
  const [filtroNivel, setFiltroNivel] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [novoControle, setNovoControle] = useState('');
  
  // Usar riscos do contexto
  const riscos = dados.riscos || [];

  const [formData, setFormData] = useState(criarFormInicial);
  const handledAutoOpenParamsRef = useRef<{ novoRisco: string | null; editarRisco: string | null }>({
    novoRisco: null,
    editarRisco: null,
  });

  const classificacaoInicial = calcularClassificacao(formData.impactoInicial, formData.probabilidadeInicial);
  const classificacaoResidual = calcularClassificacao(formData.impactoResidual, formData.probabilidadeResidual);

  const riscosFiltrados = riscos.filter(risco => {
    const matchBusca = risco.descricaoRisco.toLowerCase().includes(busca.toLowerCase()) ||
      risco.codigo.toLowerCase().includes(busca.toLowerCase()) ||
      risco.departamento.toLowerCase().includes(busca.toLowerCase()) ||
      risco.processo.toLowerCase().includes(busca.toLowerCase());
    
    const matchDepartamento = filtroDepartamento === 'todos' || risco.departamento === filtroDepartamento;
    const matchNivel = filtroNivel === 'todos' || risco.nivelInicial === filtroNivel;
    const matchStatus = filtroStatus === 'todos' || risco.status === filtroStatus;
    
    return matchBusca && matchDepartamento && matchNivel && matchStatus;
  });

  const estatisticas = {
    total: riscos.length,
    baixo: riscos.filter(r => r.nivelInicial === 'Baixo').length,
    medio: riscos.filter(r => r.nivelInicial === 'Médio').length,
    alto: riscos.filter(r => r.nivelInicial === 'Alto').length,
    emTratamento: riscos.filter(r => r.status === 'Tratar').length,
    aceitavel: riscos.filter(r => r.status === 'Aceitar').length,
    emMonitoramento: riscos.filter(r => r.status === 'Transferir').length
  };

  const departamentos = ['Produção', 'Comercial', 'TI', 'Qualidade', 'RH', 'Financeiro', 'Logística'];
  const processosPorDepartamento: Record<string, string[]> = {
    'Produção': ['Fabricação de Componentes', 'Montagem Final', 'Controle de Qualidade', 'Manutenção'],
    'Comercial': ['Prospecção', 'Gestão de Contratos', 'Atendimento ao Cliente', 'Pós-venda'],
    'TI': ['Infraestrutura', 'Segurança da Informação', 'Suporte Técnico', 'Desenvolvimento'],
    'Qualidade': ['Auditorias', 'Não Conformidades', 'Calibração', 'Certificações'],
    'RH': ['Recrutamento', 'Treinamento', 'Folha de Pagamento', 'Segurança do Trabalho'],
    'Financeiro': ['Contas a Pagar', 'Contas a Receber', 'Tesouraria', 'Contabilidade'],
    'Logística': ['Armazenagem', 'Expedição', 'Transporte', 'Inventário']
  };

  const handleNovoRisco = () => {
    setRiscoEditando(null);
    setFormData(criarFormInicial());
    setExpandirReavaliacao(false);
    setNovoControle('');
    setIsDialogOpen(true);
  };

  // Detectar se deve abrir o diálogo de novo risco automaticamente
  useEffect(() => {
    const novoRisco = searchParams.get('novoRisco');
    const editarRiscoId = searchParams.get('editarRisco');

    if (!novoRisco && !editarRiscoId) {
      handledAutoOpenParamsRef.current = { novoRisco: null, editarRisco: null };
      return;
    }
    
    if (novoRisco === 'true' && handledAutoOpenParamsRef.current.novoRisco !== novoRisco) {
      handledAutoOpenParamsRef.current = { novoRisco, editarRisco: null };
      // Resetar form e abrir diálogo
      setRiscoEditando(null);
      setFormData(criarFormInicial());
      setExpandirReavaliacao(false);
      setNovoControle('');
      setIsDialogOpen(true);
      try {
        const next = new URLSearchParams(searchParams);
        next.delete('novoRisco');
        next.delete('editarRisco');
        setSearchParams(next, { replace: true });
      } catch {}
    } else if (editarRiscoId && handledAutoOpenParamsRef.current.editarRisco !== editarRiscoId) {
      handledAutoOpenParamsRef.current = { novoRisco: null, editarRisco: editarRiscoId };
      // Encontrar o risco e abrir para edição
      const risco = riscos.find(r => r.id === editarRiscoId);
      if (risco) {
        handleEditarRisco(risco);
        try {
          const next = new URLSearchParams(searchParams);
          next.delete('novoRisco');
          next.delete('editarRisco');
          setSearchParams(next, { replace: true });
        } catch {}
      }
    }
  }, [searchParams, setSearchParams, riscos]);

  const fecharDialogEdicao = () => {
    setIsDialogOpen(false);
    setRiscoEditando(null);
    setFormData(criarFormInicial());
    setExpandirReavaliacao(false);
    setNovoControle('');
    try {
      const next = new URLSearchParams(searchParams);
      next.delete('novoRisco');
      next.delete('editarRisco');
      setSearchParams(next, { replace: true });
    } catch {}
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      setIsDialogOpen(true);
      return;
    }
    fecharDialogEdicao();
  };

  const handleSalvarRisco = () => {
    const classificacao = calcularClassificacao(formData.impactoInicial, formData.probabilidadeInicial);
    const dataAtual = dataHojeISO();
    
    if (riscoEditando) {
      // Editando risco existente
      const riscoAtualizado: Partial<Risco> = {
        departamento: formData.departamento,
        processo: formData.processo,
        descricaoRisco: formData.descricaoRisco,
        controlesExistentes: formData.controlesExistentes,
        impactoInicial: formData.impactoInicial,
        probabilidadeInicial: formData.probabilidadeInicial,
        classificacaoInicial: classificacao.valor,
        nivelInicial: classificacao.nivel,
        status: formData.status,
        planoAcaoVinculado: formData.planoAcaoVinculado || undefined,
        transferidoPara: formData.transferidoPara || undefined,
        observacaoTransferencia: formData.observacaoTransferencia || undefined,
        ultimaRevisao: dataAtual
      };

      if (expandirReavaliacao && formData.dataReavaliacao) {
        const classificacaoRes = calcularClassificacao(formData.impactoResidual, formData.probabilidadeResidual);
        
        // Incrementar revisão
        const numeroRevisaoAtual = parseInt(riscoEditando.revisaoAtual.substring(1));
        const novaRevisao = `R${numeroRevisaoAtual + 1}`;
        
        riscoAtualizado.impactoResidual = formData.impactoResidual;
        riscoAtualizado.probabilidadeResidual = formData.probabilidadeResidual;
        riscoAtualizado.classificacaoResidual = classificacaoRes.valor;
        riscoAtualizado.nivelResidual = classificacaoRes.nivel;
        riscoAtualizado.dataReavaliacao = formData.dataReavaliacao;
        riscoAtualizado.observacoesReavaliacao = formData.observacoesReavaliacao;
        riscoAtualizado.revisaoAtual = novaRevisao;
        
        // Adicionar ao histórico de revisões
        riscoAtualizado.historicoRevisoes = [
          ...riscoEditando.historicoRevisoes,
          {
            numeroRevisao: novaRevisao,
            data: formData.dataReavaliacao,
            impacto: formData.impactoResidual,
            probabilidade: formData.probabilidadeResidual,
            classificacao: classificacaoRes.valor,
            nivel: classificacaoRes.nivel,
            observacoes: formData.observacoesReavaliacao
          }
        ];
        
        toast.success(`Revisão ${novaRevisao} criada com sucesso!`);
      } else {
        toast.success('Risco atualizado com sucesso!');
      }

      updateRisco(riscoEditando.id, riscoAtualizado);
    } else {
      // Criando novo risco
      const dadosNovoRisco: Omit<Risco, 'id' | 'codigo' | 'dataCriacao' | 'ultimaRevisao' | 'revisaoAtual' | 'historicoRevisoes'> = {
        departamento: formData.departamento,
        processo: formData.processo,
        descricaoRisco: formData.descricaoRisco,
        controlesExistentes: formData.controlesExistentes,
        impactoInicial: formData.impactoInicial,
        probabilidadeInicial: formData.probabilidadeInicial,
        classificacaoInicial: classificacao.valor,
        nivelInicial: classificacao.nivel,
        status: formData.status,
        planoAcaoVinculado: formData.planoAcaoVinculado || undefined,
        transferidoPara: formData.transferidoPara || undefined,
        observacaoTransferencia: formData.observacaoTransferencia || undefined
      };

      const novoRisco = addRisco(dadosNovoRisco);

      if (expandirReavaliacao && formData.dataReavaliacao) {
        const classificacaoRes = calcularClassificacao(formData.impactoResidual, formData.probabilidadeResidual);
        
        // Atualizar com dados de reavaliação
        updateRisco(novoRisco.id, {
          impactoResidual: formData.impactoResidual,
          probabilidadeResidual: formData.probabilidadeResidual,
          classificacaoResidual: classificacaoRes.valor,
          nivelResidual: classificacaoRes.nivel,
          dataReavaliacao: formData.dataReavaliacao,
          observacoesReavaliacao: formData.observacoesReavaliacao,
          revisaoAtual: 'R2',
          historicoRevisoes: [
            {
              numeroRevisao: 'R1',
              data: dataAtual,
              impacto: formData.impactoInicial,
              probabilidade: formData.probabilidadeInicial,
              classificacao: classificacao.valor,
              nivel: classificacao.nivel,
              observacoes: 'Avaliação inicial do risco'
            },
            {
              numeroRevisao: 'R2',
              data: formData.dataReavaliacao,
              impacto: formData.impactoResidual,
              probabilidade: formData.probabilidadeResidual,
              classificacao: classificacaoRes.valor,
              nivel: classificacaoRes.nivel,
              observacoes: formData.observacoesReavaliacao
            }
          ]
        });
      } else {
        // Apenas criar histórico inicial
        updateRisco(novoRisco.id, {
          historicoRevisoes: [
            {
              numeroRevisao: 'R1',
              data: dataAtual,
              impacto: formData.impactoInicial,
              probabilidade: formData.probabilidadeInicial,
              classificacao: classificacao.valor,
              nivel: classificacao.nivel,
              observacoes: 'Avaliação inicial do risco'
            }
          ]
        });
      }

      toast.success('Risco cadastrado com sucesso!');
    }
    
    fecharDialogEdicao();
  };

  const handleVerDetalhes = (risco: Risco) => {
    setRiscoSelecionado(risco);
    setIsDetalhesOpen(true);
  };

  const handleEditarRisco = (risco: Risco) => {
    setRiscoEditando(risco);
    setFormData({
      departamento: risco.departamento,
      processo: risco.processo,
      descricaoRisco: risco.descricaoRisco,
      controlesExistentes: risco.controlesExistentes,
      impactoInicial: risco.impactoInicial,
      probabilidadeInicial: risco.probabilidadeInicial,
      status: risco.status,
      planoAcaoVinculado: risco.planoAcaoVinculado || '',
      transferidoPara: risco.transferidoPara || '',
      observacaoTransferencia: risco.observacaoTransferencia || '',
      impactoResidual: risco.impactoResidual || 1,
      probabilidadeResidual: risco.probabilidadeResidual || 1,
      dataReavaliacao: risco.dataReavaliacao || '',
      observacoesReavaliacao: risco.observacoesReavaliacao || ''
    });
    setExpandirReavaliacao(!!risco.dataReavaliacao);
    setNovoControle('');
    setIsDialogOpen(true);
  };

  const handleExcluirRisco = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este risco?')) {
      deleteRisco(id);
      toast.success('Risco excluído com sucesso!');
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* ═══ PAGE HEADER ═══ */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Registro de Riscos
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Identifique, avalie e monitore riscos que podem impactar seus processos e objetivos.
          </p>
        </div>
      </div>

      {/* ═══ BARRA DE FILTROS ═══ */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por código, descrição, departamento ou processo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={filtroDepartamento} onValueChange={setFiltroDepartamento}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Depto.</SelectItem>
            {departamentos.map(dept => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtroNivel} onValueChange={setFiltroNivel}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Nível" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Níveis</SelectItem>
            <SelectItem value="Baixo">Baixo</SelectItem>
            <SelectItem value="Médio">Médio</SelectItem>
            <SelectItem value="Alto">Alto</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Status</SelectItem>
            <SelectItem value="Aceitar">Aceitar</SelectItem>
            <SelectItem value="Transferir">Transferir</SelectItem>
            <SelectItem value="Tratar">Tratar</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={handleNovoRisco} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Risco
        </Button>
      </div>

      {/* ═══ TABELA DE RISCOS ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
            Registro de Riscos
          </h3>
          <span className="text-xs text-gray-400">
            {riscosFiltrados.length} {riscosFiltrados.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>
        <div>
          {riscosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <ShieldAlert className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-sm text-gray-400 text-center">
                {busca || filtroDepartamento !== 'todos' || filtroNivel !== 'todos' || filtroStatus !== 'todos'
                  ? 'Nenhum risco encontrado com os filtros aplicados.'
                  : 'Nenhum risco cadastrado ainda.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/60">
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Código</th>
                    <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Revisão</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Departamento</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Processo</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Descrição do Risco</th>
                    <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Imp.</th>
                    <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Prob.</th>
                    <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Classificação</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Status</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Plano Vinculado</th>
                    <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {riscosFiltrados.map((risco) => (
                    <tr key={risco.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm text-blue-600" style={{ fontWeight: 600 }}>{risco.codigo}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-600 border border-gray-200" style={{ fontWeight: 500 }}>
                            {risco.revisaoAtual}
                          </span>
                          <span className="text-xs text-gray-500">
                            {risco.historicoRevisoes.length} {risco.historicoRevisoes.length === 1 ? 'revisão' : 'revisões'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700">{risco.departamento}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">{risco.processo}</span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-sm text-gray-700 line-clamp-2">{risco.descricaoRisco}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{risco.impactoInicial}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{risco.probabilidadeInicial}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={getNivelColor(risco.nivelInicial)} variant="secondary">
                          {risco.nivelInicial} ({risco.classificacaoInicial})
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs ${
                          risco.status === 'Aceitar' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          risco.status === 'Transferir' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`} style={{ fontWeight: 500 }}>
                          {risco.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {risco.planoAcaoVinculado ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 hover:bg-transparent"
                            onClick={() => {
                              const pa = dados?.planosAcoes?.find(p => p.numeroPE === risco.planoAcaoVinculado);
                              if (pa) {
                                setSelectedPA(pa);
                                setIsPADialogOpen(true);
                              }
                            }}
                          >
                            <div className="flex items-center gap-1">
                              <LinkIcon className="w-3 h-3 text-blue-600" />
                              <span className="text-sm text-blue-600 hover:underline" style={{ fontWeight: 600 }}>{risco.planoAcaoVinculado}</span>
                            </div>
                          </Button>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => handleVerDetalhes(risco)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditarRisco(risco)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            onClick={() => handleExcluirRisco(risco.id)}
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
      </div>

      {/* Dialog: Novo Risco */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          onEscapeKeyDown={fecharDialogEdicao}
          onInteractOutside={(event) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest?.('[data-radix-popper-content-wrapper]')) return;
            if (target?.closest?.('[data-slot="select-content"]')) return;
            fecharDialogEdicao();
          }}
        >
          <DialogHeader>
            <DialogTitle>{riscoEditando ? 'Editar Risco' : 'Novo Risco'}</DialogTitle>
            <DialogDescription>
              {riscoEditando ? 'Atualize as informações do risco' : 'Preencha as informações para registrar um novo risco'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {/* Bloco 1: Identificação */}
            <div className="p-5 border rounded-xl bg-gray-50 border-gray-200">
              <h3 className="text-gray-900 mb-4 flex items-center gap-2.5" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs">1</div>
                Identificação
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Departamento *</Label>
                  <Select value={formData.departamento} onValueChange={(value) => setFormData({ ...formData, departamento: value, processo: '' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {departamentos.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Processo / Atividade *</Label>
                  <Select 
                    value={formData.processo} 
                    onValueChange={(value) => setFormData({ ...formData, processo: value })}
                    disabled={!formData.departamento}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o processo" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.departamento && processosPorDepartamento[formData.departamento]?.map(proc => (
                        <SelectItem key={proc} value={proc}>{proc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label>Descrição do Risco *</Label>
                  <Textarea
                    value={formData.descricaoRisco}
                    onChange={(e) => setFormData({ ...formData, descricaoRisco: e.target.value })}
                    placeholder="Descreva de forma clara e objetiva o risco identificado..."
                    rows={3}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Controles Existentes</Label>
                  <div className="space-y-2">
                    {formData.controlesExistentes.map((controle, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={controle}
                          onChange={(e) => {
                            const novosControles = [...formData.controlesExistentes];
                            novosControles[index] = e.target.value;
                            setFormData({ ...formData, controlesExistentes: novosControles });
                          }}
                          placeholder="Descreva o controle existente..."
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const novosControles = formData.controlesExistentes.filter((_, i) => i !== index);
                            setFormData({ ...formData, controlesExistentes: novosControles });
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={novoControle}
                        onChange={(e) => setNovoControle(e.target.value)}
                        placeholder="Adicione um novo controle..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && novoControle.trim()) {
                            e.preventDefault();
                            setFormData({ 
                              ...formData, 
                              controlesExistentes: [...formData.controlesExistentes, novoControle.trim()] 
                            });
                            setNovoControle('');
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (novoControle.trim()) {
                            setFormData({ 
                              ...formData, 
                              controlesExistentes: [...formData.controlesExistentes, novoControle.trim()] 
                            });
                            setNovoControle('');
                          }
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 2: Avaliação Inicial */}
            <div className="p-5 border rounded-xl bg-gray-50 border-gray-200">
              <h3 className="text-gray-900 mb-4 flex items-center gap-2.5" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs">2</div>
                Avaliação Inicial
              </h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label>Impacto *</Label>
                  <Select 
                    value={formData.impactoInicial.toString()} 
                    onValueChange={(value) => setFormData({ ...formData, impactoInicial: parseInt(value) as 1 | 2 | 3 })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Baixo</SelectItem>
                      <SelectItem value="2">2 - Médio</SelectItem>
                      <SelectItem value="3">3 - Alto</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Qual a gravidade do impacto se o risco ocorrer?
                  </p>
                </div>

                <div>
                  <Label>Probabilidade *</Label>
                  <Select 
                    value={formData.probabilidadeInicial.toString()} 
                    onValueChange={(value) => setFormData({ ...formData, probabilidadeInicial: parseInt(value) as 1 | 2 | 3 })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Baixa</SelectItem>
                      <SelectItem value="2">2 - Média</SelectItem>
                      <SelectItem value="3">3 - Alta</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Qual a chance deste risco ocorrer?
                  </p>
                </div>
              </div>

              {/* Resultado da Classificação */}
              <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Classificação Inicial:</p>
                    <div className="flex items-center gap-3">
                      <Badge className={`${getNivelColor(classificacaoInicial.nivel)} text-base px-3 py-1`} variant="secondary">
                        {classificacaoInicial.nivel}
                      </Badge>
                      <span className="text-gray-900" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{classificacaoInicial.valor}</span>
                      <span className="text-sm text-gray-500">({formData.impactoInicial} × {formData.probabilidadeInicial})</span>
                    </div>
                  </div>
                  {classificacaoInicial.nivel === 'Alto' && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="text-sm text-red-700" style={{ fontWeight: 600 }}>Plano de Ação Obrigatório</p>
                        <p className="text-xs text-red-600">Riscos altos devem ter tratamento</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bloco 3: Reavaliação (Colapsável) */}
            <div className="p-5 border rounded-xl bg-gray-50 border-gray-200">
              <button
                type="button"
                onClick={() => setExpandirReavaliacao(!expandirReavaliacao)}
                className="w-full flex items-center justify-between"
              >
                <h3 className="text-gray-900 flex items-center gap-2.5" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs">3</div>
                  Reavaliação (Opcional)
                </h3>
                {expandirReavaliacao ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {expandirReavaliacao && (
                <div className="mt-4 space-y-4">
                  {riscoEditando && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl mb-3">
                      <p className="text-sm text-indigo-900 flex items-center gap-2" style={{ fontWeight: 600 }}>
                        <Calendar className="w-4 h-4" />
                        Nova Revisão: {`R${parseInt(riscoEditando.revisaoAtual.substring(1)) + 1}`}
                      </p>
                      <p className="text-xs text-indigo-700 mt-1">
                        Esta reavaliação criará uma nova revisão no histórico do risco
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-gray-600">
                    Após implementação do plano de ação, reavalie o risco:
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Impacto Residual</Label>
                      <Select 
                        value={formData.impactoResidual.toString()} 
                        onValueChange={(value) => setFormData({ ...formData, impactoResidual: parseInt(value) as 1 | 2 | 3 })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - Baixo</SelectItem>
                          <SelectItem value="2">2 - Médio</SelectItem>
                          <SelectItem value="3">3 - Alto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Probabilidade Residual</Label>
                      <Select 
                        value={formData.probabilidadeResidual.toString()} 
                        onValueChange={(value) => setFormData({ ...formData, probabilidadeResidual: parseInt(value) as 1 | 2 | 3 })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - Baixa</SelectItem>
                          <SelectItem value="2">2 - Média</SelectItem>
                          <SelectItem value="3">3 - Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Data da Reavaliação</Label>
                      <Input
                        type="date"
                        value={formData.dataReavaliacao}
                        onChange={(e) => setFormData({ ...formData, dataReavaliacao: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Classificação Residual</Label>
                      <div className="h-10 flex items-center">
                        <Badge className={`${getNivelColor(classificacaoResidual.nivel)} text-base px-3 py-1`} variant="secondary">
                          {classificacaoResidual.nivel} ({classificacaoResidual.valor})
                        </Badge>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <Label>Observações da Reavaliação</Label>
                      <Textarea
                        value={formData.observacoesReavaliacao}
                        onChange={(e) => setFormData({ ...formData, observacoesReavaliacao: e.target.value })}
                        placeholder="Descreva as ações tomadas e os resultados obtidos..."
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Comparativo Visual */}
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <p className="text-sm text-gray-700 mb-2" style={{ fontWeight: 500 }}>Evolução do Risco:</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">Inicial:</span>
                        <Badge className={getNivelColor(classificacaoInicial.nivel)} variant="secondary">
                          {classificacaoInicial.nivel} ({classificacaoInicial.valor})
                        </Badge>
                      </div>
                      <div className="text-gray-400">→</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">Residual:</span>
                        <Badge className={getNivelColor(classificacaoResidual.nivel)} variant="secondary">
                          {classificacaoResidual.nivel} ({classificacaoResidual.valor})
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bloco 4: Status */}
            <div className="p-5 border rounded-xl bg-gray-50 border-gray-200">
              <h3 className="text-gray-900 mb-4 flex items-center gap-2.5" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs">4</div>
                Status do Risco
              </h3>
              <div className="space-y-4">
                <div>
                  <Label>Status *</Label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aceitar">Aceitar</SelectItem>
                      <SelectItem value="Transferir">Transferir</SelectItem>
                      <SelectItem value="Tratar">Tratar</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Defina o status atual de tratamento deste risco
                  </p>
                </div>

                {/* Campos condicionais para "Tratar" */}
                {formData.status === 'Tratar' && (
                  <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-3">
                    <PlanoAcaoCorretivaSelector
                      value={formData.planoAcaoVinculado}
                      onChange={(numeroPA) => setFormData({ ...formData, planoAcaoVinculado: numeroPA || '' })}
                      label="Plano de Ação Vinculado *"
                      onViewDetails={() => {
                        const pa = dados?.planosAcoes?.find(p => p.numeroPE === formData.planoAcaoVinculado);
                        if (pa) {
                          setSelectedPA(pa);
                          setIsPADialogOpen(true);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                      onClick={() => setIsQuickPADialogOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Criar PA e Vincular
                    </Button>
                  </div>
                )}

                {/* Campos condicionais para "Transferir" */}
                {formData.status === 'Transferir' && (
                  <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-3">
                    <div>
                      <Label>Transferir para *</Label>
                      <Select 
                        value={formData.transferidoPara} 
                        onValueChange={(value) => setFormData({ ...formData, transferidoPara: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o destino" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Seguradora">Seguradora</SelectItem>
                          <SelectItem value="Empresa Terceirizada">Empresa Terceirizada</SelectItem>
                          <SelectItem value="Cláusula Contratual">Cláusula Contratual</SelectItem>
                          <SelectItem value="Outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        Selecione para onde o risco será transferido
                      </p>
                    </div>

                    <div>
                      <Label>Observações da Transferência</Label>
                      <Textarea
                        value={formData.observacaoTransferencia}
                        onChange={(e) => setFormData({ ...formData, observacaoTransferencia: e.target.value })}
                        placeholder="Descreva detalhes da transferência do risco..."
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={fecharDialogEdicao} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSalvarRisco} className="flex-1">
              {riscoEditando ? 'Atualizar Risco' : 'Salvar Risco'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes do Risco */}
      <Dialog open={isDetalhesOpen} onOpenChange={setIsDetalhesOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {riscoSelecionado && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md border text-sm bg-gray-50 text-gray-700 border-gray-200" style={{ fontWeight: 500 }}>
                    {riscoSelecionado.codigo}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm bg-gray-100 text-gray-600 border border-gray-200" style={{ fontWeight: 500 }}>
                    {riscoSelecionado.revisaoAtual}
                  </span>
                  <span>{riscoSelecionado.descricaoRisco}</span>
                </DialogTitle>
                <DialogDescription>
                  Visualização completa das informações do risco — {riscoSelecionado.historicoRevisoes.length} {riscoSelecionado.historicoRevisoes.length === 1 ? 'revisão' : 'revisões'} no histórico
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 pt-4">
                {/* Identificação */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h3 className="text-gray-900 mb-3" style={{ fontSize: '0.875rem', fontWeight: 600 }}>Identificação</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Departamento:</p>
                      <p className="font-medium">{riscoSelecionado.departamento}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Processo:</p>
                      <p className="font-medium">{riscoSelecionado.processo}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-600">Controles Existentes:</p>
                      <p className="font-medium">{riscoSelecionado.controlesExistentes.join(', ')}</p>
                    </div>
                  </div>
                </div>

                {/* Avaliação */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h3 className="text-gray-900 mb-3" style={{ fontSize: '0.875rem', fontWeight: 600 }}>Avaliação Inicial</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Impacto:</p>
                      <p className="text-gray-900" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{riscoSelecionado.impactoInicial}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Probabilidade:</p>
                      <p className="text-gray-900" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{riscoSelecionado.probabilidadeInicial}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Classificação:</p>
                      <Badge className={`${getNivelColor(riscoSelecionado.nivelInicial)} text-base px-3 py-1 mt-1`} variant="secondary">
                        {riscoSelecionado.nivelInicial} ({riscoSelecionado.classificacaoInicial})
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Reavaliação (se existir) */}
                {riscoSelecionado.dataReavaliacao && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <h3 className="text-gray-900 mb-3" style={{ fontSize: '0.875rem', fontWeight: 600 }}>Reavaliação Atual</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-gray-600">Impacto Residual:</p>
                        <p className="text-gray-900" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{riscoSelecionado.impactoResidual}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Probabilidade Residual:</p>
                        <p className="text-gray-900" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{riscoSelecionado.probabilidadeResidual}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Classificação Residual:</p>
                        <Badge className={`${getNivelColor(riscoSelecionado.nivelResidual!)} text-base px-3 py-1 mt-1`} variant="secondary">
                          {riscoSelecionado.nivelResidual} ({riscoSelecionado.classificacaoResidual})
                        </Badge>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-gray-200 mb-3">
                      <p className="text-sm text-gray-700 mb-2" style={{ fontWeight: 500 }}>Evolução:</p>
                      <div className="flex items-center gap-4">
                        <Badge className={getNivelColor(riscoSelecionado.nivelInicial)} variant="secondary">
                          {riscoSelecionado.nivelInicial} ({riscoSelecionado.classificacaoInicial})
                        </Badge>
                        <div className="text-gray-400">→</div>
                        <Badge className={getNivelColor(riscoSelecionado.nivelResidual!)} variant="secondary">
                          {riscoSelecionado.nivelResidual} ({riscoSelecionado.classificacaoResidual})
                        </Badge>
                      </div>
                    </div>

                    <div className="text-sm">
                      <p className="text-gray-600">Data da Reavaliação:</p>
                      <p className="font-medium">{formatarDataPtBr(riscoSelecionado.dataReavaliacao)}</p>
                    </div>

                    {riscoSelecionado.observacoesReavaliacao && (
                      <div className="text-sm mt-3">
                        <p className="text-gray-600">Observações:</p>
                        <p className="font-medium">{riscoSelecionado.observacoesReavaliacao}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Histórico de Revisões */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h3 className="text-gray-900 mb-3 flex items-center gap-2" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    Histórico de Revisões ({riscoSelecionado.revisaoAtual})
                  </h3>
                  <div className="space-y-3">
                    {riscoSelecionado.historicoRevisoes.map((revisao, index) => (
                      <div key={index} className="p-3 bg-white rounded-xl border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-gray-200 text-gray-600" style={{ fontWeight: 500 }}>
                              {revisao.numeroRevisao}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {formatarDataPtBr(revisao.data)}
                            </span>
                          </div>
                          <Badge className={`${getNivelColor(revisao.nivel)} text-xs`} variant="secondary">
                            {revisao.nivel} ({revisao.classificacao})
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                          <div>
                            <span className="text-gray-600">Impacto: </span>
                            <span className="text-gray-900" style={{ fontWeight: 600 }}>{revisao.impacto}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Probabilidade: </span>
                            <span className="text-gray-900" style={{ fontWeight: 600 }}>{revisao.probabilidade}</span>
                          </div>
                        </div>
                        {revisao.observacoes && (
                          <div className="text-sm text-gray-700 pt-2 border-t">
                            <span className="text-gray-600">Observações: </span>
                            {revisao.observacoes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status e Plano */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h3 className="text-gray-900 mb-3" style={{ fontSize: '0.875rem', fontWeight: 600 }}>Status e Tratamento</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Status:</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs mt-1 ${
                        riscoSelecionado.status === 'Aceitar' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        riscoSelecionado.status === 'Transferir' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`} style={{ fontWeight: 500 }}>
                        {riscoSelecionado.status}
                      </span>
                    </div>
                    {riscoSelecionado.planoAcaoVinculado && (
                      <div>
                        <p className="text-gray-600">Plano de Ação Vinculado:</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 hover:bg-transparent mt-1"
                          onClick={() => {
                            const pa = dados?.planosAcoes?.find(p => p.numeroPE === riscoSelecionado.planoAcaoVinculado);
                            if (pa) {
                              setSelectedPA(pa);
                              setIsPADialogOpen(true);
                            }
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-blue-600" />
                            <span className="text-blue-600 hover:underline" style={{ fontWeight: 600 }}>{riscoSelecionado.planoAcaoVinculado}</span>
                          </div>
                        </Button>
                      </div>
                    )}
                    {riscoSelecionado.transferidoPara && (
                      <div className="col-span-2 mt-3">
                        <p className="text-gray-600">Transferido para:</p>
                        <p className="text-gray-900" style={{ fontWeight: 600 }}>{riscoSelecionado.transferidoPara}</p>
                        {riscoSelecionado.observacaoTransferencia && (
                          <p className="text-sm text-gray-600 mt-1">{riscoSelecionado.observacaoTransferencia}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes do PA */}
      <PADetailsDialog
        open={isPADialogOpen}
        onOpenChange={setIsPADialogOpen}
        pa={selectedPA}
      />

      {/* QuickPADialog */}
      <QuickPADialog
        open={isQuickPADialogOpen}
        onOpenChange={setIsQuickPADialogOpen}
        prefilledOrigem="Risco"
        onSave={(plano) => {
          const novoPA = addPlanoAcoes(plano);
          setFormData({ ...formData, planoAcaoVinculado: novoPA.numeroPE });
          toast.success(`PA ${novoPA.numeroPE} criado e vinculado com sucesso!`);
        }}
      />
    </div>
  );
}
