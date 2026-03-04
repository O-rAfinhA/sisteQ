import { Construction } from 'lucide-react';

export default function Fornecedores() {
  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      <div>
        <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
          Fornecedores
        </h1>
        <p className="text-gray-500 mt-1.5" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
          Gerencie fornecedores, avaliações e qualificações.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 bg-amber-50 rounded-xl flex items-center justify-center">
            <Construction className="w-7 h-7 text-amber-500" />
          </div>
          <p className="text-gray-900 mb-1" style={{ fontSize: '1rem', fontWeight: 600 }}>
            Módulo em Desenvolvimento
          </p>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            Este módulo está sendo desenvolvido e estará disponível em breve.
          </p>
        </div>
      </div>
    </div>
  );
}