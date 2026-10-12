const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

export default function Button({ 
  children, 
  variant = 'primary', 
  className = '', 
  icon: Icon, 
  iconRight: IconRight,
  size = 'md',
  ...props 
}) {
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: '',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button 
      className={`${variants[variant]} ${sizeClasses[size]} inline-flex items-center justify-center gap-2 ${className}`}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      {children}
      {IconRight && <IconRight size={size === 'sm' ? 14 : 16} />}
    </button>
  );
}
