import { TAG_OPTIONS } from '../utils/constants';

export default function TagBadge({ tag, size = 'sm', onClick, removable = false, onRemove }) {
  const tagOption = TAG_OPTIONS.find(t => t.id === tag);
  
  if (!tagOption) return null;

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-[10px]' 
    : 'px-2.5 py-1 text-xs';

  return (
    <span 
      className={`tag-badge ${tagOption.color} border ${sizeClasses} cursor-pointer select-none`}
      onClick={onClick}
    >
      {tagOption.label}
      {removable && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
          className="ml-0.5 hover:text-white transition-colors"
        >
          ×
        </button>
      )}
    </span>
  );
}
