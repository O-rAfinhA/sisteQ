import { Processo } from '../../types/strategic';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { formatarDataPtBr } from '../../utils/formatters';

interface VisaoGeralTabProps {
  processo: Processo;
  isEditing: boolean;
  onChange: (updates: Partial<Processo>) => void;
}

export function VisaoGeralTab({ processo, isEditing, onChange }: VisaoGeralTabProps) {
  return (
    <div className="space-y-6">
      {/* Informações Básicas */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código do Processo *
            </label>
            {isEditing ? (
              <Input
                value={processo.codigo}
                onChange={(e) => onChange({ codigo: e.target.value })}
                placeholder="Ex: PROC-001"
              />
            ) : (
              <p className="text-sm text-gray-900 font-mono">{processo.codigo}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Processo *
            </label>
            {isEditing ? (
              <Input
                value={processo.nome}
                onChange={(e) => onChange({ nome: e.target.value })}
                placeholder="Ex: Gestão de Vendas"
              />
            ) : (
              <p className="text-sm text-gray-900">{processo.nome}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Departamento *
            </label>
            {isEditing ? (
              <Input
                value={processo.departamento}
                onChange={(e) => onChange({ departamento: e.target.value })}
                placeholder="Ex: Comercial"
              />
            ) : (
              <p className="text-sm text-gray-900">{processo.departamento}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Responsável *
            </label>
            {isEditing ? (
              <Input
                value={processo.responsavel}
                onChange={(e) => onChange({ responsavel: e.target.value })}
                placeholder="Ex: João Silva"
              />
            ) : (
              <p className="text-sm text-gray-900">{processo.responsavel}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            {isEditing ? (
              <Select value={processo.status} onValueChange={(value) => onChange({ status: value as any })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rascunho">Rascunho</SelectItem>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge className={
                processo.status === 'Ativo' ? 'bg-green-100 text-green-800' :
                processo.status === 'Rascunho' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }>
                {processo.status}
              </Badge>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Processo
            </label>
            {isEditing ? (
              <Select value={processo.tipo} onValueChange={(value) => onChange({ tipo: value as any })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Estratégico">Estratégico</SelectItem>
                  <SelectItem value="Operacional">Operacional</SelectItem>
                  <SelectItem value="Suporte">Suporte</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-gray-900">{processo.tipo}</p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Objetivo
          </label>
          {isEditing ? (
            <Textarea
              value={processo.objetivo}
              onChange={(e) => onChange({ objetivo: e.target.value })}
              placeholder="Descreva o objetivo deste processo..."
              rows={3}
            />
          ) : (
            <p className="text-sm text-gray-700">{processo.objetivo || 'Não informado'}</p>
          )}
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Escopo
          </label>
          {isEditing ? (
            <Textarea
              value={processo.escopo}
              onChange={(e) => onChange({ escopo: e.target.value })}
              placeholder="Descreva o escopo deste processo..."
              rows={3}
            />
          ) : (
            <p className="text-sm text-gray-700">{processo.escopo || 'Não informado'}</p>
          )}
        </div>
      </div>

      {/* Informações de Versionamento */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Versionamento</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Versão Atual
            </label>
            <p className="text-sm font-mono text-gray-900">{processo.versaoAtual}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data de Criação
            </label>
            <p className="text-sm text-gray-900">
              {formatarDataPtBr(processo.dataCriacao)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Última Atualização
            </label>
            <p className="text-sm text-gray-900">
              {formatarDataPtBr(processo.ultimaAtualizacao)}
            </p>
          </div>
        </div>
      </div>

      {/* Atividades do Processo */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Atividades do Processo</h3>
        
        {processo.atividades && processo.atividades.length > 0 ? (
          <div className="space-y-3">
            {processo.atividades.map((atividade, index) => (
              <div key={atividade.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-mono text-gray-500">#{index + 1}</span>
                      <h4 className="text-sm font-medium text-gray-900">{atividade.nome}</h4>
                    </div>
                    {atividade.descricao && (
                      <p className="text-sm text-gray-600 mb-2">{atividade.descricao}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Responsável: {atividade.responsavel}</span>
                      {atividade.tempoEstimado && (
                        <span>Tempo: {atividade.tempoEstimado}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            Nenhuma atividade cadastrada para este processo
          </p>
        )}
      </div>
    </div>
  );
}
