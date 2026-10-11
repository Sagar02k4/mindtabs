import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import Button from '../../components/Button';

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" className="relative glass rounded-2xl p-6 max-w-md w-full animate-scale-in shadow-2xl shadow-black/50">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-surface-700/50 
                    text-surface-400 hover:text-surface-200 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0
                        border border-red-500/20">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <div>
            <h3 id="delete-dialog-title" className="text-lg font-semibold text-surface-100">{title || 'Confirm Delete'}</h3>
            <p className="text-sm text-surface-400 mt-1">
              {message || 'This action cannot be undone. Are you sure you want to proceed?'}
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" icon={Trash2} onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
