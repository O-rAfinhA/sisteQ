import { useState } from 'react';
import { MessageSquare, Plus, Edit2, Trash2, Building2, Search, Filter } from 'lucide-react';
import { ComunicacaoItem } from '../types/communication';
import { ComunicacaoDialog } from '../components/ComunicacaoDialog';
import { Card, CardContent } from '../components/ui/card';
import { MetricCard } from '../components/ui/metric-card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { generateId } from '../utils/helpers';
import { useLocalStorage } from '../hooks/useLocalStorage';

export function PlanoComunicacao() {
  const [items, setItems] = useLocalStorage<ComunicacaoItem[]>('planoComunicacao', []);
  const [searchTerm, setSearchTerm] = useState('');

  const handleAdd = (newItemData: Omit<ComunicacaoItem, 'id'>) => {
    const newItem: ComunicacaoItem = {
      id: generateId(),
      ...newItemData
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleUpdate = (id: string, updatedData: Omit<ComunicacaoItem, 'id'>) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...updatedData } : item
    ));
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente excluir este item do plano de comunicação?')) {
      setItems(prev => prev.filter(item => item.id !== id));
      toast.success('Comunicação removida com sucesso!');
    }
  };

  const filteredItems = items.filter(item => 
    item.setor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.informacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.comoComunicar.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Plano de Comunicação
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Gerencie e planeje as comunicações entre setores e departamentos da organização.
          </p>
        </div>
        
        <ComunicacaoDialog
          mode="new"
          onSave={handleAdd}
          trigger={
            <Button className="bg-black hover:bg-black/90 active:bg-black/80 text-white gap-2">
              <Plus className="w-4 h-4" />
              Nova Comunicação
            </Button>
          }
        />
      </div>

      {/* Cards de Resumo - Mini Dash Compacto */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label="Setores Envolvidos"
          value={new Set(items.map(i => i.setor)).size}
          icon={Building2}
          variant="purple"
        />
        <MetricCard
          label="Total de Comunicações"
          value={items.length}
          icon={MessageSquare}
          variant="info"
        />
        <MetricCard
          label="Canais Utilizados"
          value={new Set(items.map(i => i.comoComunicar).filter(Boolean)).size}
          icon={Filter}
          variant="default"
        />
      </div>

      {/* Barra de Ferramentas */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input 
            className="pl-10 bg-white" 
            placeholder="Buscar por setor, informação ou canal..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-900 mb-1" style={{ fontSize: '1rem', fontWeight: 600 }}>
              Nenhuma comunicação cadastrada
            </p>
            <p className="text-sm text-gray-400 mb-4">
              Use o botão "Nova Comunicação" no canto superior direito para adicionar a primeira
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/60">
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                    Setor
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                    Informação
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                    Como Comunicar
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                    Quem Comunicará
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                    Quando Comunicará
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                    A Quem Comunicar
                  </th>
                  <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-500" />
                        <span className="font-medium">{item.setor}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.informacao}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.comoComunicar}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.quemComunicara}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.quandoComunicara}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.aQuemComunicar}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <ComunicacaoDialog
                          mode="edit"
                          item={item}
                          onSave={(updated) => handleUpdate(item.id, updated)}
                          trigger={
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          }
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredItems.length === 0 && searchTerm && (
              <div className="text-center py-8 text-gray-500">
                Nenhum resultado encontrado para "{searchTerm}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
