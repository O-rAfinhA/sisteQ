import {
  Save,
  ArrowLeft,
  Send,
  CheckCircle,
  XCircle,
  FileText,
  Upload,
  X,
  Clock,
  User,
  Calendar,
  Building2,
  FileEdit,
  AlertCircle,
  Paperclip,
  Eye,
  Ban,
  History,
  ShieldCheck,
  ArrowLeftCircle,
  AlertTriangle,
  RefreshCcw
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { TipoDocumento } from './config/TiposDocumentos';
import { DocumentoInterno, HistoricoVersao, LogAuditoria } from './DocumentosInternos';
import { useProcessos } from '../hooks/useProcessos';
import { LogAuditoriaModal } from '../components/documentos/LogAuditoriaModal';
import { ModalDescricaoAlteracoes } from '../components/documentos/ModalDescricaoAlteracoes';
import { TiptapEditor } from '../components/documentos/TiptapEditor';
import { formatarDataPtBr, dataHojeISO, formatarTamanhoArquivo } from '../utils/formatters';
import { generateId, getFromStorage } from '../utils/helpers';

// v2.3 - Implementado campo de descrição de alterações para nova revisão

const STORAGE_KEY = 'sisteq-docs-internos';
const TIPOS_STORAGE = 'sisteq-tipos-docs-internos';
const USUARIOS_STORAGE = 'usuarios';
const DEPARTAMENTOS_STORAGE = 'departamentos';

interface Usuario {
  id: string;
  nome: string;
}

const WorkflowSteps = ({ status }: { status: string }) => {
  const steps = [
    { label: 'Elaboração', active: ['Rascunho', 'Em Revisão'].includes(status) },
    { label: 'Aprovação', active: status === 'Em Aprovação' },
    { label: 'Vigente', active: status === 'Vigente' },
  ];

  // Se estiver reprovado ou obsoleto, não encaixa no fluxo linear padrão, tratamos visualmente diferente
  if (['Reprovado', 'Obsoleto'].includes(status)) {
    return (
      <div className="w-full bg-gray-100 p-2 rounded-lg flex items-center justify-center gap-2 text-gray-500">
        <Ban className="w-4 h-4" />
        <span className="font-medium text-sm">Ciclo encerrado: {status}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center w-full max-w-xl mx-auto">
      {steps.map((step, idx) => {
        // Lógica visual:
        // Passo atual: Azul forte
        // Passos anteriores (concluídos): Verde (ou azul se for fluxo simples)
        // Passos futuros: Cinza
        
        let colorClass = "bg-gray-200 text-gray-500";
        let icon = <span className="text-xs font-bold">{idx + 1}</span>;

        // Simplificação: vamos considerar "active" como o estado atual
        if (step.active) {
          colorClass = "bg-blue-600 text-white ring-4 ring-blue-100";
        } else {
           // Se o status é Vigente, Elaboração e Aprovação já passaram?
           if (status === 'Vigente' && idx < 2) colorClass = "bg-green-500 text-white";
           if (status === 'Em Aprovação' && idx < 1) colorClass = "bg-green-500 text-white";
        }
        
        // Ícones específicos
        if (colorClass.includes("bg-green")) icon = <CheckCircle className="w-4 h-4" />;
        
        return (
          <div key={idx} className="flex items-center flex-1 last:flex-none">
            <div className={`flex flex-col items-center gap-2 relative z-10`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${colorClass}`}>
                {icon}
              </div>
              <span className={`text-xs font-medium ${step.active ? 'text-blue-700' : 'text-gray-500'}`}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 bg-gray-200 relative -top-3">
                <div 
                  className="h-full bg-green-500 transition-all duration-500" 
                  style={{ width: (status === 'Vigente' && idx < 2) || (status === 'Em Aprovação' && idx < 1) ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default function DocumentoInternoEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { processos } = useProcessos();
  const isEditMode = !!id;

  const [tiposDocumentos, setTiposDocumentos] = useState<TipoDocumento[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [departamentos, setDepartamentos] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<Partial<DocumentoInterno>>({
    tipoId: '',
    nome: '',
    descricao: '',
    departamento: '',
    responsavel: '',
    processoRelacionado: '',
    versao: '1.0',
    status: 'Rascunho',
    dataEmissao: dataHojeISO(),
    dataValidade: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    conteudoHtml: '',
    historico: [],
    logsAuditoria: [],
    dataCriacao: new Date().toISOString(),
    dataAtualizacao: new Date().toISOString()
  });

  const [conteudoHtml, setConteudoHtml] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [modoEdicao, setModoEdicao] = useState<'editor' | 'anexo'>('editor');
  const [showAprovacao, setShowAprovacao] = useState(false);
  const [aprovadorSelecionado, setAprovadorSelecionado] = useState('');
  const [comentarioAprovacao, setComentarioAprovacao] = useState('');
  const [showLogAuditoria, setShowLogAuditoria] = useState(false);
  const [showModalDescricaoAlteracoes, setShowModalDescricaoAlteracoes] = useState(false);
  const [acaoModalDescricao, setAcaoModalDescricao] = useState<'salvar' | 'novaRevisao'>('salvar');

  // Controle de edição baseado no status
  const canEdit = ['Rascunho', 'Em Revisão'].includes(formData.status || 'Rascunho');

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (isEditMode && tiposDocumentos.length > 0) {
      carregarDocumento();
    }
  }, [id, tiposDocumentos]);

  const carregarDados = () => {
    setTiposDocumentos(getFromStorage<TipoDocumento[]>(TIPOS_STORAGE, []));
    setUsuarios(getFromStorage<Usuario[]>(USUARIOS_STORAGE, []));
    setDepartamentos(getFromStorage<any[]>(DEPARTAMENTOS_STORAGE, []).map((d: any) => d.nome));
  };

  const carregarDocumento = () => {
    const docs = getFromStorage<DocumentoInterno[]>(STORAGE_KEY, []);
    const doc = docs.find(d => d.id === id);
    if (doc) {
      setFormData(doc);
      setConteudoHtml(doc.conteudoHtml || '');
      if (doc.tipoId) {
        const tipo = tiposDocumentos.find(t => t.id === doc.tipoId);
        if (tipo) setModoEdicao(tipo.modo);
      }
    }
  };

  const handleTipoChange = (tipoId: string) => {
    if (!canEdit) return;
    const tipo = tiposDocumentos.find(t => t.id === tipoId);
    if (tipo) {
      setFormData(prev => ({ ...prev, tipoId }));
      setModoEdicao(tipo.modo);
      if (!isEditMode && tipo.templateHtml) {
        setConteudoHtml(tipo.templateHtml);
        toast.success('Template carregado!');
      }
    }
  };

  const handleArquivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) return;
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 10MB.');
        return;
      }
      setArquivo(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          arquivoNome: file.name,
          arquivoTipo: file.type,
          arquivoBase64: event.target?.result as string,
          arquivoTamanho: file.size
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const gerarNovoCodigo = (): string => {
    if (!formData.tipoId) return 'DOC-001';
    const tipo = tiposDocumentos.find(t => t.id === formData.tipoId);
    if (!tipo || !tipo.prefixoCodigo) return 'DOC-001';

    const docs = getFromStorage<DocumentoInterno[]>(STORAGE_KEY, []);
    const docsDoMesmoTipo = docs.filter(doc => doc.tipoId === formData.tipoId);
    
    const maxNum = docsDoMesmoTipo.reduce((max, doc) => {
      const parts = doc.codigo.split('-');
      const num = parseInt(parts[parts.length - 1]) || 0;
      return num > max ? num : max;
    }, 0);
    
    return `${tipo.prefixoCodigo}${String(maxNum + 1).padStart(3, '0')}`;
  };

  const registrarLog = (
    acao: LogAuditoria['acao'],
    statusAnterior: string | undefined,
    statusNovo: string,
    responsavel: string,
    comentario?: string
  ): LogAuditoria => {
    return {
      id: generateId('log-'),
      dataHora: new Date().toISOString(),
      acao,
      responsavel,
      statusAnterior,
      statusNovo,
      comentario,
      versao: formData.versao
    };
  };

  // --- ACTIONS DO WORKFLOW ---

  const handleEnviarAprovacao = () => {
    if (!aprovadorSelecionado) {
      toast.error('Selecione um aprovador');
      return;
    }

    // Primeiro validar os campos obrigatórios
    if (!formData.tipoId || !formData.nome || !formData.departamento || !formData.responsavel) {
      toast.error('Preencha todos os campos obrigatórios antes de enviar para aprovação');
      return;
    }

    if (modoEdicao === 'anexo' && !formData.arquivoBase64 && !isEditMode && !formData.arquivoNome) {
      toast.error('Anexe um arquivo antes de enviar para aprovação');
      return;
    }

    const log = registrarLog(
      'Envio para Aprovação',
      formData.status,
      'Em Aprovação',
      formData.responsavel || 'Sistema',
      `Enviado para aprovação de ${aprovadorSelecionado}`
    );

    const updated: DocumentoInterno = {
      ...(formData as DocumentoInterno),
      id: formData.id || generateId('di-'),
      codigo: formData.codigo || gerarNovoCodigo(),
      conteudoHtml: modoEdicao === 'editor' ? conteudoHtml : undefined,
      status: 'Em Aprovação',
      aprovacao: {
        aprovadorSolicitado: aprovadorSelecionado,
        dataEnvioAprovacao: new Date().toISOString()
      },
      logsAuditoria: [...(formData.logsAuditoria || []), log],
      dataAtualizacao: new Date().toISOString()
    };

    salvarDocumento(updated);
    setFormData(updated);
    toast.success('Documento enviado para aprovação!');
    setShowAprovacao(false);
    navigate('/documentos/internos');
  };

  const handleAprovar = () => {
    if (!formData.aprovacao?.aprovadorSolicitado) return;

    // Lógica revisada: Aprovação torna o documento vigente.
    // NÃO movemos para o histórico ainda. O histórico é para versões passadas/arquivadas.
    // O documento atual (Vigente) é o "Live".

    const log = registrarLog(
      'Aprovação',
      formData.status,
      'Vigente',
      formData.aprovacao.aprovadorSolicitado,
      comentarioAprovacao || 'Documento aprovado'
    );

    const updated: DocumentoInterno = {
      ...(formData as DocumentoInterno),
      status: 'Vigente',
      aprovacao: {
        ...formData.aprovacao,
        aprovadorResponsavel: formData.aprovacao.aprovadorSolicitado,
        dataAprovacao: new Date().toISOString(),
        comentarioAprovacao
      },
      // historico: mantemos o que tem, não adicionamos a versão atual ainda
      logsAuditoria: [...(formData.logsAuditoria || []), log]
    };

    salvarDocumento(updated);
    toast.success('Documento aprovado e vigente!');
    setComentarioAprovacao('');
    navigate('/documentos/internos');
  };

  const handleRejeitar = () => {
    if (!comentarioAprovacao) {
      toast.error('Adicione um comentário explicando a rejeição');
      return;
    }

    const log = registrarLog(
      'Reprovação',
      formData.status,
      'Reprovado',
      formData.aprovacao?.aprovadorSolicitado || 'Sistema',
      comentarioAprovacao
    );

    const updated: DocumentoInterno = {
      ...(formData as DocumentoInterno),
      status: 'Reprovado',
      aprovacao: {
        ...formData.aprovacao,
        aprovadorResponsavel: formData.aprovacao?.aprovadorSolicitado,
        dataAprovacao: new Date().toISOString(),
        comentarioAprovacao
      },
      logsAuditoria: [...(formData.logsAuditoria || []), log]
    };

    salvarDocumento(updated);
    toast.error('Documento rejeitado');
    setComentarioAprovacao('');
    navigate('/documentos/internos');
  };

  const handleDevolverRevisao = () => {
    if (!comentarioAprovacao) {
      toast.error('Adicione um comentário explicando o ajuste necessário');
      return;
    }

    // Retorna para o status 'Em Revisão', permitindo edição
    const log = registrarLog(
      'Devolução para Revisão',
      formData.status,
      'Em Revisão',
      formData.aprovacao?.aprovadorSolicitado || 'Sistema',
      comentarioAprovacao
    );

    const updated: DocumentoInterno = {
      ...(formData as DocumentoInterno),
      status: 'Em Revisão',
      aprovacao: {
        ...formData.aprovacao,
        aprovadorResponsavel: formData.aprovacao?.aprovadorSolicitado,
        dataAprovacao: new Date().toISOString(),
        comentarioAprovacao: `[Devolvido para Ajuste] ${comentarioAprovacao}`
      },
      logsAuditoria: [...(formData.logsAuditoria || []), log]
    };

    salvarDocumento(updated);
    toast.info('Documento devolvido para ajustes');
    setComentarioAprovacao('');
    navigate('/documentos/internos');
  };

  const handleNovaRevisao = () => {
    if (!confirm('Deseja iniciar uma nova revisão (nova versão)? A versão atual será arquivada no histórico.')) {
      return;
    }

    // Solicitar descrição das alterações antes de arquivar
    setAcaoModalDescricao('novaRevisao');
    setShowModalDescricaoAlteracoes(true);
  };

  const handleNovaRevisaoComDescricao = (descricao: string) => {
    // 1. Arquivar versão atual (Vigente) no histórico COM a descrição fornecida
    const versaoArquivada: HistoricoVersao = {
      versao: formData.versao || '1.0',
      data: formData.aprovacao?.dataAprovacao || new Date().toISOString(),
      responsavel: formData.aprovacao?.aprovadorResponsavel || formData.responsavel || 'Sistema',
      alteracoes: descricao, // USAR A DESCRIÇÃO DO REVISOR
      status: 'Obsoleto' // Versões no histórico são obsoletas em relação à nova
    };

    // 2. Incrementar versão
    const novaVersaoNum = incrementarVersao(formData.versao || '1.0');

    // 3. Criar log com a descrição
    const log = registrarLog(
      'Mudança de Status',
      formData.status,
      'Rascunho',
      formData.responsavel || 'Sistema',
      `Iniciada nova versão ${novaVersaoNum}. Motivo: ${descricao}`
    );

    // 4. Resetar status para Rascunho e limpar aprovações
    const updated: DocumentoInterno = {
      ...(formData as DocumentoInterno),
      versao: novaVersaoNum,
      status: 'Rascunho',
      dataEmissao: dataHojeISO(),
      aprovacao: undefined,
      historico: [versaoArquivada, ...(formData.historico || [])], // Adiciona a arquivada no topo
      logsAuditoria: [...(formData.logsAuditoria || []), log],
      dataAtualizacao: new Date().toISOString()
    };

    setFormData(updated);
    salvarDocumento(updated);
    setShowModalDescricaoAlteracoes(false);
    toast.success(`Nova versão ${novaVersaoNum} iniciada!`);
  };

  const handleReiniciar = () => {
     if (!confirm('Deseja reiniciar a edição deste documento reprovado?')) return;

     const log = registrarLog(
      'Mudança de Status',
      formData.status,
      'Rascunho',
      formData.responsavel || 'Sistema',
      'Reiniciada edição após reprovação'
    );

    const updated: DocumentoInterno = {
      ...(formData as DocumentoInterno),
      status: 'Rascunho',
      logsAuditoria: [...(formData.logsAuditoria || []), log]
    };

    setFormData(updated);
    salvarDocumento(updated);
    toast.success('Documento reiniciado para edição');
  };

  const incrementarVersao = (versaoAtual: string): string => {
    const parts = versaoAtual.split('.');
    const maior = parseInt(parts[0]) || 1;
    return `${maior + 1}.0`;
  };

  const salvarDocumento = (docToSave?: DocumentoInterno) => {
    const docs = getFromStorage<DocumentoInterno[]>(STORAGE_KEY, []);

    const documento = docToSave || {
      ...(formData as DocumentoInterno),
      id: formData.id || generateId('di-'),
      codigo: formData.codigo || gerarNovoCodigo(),
      conteudoHtml: modoEdicao === 'editor' ? conteudoHtml : undefined,
      dataAtualizacao: new Date().toISOString()
    };

    if (isEditMode) {
      const index = docs.findIndex(d => d.id === id);
      if (index !== -1) docs[index] = documento;
    } else {
      docs.push(documento);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    
    if (!docToSave) {
      toast.success('Documento salvo com sucesso!');
      navigate('/documentos/internos');
    }
  };

  const handleSalvar = () => {
    if (!formData.tipoId || !formData.nome || !formData.departamento || !formData.responsavel) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (modoEdicao === 'anexo' && !formData.arquivoBase64 && !isEditMode && !formData.arquivoNome) {
      toast.error('Anexe um arquivo');
      return;
    }
    
    // Se está em revisão (após devolução), solicitar descrição das alterações
    if (formData.status === 'Em Revisão' && isEditMode) {
      setShowModalDescricaoAlteracoes(true);
      setAcaoModalDescricao('salvar');
      return;
    }
    
    salvarDocumento();
  };

  const handleConfirmarAlteracoes = (descricao: string) => {
    // Criar log de edição com a descrição
    const log = registrarLog(
      'Edição',
      formData.status,
      'Em Revisão',
      formData.responsavel || 'Sistema',
      descricao
    );

    const updated: DocumentoInterno = {
      ...(formData as DocumentoInterno),
      id: formData.id || generateId('di-'),
      codigo: formData.codigo || gerarNovoCodigo(),
      conteudoHtml: modoEdicao === 'editor' ? conteudoHtml : undefined,
      dataAtualizacao: new Date().toISOString(),
      logsAuditoria: [...(formData.logsAuditoria || []), log]
    };

    salvarDocumento(updated);
    setShowModalDescricaoAlteracoes(false);
  };

  // --- RENDER ---

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header Fixo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/documentos/internos')}>
            <ArrowLeftCircle className="w-6 h-6 text-gray-500" />
          </Button>
          <div>
            <h1 className="text-gray-900 tracking-tight flex items-center gap-2" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
              {isEditMode ? `Editando: ${formData.nome}` : 'Novo Documento Interno'}
              {formData.versao && <Badge variant="secondary">v{formData.versao}</Badge>}
            </h1>
            <p className="text-sm text-gray-500">
              {formData.codigo || 'Novo Registro'} • {formData.status}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/documentos/internos')}>
            Cancelar
          </Button>
          {canEdit && (
            <Button onClick={handleSalvar} variant="black">
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          )}
        </div>
      </div>

      <WorkflowSteps status={formData.status || 'Rascunho'} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna Esquerda: Informações e Workflow */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Card de Status/Ação (Highlight) */}
          <Card className={`border-l-4 shadow-sm ${
            formData.status === 'Vigente' ? 'border-l-green-500 bg-green-50/50' :
            formData.status === 'Em Aprovação' ? 'border-l-orange-500 bg-orange-50/50' :
            formData.status === 'Reprovado' ? 'border-l-red-500 bg-red-50/50' :
            'border-l-blue-500 bg-white'
          }`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2" style={{ fontWeight: 600 }}>
                {formData.status === 'Vigente' && <ShieldCheck className="w-5 h-5 text-green-600" />}
                {formData.status === 'Em Aprovação' && <Clock className="w-5 h-5 text-orange-600" />}
                {formData.status === 'Rascunho' && <FileEdit className="w-5 h-5 text-blue-600" />}
                Estado Atual: {formData.status}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Botões de Ação do Workflow */}
                {formData.status === 'Rascunho' && (
                  <Button onClick={() => setShowAprovacao(true)} className="w-full gap-2" variant="default">
                    <Send className="w-4 h-4" /> Enviar para Aprovação
                  </Button>
                )}
                {formData.status === 'Em Revisão' && (
                  <Button onClick={() => setShowAprovacao(true)} className="w-full gap-2" variant="default">
                    <Send className="w-4 h-4" /> Reenviar para Aprovação
                  </Button>
                )}
                
                {formData.status === 'Em Aprovação' && (
                  <div className="flex flex-col gap-2">
                    <div className="p-3 bg-white rounded border text-sm text-gray-600 mb-2">
                      <p><strong>Aprovador:</strong> {formData.aprovacao?.aprovadorSolicitado}</p>
                      <p><strong>Enviado em:</strong> {formatarDataPtBr(formData.aprovacao?.dataEnvioAprovacao || '')}</p>
                    </div>
                    <Button onClick={handleAprovar} className="w-full bg-green-600 hover:bg-green-700 gap-2">
                      <CheckCircle className="w-4 h-4" /> Aprovar Documento
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={handleDevolverRevisao} variant="outline" className="text-yellow-700 border-yellow-200 hover:bg-yellow-50">
                        <ArrowLeftCircle className="w-4 h-4 mr-1" /> Ajustar
                      </Button>
                      <Button onClick={handleRejeitar} variant="outline" className="text-red-700 border-red-200 hover:bg-red-50">
                        <XCircle className="w-4 h-4 mr-1" /> Rejeitar
                      </Button>
                    </div>
                    <textarea
                      value={comentarioAprovacao}
                      onChange={(e) => setComentarioAprovacao(e.target.value)}
                      placeholder="Comentário obrigatório para ajuste ou rejeição..."
                      className="w-full text-sm p-2 border rounded mt-2"
                      rows={2}
                    />
                  </div>
                )}

                {formData.status === 'Vigente' && (
                  <Button onClick={handleNovaRevisao} className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
                    <RefreshCcw className="w-4 h-4" /> Iniciar Nova Revisão (v{incrementarVersao(formData.versao || '1.0')})
                  </Button>
                )}

                {formData.status === 'Reprovado' && (
                   <Button onClick={handleReiniciar} variant="outline" className="w-full gap-2">
                     <RefreshCcw className="w-4 h-4" /> Reiniciar Edição
                   </Button>
                )}
              </div>

              {/* Modal Inline de Envio */}
              {showAprovacao && (
                <div className="mt-4 pt-4 border-t border-gray-200 animate-in fade-in zoom-in-95 duration-200">
                  <label className="text-xs text-gray-500 mb-1 block" style={{ fontWeight: 500 }}>Selecione o Aprovador</label>
                  <select
                    value={aprovadorSelecionado}
                    onChange={(e) => setAprovadorSelecionado(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm mb-3"
                  >
                    <option value="">Selecione...</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.nome}>{u.nome}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleEnviarAprovacao} className="flex-1">Confirmar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAprovacao(false)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadados */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500">Nome do Documento</label>
                <Input 
                  value={formData.nome} 
                  onChange={(e) => canEdit && setFormData({ ...formData, nome: e.target.value })}
                  disabled={!canEdit}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500">Tipo</label>
                <select
                  value={formData.tipoId}
                  onChange={(e) => handleTipoChange(e.target.value)}
                  disabled={!canEdit || isEditMode}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-white disabled:bg-gray-100"
                >
                  <option value="">Selecione...</option>
                  {tiposDocumentos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                   <label className="text-xs font-medium text-gray-500">Departamento</label>
                   <select
                    value={formData.departamento}
                    onChange={(e) => canEdit && setFormData({ ...formData, departamento: e.target.value })}
                    disabled={!canEdit}
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-white disabled:bg-gray-100"
                   >
                     <option value="">...</option>
                     {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
                   </select>
                </div>
                <div>
                   <label className="text-xs font-medium text-gray-500">Responsável</label>
                   <select
                    value={formData.responsavel}
                    onChange={(e) => canEdit && setFormData({ ...formData, responsavel: e.target.value })}
                    disabled={!canEdit}
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-white disabled:bg-gray-100"
                   >
                     <option value="">...</option>
                     {usuarios.map(u => <option key={u.id} value={u.nome}>{u.nome}</option>)}
                   </select>
                </div>
              </div>
              
              <div>
                <label className="text-xs font-medium text-gray-500">Processo Vinculado</label>
                <select
                  value={formData.processoRelacionado}
                  onChange={(e) => canEdit && setFormData({ ...formData, processoRelacionado: e.target.value })}
                  disabled={!canEdit}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-white disabled:bg-gray-100"
                >
                  <option value="">Nenhum</option>
                  {processos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.setor}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                   <label className="text-xs font-medium text-gray-500">Data Emissão</label>
                   <Input 
                     type="date"
                     value={formData.dataEmissao} 
                     onChange={(e) => canEdit && setFormData({ ...formData, dataEmissao: e.target.value })}
                     disabled={!canEdit}
                     className="mt-1"
                   />
                </div>
                <div>
                   <label className="text-xs font-medium text-gray-500">Data Validade / Revisão</label>
                   <Input 
                     type="date"
                     value={formData.dataValidade} 
                     onChange={(e) => canEdit && setFormData({ ...formData, dataValidade: e.target.value })}
                     disabled={!canEdit}
                     className="mt-1"
                   />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Histórico */}
          {formData.historico && formData.historico.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2" style={{ fontWeight: 600 }}>
                  <History className="w-4 h-4" /> Histórico de Versões
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 relative">
                  {/* Linha vertical conectora */}
                  <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-100"></div>
                  
                  {formData.historico.map((h, i) => (
                    <div key={i} className="relative pl-6">
                      <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-gray-200 border-2 border-white"></div>
                      <p className="text-sm" style={{ fontWeight: 600 }}>Versão {h.versao}</p>
                      <p className="text-xs text-gray-500">{formatarDataPtBr(h.data)}</p>
                      <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded">{h.alteracoes}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>

        {/* Coluna Direita: Editor */}
        <div className="lg:col-span-2">
          <Card className="h-full min-h-[600px] flex flex-col">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="text-lg flex items-center gap-2">
                 {modoEdicao === 'editor' ? <FileEdit className="w-5 h-5 text-gray-500" /> : <Paperclip className="w-5 h-5 text-gray-500" />}
                 {modoEdicao === 'editor' ? 'Editor de Conteúdo' : 'Arquivo Anexo'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-6">
              {!canEdit && (
                 <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-md flex items-center gap-2 text-sm">
                   <AlertTriangle className="w-4 h-4" />
                   Modo de Leitura: O documento não pode ser editado neste status.
                 </div>
              )}

              {modoEdicao === 'editor' ? (
                <div className={!canEdit ? 'pointer-events-none opacity-90' : ''}>
                  <TiptapEditor
                    content={conteudoHtml}
                    onChange={setConteudoHtml}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {canEdit && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:bg-gray-50 transition-colors">
                      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <label className="cursor-pointer">
                        <span className="text-blue-600 hover:text-blue-700 font-medium text-lg">
                          Clique para selecionar
                        </span>
                        <input type="file" className="hidden" onChange={handleArquivoChange} accept=".pdf,.doc,.docx,.xls,.xlsx" />
                      </label>
                      <p className="text-sm text-gray-500 mt-2">PDF, Word ou Excel (máx. 10MB)</p>
                    </div>
                  )}

                  {formData.arquivoNome ? (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                          <Paperclip className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{formData.arquivoNome}</p>
                          <p className="text-sm text-gray-600">
                            {formData.arquivoTamanho ? formatarTamanhoArquivo(formData.arquivoTamanho) : ''} • {formData.arquivoTipo}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-blue-700 hover:text-blue-800">Baixar</Button>
                    </div>
                  ) : (
                    !canEdit && <p className="text-gray-500 italic text-center py-10">Nenhum arquivo anexado.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer com Log */}
      <div className="mt-12 border-t pt-6 flex justify-between items-center text-gray-400 text-sm">
        <p>SISTEQ - Sistema de Gestão da Qualidade v2.0</p>
        {isEditMode && formData.logsAuditoria && formData.logsAuditoria.length > 0 && (
           <Button variant="ghost" size="sm" onClick={() => setShowLogAuditoria(true)} className="gap-2 text-gray-500 hover:text-gray-700">
             <ShieldCheck className="w-4 h-4" /> Registro de Auditoria ({formData.logsAuditoria.length})
           </Button>
        )}
      </div>

      {/* Modal Log de Auditoria */}
      {showLogAuditoria && formData.logsAuditoria && (
        <LogAuditoriaModal
          logs={formData.logsAuditoria}
          onClose={() => setShowLogAuditoria(false)}
        />
      )}
      
      {/* Modal de Descrição de Alterações */}
      <ModalDescricaoAlteracoes
        isOpen={showModalDescricaoAlteracoes}
        onClose={() => setShowModalDescricaoAlteracoes(false)}
        onConfirm={acaoModalDescricao === 'novaRevisao' ? handleNovaRevisaoComDescricao : handleConfirmarAlteracoes}
        acao={acaoModalDescricao}
      />
    </div>
  );
}
