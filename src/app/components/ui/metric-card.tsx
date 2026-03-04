import * as React from 'react';
import { TrendingUp, Clock } from 'lucide-react';
import { cn } from './utils';

// ─────────────────────────────────────────────
// MetricCard V2 — Componente padrão do Design System
// ─────────────────────────────────────────────
// Padrão visual:
//   bg-white rounded-xl border border-gray-200 p-5
//   hover:shadow-sm transition
//   Label: text-sm text-gray-500
//   Value: text-2xl / fontWeight: 600
//   Icon: w-10 h-10 rounded-lg
// ─────────────────────────────────────────────

export type MetricCardVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

const VARIANT_STYLES: Record<MetricCardVariant, { iconBg: string; iconColor: string; valueColor: string }> = {
  default: { iconBg: 'bg-gray-100', iconColor: 'text-gray-600', valueColor: 'text-gray-900' },
  success: { iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', valueColor: 'text-gray-900' },
  warning: { iconBg: 'bg-amber-50', iconColor: 'text-amber-600', valueColor: 'text-gray-900' },
  danger: { iconBg: 'bg-red-50', iconColor: 'text-red-600', valueColor: 'text-red-600' },
  info: { iconBg: 'bg-blue-50', iconColor: 'text-blue-600', valueColor: 'text-gray-900' },
  purple: { iconBg: 'bg-violet-50', iconColor: 'text-violet-600', valueColor: 'text-gray-900' },
};

const TREND_STYLES = {
  up: 'text-emerald-600',
  down: 'text-red-500',
  neutral: 'text-gray-500',
};

export interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  variant?: MetricCardVariant;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  variant = 'default',
  trend,
  trendLabel,
  onClick,
  active = false,
  className,
}: MetricCardProps) {
  const s = VARIANT_STYLES[variant];
  const isClickable = !!onClick;

  const Wrapper = isClickable ? 'button' : 'div';

  return (
    <Wrapper
      type={isClickable ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border border-gray-200 p-5 transition-all duration-200 text-left w-full',
        isClickable && 'cursor-pointer hover:shadow-sm',
        !isClickable && 'hover:shadow-sm',
        active && 'ring-2 ring-gray-900/20 border-gray-300 shadow-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 truncate">{label}</p>
          <p
            className={`mt-1 truncate ${s.valueColor}`}
            style={{ fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.2 }}
          >
            {value}
          </p>
          {trendLabel && trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${TREND_STYLES[trend]}`}>
              {trend === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
              {trend === 'down' && <TrendingUp className="w-3.5 h-3.5 rotate-180" />}
              {trend === 'neutral' && <Clock className="w-3.5 h-3.5" />}
              <span style={{ fontWeight: 500 }}>{trendLabel}</span>
            </div>
          )}
        </div>
        <div
          className={`w-10 h-10 rounded-lg ${s.iconBg} flex items-center justify-center flex-shrink-0 ml-3`}
        >
          <Icon className={`w-5 h-5 ${s.iconColor}`} />
        </div>
      </div>
    </Wrapper>
  );
}
