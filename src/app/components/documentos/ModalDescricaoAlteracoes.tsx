// Modal para Descrição de Alterações v2.1
import { useState } from 'react';
import { X, FileEdit } from 'lucide-react';
import { Button } from '../ui/button';

interface ModalDescricaoAlteracoesProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (descricao: string) => void;
  titulo?: string;
  descricaoPlaceholder?: string;
  acao?: 'salvar' | 'novaRevisao';
}

export function ModalDescricaoAlteracoes({ 
  isOpen, 
  onClose, 
  onConfirm,
  titulo,
  descricaoPlaceholder,
  acao = 'salvar'
}: ModalDescricaoAlteracoesProps) {
  const [descricao, setDescricao] = useState('');

  // Definir título e placeholder baseado na ação
  const tituloFinal = titulo || (acao === 'novaRevisao' 
    ? 'Descreva o Motivo da Nova Revisão'
    : 'Descreva as Alterações Realizadas');
  
  const placeholderFinal = descricaoPlaceholder || (acao === 'novaRevisao'
    ? 'Ex: Adequação aos novos requisitos regulatórios, atualização de processos internos...'
    : 'Ex: Revisão da seção 3.2 para incluir novos critérios de aprovação...');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!descricao.trim()) {
      alert('Por favor, descreva as alterações realizadas.');
      return;
    }
    onConfirm(descricao.trim());
    setDescricao(''); // Limpar após confirmar
  };

  const handleClose = () => {
    setDescricao('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <FileEdit className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl text-gray-900" style={{ fontWeight: 700 }}>{tituloFinal}</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              Registre de forma clara e objetiva as principais mudanças realizadas nesta revisão.
              Esta informação será registrada no histórico de versões.
            </p>
            
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição das Alterações <span className="text-red-500">*</span>
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder={placeholderFinal}
              className="w-full h-32 px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-2">
              Mínimo recomendado: 10 caracteres
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Dica:</strong> Seja específico. Exemplo: "Atualização da seção 3.2 para adequação aos novos requisitos" 
              é melhor que "Ajustes gerais".
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={handleClose}
            variant="outline"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Confirmar e Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}