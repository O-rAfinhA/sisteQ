import { useState } from 'react';
import { Settings, Plus, X, Trash2, FileText, Save, Target, ShoppingCart } from 'lucide-react';
import { useFornecedores } from '../../hooks/useFornecedores';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

export function FornecedorConfiguracoes() {
  const { configuracao, updateConfiguracao } = useFornecedores();
  const [abaAtiva, setAbaAtiva] = useState<'tipos' | 'documentos'>('tipos');
  
  // Estados para Tipos de Fornecedor
  const [novoTipo, setNovoTipo] = useState('');
  const [tiposEditaveis, setTiposEditaveis] = useState(configuracao.tiposFornecedor);
  
  // Estados para Metas de Avaliação
  const [metasEditaveis, setMetasEditaveis] = useState<{ [tipo: string]: number }>(
    configuracao.metaAvaliacaoPorTipo || {}
  );
  
  // Estados para Documentos
  const [tipoSelecionado, setTipoSelecionado] = useState<string>(configuracao.tiposFornecedor[0] || '');
  const [novoDocumento, setNovoDocumento] = useState('');
  const [documentosEditaveis, setDocumentosEditaveis] = useState(configuracao.documentosPorTipo);

  const handleAdicionarTipo = () => {
    if (!novoTipo.trim()) {
      toast.error('Digite um nome para o tipo de fornecedor');
      return;
    }

    if (tiposEditaveis.includes(novoTipo.trim())) {
      toast.error('Este tipo já existe');
      return;
    }

    const novostipos = [...tiposEditaveis, novoTipo.trim()];
    setTiposEditaveis(novostipos);
    
    // Adicionar lista vazia de documentos para o novo tipo
    setDocumentosEditaveis({
      ...documentosEditaveis,
      [novoTipo.trim()]: []
    });

    setNovoTipo('');
    toast.success('Tipo adicionado');
  };

  const handleRemoverTipo = (tipo: string) => {
    if (confirm(`Tem certeza que deseja remover o tipo "${tipo}"?`)) {
      const novostipos = tiposEditaveis.filter(t => t !== tipo);
      setTiposEditaveis(novostipos);
      
      // Remover documentos associados
      const novosDocumentos = { ...documentosEditaveis };
      delete novosDocumentos[tipo];
      setDocumentosEditaveis(novosDocumentos);
      
      toast.success('Tipo removido');
    }
  };

  const handleAdicionarDocumento = () => {
    if (!novoDocumento.trim()) {
      toast.error('Digite um nome para o documento');
      return;
    }

    if (!tipoSelecionado) {
      toast.error('Selecione um tipo de fornecedor');
      return;
    }

    const documentosAtuais = documentosEditaveis[tipoSelecionado] || [];
    
    if (documentosAtuais.includes(novoDocumento.trim())) {
      toast.error('Este documento já existe para este tipo');
      return;
    }

    setDocumentosEditaveis({
      ...documentosEditaveis,
      [tipoSelecionado]: [...documentosAtuais, novoDocumento.trim()]
    });

    setNovoDocumento('');
    toast.success('Documento adicionado');
  };

  const handleRemoverDocumento = (tipo: string, documento: string) => {
    if (confirm(`Tem certeza que deseja remover o documento "${documento}"?`)) {
      const documentosAtualizados = documentosEditaveis[tipo].filter(d => d !== documento);
      
      setDocumentosEditaveis({
        ...documentosEditaveis,
        [tipo]: documentosAtualizados
      });
      
      toast.success('Documento removido');
    }
  };

  const handleSalvar = () => {
    updateConfiguracao({
      tiposFornecedor: tiposEditaveis,
      documentosPorTipo: documentosEditaveis,
      metaAvaliacaoPorTipo: metasEditaveis
    });
    
    toast.success('Configurações salvas com sucesso!');
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Configurações de Homologação
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Gerencie tipos de fornecedores e documentos necessários para homologação
          </p>
        </div>

        <Button
          onClick={handleSalvar}
          className="gap-2 flex-shrink-0 ml-8"
        >
          <Save className="w-4 h-4" />
          Salvar Configurações
        </Button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Settings className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-blue-900 text-sm mb-1" style={{ fontWeight: 600 }}>
            Como funciona?
          </h3>
          <p className="text-blue-700 text-sm" style={{ lineHeight: 1.6 }}>
            Ao cadastrar um fornecedor, você pode selecionar um ou mais tipos. Durante a homologação, 
            o sistema exigirá apenas os documentos configurados para os tipos selecionados, 
            tornando o processo mais eficiente e personalizado.
          </p>
        </div>
      </div>

      {/* Configuração Global: Pedido de Compras */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                Habilitar Pedido de Compras interno
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Quando ativado, a seção Pedido de Compras aparece no menu e os recebimentos podem ser iniciados a partir de pedidos.
                Quando desativado, o Recebimento funciona apenas de forma manual.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              updateConfiguracao({ habilitarPedidoCompras: !configuracao.habilitarPedidoCompras });
              toast.success(configuracao.habilitarPedidoCompras ? 'Pedido de Compras desabilitado' : 'Pedido de Compras habilitado');
            }}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
              configuracao.habilitarPedidoCompras ? 'bg-primary' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                configuracao.habilitarPedidoCompras ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Abas */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setAbaAtiva('tipos')}
            className={`flex-1 px-6 py-3 text-sm transition-colors ${
              abaAtiva === 'tipos'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
            }`}
            style={{ fontWeight: abaAtiva === 'tipos' ? 600 : 400 }}
          >
            Tipos de Fornecedores
          </button>
          <button
            onClick={() => setAbaAtiva('documentos')}
            className={`flex-1 px-6 py-3 text-sm transition-colors ${
              abaAtiva === 'documentos'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
            }`}
            style={{ fontWeight: abaAtiva === 'documentos' ? 600 : 400 }}
          >
            Documentos por Tipo
          </button>
        </div>

        {/* Conteúdo da Aba - Tipos de Fornecedores */}
        {abaAtiva === 'tipos' && (
          <div className="p-6 space-y-6">
            {/* Adicionar Novo Tipo */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm text-gray-900 mb-3" style={{ fontWeight: 600 }}>Adicionar Novo Tipo</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={novoTipo}
                  onChange={(e) => setNovoTipo(e.target.value)}
                  placeholder="Ex: Transportadoras, Embalagens..."
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleAdicionarTipo()}
                />
                <Button
                  onClick={handleAdicionarTipo}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </Button>
              </div>
            </div>

            {/* Lista de Tipos */}
            <div>
              <h3 className="text-sm text-gray-900 mb-3" style={{ fontWeight: 600 }}>
                Tipos Cadastrados ({tiposEditaveis.length})
              </h3>
              <div className="space-y-2">
                {tiposEditaveis.map((tipo) => (
                  <div
                    key={tipo}
                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 bg-violet-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-violet-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{tipo}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] ${
                            (documentosEditaveis[tipo]?.length || 0) > 0 ? 'bg-violet-50 text-violet-600 border border-violet-200' : 'bg-gray-50 text-gray-400 border border-gray-200'
                          }`} style={{ fontWeight: 600 }}>
                            {documentosEditaveis[tipo]?.length || 0} doc(s)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                        (metasEditaveis[tipo] ?? 3.0) >= 4 ? 'bg-emerald-50 border-emerald-200' : (metasEditaveis[tipo] ?? 3.0) >= 3 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
                      }`}>
                        <Target className={`w-3.5 h-3.5 ${
                          (metasEditaveis[tipo] ?? 3.0) >= 4 ? 'text-emerald-500' : (metasEditaveis[tipo] ?? 3.0) >= 3 ? 'text-amber-500' : 'text-red-500'
                        }`} />
                        <span className="text-xs text-gray-500" style={{ fontWeight: 500 }}>Meta</span>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          step="0.5"
                          value={metasEditaveis[tipo] ?? 3.0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val >= 1 && val <= 5) {
                              setMetasEditaveis(prev => ({ ...prev, [tipo]: val }));
                            }
                          }}
                          className="w-14 px-1.5 py-1 border border-gray-200 rounded-md text-center text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                        <span className="text-[11px] text-gray-400">/ 5.0</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoverTipo(tipo)}
                        className="h-9 w-9 text-gray-400 hover:text-red-600"
                        title="Remover tipo"
                        aria-label="Remover tipo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {tiposEditaveis.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Nenhum tipo cadastrado</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo da Aba - Documentos */}
        {abaAtiva === 'documentos' && (
          <div className="p-6 space-y-6">
            {/* Seletor de Tipo */}
            <div>
              <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>
                Selecione o Tipo de Fornecedor
              </label>
              <select
                value={tipoSelecionado}
                onChange={(e) => setTipoSelecionado(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors text-sm"
              >
                {tiposEditaveis.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            {tipoSelecionado && (
              <>
                {/* Adicionar Novo Documento */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm text-gray-900 mb-3" style={{ fontWeight: 600 }}>
                    Adicionar Documento para {tipoSelecionado}
                  </h3>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={novoDocumento}
                      onChange={(e) => setNovoDocumento(e.target.value)}
                      placeholder="Ex: Alvará de Funcionamento, ISO 9001..."
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && handleAdicionarDocumento()}
                    />
                    <Button
                      onClick={handleAdicionarDocumento}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar
                    </Button>
                  </div>
                </div>

                {/* Lista de Documentos */}
                <div>
                  <h3 className="text-sm text-gray-900 mb-3" style={{ fontWeight: 600 }}>
                    Documentos Necessários ({documentosEditaveis[tipoSelecionado]?.length || 0})
                  </h3>
                  <div className="space-y-2">
                    {(documentosEditaveis[tipoSelecionado] || []).map((documento, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <span className="text-xs text-gray-600" style={{ fontWeight: 600 }}>{idx + 1}</span>
                          </div>
                          <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{documento}</p>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoverDocumento(tipoSelecionado, documento)}
                          className="h-9 w-9 text-gray-400 hover:text-red-600"
                          title="Remover documento"
                          aria-label="Remover documento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    {(documentosEditaveis[tipoSelecionado]?.length || 0) === 0 && (
                      <div className="text-center py-12">
                        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">
                          Nenhum documento configurado para este tipo
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
