/**
 * Manutenção / Configuração
 * Página completa para configurações do módulo de manutenção.
 * O conteúdo foi migrado do ConfiguracaoManutencaoSheet.
 */
import { useState, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import {
  Settings, Plus, Trash2, RotateCcw, GripVertical, Tag, Wrench,
} from 'lucide-react';
import { useManutencao, TIPOS_EQUIPAMENTO_DEFAULT } from '../../hooks/useManutencao';

export function ManutencaoConfiguracao() {
  const { tiposEquipamento, setTiposEquipamento } = useManutencao();
  const [novoTipo, setNovoTipo] = useState('');
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Adicionar tipo ──
  function adicionarTipo() {
    const v = novoTipo.trim();
    if (!v) { toast.error('Digite o nome do tipo.'); return; }
    if (tiposEquipamento.some(t => t.toLowerCase() === v.toLowerCase())) {
      toast.error('Tipo já cadastrado.'); return;
    }
    setTiposEquipamento(prev => [...prev, v]);
    setNovoTipo('');
    toast.success(`Tipo "${v}" adicionado.`);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  // ── Remover tipo ──
  function removerTipo(idx: number) {
    const nome = tiposEquipamento[idx];
    setTiposEquipamento(prev => prev.filter((_, i) => i !== idx));
    toast.success(`Tipo "${nome}" removido.`);
  }

  // ── Restaurar padrões ──
  function restaurarPadroes() {
    setTiposEquipamento([...TIPOS_EQUIPAMENTO_DEFAULT]);
    toast.success('Tipos restaurados para os padrões.');
  }

  // ── Drag-and-drop para reordenar ──
  function onDragStart(idx: number) { setDragging(idx); }
  function onDragEnter(idx: number) { setDragOver(idx); }
  function onDragEnd() {
    if (dragging === null || dragOver === null || dragging === dragOver) {
      setDragging(null); setDragOver(null); return;
    }
    const arr = [...tiposEquipamento];
    const [item] = arr.splice(dragging, 1);
    arr.splice(dragOver, 0, item);
    setTiposEquipamento(arr);
    setDragging(null); setDragOver(null);
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] border border-blue-100 bg-blue-50 text-blue-600" style={{ fontWeight: 600 }}>
            <Wrench style={{ width: 11, height: 11 }} />
            MANUTENÇÃO
          </div>
        </div>
        <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
          Configurações
        </h1>
        <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
          Personalize as listas e parâmetros usados em todo o módulo de manutenção.
        </p>
      </div>

      {/* Conteúdo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ── Card: Tipos de Equipamento ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-400" />
              <span className="text-gray-800" style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                Tipos de Equipamento
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full"
                style={{ fontWeight: 600 }}
              >
                {tiposEquipamento.length}
              </span>
            </div>
            <button
              onClick={restaurarPadroes}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
              title="Restaurar padrões"
            >
              <RotateCcw className="w-3 h-3" /> Restaurar padrões
            </button>
          </div>

          <p className="text-xs text-gray-400">
            Arraste para reordenar. Esses tipos aparecem no cadastro de equipamentos.
          </p>

          {/* Campo para adicionar */}
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={novoTipo}
              onChange={e => setNovoTipo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adicionarTipo()}
              placeholder="Novo tipo..."
              className="h-9 text-sm flex-1"
            />
            <Button size="sm" className="h-9 gap-1 px-3" onClick={adicionarTipo}>
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </Button>
          </div>

          {/* Lista de tipos */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            {tiposEquipamento.length === 0 && (
              <div className="py-10 text-center text-xs text-gray-400">
                Nenhum tipo cadastrado.
              </div>
            )}
            {tiposEquipamento.map((tipo, idx) => (
              <div
                key={tipo + idx}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragEnter={() => onDragEnter(idx)}
                onDragEnd={onDragEnd}
                onDragOver={e => e.preventDefault()}
                className={`flex items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-50 last:border-0 transition-colors cursor-grab active:cursor-grabbing select-none ${
                  dragOver === idx ? 'bg-blue-50 border-blue-100' : 'hover:bg-gray-50/60'
                } ${dragging === idx ? 'opacity-40' : ''}`}
              >
                <GripVertical className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                <span className="text-sm text-gray-700 flex-1">{tipo}</span>
                <button
                  onClick={() => removerTipo(idx)}
                  className="text-gray-300 hover:text-red-400 transition-colors p-0.5 rounded flex-shrink-0"
                  title={`Remover "${tipo}"`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Card: Info ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-4 h-4 text-gray-400" />
            <span className="text-gray-800" style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
              Sobre as configurações
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Todas as configurações são salvas automaticamente e persistem entre sessões via <span className="font-mono text-xs bg-gray-100 px-1 rounded">localStorage</span>.
          </p>
          <p className="text-sm text-gray-500">
            Alterações nos tipos de equipamento não afetam equipamentos já cadastrados — apenas novos cadastros utilizarão a lista atualizada.
          </p>
        </div>

      </div>
    </div>
  );
}