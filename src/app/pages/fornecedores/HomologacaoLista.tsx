import { useNavigate } from 'react-router';
import { CheckCircle, Clock, AlertTriangle, XCircle, Eye, Edit2, Trash2 } from 'lucide-react';
import { useFornecedores } from '../../hooks/useFornecedores';
import { getCriticidadeColor, getFornecedorStatusColor } from '../../utils/fornecedor-helpers';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import type { Fornecedor } from '../../types/fornecedor';

// ═══ Status visual configs locais (por design) ═══
const METRIC_CARDS = [
  {
    key: 'aguardando',
    label: 'Aguardando Homologação',
    icon: Clock,
    iconBg: 'bg-amber-50',
    iconBorder: 'border-amber-200',
    iconColor: 'text-amber-500',
  },
  {
    key: 'homologados',
    label: 'Homologados',
    icon: CheckCircle,
    iconBg: 'bg-emerald-50',
    iconBorder: 'border-emerald-200',
    iconColor: 'text-emerald-500',
  },
  {
    key: 'restricao',
    label: 'Hom. com Restrição',
    icon: AlertTriangle,
    iconBg: 'bg-amber-50',
    iconBorder: 'border-amber-200',
    iconColor: 'text-amber-500',
  },
  {
    key: 'reprovados',
    label: 'Reprovados',
    icon: XCircle,
    iconBg: 'bg-gray-100',
    iconBorder: 'border-gray-200',
    iconColor: 'text-gray-500',
  },
] as const;

// ═══ Componente de tabela reutilizável por grupo ═══
function GrupoTabela({
  titulo,
  fornecedores,
  emptyIcon: EmptyIcon,
  emptyMsg,
  colunas,
  renderRow,
}: {
  titulo: string;
  fornecedores: Fornecedor[];
  emptyIcon: React.ElementType;
  emptyMsg: string;
  colunas: { label: string; align: 'left' | 'center' }[];
  renderRow: (f: Fornecedor) => React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
          {titulo}
        </h3>
        <span className="text-xs text-gray-400">
          {fornecedores.length} {fornecedores.length === 1 ? 'fornecedor' : 'fornecedores'}
        </span>
      </div>

      {fornecedores.length === 0 ? (
        <div className="p-12 text-center">
          <EmptyIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">{emptyMsg}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/60">
                {colunas.map((col, idx) => (
                  <th
                    key={idx}
                    className={`py-3 px-4 text-xs text-gray-500 ${col.align === 'left' ? 'text-left' : 'text-center'}`}
                    style={{ fontWeight: 500 }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fornecedores.map(f => renderRow(f))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══ Colunas padrão para grupos já processados ═══
const COLUNAS_PADRAO = [
  { label: 'Fornecedor', align: 'left' as const },
  { label: 'CNPJ', align: 'center' as const },
  { label: 'Criticidade', align: 'center' as const },
  { label: 'Status', align: 'center' as const },
  { label: 'Ações', align: 'center' as const },
];

export function HomologacaoLista() {
  const { fornecedores } = useFornecedores();
  const navigate = useNavigate();

  const emHomologacao = fornecedores.filter(f => f.status === 'Em Homologação');
  const homologados = fornecedores.filter(f => f.status === 'Homologado');
  const homologadosComRestricao = fornecedores.filter(f => f.status === 'Homologado com Restrição');
  const reprovados = fornecedores.filter(f => f.status === 'Reprovado');

  const counts: Record<string, number> = {
    aguardando: emHomologacao.length,
    homologados: homologados.length,
    restricao: homologadosComRestricao.length,
    reprovados: reprovados.length,
  };

  // ═══ Ações padrão: ícones sem texto (Eye, Edit2, Trash2) ═══
  const renderAcoes = (fornecedor: Fornecedor) => (
    <td className="py-3 px-4">
      <div className="flex items-center justify-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/fornecedores/visualizar/${fornecedor.id}`)}
          title="Visualizar"
          className="h-8 w-8 p-0"
        >
          <Eye className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/fornecedores/homologacao/${fornecedor.id}`)}
          title="Editar"
          className="h-8 w-8 p-0"
        >
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (confirm(`Deseja remover ${fornecedor.razaoSocial} da homologação?`)) {
              toast.success('Fornecedor removido da homologação');
            }
          }}
          title="Excluir"
          className="h-8 w-8 p-0 text-red-600"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </td>
  );

  // ═══ Row padrão para grupos já processados (com coluna Status) ═══
  const renderRowPadrao = (fornecedor: Fornecedor) => (
    <tr key={fornecedor.id} className="hover:bg-gray-50/50 transition-colors">
      <td className="py-3 px-4">
        <div>
          <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{fornecedor.razaoSocial}</p>
          <p className="text-xs text-gray-400">{fornecedor.nomeFantasia}</p>
        </div>
      </td>
      <td className="py-3 px-4 text-center">
        <p className="text-sm text-gray-600 font-mono">{fornecedor.cnpj}</p>
      </td>
      <td className="py-3 px-4 text-center">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs ${getCriticidadeColor(fornecedor.criticidade)}`} style={{ fontWeight: 500 }}>
          {fornecedor.criticidade}
        </span>
      </td>
      <td className="py-3 px-4 text-center">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs ${getFornecedorStatusColor(fornecedor.status)}`} style={{ fontWeight: 500 }}>
          {fornecedor.status}
        </span>
      </td>
      {renderAcoes(fornecedor)}
    </tr>
  );

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* ═══ HEADER ═══ */}
      <div>
        <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
          Homologação de Fornecedores
        </h1>
        <p className="text-gray-500 mt-1.5" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
          Acompanhe o processo de homologação e seus resultados
        </p>
      </div>

      {/* ═══ METRIC CARDS — ícones circulares sem nomes ═══ */}
      <div className="grid grid-cols-4 gap-4">
        {METRIC_CARDS.map(card => {
          const Icon = card.icon;
          const count = counts[card.key];
          return (
            <div
              key={card.key}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500 truncate">{card.label}</p>
                  <p className="mt-1 text-gray-900 truncate" style={{ fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.2 }}>
                    {count}
                  </p>
                </div>
                <div
                  className={`w-10 h-10 rounded-full ${card.iconBg} border ${card.iconBorder} flex items-center justify-center flex-shrink-0 ml-3`}
                >
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ AGUARDANDO HOMOLOGAÇÃO ═══ */}
      <GrupoTabela
        titulo="Aguardando Homologação"
        fornecedores={emHomologacao}
        emptyIcon={CheckCircle}
        emptyMsg="Nenhum fornecedor aguardando homologação"
        colunas={[
          { label: 'Fornecedor', align: 'left' },
          { label: 'CNPJ', align: 'center' },
          { label: 'Tipo', align: 'center' },
          { label: 'Criticidade', align: 'center' },
          { label: 'Ações', align: 'center' },
        ]}
        renderRow={(fornecedor) => (
          <tr key={fornecedor.id} className="hover:bg-gray-50/50 transition-colors">
            <td className="py-3 px-4">
              <div>
                <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{fornecedor.razaoSocial}</p>
                <p className="text-xs text-gray-400">{fornecedor.nomeFantasia}</p>
              </div>
            </td>
            <td className="py-3 px-4 text-center">
              <p className="text-sm text-gray-600 font-mono">{fornecedor.cnpj}</p>
            </td>
            <td className="py-3 px-4 text-center">
              <div className="flex flex-wrap gap-1 justify-center">
                {fornecedor.tipo.map((t, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-violet-50 text-violet-700 border border-violet-200" style={{ fontWeight: 500 }}>
                    {t}
                  </span>
                ))}
              </div>
            </td>
            <td className="py-3 px-4 text-center">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs ${getCriticidadeColor(fornecedor.criticidade)}`} style={{ fontWeight: 500 }}>
                {fornecedor.criticidade}
              </span>
            </td>
            {renderAcoes(fornecedor)}
          </tr>
        )}
      />

      {/* ═══ HOMOLOGADOS ═══ */}
      <GrupoTabela
        titulo="Homologados"
        fornecedores={homologados}
        emptyIcon={AlertTriangle}
        emptyMsg="Nenhum fornecedor homologado ainda"
        colunas={COLUNAS_PADRAO}
        renderRow={renderRowPadrao}
      />

      {/* ═══ HOMOLOGADOS COM RESTRIÇÃO ═══ */}
      {homologadosComRestricao.length > 0 && (
        <GrupoTabela
          titulo="Homologados com Restrição"
          fornecedores={homologadosComRestricao}
          emptyIcon={AlertTriangle}
          emptyMsg=""
          colunas={COLUNAS_PADRAO}
          renderRow={renderRowPadrao}
        />
      )}

      {/* ═══ REPROVADOS ═══ */}
      {reprovados.length > 0 && (
        <GrupoTabela
          titulo="Reprovados"
          fornecedores={reprovados}
          emptyIcon={XCircle}
          emptyMsg=""
          colunas={COLUNAS_PADRAO}
          renderRow={renderRowPadrao}
        />
      )}
    </div>
  );
}
