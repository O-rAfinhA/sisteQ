/**
 * Engrenagem de Configuração — Módulo de Manutenção
 * Botão + Sheet reutilizável inserido no header de cada sessão.
 * Gerencia configurações dinâmicas persistidas em localStorage via useManutencao.
 */
import { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';
import {
  Settings, Plus, Trash2, RotateCcw, GripVertical, Tag,
} from 'lucide-react';
import { useManutencao, TIPOS_EQUIPAMENTO_DEFAULT } from '../../hooks/useManutencao';

// ─── Componente principal ────────────────────────────────────────────
export function ConfiguracaoManutencaoSheet() {
  const { tiposEquipamento, setTiposEquipamento } = useManutencao();
  const [open, setOpen] = useState(false);
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
    <>
      {/* Botão engrenagem */}
      <Button
        variant="outline"
        size="sm"
        className="h-9 w-9 p-0 text-gray-400 hover:text-gray-700 border-gray-200 hover:border-gray-300"
        title="Configurações do módulo"
        onClick={() => setOpen(true)}
      >
        <Settings className="w-4 h-4" />
      </Button>

      {/* Sheet de configurações */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full sm:max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto p-0">
          <DialogHeader className="pb-4 pt-6 px-6">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-500" />
              Configurações — Manutenção
            </DialogTitle>
            <DialogDescription>
              Personalize as listas e parâmetros usados em todo o módulo de manutenção.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pb-10 px-6">

            {/* ── Seção: Tipos de Equipamento ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-800" style={{ fontWeight: 600 }}>Tipos de Equipamento</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full" style={{ fontWeight: 600 }}>
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

              <p className="text-xs text-gray-400 mb-3">
                Arraste para reordenar. Esses tipos aparecem no cadastro de equipamentos.
              </p>

              {/* Campo para adicionar */}
              <div className="flex gap-2 mb-3">
                <Input
                  ref={inputRef}
                  value={novoTipo}
                  onChange={e => setNovoTipo(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && adicionarTipo()}
                  placeholder="Novo tipo..."
                  className="h-8 text-sm flex-1"
                />
                <Button size="sm" className="h-8 gap-1 px-3" onClick={adicionarTipo}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Lista de tipos */}
              <div className="space-y-1 border border-gray-100 rounded-xl overflow-hidden">
                {tiposEquipamento.length === 0 && (
                  <div className="py-8 text-center text-xs text-gray-400">
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
            </section>

            {/* ── Separador ── */}
            <div className="border-t border-gray-100" />

            {/* ── Info ── */}
            <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
              <p style={{ fontWeight: 600 }} className="text-gray-600">Sobre as configurações</p>
              <p>Todas as configurações são salvas automaticamente e persistem entre sessões.</p>
              <p>Alterações nos tipos não afetam equipamentos já cadastrados.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
