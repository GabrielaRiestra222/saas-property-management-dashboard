import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-[#FC9F5B] text-black shadow-sm hover:bg-[#FBD1A2] hover:shadow-md',
  secondary:
    'bg-white border border-border hover:border-[#FC9F5B] hover:bg-[#ECE4B7] text-black shadow-sm',
  ghost:
    'hover:bg-[#7DCFB6]/45 text-black',
  danger:
    'bg-red-700 hover:bg-red-800 text-white shadow-lg shadow-red-200 hover:-translate-y-0.5',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-5 py-3 text-base gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium rounded-xl transition-all
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${className}
      `}
    >
      {loading ? (
        <svg
          className="animate-spin w-4 h-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8z"
          />
        </svg>
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
