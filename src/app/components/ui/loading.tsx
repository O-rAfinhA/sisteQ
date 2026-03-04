/**
 * Componentes de Loading otimizados e reutilizáveis
 */

import { cn } from './utils';

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export function LoadingSpinner({ 
  size = 'md', 
  className 
}: Pick<LoadingProps, 'size' | 'className'>) {
  return (
    <div
      className={cn(
        'border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin',
        sizeClasses[size],
        className
      )}
    />
  );
}

export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

export function LoadingPulse({ 
  size = 'md',
  className 
}: Pick<LoadingProps, 'size' | 'className'>) {
  return (
    <div
      className={cn(
        'bg-blue-600 rounded-full animate-pulse',
        sizeClasses[size],
        className
      )}
    />
  );
}

export function Loading({
  size = 'md',
  variant = 'spinner',
  text,
  fullScreen = false,
  className,
}: LoadingProps) {
  const LoadingComponent = variant === 'spinner' 
    ? LoadingSpinner 
    : variant === 'dots' 
    ? LoadingDots 
    : LoadingPulse;

  const content = (
    <div className={cn(
      'flex flex-col items-center justify-center gap-3',
      fullScreen && 'min-h-screen',
      className
    )}>
      <LoadingComponent size={size} />
      {text && (
        <p className="text-sm text-gray-600 font-medium">{text}</p>
      )}
    </div>
  );

  return content;
}

export function PageLoader({ text = 'Carregando...' }: { text?: string }) {
  return (
    <Loading
      size="lg"
      variant="spinner"
      text={text}
      fullScreen
    />
  );
}

export function InlineLoader({ 
  text, 
  size = 'sm' 
}: { 
  text?: string; 
  size?: 'sm' | 'md' 
}) {
  return (
    <div className="flex items-center gap-2">
      <LoadingSpinner size={size} />
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  );
}

export function Skeleton({ 
  className, 
  count = 1 
}: { 
  className?: string; 
  count?: number 
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'animate-pulse bg-gray-200 rounded',
            className
          )}
        />
      ))}
    </>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className="h-10 flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border rounded-lg p-6 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
