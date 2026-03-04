/**
 * Componente de Empty State reutilizável e otimizado
 */

import { LucideIcon } from 'lucide-react';
import { Button } from './button';
import { cn } from './utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: {
    container: 'py-8',
    icon: 'w-12 h-12',
    title: 'text-base',
    description: 'text-xs',
  },
  md: {
    container: 'py-12',
    icon: 'w-16 h-16',
    title: 'text-lg',
    description: 'text-sm',
  },
  lg: {
    container: 'py-16',
    icon: 'w-20 h-20',
    title: 'text-xl',
    description: 'text-base',
  },
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = 'md',
}: EmptyStateProps) {
  const config = sizeConfig[size];
  const ActionIcon = action?.icon;

  return (
    <div className={cn('flex items-center justify-center', config.container, className)}>
      <div className="text-center max-w-md">
        {Icon && (
          <Icon className={cn(config.icon, 'mx-auto mb-4 text-gray-400')} />
        )}
        
        <h3 className={cn('font-medium text-gray-900 mb-2', config.title)}>
          {title}
        </h3>
        
        {description && (
          <p className={cn('text-gray-500 mb-6', config.description)}>
            {description}
          </p>
        )}
        
        {action && (
          <Button onClick={action.onClick} className="gap-2">
            {ActionIcon && <ActionIcon className="w-4 h-4" />}
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}

export function EmptyTableState({ 
  message = 'Nenhum registro encontrado',
  colSpan 
}: { 
  message?: string;
  colSpan?: number;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        <p className="text-gray-500 text-sm">{message}</p>
      </td>
    </tr>
  );
}

export function EmptySearchState({ 
  searchTerm,
  onClear,
}: { 
  searchTerm: string;
  onClear: () => void;
}) {
  return (
    <div className="text-center py-12">
      <p className="text-gray-500 mb-2">
        Nenhum resultado encontrado para <strong>"{searchTerm}"</strong>
      </p>
      <Button variant="ghost" onClick={onClear} size="sm">
        Limpar busca
      </Button>
    </div>
  );
}
