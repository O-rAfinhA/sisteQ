import { useState } from 'react';
import { useStrategic } from '../context/StrategicContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Plus, X, Edit2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ParteInteressada } from '../types/strategic';
import { MetricCard } from '../components/ui/metric-card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';

export default function PartesInteressadas() {
  const { dados, addParteInteressada, updateParteInteressada, deleteParteInteressada } = useStrategic();
  const [editandoParte, setEditandoParte] = useState<ParteInteressada | null>(null);
  
  const [novoNome, setNovoNome] = useState('');
  const [novaExpectativa, setNovaExpectativa] = useState('');
  const [novoAtendimento, setNovoAtendimento] = useState('');

  const handleAddParte = () => {
    if (novoNome.trim()) {
      addParteInteressada({
        nome: novoNome.trim(),
        expectativa: novaExpectativa.trim(),
        atendimento: novoAtendimento.trim(),
      });
      setNovoNome('');
      setNovaExpectativa('');
      setNovoAtendimento('');
      toast.success('Parte interessada adicionada com sucesso!');
    } else {
      toast.error('Por favor, informe o nome da parte interessada.');
    }
  };

  const handleUpdateParte = (id: string, nome: string, expectativa: string, atendimento: string) => {
    updateParteInteressada(id, { nome, expectativa, atendimento });
    setEditandoParte(null);
    toast.success('Parte interessada atualizada com sucesso!');
  };

  const handleDeleteParte = (id: string) => {
    deleteParteInteressada(id);
    toast.success('Parte interessada removida com sucesso!');
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* ═══ PAGE HEADER ═══ */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Partes Interessadas
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Identifique as partes interessadas, suas expectativas e como são atendidas.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2 flex-shrink-0 ml-8">
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Nova Parte Interessada</DialogTitle>
              <DialogDescription>
                Cadastre uma nova parte interessada no sistema.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Nome da Parte Interessada *</Label>
                <Input
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: Clientes, Fornecedores, Acionistas..."
                />
              </div>
              <div>
                <Label>Expectativa</Label>
                <Textarea
                  value={novaExpectativa}
                  onChange={(e) => setNovaExpectativa(e.target.value)}
                  placeholder="Descreva as expectativas desta parte interessada..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Atendimento</Label>
                <Textarea
                  value={novoAtendimento}
                  onChange={(e) => setNovoAtendimento(e.target.value)}
                  placeholder="Descreva como esta expectativa é atendida..."
                  rows={3}
                />
              </div>
              <Button
                onClick={() => {
                  if (novoNome.trim()) {
                    handleAddParte();
                  } else {
                    toast.error('Por favor, informe o nome da parte interessada.');
                  }
                }}
                className="w-full"
              >
                Adicionar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ═══ MetricCard ═══ */}
      <div className="grid grid-cols-1 max-w-xs">
        <MetricCard
          label="Total de Partes Interessadas"
          value={dados.partesInteressadas.length}
          icon={Users}
          variant="info"
        />
      </div>

      {/* ═══ LISTA ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-gray-900 flex items-center gap-2" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
            <Users className="w-4 h-4 text-gray-400" />
            Partes Interessadas
          </h3>
          <span className="text-xs text-gray-400">
            {dados.partesInteressadas.length} {dados.partesInteressadas.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {dados.partesInteressadas.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {dados.partesInteressadas.map((parte) => (
              <div key={parte.id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-blue-500" />
                      </div>
                      <h3 className="text-gray-900 truncate" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                        {parte.nome}
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-6 ml-10">
                      <div>
                        <p className="text-xs text-gray-400 mb-1" style={{ fontWeight: 500 }}>Expectativa</p>
                        <p className="text-sm text-gray-600">{parte.expectativa || 'Não especificada'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1" style={{ fontWeight: 500 }}>Atendimento</p>
                        <p className="text-sm text-gray-600">{parte.atendimento || 'Não especificado'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setEditandoParte(parte)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Editar Parte Interessada</DialogTitle>
                          <DialogDescription>
                            Atualize as informações da parte interessada.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div>
                            <Label>Nome</Label>
                            <Input
                              defaultValue={parte.nome}
                              id={`edit-nome-${parte.id}`}
                            />
                          </div>
                          <div>
                            <Label>Expectativa</Label>
                            <Textarea
                              defaultValue={parte.expectativa}
                              id={`edit-expectativa-${parte.id}`}
                              rows={3}
                            />
                          </div>
                          <div>
                            <Label>Atendimento</Label>
                            <Textarea
                              defaultValue={parte.atendimento}
                              id={`edit-atendimento-${parte.id}`}
                              rows={3}
                            />
                          </div>
                          <Button
                            onClick={() => {
                              const nome = (document.getElementById(`edit-nome-${parte.id}`) as HTMLInputElement).value;
                              const expectativa = (document.getElementById(`edit-expectativa-${parte.id}`) as HTMLTextAreaElement).value;
                              const atendimento = (document.getElementById(`edit-atendimento-${parte.id}`) as HTMLTextAreaElement).value;
                              handleUpdateParte(parte.id, nome, expectativa, atendimento);
                            }}
                            variant="black"
                            className="w-full"
                          >
                            Salvar Alterações
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteParte(parte.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-900 mb-1" style={{ fontSize: '1rem', fontWeight: 600 }}>
              Nenhuma parte interessada cadastrada
            </p>
            <p className="text-sm text-gray-400">
              Clique em "Adicionar" para cadastrar a primeira.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
