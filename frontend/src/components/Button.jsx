const variants = {
  primary:
    'bg-forest text-white hover:bg-forest-deep disabled:bg-forest/50',
  secondary:
    'bg-white text-ink border border-line-strong hover:bg-cream disabled:opacity-50',
  ghost: 'bg-transparent text-ink hover:bg-cream disabled:opacity-50',
  light: 'bg-white text-forest hover:bg-cream disabled:opacity-60',
};

const sizes = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-sm',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={`group inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
