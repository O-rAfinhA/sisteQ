import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  User,
  Shield,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Award,
  ClipboardList,
  Calendar,
  Paperclip,
  Star,
  CalendarRange,
  FileCheck,
  Edit2,
  Save,
  X,
  Upload,
  Trash2,
  AlertCircle,
  Lock,
  ShieldCheck,
  Ban,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { useFornecedores } from '../../hooks/useFornecedores';
import { NivelAvaliacao, Criticidade, TipoFornecedor } from '../../types/fornecedor';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { getFornecedorStatusColor, getCriticidadeColor, calcularIQF, getIQFColor, getIQFGaugeColor } from '../../utils/fornecedor-helpers';
import { formatarDataPtBr } from '../../utils/formatters';
import { toast } from 'sonner';

function diasAteVencimento(dataValidade: string | undefined): number | null {
  if (!dataValidade) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(dataValidade);
  validade.setHours(0, 0, 0, 0);
  return Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function StarRating({ nota }: { nota: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= Math.round(nota) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
      ))}
      <span className="ml-1.5 text-sm text-gray-900" style={{ fontWeight: 600 }}>{nota.toFixed(1)}</span>
    </div>
  );
}

// Section header with edit button
function SectionHeader({ icon: Icon, title, subtitle, editing, onEdit, onSave, onCancel }: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-gray-900 flex items-center gap-2" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
        <Icon className="w-4 h-4 text-gray-400" />
        {title}
        {subtitle && <span className="text-xs text-gray-400 ml-1" style={{ fontWeight: 400 }}>{subtitle}</span>}
      </h3>
      {editing ? (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={onCancel}>
            <X className="w-3 h-3" />
            Cancelar
          </Button>
          <Button size="sm" className="gap-1 text-xs h-7" onClick={onSave}>
            <Save className="w-3 h-3" />
            Salvar
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="gap-1.5 text-xs h-7 text-gray-600"
        >
          <Edit2 className="w-3 h-3" />
          Editar
        </Button>
      )}
    </div>
  );
}

// Inline input component
function InlineField({ label, value, onChange, type = 'text', placeholder, required, className }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm transition-colors"
        placeholder={placeholder}
      />
    </div>
  );
}

export function FornecedorVisualizar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getFornecedorById, updateFornecedor, getROFsByFornecedor, getAvaliacoesByFornecedor, getRecebimentosByFornecedor, configuracao } = useFornecedores();

  const fornecedor = id ? getFornecedorById(id) : null;
  const rofs = id ? getROFsByFornecedor(id) : [];
  const avaliacoes = id ? getAvaliacoesByFornecedor(id) : [];
  const recebimentosForn = id ? getRecebimentosByFornecedor(id) : [];

  // ══════ IQF com seletor de ano ══════
  const anoAtual = new Date().getFullYear();
  const [anoIQF, setAnoIQF] = useState<number | 'todos'>(anoAtual);

  // Anos disponíveis (de avaliações + ROFs + ano atual)
  const anosDisponiveis = useMemo(() => {
    const anos = new Set<number>();
    anos.add(anoAtual);
    avaliacoes.forEach(a => anos.add(new Date(a.data).getFullYear()));
    rofs.forEach(r => anos.add(new Date(r.dataAbertura).getFullYear()));
    return Array.from(anos).sort((a, b) => b - a);
  }, [avaliacoes, rofs, anoAtual]);

  // IQF filtrado por ano
  const iqf = useMemo(() => {
    if (!fornecedor) return null;

    if (anoIQF === 'todos') {
      return calcularIQF(fornecedor, rofs, configuracao.metaAvaliacaoPorTipo, recebimentosForn);
    }

    // Filtrar avaliações e ROFs pelo ano selecionado
    const avaliacoesAno = avaliacoes.filter(a => new Date(a.data).getFullYear() === anoIQF);
    const rofsAno = rofs.filter(r => new Date(r.dataAbertura).getFullYear() === anoIQF);
    const recebimentosAno = recebimentosForn.filter(r => new Date(r.dataRecebimento).getFullYear() === anoIQF);

    // Criar fornecedor virtual com dados filtrados por ano
    const notaMediaAno = avaliacoesAno.length > 0
      ? avaliacoesAno.reduce((sum, a) => sum + a.notaFinal, 0) / avaliacoesAno.length
      : undefined;

    const fornecedorFiltrado = {
      ...fornecedor,
      avaliacoes: avaliacoesAno,
      notaMedia: notaMediaAno
    };

    return calcularIQF(fornecedorFiltrado, rofsAno, configuracao.metaAvaliacaoPorTipo, recebimentosAno);
  }, [fornecedor, rofs, avaliacoes, recebimentosForn, configuracao.metaAvaliacaoPorTipo, anoIQF]);

  // ══════ ESTADO DE EDIÇÃO ══════
  const [editandoDados, setEditandoDados] = useState(false);
  const [editandoDocumentos, setEditandoDocumentos] = useState(false);
  const [editandoCriterios, setEditandoCriterios] = useState(false);
  const [mostrarFormulaIQF, setMostrarFormulaIQF] = useState(false);
  const [mostrarRegrasHomologacao, setMostrarRegrasHomologacao] = useState(false);

  // Form: Dados Cadastrais
  const [formDados, setFormDados] = useState({
    razaoSocial: '', nomeFantasia: '', cnpj: '', endereco: '', cidade: '', estado: '', cep: '',
    telefone: '', email: '', site: '', contatoPrincipal: '', departamentoVinculado: '',
    criticidade: 'Não Crítico' as Criticidade, tipo: [] as string[],
    periodicidadeAvaliacao: 'Anual' as 'Semestral' | 'Anual' | 'Personalizado'
  });

  // Form: Documentos
  const [formDocumentos, setFormDocumentos] = useState<{
    [key: string]: {
      status: 'Aplicável' | 'Não Aplicável';
      conforme: boolean;
      nomeArquivo?: string;
      dataUpload?: string;
      dataValidade?: string;
      observacao?: string;
    };
  }>({});

  // Form: Critérios
  const [formCriterios, setFormCriterios] = useState<{
    capacidadeProdutiva: NivelAvaliacao | null;
    reconhecimentoMercado: NivelAvaliacao | null;
    amostraProduto: NivelAvaliacao | null;
    avaliacaoPrimeiroServico: NivelAvaliacao | null;
    prazoEntrega: NivelAvaliacao | null;
  }>({
    capacidadeProdutiva: null,
    reconhecimentoMercado: null,
    amostraProduto: null,
    avaliacaoPrimeiroServico: null,
    prazoEntrega: null
  });

  // Form: Observações por critério (obrigatório para Parcialmente Adequado / Inadequado)
  const [formObsCriterios, setFormObsCriterios] = useState<{ [key: string]: string }>({});

  // Form: Decisão de homologação
  const [formDecisao, setFormDecisao] = useState<{
    resultado: 'Homologado' | 'Homologado com Restrição' | 'Reprovado';
    responsavel: string;
    observacao: string;
    data: string;
  }>({
    resultado: 'Homologado',
    responsavel: '',
    observacao: '',
    data: ''
  });

  // Sincronizar formulário com dados do fornecedor
  useEffect(() => {
    if (fornecedor) {
      setFormDados({
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
        departamentoVinculado: fornecedor.departamentoVinculado,
        criticidade: fornecedor.criticidade,
        tipo: fornecedor.tipo,
        periodicidadeAvaliacao: fornecedor.periodicidadeAvaliacao
      });
      if (fornecedor.homologacao?.analiseDocumental) {
        setFormDocumentos({ ...fornecedor.homologacao.analiseDocumental });
      }
      if (fornecedor.homologacao?.criterios) {
        setFormCriterios({ ...fornecedor.homologacao.criterios });
      }
      if (fornecedor.homologacao?.observacoesCriterios) {
        setFormObsCriterios({ ...fornecedor.homologacao.observacoesCriterios });
      }
      if (fornecedor.homologacao?.decisao) {
        setFormDecisao({ ...fornecedor.homologacao.decisao });
      }
    }
  }, [fornecedor]);

  // Handlers: Dados
  const handleSalvarDados = () => {
    if (!id || !fornecedor) return;
    if (!formDados.razaoSocial || !formDados.cnpj || !formDados.email) {
      toast.error('Preencha os campos obrigatórios: Razão Social, CNPJ e E-mail');
      return;
    }
    if (formDados.tipo.length === 0) {
      toast.error('Selecione pelo menos um tipo de fornecedor');
      return;
    }
    updateFornecedor(id, {
      razaoSocial: formDados.razaoSocial,
      nomeFantasia: formDados.nomeFantasia,
      cnpj: formDados.cnpj,
      endereco: formDados.endereco,
      cidade: formDados.cidade,
      estado: formDados.estado,
      cep: formDados.cep,
      telefone: formDados.telefone,
      email: formDados.email,
      site: formDados.site || undefined,
      contatoPrincipal: formDados.contatoPrincipal || undefined,
      departamentoVinculado: formDados.departamentoVinculado,
      criticidade: formDados.criticidade,
      tipo: formDados.tipo as TipoFornecedor[],
      periodicidadeAvaliacao: formDados.periodicidadeAvaliacao
    });
    toast.success('Dados do fornecedor atualizados');
    setEditandoDados(false);
  };

  const handleCancelarDados = () => {
    if (fornecedor) {
      setFormDados({
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
        departamentoVinculado: fornecedor.departamentoVinculado,
        criticidade: fornecedor.criticidade,
        tipo: fornecedor.tipo,
        periodicidadeAvaliacao: fornecedor.periodicidadeAvaliacao
      });
    }
    setEditandoDados(false);
  };

  // Handlers: Documentos
  const handleSalvarDocumentos = () => {
    if (!id || !fornecedor) return;
    updateFornecedor(id, {
      homologacao: {
        ...fornecedor.homologacao!,
        analiseDocumental: formDocumentos
      }
    });
    toast.success('Documentos atualizados');
    setEditandoDocumentos(false);
  };

  const handleCancelarDocumentos = () => {
    if (fornecedor?.homologacao?.analiseDocumental) {
      setFormDocumentos({ ...fornecedor.homologacao.analiseDocumental });
    }
    setEditandoDocumentos(false);
  };

  const handleUploadDoc = (documento: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setFormDocumentos(prev => ({
          ...prev,
          [documento]: {
            ...prev[documento],
            nomeArquivo: file.name,
            dataUpload: new Date().toISOString(),
            conforme: true
          }
        }));
        toast.success(`Arquivo "${file.name}" anexado`);
      }
    };
    input.click();
  };

  // Handlers: Critérios
  const handleSalvarCriterios = () => {
    if (!id || !fornecedor) return;
    // Validar observações obrigatórias para Parcialmente Adequado / Inadequado
    const criteriosComObsObrigatoria = Object.entries(formCriterios).filter(
      ([, nivel]) => nivel === 'Parcialmente Adequado' || nivel === 'Inadequado'
    );
    for (const [key] of criteriosComObsObrigatoria) {
      if (!formObsCriterios[key]?.trim()) {
        toast.error(`Preencha a observação para "${criterioLabels[key]}" (${formCriterios[key as keyof typeof formCriterios]})`);
        return;
      }
    }
    const updatedHomologacao = {
      ...fornecedor.homologacao!,
      criterios: formCriterios,
      observacoesCriterios: formObsCriterios,
      ...(formDecisao.responsavel && formDecisao.data ? { decisao: formDecisao } : {})
    };
    updateFornecedor(id, { homologacao: updatedHomologacao });
    toast.success('Critérios e decisão atualizados');
    setEditandoCriterios(false);
  };

  const handleCancelarCriterios = () => {
    if (fornecedor?.homologacao?.criterios) {
      setFormCriterios({ ...fornecedor.homologacao.criterios });
    }
    if (fornecedor?.homologacao?.observacoesCriterios) {
      setFormObsCriterios({ ...fornecedor.homologacao.observacoesCriterios });
    } else {
      setFormObsCriterios({});
    }
    if (fornecedor?.homologacao?.decisao) {
      setFormDecisao({ ...fornecedor.homologacao.decisao });
    }
    setEditandoCriterios(false);
  };

  // Análise documental stats
  const docStats = useMemo(() => {
    if (!fornecedor?.homologacao?.analiseDocumental) {
      return { total: 0, aplicaveis: 0, conformes: 0, comAnexo: 0, vencidos: 0, aVencer: 0 };
    }
    const docs = Object.entries(fornecedor.homologacao.analiseDocumental);
    const aplicaveis = docs.filter(([, d]) => d.status === 'Aplicável');
    const conformes = aplicaveis.filter(([, d]) => d.conforme);
    const comAnexo = aplicaveis.filter(([, d]) => d.nomeArquivo);
    const vencidos = aplicaveis.filter(([, d]) => { const dias = diasAteVencimento(d.dataValidade); return dias !== null && dias < 0; });
    const aVencer = aplicaveis.filter(([, d]) => { const dias = diasAteVencimento(d.dataValidade); return dias !== null && dias >= 0 && dias <= 30; });
    return { total: docs.length, aplicaveis: aplicaveis.length, conformes: conformes.length, comAnexo: comAnexo.length, vencidos: vencidos.length, aVencer: aVencer.length };
  }, [fornecedor]);

  const criterioLabels: Record<string, string> = {
    capacidadeProdutiva: 'Capacidade Produtiva',
    reconhecimentoMercado: 'Reconhecimento de Mercado',
    amostraProduto: 'Amostra do Produto',
    avaliacaoPrimeiroServico: 'Avaliação do 1o Serviço',
    prazoEntrega: 'Prazo de Entrega'
  };

  const criterioLabelsShort: Record<string, string> = {
    capacidadeProdutiva: 'Cap. Produtiva',
    reconhecimentoMercado: 'Rec. Mercado',
    amostraProduto: 'Amostra Prod.',
    avaliacaoPrimeiroServico: 'Aval. 1o Serv.',
    prazoEntrega: 'Prazo Entrega'
  };

  const getNivelColor = (nivel: NivelAvaliacao | null): string => {
    if (!nivel) return '#d1d5db';
    if (nivel === 'Adequado') return '#10b981';
    if (nivel === 'Parcialmente Adequado') return '#f59e0b';
    return '#ef4444';
  };

  const getNivelBgClass = (nivel: NivelAvaliacao | null) => {
    if (!nivel) return 'bg-gray-100 text-gray-400 border-gray-200';
    if (nivel === 'Adequado') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (nivel === 'Parcialmente Adequado') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  if (!fornecedor) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600">Fornecedor não encontrado</p>
      </div>
    );
  }

  const criteriosData = fornecedor.homologacao?.criterios;
  const criteriosPreenchidos = criteriosData ? Object.values(criteriosData).filter(c => c !== null).length : 0;
  const criteriosAdequados = criteriosData ? Object.values(criteriosData).filter(c => c === 'Adequado').length : 0;
  const rofsAbertas = rofs.filter(r => r.status === 'Aberta' || r.status === 'Em Tratamento').length;

  const handleTipoChange = (tipo: string) => {
    setFormDados(prev => {
      const tipos = prev.tipo.includes(tipo)
        ? prev.tipo.filter(t => t !== tipo)
        : [...prev.tipo, tipo];
      return { ...prev, tipo: tipos };
    });
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* ══════ HEADER COM IDENTIDADE DO FORNECEDOR ══════ */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:border-gray-300 hover:shadow-sm transition-all flex-shrink-0 mt-1"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.3 }}>
                  {fornecedor.razaoSocial}
                </h1>
                <p className="text-gray-500 mt-0.5" style={{ fontSize: '0.875rem' }}>
                  {fornecedor.nomeFantasia} • <span className="font-mono text-gray-400">{fornecedor.cnpj}</span>
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge className={`${getFornecedorStatusColor(fornecedor.status)} border text-xs`}>{fornecedor.status}</Badge>
                  <Badge className={`${getCriticidadeColor(fornecedor.criticidade)} border text-xs`}>{fornecedor.criticidade}</Badge>
                  {fornecedor.tipo.map((t, idx) => (
                    <Badge key={idx} className="bg-purple-100 text-purple-800 border-purple-200 border text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {fornecedor.status === 'Em Homologação' && (
                <Button className="gap-1.5" onClick={() => navigate(`/fornecedores/homologacao/${fornecedor.id}`)}>
                  <Shield className="w-4 h-4" />
                  Ir para Homologação
                </Button>
              )}
            </div>
          </div>
          {/* Linha de contato resumida */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 flex-wrap">
            {fornecedor.email && (
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400" />{fornecedor.email}</span>
            )}
            {fornecedor.telefone && (
              <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" />{fornecedor.telefone}</span>
            )}
            {fornecedor.cidade && (
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" />{fornecedor.cidade}{fornecedor.estado ? ` - ${fornecedor.estado}` : ''}</span>
            )}
            {fornecedor.contatoPrincipal && (
              <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-gray-400" />{fornecedor.contatoPrincipal}</span>
            )}
            <span className="ml-auto text-gray-400">
              Cadastro: {formatarDataPtBr(fornecedor.dataCadastro)}
            </span>
          </div>
        </div>
      </div>

      {/* ══════ BANNER DE FORNECEDOR BLOQUEADO ══════ */}
      {fornecedor.status === 'Bloqueado' && /* mt-6 */ (() => {
        const ultimoBloqueio = fornecedor.historicoBloqueios
          ?.filter(r => r.acao === 'Bloqueio')
          .at(-1);
        return (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-red-800" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  Fornecedor Bloqueado
                </h4>
                {ultimoBloqueio && (
                  <span className="text-xs text-red-500">
                    desde {new Date(ultimoBloqueio.data).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
              {ultimoBloqueio ? (
                <div className="space-y-1">
                  <p className="text-sm text-red-700" style={{ lineHeight: 1.6 }}>
                    <span style={{ fontWeight: 500 }}>Motivo:</span> {ultimoBloqueio.motivo}
                  </p>
                  <p className="text-xs text-red-500">
                    <span style={{ fontWeight: 500 }}>Responsável:</span> {ultimoBloqueio.responsavel}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-red-700">
                  Este fornecedor está bloqueado e não pode receber novos pedidos ou participar de processos.
                </p>
              )}
            </div>
            {fornecedor.historicoBloqueios && fornecedor.historicoBloqueios.length > 0 && (
              <div className="flex-shrink-0">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-red-100 text-red-700 border border-red-200" style={{ fontWeight: 600 }}>
                  <Lock className="w-3 h-3" />
                  {fornecedor.historicoBloqueios.filter(r => r.acao === 'Bloqueio').length} bloqueio(s)
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════
           SEÇÃO 1: DADOS CADASTRAIS
         ══════════════════════════════════════════════════════ */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <SectionHeader
          icon={Building2}
          title="Dados Cadastrais"
          editing={editandoDados}
          onEdit={() => setEditandoDados(true)}
          onSave={handleSalvarDados}
          onCancel={handleCancelarDados}
        />

        {editandoDados ? (
          /* ── MODO EDIÇÃO: DADOS ── */
          <div className="space-y-5">
            {/* Identificação */}
            <div>
              <p className="text-xs text-gray-400 mb-3" style={{ fontWeight: 600 }}>IDENTIFICAÇÃO</p>
              <div className="grid grid-cols-2 gap-3">
                <InlineField label="Razão Social" value={formDados.razaoSocial} onChange={v => setFormDados(p => ({ ...p, razaoSocial: v }))} placeholder="Razão Social" required />
                <InlineField label="Nome Fantasia" value={formDados.nomeFantasia} onChange={v => setFormDados(p => ({ ...p, nomeFantasia: v }))} placeholder="Nome Fantasia" />
                <InlineField label="CNPJ" value={formDados.cnpj} onChange={v => setFormDados(p => ({ ...p, cnpj: v }))} placeholder="00.000.000/0000-00" required />
                <InlineField label="CEP" value={formDados.cep} onChange={v => setFormDados(p => ({ ...p, cep: v }))} placeholder="00000-000" />
                <InlineField label="Endereço" value={formDados.endereco} onChange={v => setFormDados(p => ({ ...p, endereco: v }))} placeholder="Rua, número, bairro" className="col-span-2" />
                <InlineField label="Cidade" value={formDados.cidade} onChange={v => setFormDados(p => ({ ...p, cidade: v }))} placeholder="Cidade" />
                <InlineField label="Estado" value={formDados.estado} onChange={v => setFormDados(p => ({ ...p, estado: v }))} placeholder="UF" />
              </div>
            </div>

            {/* Contato */}
            <div>
              <p className="text-xs text-gray-400 mb-3" style={{ fontWeight: 600 }}>CONTATO</p>
              <div className="grid grid-cols-2 gap-3">
                <InlineField label="E-mail" value={formDados.email} onChange={v => setFormDados(p => ({ ...p, email: v }))} type="email" placeholder="email@exemplo.com" required />
                <InlineField label="Telefone" value={formDados.telefone} onChange={v => setFormDados(p => ({ ...p, telefone: v }))} placeholder="(00) 00000-0000" />
                <InlineField label="Site" value={formDados.site} onChange={v => setFormDados(p => ({ ...p, site: v }))} placeholder="www.exemplo.com" />
                <InlineField label="Contato Principal" value={formDados.contatoPrincipal} onChange={v => setFormDados(p => ({ ...p, contatoPrincipal: v }))} placeholder="Nome do contato" />
              </div>
            </div>

            {/* Classificação */}
            <div>
              <p className="text-xs text-gray-400 mb-3" style={{ fontWeight: 600 }}>CLASSIFICAÇÃO</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-2" style={{ fontWeight: 500 }}>Tipo de Fornecedor</label>
                  <div className="flex flex-wrap gap-2">
                    {configuracao.tiposFornecedor.map(tipo => (
                      <button
                        key={tipo}
                        onClick={() => handleTipoChange(tipo)}
                        className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${formDados.tipo.includes(tipo)
                          ? 'bg-blue-500 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                          }`}
                        style={{ fontWeight: 500 }}
                      >
                        {tipo}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <InlineField label="Departamento Vinculado" value={formDados.departamentoVinculado} onChange={v => setFormDados(p => ({ ...p, departamentoVinculado: v }))} placeholder="Ex: Compras" />

                  <div>
                    <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Criticidade</label>
                    <div className="flex gap-2">
                      {(['Crítico', 'Não Crítico'] as Criticidade[]).map(crit => (
                        <button
                          key={crit}
                          onClick={() => setFormDados(p => ({ ...p, criticidade: crit }))}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs border transition-all ${formDados.criticidade === crit
                            ? crit === 'Crítico'
                              ? 'bg-red-500 text-white border-red-600'
                              : 'bg-blue-500 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                            }`}
                          style={{ fontWeight: 500 }}
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          {crit}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Periodicidade Avaliação</label>
                    <select
                      value={formDados.periodicidadeAvaliacao}
                      onChange={e => setFormDados(p => ({ ...p, periodicidadeAvaliacao: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm transition-colors"
                    >
                      <option value="Semestral">Semestral</option>
                      <option value="Anual">Anual</option>
                      <option value="Personalizado">Personalizado</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── MODO VISUALIZAÇÃO: DADOS ── */
          <div className="grid grid-cols-4 gap-4">
            {fornecedor.endereco && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400" style={{ fontWeight: 500 }}>Endereço</p>
                  <p className="text-sm text-gray-700">{fornecedor.endereco}</p>
                  <p className="text-xs text-gray-500">{fornecedor.cidade}{fornecedor.estado ? ` - ${fornecedor.estado}` : ''} {fornecedor.cep}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400" style={{ fontWeight: 500 }}>E-mail</p>
                <p className="text-sm text-gray-700">{fornecedor.email}</p>
              </div>
            </div>
            {fornecedor.telefone && (
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400" style={{ fontWeight: 500 }}>Telefone</p>
                  <p className="text-sm text-gray-700">{fornecedor.telefone}</p>
                </div>
              </div>
            )}
            {fornecedor.contatoPrincipal && (
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400" style={{ fontWeight: 500 }}>Contato Principal</p>
                  <p className="text-sm text-gray-700">{fornecedor.contatoPrincipal}</p>
                </div>
              </div>
            )}
            {fornecedor.site && (
              <div className="flex items-start gap-2">
                <Globe className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400" style={{ fontWeight: 500 }}>Site</p>
                  <p className="text-sm text-gray-700">{fornecedor.site}</p>
                </div>
              </div>
            )}
            {fornecedor.departamentoVinculado && (
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400" style={{ fontWeight: 500 }}>Departamento</p>
                  <p className="text-sm text-gray-700">{fornecedor.departamentoVinculado}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400" style={{ fontWeight: 500 }}>Periodicidade</p>
                <p className="text-sm text-gray-700">{fornecedor.periodicidadeAvaliacao}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
           SEÇÃO 2: HOMOLOGAÇÃO (Critérios + Análise Documental)
         ══════════════════════════════════════════════════════ */}
      {/* mt-6: mesma zona cadastral */}
      {(criteriosData || fornecedor.homologacao) && (() => {
        const decisao = fornecedor.homologacao?.decisao;
        const criteriosInadequados = criteriosData ? Object.values(criteriosData).filter(c => c === 'Inadequado').length : 0;
        const criteriosParciais = criteriosData ? Object.values(criteriosData).filter(c => c === 'Parcialmente Adequado').length : 0;
        const temDocsVencidos = docStats.vencidos > 0;
        const temDocsNaoConformes = docStats.aplicaveis > 0 && docStats.conformes < docStats.aplicaveis;
        const docsCompletos = docStats.aplicaveis === 0 || (docStats.conformes === docStats.aplicaveis && !temDocsVencidos);

        // ═══ REGRAS OBJETIVAS DE HOMOLOGAÇÃO ═══
        // 1. Pendente       → algum critério não avaliado (null)
        // 2. Reprovado      → qualquer critério = Inadequado
        // 3. Homologado     → 5/5 Adequado + docs 100% conformes + sem vencidos
        // 4. Hom. c/ Restr. → todos avaliados, nenhum Inadequado, mas tem Parcial OU docs pendentes/vencidos
        const statusCalculado: string =
          criteriosPreenchidos < 5
            ? 'Pendente'
            : criteriosInadequados > 0
              ? 'Reprovado'
              : criteriosAdequados === 5 && docsCompletos
                ? 'Homologado'
                : 'Homologado com Restrição';

        // Decisão manual prevalece como override; se ausente, usa o calculado
        const statusFinal = decisao ? decisao.resultado : statusCalculado;
        const temOverride = decisao && decisao.resultado !== statusCalculado;

        const statusConfig: Record<string, { bg: string; text: string; border: string; icon: React.ElementType }> = {
          'Homologado': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle },
          'Homologado com Restrição': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: AlertTriangle },
          'Reprovado': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
          'Pendente': { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', icon: Clock },
        };
        const sc = statusConfig[statusFinal] || statusConfig['Pendente'];
        const StatusIcon = sc.icon;
        const scCalc = statusConfig[statusCalculado] || statusConfig['Pendente'];
        const CalcIcon = scCalc.icon;

        return (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* ── Header da Homologação com status ── */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-gray-900 flex items-center gap-2" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  <Shield className="w-4 h-4 text-gray-400" />
                  Homologação
                </h3>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${sc.bg} ${sc.text} ${sc.border}`} style={{ fontWeight: 600 }}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusFinal}
                </span>
              </div>

              {/* Barra de resumo com 3 indicadores */}
              <div className="grid grid-cols-3 gap-4 mt-3">
                {/* Critérios */}
                <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${criteriosAdequados === 5 ? 'bg-emerald-100' : criteriosInadequados > 0 ? 'bg-red-100' : criteriosPreenchidos < 5 ? 'bg-gray-200' : 'bg-amber-100'}`}>
                    <Shield className={`w-4 h-4 ${criteriosAdequados === 5 ? 'text-emerald-600' : criteriosInadequados > 0 ? 'text-red-600' : criteriosPreenchidos < 5 ? 'text-gray-500' : 'text-amber-600'}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400" style={{ fontWeight: 500 }}>Critérios</p>
                    <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                      {criteriosAdequados}/5
                      <span className="text-[11px] text-gray-400 ml-1" style={{ fontWeight: 400 }}>adequados</span>
                    </p>
                    {criteriosPreenchidos < 5 && (
                      <p className="text-[10px] text-gray-400">{5 - criteriosPreenchidos} pendente(s)</p>
                    )}
                    {criteriosParciais > 0 && (
                      <p className="text-[10px] text-amber-500">{criteriosParciais} parcial(is)</p>
                    )}
                  </div>
                </div>

                {/* Documentos */}
                <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${docsCompletos && docStats.aplicaveis > 0 ? 'bg-emerald-100' : temDocsVencidos ? 'bg-red-100' : temDocsNaoConformes ? 'bg-amber-100' : 'bg-gray-200'}`}>
                    <FileCheck className={`w-4 h-4 ${docsCompletos && docStats.aplicaveis > 0 ? 'text-emerald-600' : temDocsVencidos ? 'text-red-600' : temDocsNaoConformes ? 'text-amber-600' : 'text-gray-500'}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400" style={{ fontWeight: 500 }}>Documentos</p>
                    <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                      {docStats.conformes}/{docStats.aplicaveis}
                      <span className="text-[11px] text-gray-400 ml-1" style={{ fontWeight: 400 }}>conformes</span>
                    </p>
                    {temDocsVencidos && <p className="text-[10px] text-red-500">{docStats.vencidos} vencido(s)</p>}
                    {!temDocsVencidos && docStats.aVencer > 0 && <p className="text-[10px] text-amber-500">{docStats.aVencer} a vencer em 30d</p>}
                  </div>
                </div>

                {/* Decisão / Override */}
                <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${decisao ? sc.bg : scCalc.bg}`}>
                    {decisao ? <StatusIcon className={`w-4 h-4 ${sc.text}`} /> : <CalcIcon className={`w-4 h-4 ${scCalc.text}`} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400" style={{ fontWeight: 500 }}>{decisao ? 'Decisão Manual' : 'Status Calculado'}</p>
                    {decisao ? (
                      <>
                        <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                          {decisao.resultado}
                        </p>
                        <p className="text-[10px] text-gray-400">{decisao.responsavel} em {formatarDataPtBr(decisao.data)}</p>
                        {temOverride && (
                          <p className="text-[10px] text-amber-600" style={{ fontWeight: 500 }}>Calculado: {statusCalculado}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{statusCalculado}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Regras objetivas - disclosure pattern */}
              <div className="mt-3 pt-2.5 border-t border-gray-100">
                <button
                  onClick={() => setMostrarRegrasHomologacao(prev => !prev)}
                  className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  <Info className="w-3 h-3" />
                  Como é calculado?
                  {mostrarRegrasHomologacao ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {mostrarRegrasHomologacao && (
                  <p className="mt-2 text-[10px] text-gray-400 pl-5" style={{ lineHeight: 1.6 }}>
                    <span style={{ fontWeight: 500 }}>Homologado</span> = 5/5 critérios Adequados + 100% docs conformes + sem vencidos &nbsp;|&nbsp;
                    <span style={{ fontWeight: 500 }}>Hom. c/ Restrição</span> = todos avaliados, nenhum Inadequado, mas parciais ou docs pendentes &nbsp;|&nbsp;
                    <span style={{ fontWeight: 500 }}>Reprovado</span> = qualquer critério Inadequado &nbsp;|&nbsp;
                    <span style={{ fontWeight: 500 }}>Pendente</span> = critérios não totalmente avaliados.
                    {decisao && ' A decisão manual prevalece sobre o cálculo automático.'}
                  </p>
                )}
              </div>
            </div>

            {/* ── Critérios de Homologação ── */}
            <div className="px-6 py-5 border-b border-gray-100">
              <SectionHeader
                icon={Shield}
                title="Critérios de Homologação"
                subtitle={!editandoCriterios ? `${criteriosPreenchidos}/5 avaliados` : undefined}
                editing={editandoCriterios}
                onEdit={() => setEditandoCriterios(true)}
                onSave={handleSalvarCriterios}
                onCancel={handleCancelarCriterios}
              />

              {editandoCriterios ? (
                /* ── MODO EDIÇÃO: CRITÉRIOS ── */
                <div className="space-y-4">
                  {Object.entries(formCriterios).map(([key, value]) => {
                    const precisaObs = value === 'Parcialmente Adequado' || value === 'Inadequado';
                    return (
                      <div key={key} className={`border rounded-xl p-4 transition-colors ${precisaObs && !formObsCriterios[key]?.trim() ? 'border-amber-300 bg-amber-50/20' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${getNivelBgClass(value)}`}>
                              {value === 'Adequado' ? <CheckCircle className="w-3.5 h-3.5" /> :
                                value === 'Parcialmente Adequado' ? <AlertTriangle className="w-3.5 h-3.5" /> :
                                  value === 'Inadequado' ? <XCircle className="w-3.5 h-3.5" /> :
                                    <Clock className="w-3.5 h-3.5" />}
                            </div>
                            <h4 className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{criterioLabels[key]}</h4>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded border ${getNivelBgClass(value)}`} style={{ fontWeight: 500 }}>
                            {value || 'Pendente'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {(['Inadequado', 'Parcialmente Adequado', 'Adequado'] as NivelAvaliacao[]).map(nivel => (
                            <button
                              key={nivel}
                              onClick={() => {
                                setFormCriterios(prev => ({ ...prev, [key]: nivel }));
                                if (nivel === 'Adequado') {
                                  setFormObsCriterios(prev => {
                                    const copy = { ...prev };
                                    delete copy[key];
                                    return copy;
                                  });
                                }
                              }}
                              className={`px-3 py-2.5 rounded-lg text-xs transition-all border ${value === nivel
                                ? nivel === 'Adequado'
                                  ? 'bg-emerald-500 text-white border-emerald-600'
                                  : nivel === 'Parcialmente Adequado'
                                    ? 'bg-amber-500 text-white border-amber-600'
                                    : 'bg-red-500 text-white border-red-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                }`}
                              style={{ fontWeight: 500 }}
                            >
                              <div className="flex items-center justify-center gap-1.5">
                                {nivel === 'Adequado' && <CheckCircle className="w-3.5 h-3.5" />}
                                {nivel === 'Parcialmente Adequado' && <AlertTriangle className="w-3.5 h-3.5" />}
                                {nivel === 'Inadequado' && <XCircle className="w-3.5 h-3.5" />}
                                {nivel}
                              </div>
                            </button>
                          ))}
                        </div>
                        {precisaObs && (
                          <div className="mt-3">
                            <label className="flex items-center gap-1.5 text-xs mb-1.5" style={{ fontWeight: 500 }}>
                              <AlertCircle className={`w-3 h-3 ${!formObsCriterios[key]?.trim() ? 'text-amber-500' : 'text-gray-400'}`} />
                              <span className={!formObsCriterios[key]?.trim() ? 'text-amber-700' : 'text-gray-500'}>
                                Observação {!formObsCriterios[key]?.trim() ? '(obrigatória)' : ''}
                              </span>
                            </label>
                            <textarea
                              value={formObsCriterios[key] || ''}
                              onChange={e => setFormObsCriterios(prev => ({ ...prev, [key]: e.target.value }))}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:outline-none text-sm transition-colors resize-none ${
                                !formObsCriterios[key]?.trim()
                                  ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-amber-50/50'
                                  : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'
                              }`}
                              placeholder={`Justifique a classificação "${value}" para ${criterioLabels[key]}...`}
                              rows={2}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* ── DECISÃO DE HOMOLOGAÇÃO (editável) ── */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <p className="text-xs text-gray-400 mb-3" style={{ fontWeight: 600 }}>DECISÃO DE HOMOLOGAÇÃO</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Resultado</label>
                        <select
                          value={formDecisao.resultado}
                          onChange={e => setFormDecisao(prev => ({ ...prev, resultado: e.target.value as typeof prev.resultado }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm transition-colors"
                        >
                          <option value="Homologado">Homologado</option>
                          <option value="Homologado com Restrição">Homologado com Restrição</option>
                          <option value="Reprovado">Reprovado</option>
                        </select>
                      </div>
                      <InlineField
                        label="Responsável"
                        value={formDecisao.responsavel}
                        onChange={v => setFormDecisao(prev => ({ ...prev, responsavel: v }))}
                        placeholder="Nome do responsável"
                      />
                      <div>
                        <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Data da Decisão</label>
                        <input
                          type="date"
                          value={formDecisao.data}
                          onChange={e => setFormDecisao(prev => ({ ...prev, data: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm transition-colors"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Observação Geral</label>
                      <textarea
                        value={formDecisao.observacao}
                        onChange={e => setFormDecisao(prev => ({ ...prev, observacao: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm transition-colors resize-none"
                        placeholder="Observações gerais da decisão de homologação..."
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* ── MODO VISUALIZAÇÃO: CRITÉRIOS ── */
                <>
                  <div className="grid grid-cols-5 gap-3">
                    {criteriosData && Object.entries(criteriosData).map(([key, value]) => {
                      const obs = fornecedor.homologacao?.observacoesCriterios?.[key];
                      return (
                        <div key={key} className={`rounded-xl p-4 border text-center transition-all ${getNivelBgClass(value)}`}>
                          <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center"
                            style={{ backgroundColor: getNivelColor(value) + '20' }}>
                            {value === 'Adequado' ? <CheckCircle className="w-5 h-5" /> :
                              value === 'Parcialmente Adequado' ? <AlertTriangle className="w-5 h-5" /> :
                                value === 'Inadequado' ? <XCircle className="w-5 h-5" /> :
                                  <Clock className="w-5 h-5" />}
                          </div>
                          <p className="text-xs mb-0.5" style={{ fontWeight: 600 }}>{value || 'Pendente'}</p>
                          <p className="text-xs opacity-70">{criterioLabelsShort[key]}</p>
                          {obs && (
                            <p className="text-xs mt-2 pt-2 border-t opacity-80 text-left" title={obs}>
                              {obs.length > 60 ? obs.slice(0, 60) + '…' : obs}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {fornecedor.homologacao?.decisao && (
                    <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-400" style={{ fontWeight: 500 }}>Responsável</p>
                        <p className="text-sm text-gray-700">{fornecedor.homologacao.decisao.responsavel}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400" style={{ fontWeight: 500 }}>Data da Decisão</p>
                        <p className="text-sm text-gray-700">{formatarDataPtBr(fornecedor.homologacao.decisao.data)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400" style={{ fontWeight: 500 }}>Observação</p>
                        <p className="text-sm text-gray-700">{fornecedor.homologacao.decisao.observacao}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Análise Documental (dentro da Homologação) ── */}
            {fornecedor.homologacao?.analiseDocumental && Object.keys(fornecedor.homologacao.analiseDocumental).length > 0 && (
              <div>
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30">
                  <SectionHeader
                    icon={FileCheck}
                    title="Análise Documental"
                    subtitle={!editandoDocumentos ? `${docStats.conformes}/${docStats.aplicaveis} conformes • ${docStats.total} documentos` : undefined}
                    editing={editandoDocumentos}
                    onEdit={() => setEditandoDocumentos(true)}
                    onSave={handleSalvarDocumentos}
                    onCancel={handleCancelarDocumentos}
                  />
                </div>

                {editandoDocumentos ? (
                  /* ── MODO EDIÇÃO: DOCUMENTOS ── */
                  <div className="p-5 space-y-3">
                    {Object.entries(formDocumentos).map(([doc, dados]) => {
                      const dias = diasAteVencimento(dados.dataValidade);
                      const isVencido = dias !== null && dias < 0;

                      return (
                        <div key={doc} className={`border rounded-xl p-4 transition-all ${isVencido ? 'border-red-200 bg-red-50/30' : dados.conforme ? 'border-emerald-200 bg-emerald-50/10' : 'border-gray-200'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${dados.conforme ? (isVencido ? 'bg-red-100' : 'bg-emerald-100') : 'bg-gray-100'}`}>
                                {dados.conforme ? (isVencido ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> : <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />)
                                  : <FileText className="w-3.5 h-3.5 text-gray-400" />}
                              </div>
                              <span className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{doc}</span>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant={dados.status === 'Aplicável' ? 'black' : 'secondary'}
                                size="sm"
                                onClick={() => setFormDocumentos(prev => ({ ...prev, [doc]: { ...prev[doc], status: 'Aplicável' } }))}
                                className="h-7 px-2 text-xs"
                              >
                                Aplicável
                              </Button>
                              <Button
                                variant={dados.status === 'Não Aplicável' ? 'black' : 'secondary'}
                                size="sm"
                                onClick={() => setFormDocumentos(prev => ({ ...prev, [doc]: { ...prev[doc], status: 'Não Aplicável', conforme: false, nomeArquivo: undefined, dataUpload: undefined, dataValidade: undefined } }))}
                                className="h-7 px-2 text-xs"
                              >
                                N/A
                              </Button>
                            </div>
                          </div>

                          {dados.status === 'Aplicável' && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Documento Anexo</label>
                                  {dados.nomeArquivo ? (
                                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                                      <Paperclip className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                      <span className="text-xs text-blue-700 truncate flex-1" title={dados.nomeArquivo}>{dados.nomeArquivo}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setFormDocumentos(prev => ({ ...prev, [doc]: { ...prev[doc], nomeArquivo: undefined, dataUpload: undefined, conforme: false } }))}
                                        className="h-6 w-6 text-blue-600"
                                        aria-label="Remover arquivo"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <button onClick={() => handleUploadDoc(doc)}
                                      className="w-full flex items-center justify-center gap-1.5 p-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-accent transition-all text-xs text-gray-500 hover:text-blue-600">
                                      <Upload className="w-3.5 h-3.5" /> Enviar
                                    </button>
                                  )}
                                </div>

                                <div>
                                  <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Data de Validade</label>
                                  <input
                                    type="date"
                                    value={dados.dataValidade || ''}
                                    onChange={e => setFormDocumentos(prev => ({ ...prev, [doc]: { ...prev[doc], dataValidade: e.target.value } }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-xs transition-colors"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Observação</label>
                                  <input
                                    type="text"
                                    value={dados.observacao || ''}
                                    onChange={e => setFormDocumentos(prev => ({ ...prev, [doc]: { ...prev[doc], observacao: e.target.value } }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-xs transition-colors"
                                    placeholder="Observações..."
                                  />
                                </div>
                              </div>

                              <label className={`flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all ${dados.conforme ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'}`}>
                                <input
                                  type="checkbox"
                                  checked={dados.conforme}
                                  onChange={() => setFormDocumentos(prev => ({ ...prev, [doc]: { ...prev[doc], conforme: !prev[doc].conforme } }))}
                                  className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300"
                                />
                                <span className={`text-xs ${dados.conforme ? 'text-emerald-700' : 'text-gray-600'}`} style={{ fontWeight: 500 }}>
                                  {dados.conforme ? 'Documento conforme' : 'Marcar como conforme'}
                                </span>
                              </label>
                            </div>
                          )}

                          {dados.status === 'Não Aplicável' && (
                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                              <XCircle className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-xs text-gray-500">Não aplicável para este fornecedor</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* ── MODO VISUALIZAÇÃO: DOCUMENTOS ── */
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50/60">
                          <th className="text-left py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Documento</th>
                          <th className="text-center py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Status</th>
                          <th className="text-center py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Conforme</th>
                          <th className="text-center py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Anexo</th>
                          <th className="text-center py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Validade</th>
                          <th className="text-left py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Observação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {Object.entries(fornecedor.homologacao!.analiseDocumental).map(([doc, dados]) => {
                          const dias = diasAteVencimento(dados.dataValidade);
                          const isVencido = dias !== null && dias < 0;
                          const isAVencer = dias !== null && dias >= 0 && dias <= 30;
                          return (
                            <tr key={doc} className={`hover:bg-gray-50/50 transition-colors ${isVencido ? 'bg-red-50/30' : isAVencer ? 'bg-amber-50/20' : ''}`}>
                              <td className="py-3 px-4"><span className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{doc}</span></td>
                              <td className="py-3 px-4 text-center">
                                <Badge className={`text-xs border ${dados.status === 'Aplicável' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{dados.status}</Badge>
                              </td>
                              <td className="py-3 px-4 text-center">
                                {dados.status === 'Aplicável' ? (dados.conforme ? <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" /> : <XCircle className="w-5 h-5 text-gray-300 mx-auto" />) : <span className="text-xs text-gray-400">—</span>}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {dados.nomeArquivo ? (
                                  <button
                                    onClick={() => {
                                      const blob = new Blob(['Conteúdo simulado do documento'], { type: 'application/octet-stream' });
                                      const url = URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = dados.nomeArquivo || 'documento';
                                      a.click();
                                      URL.revokeObjectURL(url);
                                    }}
                                    className="inline-flex items-center gap-1 hover:underline cursor-pointer group"
                                    title={`Abrir ${dados.nomeArquivo}`}
                                  >
                                    <Paperclip className="w-3.5 h-3.5 text-blue-500 group-hover:text-blue-700" />
                                    <span className="text-xs text-blue-600 group-hover:text-blue-800 truncate max-w-[120px]">{dados.nomeArquivo}</span>
                                  </button>
                                ) : <span className="text-xs text-gray-400">—</span>}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {dados.dataValidade ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-xs text-gray-600">{formatarDataPtBr(dados.dataValidade)}</span>
                                    {isVencido && <span className="inline-flex items-center gap-0.5 text-xs text-red-600" style={{ fontWeight: 500 }}><AlertTriangle className="w-3 h-3" /> Vencido</span>}
                                    {isAVencer && <span className="inline-flex items-center gap-0.5 text-xs text-amber-600" style={{ fontWeight: 500 }}><Clock className="w-3 h-3" /> {dias}d</span>}
                                  </div>
                                ) : <span className="text-xs text-gray-400">—</span>}
                              </td>
                              <td className="py-3 px-4"><span className="text-xs text-gray-500">{dados.observacao || '—'}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ══════ IQF — ÍNDICE DE QUALIDADE ══════ */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-gray-400" />
            <h3 className="text-gray-900" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              IQF — Índice de Qualidade do Fornecedor
            </h3>
            {iqf && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs ${getIQFColor(iqf.score).bg} ${getIQFColor(iqf.score).text} ${getIQFColor(iqf.score).border}`} style={{ fontWeight: 600 }}>
                {getIQFColor(iqf.score).label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-gray-400" />
            <select
              value={String(anoIQF)}
              onChange={e => setAnoIQF(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
              style={{ fontWeight: 500 }}
            >
              <option value="todos">Todos os anos</option>
              {anosDisponiveis.map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
          </div>
        </div>

        {!iqf ? (
          <div className="text-center py-8">
            <Award className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Sem dados suficientes para calcular o IQF{anoIQF !== 'todos' ? ` em ${anoIQF}` : ''}.</p>
          </div>
        ) : (
          <>

          <div className="flex items-start gap-8">
            {/* Gauge grande */}
            <div className="flex flex-col items-center flex-shrink-0">
              <svg width="120" height="72" viewBox="0 0 120 72">
                <path d="M 10 62 A 50 50 0 0 1 110 62" fill="none" stroke="#e5e7eb" strokeWidth="10" strokeLinecap="round" />
                <path d="M 10 62 A 50 50 0 0 1 110 62" fill="none" stroke={getIQFGaugeColor(iqf.score)} strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${Math.PI * 50}`} strokeDashoffset={`${Math.PI * 50 - (iqf.score / 100) * Math.PI * 50}`}
                  className="transition-all duration-700" />
                <text x="60" y="56" textAnchor="middle" style={{ fontSize: '24px', fontWeight: 700 }} fill="#111827">
                  {iqf.score}
                </text>
              </svg>
              <span className="text-xs text-gray-400 mt-1">de 100 pontos</span>
            </div>

            {/* Barras de cada dimensão */}
            <div className="flex-1 grid grid-cols-3 gap-x-6 gap-y-3">
              {/* Avaliações */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500" style={{ fontWeight: 500 }}>Avaliações (50%)</span>
                  <span className="text-xs text-gray-900" style={{ fontWeight: 600 }}>{iqf.detalhes.notaScore}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${iqf.detalhes.notaScore >= 80 ? 'bg-emerald-500' : iqf.detalhes.notaScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${iqf.detalhes.notaScore}%` }} />
                </div>
                <span className="text-[11px] text-gray-400">
                  {iqf.detalhes.totalAvaliacoes} avaliação(ões) • Meta: {iqf.detalhes.meta.toFixed(1)}
                </span>
              </div>

              {/* Conformidade Documental */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500" style={{ fontWeight: 500 }}>Conformidade Doc. (25%)</span>
                  <span className="text-xs text-gray-900" style={{ fontWeight: 600 }}>{iqf.detalhes.conformidadeScore}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${iqf.detalhes.conformidadeScore >= 80 ? 'bg-emerald-500' : iqf.detalhes.conformidadeScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${iqf.detalhes.conformidadeScore}%` }} />
                </div>
                <span className="text-[11px] text-gray-400">{iqf.detalhes.totalConformes}/{iqf.detalhes.totalAplicaveis} conformes</span>
              </div>

              {/* Ocorrências */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500" style={{ fontWeight: 500 }}>Ocorrências (25%)</span>
                  <span className="text-xs text-gray-900" style={{ fontWeight: 600 }}>{iqf.detalhes.ocorrenciaScore}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${iqf.detalhes.ocorrenciaScore >= 80 ? 'bg-emerald-500' : iqf.detalhes.ocorrenciaScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${iqf.detalhes.ocorrenciaScore}%` }} />
                </div>
                <span className="text-[11px] text-gray-400">{iqf.detalhes.rofsAbertas} abertas / {iqf.detalhes.rofsTotal} total</span>
              </div>

              {/* Pontualidade de Entrega (somente se tem recebimentos) */}
              {iqf.detalhes.recebimentosTotal > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500" style={{ fontWeight: 500 }}>Pontualidade (15%)</span>
                    <span className="text-xs text-gray-900" style={{ fontWeight: 600 }}>{iqf.detalhes.pontualidadeScore}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${iqf.detalhes.pontualidadeScore >= 80 ? 'bg-emerald-500' : iqf.detalhes.pontualidadeScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${iqf.detalhes.pontualidadeScore}%` }} />
                  </div>
                  <span className="text-[11px] text-gray-400">{iqf.detalhes.recebimentosNoPrazo}/{iqf.detalhes.recebimentosTotal} no prazo</span>
                </div>
              )}

              {/* Qualidade de Recebimento (somente se tem recebimentos) */}
              {iqf.detalhes.recebimentosTotal > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500" style={{ fontWeight: 500 }}>Qualidade Receb. (10%)</span>
                    <span className="text-xs text-gray-900" style={{ fontWeight: 600 }}>{iqf.detalhes.qualidadeRecScore}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${iqf.detalhes.qualidadeRecScore >= 80 ? 'bg-emerald-500' : iqf.detalhes.qualidadeRecScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${iqf.detalhes.qualidadeRecScore}%` }} />
                  </div>
                  <span className="text-[11px] text-gray-400">{iqf.detalhes.recebimentosAprovados}/{iqf.detalhes.recebimentosTotal} aprovados</span>
                </div>
              )}
            </div>
          </div>

          {/* Fórmula de cálculo - disclosure pattern */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={() => setMostrarFormulaIQF(prev => !prev)}
              className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
              style={{ fontWeight: 500 }}
            >
              <Info className="w-3 h-3" />
              Como é calculado?
              {mostrarFormulaIQF ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {mostrarFormulaIQF && (
              <p className="mt-2 text-[11px] text-gray-400 pl-5" style={{ lineHeight: 1.6 }}>
                IQF = (Nota média ÷ Meta) × 50% + (Docs conformes ÷ Docs aplicáveis) × 25% + (100 − penalidades ROFs) × 25%.
                Penalidades por ROF aberta: Alta −25, Média −15, Baixa −8; concluída −3. Atingimento de nota limitado a 100%.
              </p>
            )}
          </div>
        </>
        )}
      </div>

      {/* ══════ RESUMO GERAL ══════ */}
      <div className="mt-3 bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-4 gap-4">
          {/* Nota Média */}
          <div className="relative p-4 bg-gray-50 rounded-lg border-l-[3px] border-l-amber-400 overflow-hidden">
            <p className="text-[11px] text-gray-400 mb-1" style={{ fontWeight: 500 }}>Nota Média</p>
            {fornecedor.notaMedia !== undefined ? (
              <div className="flex items-end gap-2">
                <span className="text-2xl text-gray-900" style={{ fontWeight: 700, lineHeight: 1 }}>{fornecedor.notaMedia.toFixed(1)}</span>
                <StarRating nota={fornecedor.notaMedia} />
              </div>
            ) : (
              <span className="text-sm text-gray-400">Sem avaliações</span>
            )}
          </div>

          {/* Avaliações */}
          <div className="relative p-4 bg-gray-50 rounded-lg border-l-[3px] border-l-blue-400 overflow-hidden">
            <p className="text-[11px] text-gray-400 mb-1" style={{ fontWeight: 500 }}>Total de Avaliações</p>
            <span className="text-2xl text-gray-900" style={{ fontWeight: 700, lineHeight: 1 }}>{avaliacoes.length}</span>
          </div>

          {/* ROFs Abertas */}
          <div className={`relative p-4 bg-gray-50 rounded-lg border-l-[3px] overflow-hidden ${rofsAbertas > 0 ? 'border-l-amber-400' : 'border-l-emerald-400'}`}>
            <p className="text-[11px] text-gray-400 mb-1" style={{ fontWeight: 500 }}>ROFs Abertas</p>
            <span className={`text-2xl ${rofsAbertas > 0 ? 'text-amber-600' : 'text-gray-900'}`} style={{ fontWeight: 700, lineHeight: 1 }}>{rofsAbertas}</span>
            {rofs.length > 0 && <span className="text-xs text-gray-400 ml-1.5">/ {rofs.length} total</span>}
          </div>

          {/* Próxima Avaliação */}
          <div className="relative p-4 bg-gray-50 rounded-lg border-l-[3px] border-l-gray-300 overflow-hidden">
            <p className="text-[11px] text-gray-400 mb-1" style={{ fontWeight: 500 }}>Próxima Avaliação</p>
            {fornecedor.proximaAvaliacao ? (
              <span className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{formatarDataPtBr(fornecedor.proximaAvaliacao)}</span>
            ) : (
              <span className="text-sm text-gray-400">Não agendada</span>
            )}
          </div>
        </div>
      </div>

      {/* ══════ AVALIAÇÕES RECENTES ══════ */}
      {avaliacoes.length > 0 && (
        <div className="mt-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-gray-900 flex items-center gap-2" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              <Award className="w-4 h-4 text-gray-400" />
              Histórico de Avaliações
            </h3>
            <div className="flex items-center gap-3">
              {avaliacoes.length > 5 && (
                <button
                  onClick={() => navigate('/fornecedores/avaliacoes')}
                  className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  Ver todos ({avaliacoes.length})
                </button>
              )}
              <span className="text-xs text-gray-400">{avaliacoes.length} avaliação(ões)</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/60">
                  <th className="text-left py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Data</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Qualidade</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Prazo</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Atendimento</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Conformidade</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Nota Final</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {avaliacoes.slice().reverse().slice(0, 5).map(av => (
                  <tr key={av.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-700">{formatarDataPtBr(av.data)}</td>
                    {[av.criterios.qualidade, av.criterios.prazo, av.criterios.atendimento, av.criterios.conformidadeDocumental].map((nota, i) => (
                      <td key={i} className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm ${
                          nota >= 4 ? 'bg-emerald-50 text-emerald-700' : nota >= 3 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                        }`} style={{ fontWeight: 600 }}>
                          {nota}
                        </span>
                      </td>
                    ))}
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs border ${av.notaFinal >= 4 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : av.notaFinal >= 3 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`} style={{ fontWeight: 600 }}>{av.notaFinal.toFixed(1)}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">{av.responsavel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════ ROFS ══════ */}
      {rofs.length > 0 && (
        <div className="mt-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-gray-900 flex items-center gap-2" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              <ClipboardList className="w-4 h-4 text-gray-400" />
              Registros de Ocorrências (ROFs)
            </h3>
            <div className="flex items-center gap-3">
              {rofs.length > 5 && (
                <button
                  onClick={() => navigate('/fornecedores/rof')}
                  className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  Ver todos ({rofs.length})
                </button>
              )}
              <span className="text-xs text-gray-400">{rofs.length} registro(s)</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/60">
                  <th className="text-left py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Número</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Tipo</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Gravidade</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Status</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Descrição</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rofs.slice().reverse().slice(0, 5).map(rof => (
                  <tr key={rof.id} className={`hover:bg-gray-50/50 transition-colors ${rof.gravidade === 'Alta' && (rof.status === 'Aberta' || rof.status === 'Em Tratamento') ? 'bg-red-50/30' : ''}`}>
                    <td className="py-3 px-4 text-sm text-gray-900 font-mono" style={{ fontWeight: 500 }}>{rof.numero}</td>
                    <td className="py-3 px-4 text-center"><Badge className="bg-gray-100 text-gray-600 border border-gray-200 text-xs">{rof.tipo}</Badge></td>
                    <td className="py-3 px-4 text-center">
                      <Badge className={`text-xs border ${rof.gravidade === 'Alta' ? 'bg-red-50 text-red-700 border-red-200' : rof.gravidade === 'Média' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{rof.gravidade}</Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge className={`text-xs border ${rof.status === 'Concluída' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : rof.status === 'Cancelada' ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{rof.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 max-w-[200px] truncate">{rof.descricao}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{formatarDataPtBr(rof.dataAbertura)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
           SEÇÃO 5: HISTÓRICO DE BLOQUEIOS/DESBLOQUEIOS
         ══════════════════════════════════════════════════════ */}
      {fornecedor.historicoBloqueios && fornecedor.historicoBloqueios.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-gray-900 flex items-center gap-2" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              <Ban className="w-4 h-4 text-gray-400" />
              Histórico de Bloqueios / Desbloqueios
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-red-50 text-red-700 border border-red-200" style={{ fontWeight: 600 }}>
                  <Lock className="w-3 h-3" />
                  {fornecedor.historicoBloqueios.filter(r => r.acao === 'Bloqueio').length}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-emerald-50 text-emerald-700 border border-emerald-200" style={{ fontWeight: 600 }}>
                  <ShieldCheck className="w-3 h-3" />
                  {fornecedor.historicoBloqueios.filter(r => r.acao === 'Desbloqueio').length}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {fornecedor.historicoBloqueios.length} registro(s)
              </span>
            </div>
          </div>

          <div className="p-5">
            <div className="relative">
              {/* Linha vertical da timeline */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />

              <div className="space-y-4">
                {[...fornecedor.historicoBloqueios].reverse().map((registro, idx) => {
                  const isBloqueio = registro.acao === 'Bloqueio';
                  return (
                    <div key={idx} className="relative pl-10">
                      {/* Ícone na timeline */}
                      <div className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                        isBloqueio
                          ? 'bg-red-50 border-red-200'
                          : 'bg-emerald-50 border-emerald-200'
                      }`}>
                        {isBloqueio
                          ? <Lock className="w-3.5 h-3.5 text-red-600" />
                          : <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        }
                      </div>

                      {/* Card do registro */}
                      <div className={`rounded-xl p-4 border transition-all ${
                        isBloqueio
                          ? 'bg-red-50/40 border-red-200 hover:border-red-300'
                          : 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-xs border ${
                              isBloqueio
                                ? 'bg-red-100 text-red-700 border-red-200'
                                : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`} style={{ fontWeight: 600 }}>
                              {registro.acao}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(registro.data).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <User className="w-3 h-3" />
                            <span style={{ fontWeight: 500 }}>{registro.responsavel}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700" style={{ lineHeight: 1.6 }}>
                          {registro.motivo}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
