import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  BookOpen,
  Save,
  X,
  Upload,
  Paperclip,
  AlertCircle,
  FileText,
  Download,
  Calendar,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { DocumentoExterno } from './DocumentosExternosNovo';
import { TipoDocumento } from './config/TiposDocumentos';
import { useProcessos } from '../hooks/useProcessos';
import { generateId, getFromStorage, persistKvKeyNow } from '../utils/helpers';
import { formatarDataPtBr, dataHojeISO, formatarTamanhoArquivo } from '../utils/formatters';

const STORAGE_KEY = 'sisteq-docs-externos';

export default function DocumentoExternoEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { processos } = useProcessos();
  const isEditMode = !!id;

  const [tiposDocumentos, setTiposDocumentos] = useState<TipoDocumento[]>([]);
  const [formData, setFormData] = useState<Partial<DocumentoExterno>>({
    tipoId: '',
    nomeDocumento: '',
    numeroOficial: '',
    orgaoEmissor: '',
    revisaoConhecida: '',
    dataPublicacao: dataHojeISO(),
    dataVigencia: dataHojeISO(),
    dataValidade: '',
    aplicabilidade: '',
    processoRelacionado: '',
    responsavelMonitoramento: '',
    status: 'Vigente',
    observacoes: '',
    dataCriacao: new Date().toISOString()
  });

  const [arquivo, setArquivo] = useState<File | null>(null);

  useEffect(() => {
    carregarTipos();
    if (isEditMode) {
      carregarDocumento();
    }
  }, [id]);

  useEffect(() => {
    if (formData.tipoId && formData.dataPublicacao) {
      const tipo = tiposDocumentos.find(t => t.id === formData.tipoId);
      if (tipo) {
        calcularEAtualizarValidade(formData.dataPublicacao, tipo.validadeDias);
      }
    }
  }, [formData.tipoId, formData.dataPublicacao, tiposDocumentos]);

  const calcularEAtualizarValidade = (dataPublicacao: string, diasValidade?: number) => {
    let novoVencimento = '';
    let novoStatus = formData.status;

    if (diasValidade && diasValidade > 0) {
      const data = new Date(dataPublicacao);
      data.setDate(data.getDate() + diasValidade);
      novoVencimento = data.toISOString().split('T')[0];
      
      if (!isEditMode || formData.status === 'Vigente') {
         novoStatus = 'Aguardando Validação';
      }
    } else {
      novoVencimento = '';
      if (!isEditMode && novoStatus === 'Aguardando Validação') {
         novoStatus = 'Vigente';
      }
    }

    setFormData(prev => ({
      ...prev,
      dataValidade: novoVencimento,
      status: (!isEditMode && diasValidade && diasValidade > 0) ? 'Aguardando Validação' : prev.status
    }));
  };

  const carregarTipos = () => {
    setTiposDocumentos(getFromStorage<any[]>('sisteq-tipos-externos', []));
  };

  const carregarDocumento = () => {
    const docs = getFromStorage<DocumentoExterno[]>(STORAGE_KEY, []);
    const doc = docs.find(d => d.id === id);
    if (doc) {
      setFormData(doc);
    }
  };

  const handleArquivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 10MB.');
        return;
      }
      setArquivo(file);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setFormData({
          ...formData,
          arquivoNome: file.name,
          arquivoTipo: file.type,
          arquivoBase64: base64,
          arquivoTamanho: file.size
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const gerarNovoCodigo = (): string => {
    const docs = getFromStorage<DocumentoExterno[]>(STORAGE_KEY, []);
    const maxNum = docs.reduce((max, doc) => {
      const num = parseInt(doc.codigo.split('-')[1]);
      return num > max ? num : max;
    }, 0);
    return `DE-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleValidar = () => {
    if (!confirm('Confirma a validação deste documento? Ele se tornará Vigente.')) return;
    
    setFormData(prev => ({
      ...prev,
      status: 'Vigente',
      dataValidacao: new Date().toISOString(),
      validadoPor: 'Usuário Atual'
    }));
    toast.success('Documento validado com sucesso!');
  };

  const handleSalvar = () => {
    if (!formData.nomeDocumento || !formData.numeroOficial || !formData.orgaoEmissor) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!formData.arquivoBase64 && !isEditMode) {
      toast.error('Anexe o arquivo do documento');
      return;
    }

    const docs = getFromStorage<DocumentoExterno[]>(STORAGE_KEY, []);

    const documento: DocumentoExterno = {
      ...(formData as DocumentoExterno),
      id: formData.id || generateId('de-'),
      codigo: formData.codigo || gerarNovoCodigo(),
      dataAtualizacao: new Date().toISOString()
    };

    if (isEditMode) {
      const index = docs.findIndex(d => d.id === id);
      if (index !== -1) {
        docs[index] = documento;
      }
    } else {
      docs.push(documento);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    persistKvKeyNow(STORAGE_KEY).then(result => {
      if (result.ok) return;
      if (result.status === 413) {
        toast.error('Arquivo/anexo muito grande para persistir no servidor. Reduza o tamanho do arquivo.');
        return;
      }
      const suffix = result.status ? ` (HTTP ${result.status})` : '';
      const detail = result.error ? `: ${result.error}` : '';
      toast.error(`Falha ao persistir no servidor${suffix}${detail}`);
    });
    toast.success('Documento salvo com sucesso!');
    navigate('/documentos/externos');
  };

  const handleDownload = () => {
    if (formData.arquivoBase64 && formData.arquivoNome) {
      const link = document.createElement('a');
      link.href = formData.arquivoBase64;
      link.download = formData.arquivoNome;
      link.click();
    }
  };

  const tipoSelecionado = tiposDocumentos.find(t => t.id === formData.tipoId);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
                {isEditMode ? 'Editar Documento Externo' : 'Novo Documento Externo'}
              </h1>
              {formData.codigo && (
                <p className="text-gray-600 mt-1">Código: {formData.codigo}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/documentos/externos')}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSalvar}>
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>
      </div>

      {/* Alert para documentos desatualizados */}
      {formData.status === 'Desatualizada' && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-orange-900">Documento Desatualizado</h4>
            <p className="text-sm text-orange-700 mt-1">
              Este documento está marcado como desatualizado. Verifique se há uma nova revisão disponível.
            </p>
          </div>
        </div>
      )}

      {/* Informações Principais */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Identificação do Documento</CardTitle>
            {formData.status === 'Aguardando Validação' && (
              <Button onClick={handleValidar} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Validar Documento
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Número Oficial */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número Oficial *
            </label>
            <Input
              value={formData.numeroOficial}
              onChange={(e) => setFormData({ ...formData, numeroOficial: e.target.value })}
              placeholder="Ex: NBR ISO 9001:2015, RDC 301/2019, NR-12"
            />
            <p className="text-sm text-gray-500 mt-1">
              Número oficial da norma, lei ou regulamento conforme publicação
            </p>
          </div>

          {/* Nome do Documento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Documento *
            </label>
            <Input
              value={formData.nomeDocumento}
              onChange={(e) => setFormData({ ...formData, nomeDocumento: e.target.value })}
              placeholder="Ex: Sistemas de Gestão da Qualidade - Requisitos"
            />
          </div>

          {/* Tipo e Órgão Emissor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Documento
              </label>
              <select
                value={formData.tipoId}
                onChange={(e) => setFormData({ ...formData, tipoId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
              >
                <option value="">Selecione</option>
                {tiposDocumentos.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nome}
                  </option>
                ))}
              </select>
              {tipoSelecionado && (
                <p className="text-xs text-gray-500 mt-1">
                  Validade configurada: {tipoSelecionado.validadeDias ? `${tipoSelecionado.validadeDias} dias` : 'Sem vencimento'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Órgão Emissor *
              </label>
              <Input
                value={formData.orgaoEmissor}
                onChange={(e) => setFormData({ ...formData, orgaoEmissor: e.target.value })}
                placeholder="Ex: ABNT, INMETRO, ANVISA, MTE"
              />
            </div>
          </div>

          {/* Revisão e Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Revisão Conhecida
              </label>
              <Input
                value={formData.revisaoConhecida}
                onChange={(e) => setFormData({ ...formData, revisaoConhecida: e.target.value })}
                placeholder="Ex: Rev. 01, 2023, Emenda 1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
                disabled={formData.status === 'Aguardando Validação'}
              >
                <option value="Vigente">Vigente</option>
                <option value="Desatualizada">Desatualizada</option>
                <option value="Em Revisão">Em Revisão</option>
                <option value="Obsoleta">Obsoleta</option>
                <option value="Aguardando Validação">Aguardando Validação</option>
              </select>
              {formData.status === 'Aguardando Validação' && (
                <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Requer validação para se tornar Vigente
                </p>
              )}
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Publicação
              </label>
              <Input
                type="date"
                value={formData.dataPublicacao}
                onChange={(e) => setFormData({ ...formData, dataPublicacao: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Vigência
              </label>
              <Input
                type="date"
                value={formData.dataVigencia}
                onChange={(e) => setFormData({ ...formData, dataVigencia: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Validade (Calculada)
              </label>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
                <Calendar className="w-4 h-4 text-gray-400" />
                {formData.dataValidade ? (
                  <span>{formatarDataPtBr(formData.dataValidade)}</span>
                ) : (
                  <span className="text-gray-400 italic">Sem vencimento</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aplicabilidade e Controle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aplicabilidade e Controle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Aplicabilidade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aplicabilidade na Empresa
            </label>
            <textarea
              value={formData.aplicabilidade}
              onChange={(e) => setFormData({ ...formData, aplicabilidade: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
              rows={3}
              placeholder="Descreva onde e como este documento se aplica na empresa"
            />
          </div>

          {/* Processo Relacionado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Processo Relacionado
            </label>
            <select
              value={formData.processoRelacionado}
              onChange={(e) => setFormData({ ...formData, processoRelacionado: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
            >
              <option value="">Nenhum</option>
              {processos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.codigo} - {p.setor}
                </option>
              ))}
            </select>
          </div>

          {/* Responsável pelo Monitoramento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Responsável pelo Monitoramento
            </label>
            <Input
              value={formData.responsavelMonitoramento}
              onChange={(e) => setFormData({ ...formData, responsavelMonitoramento: e.target.value })}
              placeholder="Nome da pessoa responsável por acompanhar atualizações"
            />
            <p className="text-sm text-gray-500 mt-1">
              Pessoa responsável por monitorar atualizações desta norma/legislação
            </p>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
              rows={3}
              placeholder="Informações adicionais, links para consulta, etc."
            />
          </div>
        </CardContent>
      </Card>

      {/* Arquivo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Paperclip className="w-5 h-5" />
            Arquivo do Documento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <label className="cursor-pointer">
              <span className="text-indigo-600 hover:text-indigo-700 font-medium">
                Clique para selecionar um arquivo
              </span>
              <input
                type="file"
                className="hidden"
                onChange={handleArquivoChange}
                accept=".pdf,.doc,.docx"
              />
            </label>
            <p className="text-sm text-gray-500 mt-2">
              PDF ou Word (máx. 10MB)
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Anexe uma cópia da norma/legislação para referência interna
            </p>
          </div>

          {formData.arquivoNome && (
            <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-indigo-600" />
                  <div>
                    <p className="font-medium text-gray-900">{formData.arquivoNome}</p>
                    <p className="text-sm text-gray-600">
                      {formData.arquivoTamanho ? formatarTamanhoArquivo(formData.arquivoTamanho) : ''}
                    </p>
                  </div>
                </div>
                {isEditMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Baixar
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
