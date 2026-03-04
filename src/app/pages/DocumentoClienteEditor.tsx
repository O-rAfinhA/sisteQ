import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  UserSquare,
  Save,
  X,
  Upload,
  Paperclip,
  Download,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { DocumentoCliente } from './DocumentosClientesNovo';
import { TipoDocumento } from './config/TiposDocumentos';
import { useProcessos } from '../hooks/useProcessos';
import { generateId } from '../utils/helpers';
import { formatarDataPtBr, dataHojeISO, formatarTamanhoArquivo } from '../utils/formatters';
import { getFromStorage } from '../utils/helpers';

const STORAGE_KEY = 'sisteq-docs-clientes';

export default function DocumentoClienteEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { processos } = useProcessos();
  const isEditMode = !!id;

  const [tiposDocumentos, setTiposDocumentos] = useState<TipoDocumento[]>([]);
  const [formData, setFormData] = useState<Partial<DocumentoCliente>>({
    cliente: '',
    codigoCliente: '',
    revisaoCliente: '',
    nomeDocumento: '',
    tipoId: '',
    processoRelacionado: '',
    produtoRelacionado: '',
    responsavelInterno: '',
    dataRecebimento: dataHojeISO(),
    dataEmissao: dataHojeISO(),
    dataValidade: '',
    dataAtualizacao: dataHojeISO(),
    status: 'Em Análise',
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
    if (formData.tipoId && formData.dataEmissao) {
      const tipo = tiposDocumentos.find(t => t.id === formData.tipoId);
      if (tipo) {
        calcularEAtualizarValidade(formData.dataEmissao, tipo.validadeDias);
      }
    }
  }, [formData.tipoId, formData.dataEmissao, tiposDocumentos]);

  const calcularEAtualizarValidade = (dataEmissao: string, diasValidade?: number) => {
    let novoVencimento = '';
    let novoStatus = formData.status;

    if (diasValidade && diasValidade > 0) {
      const data = new Date(dataEmissao);
      data.setDate(data.getDate() + diasValidade);
      novoVencimento = data.toISOString().split('T')[0];
      
      if (!isEditMode || formData.status === 'Em Análise') {
         novoStatus = 'Aguardando Validação';
      }
    } else {
      novoVencimento = '';
      if (!isEditMode && novoStatus === 'Aguardando Validação') {
         novoStatus = 'Válido';
      }
    }

    setFormData(prev => ({
      ...prev,
      dataValidade: novoVencimento,
      status: (!isEditMode && diasValidade && diasValidade > 0) ? 'Aguardando Validação' : prev.status
    }));
  };

  const carregarTipos = () => {
    setTiposDocumentos(getFromStorage<any[]>('sisteq-tipos-docs-clientes', []));
  };

  const carregarDocumento = () => {
    const docs = getFromStorage<DocumentoCliente[]>(STORAGE_KEY, []);
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
    const docs = getFromStorage<DocumentoCliente[]>(STORAGE_KEY, []);
    const maxNum = docs.reduce((max, doc) => {
      const num = parseInt(doc.codigo.split('-')[1]);
      return num > max ? num : max;
    }, 0);
    return `DC-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleValidar = () => {
    if (!confirm('Confirma a validação deste documento? Ele se tornará Válido.')) return;
    
    setFormData(prev => ({
      ...prev,
      status: 'Válido',
      dataValidacao: new Date().toISOString(),
      validadoPor: 'Usuário Atual'
    }));
    toast.success('Documento validado com sucesso!');
  };

  const handleSalvar = () => {
    if (!formData.cliente || !formData.codigoCliente || !formData.nomeDocumento) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!formData.arquivoBase64 && !isEditMode) {
      toast.error('Anexe o arquivo do documento');
      return;
    }

    const docs = getFromStorage<DocumentoCliente[]>(STORAGE_KEY, []);

    const documento: DocumentoCliente = {
      ...(formData as DocumentoCliente),
      id: formData.id || generateId('dc-'),
      codigo: formData.codigo || gerarNovoCodigo()
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
    toast.success('Documento salvo com sucesso!');
    navigate('/documentos/clientes');
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
            <UserSquare className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
                {isEditMode ? 'Editar Documento de Cliente' : 'Novo Documento de Cliente'}
              </h1>
              {formData.codigo && (
                <p className="text-gray-600 mt-1">Código: {formData.codigo}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/documentos/clientes')}>
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

      {/* Informações do Cliente */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Informações do Cliente e Documento</CardTitle>
            {formData.status === 'Aguardando Validação' && (
              <Button onClick={handleValidar} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Validar Documento
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cliente *
            </label>
            <Input
              value={formData.cliente}
              onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
              placeholder="Nome da empresa cliente"
            />
          </div>

          {/* Código do Cliente e Revisão */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código do Cliente *
              </label>
              <Input
                value={formData.codigoCliente}
                onChange={(e) => setFormData({ ...formData, codigoCliente: e.target.value })}
                placeholder="Ex: DES-001, SPEC-2024-01"
              />
              <p className="text-sm text-gray-500 mt-1">
                Código/número que o cliente utiliza para este documento
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Revisão do Cliente
              </label>
              <Input
                value={formData.revisaoCliente}
                onChange={(e) => setFormData({ ...formData, revisaoCliente: e.target.value })}
                placeholder="Ex: A, B, Rev. 01"
              />
            </div>
          </div>

          {/* Nome do Documento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Documento *
            </label>
            <Input
              value={formData.nomeDocumento}
              onChange={(e) => setFormData({ ...formData, nomeDocumento: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
              placeholder="Nome do documento"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Documento
            </label>
            <select
              value={formData.tipoId}
              onChange={(e) => setFormData({ ...formData, tipoId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
            >
              <option value="">Selecione um tipo...</option>
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

          {/* Datas: Emissão, Validade, Recebimento */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Emissão (Cliente)
              </label>
              <Input
                type="date"
                value={formData.dataEmissao}
                onChange={(e) => setFormData({ ...formData, dataEmissao: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Recebimento
              </label>
              <Input
                type="date"
                value={formData.dataRecebimento}
                onChange={(e) => setFormData({ ...formData, dataRecebimento: e.target.value })}
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

          {/* Status e Responsável */}
          <div className="grid grid-cols-2 gap-4">
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
                <option value="Válido">Válido</option>
                <option value="Desatualizado">Desatualizado</option>
                <option value="Em Análise">Em Análise</option>
                <option value="Aguardando Validação">Aguardando Validação</option>
              </select>
              {formData.status === 'Aguardando Validação' && (
                <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Requer validação para se tornar Válido
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Responsável Interno
              </label>
              <Input
                value={formData.responsavelInterno}
                onChange={(e) => setFormData({ ...formData, responsavelInterno: e.target.value })}
                placeholder="Nome do responsável"
              />
            </div>
          </div>

          {/* Produto Relacionado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Produto/Projeto Relacionado
            </label>
            <Input
              value={formData.produtoRelacionado}
              onChange={(e) => setFormData({ ...formData, produtoRelacionado: e.target.value })}
              placeholder="Nome do produto ou projeto"
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
              placeholder="Informações adicionais sobre o documento"
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
              <span className="text-purple-600 hover:text-purple-700 font-medium">
                Clique para selecionar um arquivo
              </span>
              <input
                type="file"
                className="hidden"
                onChange={handleArquivoChange}
                accept=".pdf,.dwg,.dxf,.doc,.docx"
              />
            </label>
            <p className="text-sm text-gray-500 mt-2">
              PDF, CAD (DWG/DXF), Word (máx. 10MB)
            </p>
          </div>

          {formData.arquivoNome && (
            <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-purple-600" />
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