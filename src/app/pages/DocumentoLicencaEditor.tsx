import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  FileCheck,
  Save,
  X,
  Upload,
  Paperclip,
  CheckCircle2,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { DocumentoLicenca } from './DocumentosLicencas';
import { TipoDocumento } from './config/TiposDocumentos';
import { useProcessos } from '../hooks/useProcessos';
import { generateId, getFromStorage, persistKvKeyNow } from '../utils/helpers';
import { formatarDataPtBr, dataHojeISO } from '../utils/formatters';

const STORAGE_KEY = 'sisteq-docs-licencas';

export default function DocumentoLicencaEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { processos } = useProcessos();
  const isEditMode = !!id;

  const [tiposDocumentos, setTiposDocumentos] = useState<TipoDocumento[]>([]);
  const [formData, setFormData] = useState<Partial<DocumentoLicenca>>({
    tipoId: '',
    nomeDocumento: '',
    numeroLicenca: '',
    orgaoEmissor: '',
    dataEmissao: dataHojeISO(),
    dataVencimento: '',
    processoRelacionado: '',
    responsavel: '',
    status: 'Em Renovação',
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

  // Recalcular vencimento quando tipo ou emissão mudar (apenas se não estiver editando um já salvo com valores fixos, mas aqui queremos forçar a regra)
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
      
      // Se for um novo documento ou se a regra de validação se aplicar
      if (!isEditMode || formData.status === 'Em Renovação') { 
         novoStatus = 'Aguardando Validação';
      }
    } else {
      // Sem vencimento
      novoVencimento = '';
      if (!isEditMode && novoStatus === 'Aguardando Validação') {
         novoStatus = 'Vigente';
      }
    }

    setFormData(prev => ({
      ...prev,
      dataVencimento: novoVencimento,
      // Não sobrescreve status se já estiver editando, a menos que seja intencional. 
      // Mas o requisito pede para ativar o fluxo. Vamos manter a lógica simples:
      // Se tem validade e estamos criando, vai para Aguardando Validação.
      // Se editamos e mudamos a data, talvez devesse voltar para validação? Por enquanto, só na criação ou mudança crítica.
      status: (!isEditMode && diasValidade && diasValidade > 0) ? 'Aguardando Validação' : prev.status
    }));
  };

  const carregarTipos = () => {
    setTiposDocumentos(getFromStorage<any[]>('sisteq-tipos-licencas', []));
  };

  const carregarDocumento = () => {
    const docs = getFromStorage<DocumentoLicenca[]>(STORAGE_KEY, []);
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

  const gerarNovoCodigo = (tipoId: string): string => {
    const tipo = tiposDocumentos.find(t => t.id === tipoId);
    const prefixo = (tipo as any)?.prefixo || tipo?.prefixoCodigo || 'LIC-';
    
    const docs = getFromStorage<DocumentoLicenca[]>(STORAGE_KEY, []);
    
    const docsDoTipo = docs.filter(d => d.codigo.startsWith(prefixo));
    const maxNum = docsDoTipo.reduce((max, doc) => {
      const parts = doc.codigo.split('-');
      const num = parseInt(parts[parts.length - 1]);
      return num > max ? num : max;
    }, 0);
    
    return `${prefixo}${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleValidar = () => {
    if (!confirm('Confirma a validação deste documento? Ele se tornará Vigente.')) return;
    
    setFormData(prev => ({
      ...prev,
      status: 'Vigente',
      dataValidacao: new Date().toISOString(),
      validadoPor: 'Usuário Atual' // Idealmente pegar do contexto de auth
    }));
    toast.success('Documento validado com sucesso!');
  };

  const handleSalvar = () => {
    if (!formData.tipoId || !formData.nomeDocumento || !formData.numeroLicenca || !formData.orgaoEmissor) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const docs = getFromStorage<DocumentoLicenca[]>(STORAGE_KEY, []);

    if (isEditMode) {
      const index = docs.findIndex(d => d.id === id);
      if (index !== -1) {
        docs[index] = {
          ...docs[index],
          ...formData,
          dataAtualizacao: new Date().toISOString()
        } as DocumentoLicenca;
      }
    } else {
      const novoDoc: DocumentoLicenca = {
        id: generateId(),
        codigo: gerarNovoCodigo(formData.tipoId!),
        ...formData,
        dataAtualizacao: new Date().toISOString()
      } as DocumentoLicenca;
      docs.push(novoDoc);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    persistKvKeyNow(STORAGE_KEY).then(result => {
      if (result.ok) return;
      if (result.status === 413) {
        toast.error('Arquivo/anexo muito grande para persistir no servidor. Reduza o tamanho do arquivo.');
        return;
      }
      toast.error('Falha ao persistir no servidor. Os dados ficaram apenas no navegador.');
    });
    toast.success(isEditMode ? 'Licença atualizada!' : 'Licença criada!');
    navigate('/documentos/licencas');
  };

  const tipoSelecionado = tiposDocumentos.find(t => t.id === formData.tipoId);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <FileCheck className="w-8 h-8 text-green-600" />
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            {isEditMode ? 'Editar Licença' : 'Nova Licença'}
          </h1>
        </div>
        <p className="text-gray-600">
          {isEditMode ? 'Atualize as informações da licença' : 'Cadastre uma nova licença ou obrigação legal'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Informações da Licença</CardTitle>
            {formData.status === 'Aguardando Validação' && (
              <Button onClick={handleValidar} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Validar Documento
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Licença <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.tipoId}
              onChange={(e) => setFormData({ ...formData, tipoId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
              required
            >
              <option value="">Selecione o tipo</option>
              {tiposDocumentos.map(tipo => (
                <option key={tipo.id} value={tipo.id}>{tipo.nome}</option>
              ))}
            </select>
            {tipoSelecionado && (
              <p className="text-xs text-gray-500 mt-1">
                Validade configurada: {tipoSelecionado.validadeDias ? `${tipoSelecionado.validadeDias} dias` : 'Sem vencimento'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Nome */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Licença <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.nomeDocumento}
                onChange={(e) => setFormData({ ...formData, nomeDocumento: e.target.value })}
                placeholder="Ex: Alvará de Funcionamento"
                required
              />
            </div>

            {/* Número */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número da Licença <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.numeroLicenca}
                onChange={(e) => setFormData({ ...formData, numeroLicenca: e.target.value })}
                placeholder="Ex: 2024/12345"
                required
              />
            </div>

            {/* Órgão Emissor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Órgão Emissor <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.orgaoEmissor}
                onChange={(e) => setFormData({ ...formData, orgaoEmissor: e.target.value })}
                placeholder="Ex: Prefeitura Municipal"
                required
              />
            </div>

            {/* Data Emissão */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Emissão
              </label>
              <Input
                type="date"
                value={formData.dataEmissao}
                onChange={(e) => setFormData({ ...formData, dataEmissao: e.target.value })}
              />
            </div>

            {/* Data Vencimento (Calculada) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Vencimento
              </label>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
                <Calendar className="w-4 h-4 text-gray-400" />
                {formData.dataVencimento ? (
                  <span>{formatarDataPtBr(formData.dataVencimento)}</span>
                ) : (
                  <span className="text-gray-400 italic">Sem vencimento / Calculado automaticamente</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Calculada com base na validade do tipo ({tipoSelecionado?.validadeDias || 0} dias)</p>
            </div>

            {/* Responsável */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Responsável
              </label>
              <Input
                value={formData.responsavel}
                onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                placeholder="Responsável pelo acompanhamento"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
                disabled={formData.status === 'Aguardando Validação'} // Bloqueia mudança manual se estiver aguardando
              >
                <option value="Vigente">Vigente</option>
                <option value="Vence em 30 dias">Vence em 30 dias</option>
                <option value="Vencida">Vencida</option>
                <option value="Em Renovação">Em Renovação</option>
                <option value="Aguardando Validação">Aguardando Validação</option>
              </select>
              {formData.status === 'Aguardando Validação' && (
                <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Requer validação para se tornar Vigente
                </p>
              )}
            </div>

            {/* Processo Relacionado */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Processo Relacionado
              </label>
              <select
                value={formData.processoRelacionado}
                onChange={(e) => setFormData({ ...formData, processoRelacionado: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
              >
                <option value="">Nenhum</option>
                {processos.map(proc => (
                  <option key={proc.id} value={proc.id}>{proc.codigo} - {(proc as any).nome ?? proc.setor}</option>
                ))}
              </select>
            </div>

            {/* Observações */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
                rows={4}
                placeholder="Informações adicionais..."
              />
            </div>

            {/* Upload de Arquivo */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Anexar Documento
              </label>
              <div className="flex items-center gap-4">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-200 rounded-lg hover:border-blue-500 transition-colors">
                    <Upload className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {arquivo ? arquivo.name : formData.arquivoNome || 'Selecione um arquivo (PDF, JPG, PNG - Máx 10MB)'}
                    </span>
                  </div>
                  <input
                    type="file"
                    onChange={handleArquivoChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                  />
                </label>
                {(arquivo || formData.arquivoNome) && (
                  <Paperclip className="w-5 h-5 text-green-600" />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex gap-4 mt-6">
        <Button onClick={handleSalvar} variant={isEditMode ? "black" : "default"} className="flex-1 gap-2">
          <Save className="w-4 h-4" />
          {isEditMode ? 'Salvar Alterações' : 'Criar Licença'}
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/documentos/licencas')}
          className="flex-1 gap-2"
        >
          <X className="w-4 h-4" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}
