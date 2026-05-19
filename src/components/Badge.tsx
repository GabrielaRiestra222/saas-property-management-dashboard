import type { ReactNode } from 'react';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'default' | string;

interface BadgeProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<string, string> = {
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
  pink: 'bg-pink-50 text-pink-700 border-pink-200',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  default: 'bg-gray-50 text-gray-700 border-gray-200',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const cls = variantClasses[variant] ?? variantClasses.default;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${cls} ${className}`}
    >
      {children}
    </span>
  );
}
