import { Info, X } from 'lucide-react';
import { useState } from 'react';

interface ConfigInfoProps {
  title: string;
  items: string[];
}

export function ConfigInfo({ title, items }: ConfigInfoProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Proteção contra items undefined ou null
  const safeItems = items || [];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
      >
        <Info className="w-4 h-4" />
        Onde isso é usado?
      </button>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <h4 className="font-semibold text-blue-900">{title}</h4>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-blue-600 hover:text-blue-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {safeItems.length > 0 ? (
        <ul className="space-y-1 ml-7">
          {safeItems.map((item, index) => (
            <li key={index} className="text-sm text-blue-700">
              • {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-blue-700 ml-7">Nenhum uso encontrado</p>
      )}
    </div>
  );
}