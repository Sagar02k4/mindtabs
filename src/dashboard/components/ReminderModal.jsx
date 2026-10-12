import React, { useEffect, useRef, useState } from 'react';
import { Bell, Clock, X } from 'lucide-react';
import Button from '../../components/Button';
import { REMINDER_PRESETS } from '../../utils/constants';
import useTabStore from '../../store/tabStore';

export default function ReminderModal({ isOpen, onClose, tab }) {
  const [customDateTime, setCustomDateTime] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(null);
  const { setReminder } = useTabStore();

  const closeButtonRef = useRef(null);
  useEffect(() => {
    if (!isOpen) return undefined;
    closeButtonRef.current?.focus();
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !tab) return null;

  const handleSetReminder = async (preset) => {
    if (preset.id === 'custom') {
      setSelectedPreset('custom');
      return;
    }
    await setReminder(tab.id, preset.getTime());
    onClose();
  };

  const handleCustomReminder = async () => {
    if (!customDateTime) return;
    const time = new Date(customDateTime).getTime();
    if (time <= Date.now()) return;
    await setReminder(tab.id, time);
    onClose();
    setCustomDateTime('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div role="dialog" aria-modal="true" aria-labelledby="reminder-dialog-title" className="relative glass rounded-2xl p-6 max-w-sm w-full animate-scale-in shadow-2xl shadow-black/50">
        <button
          type="button"
          ref={closeButtonRef}
          aria-label="Close reminder dialog"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-surface-700/50 
                    text-surface-400 hover:text-surface-200 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center
                        border border-amber-500/20">
            <Bell size={20} className="text-amber-400" />
          </div>
          <div>
            <h3 id="reminder-dialog-title" className="text-base font-semibold text-surface-100">Set Reminder</h3>
            <p className="text-xs text-surface-400 truncate max-w-[200px]">{tab.title}</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {REMINDER_PRESETS.filter(p => p.id !== 'custom').map((preset) => (
            <button
              type="button"
              key={preset.id}
              onClick={() => handleSetReminder(preset)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                        glass-card transition-all duration-200"
            >
              <span className="text-lg">{preset.icon}</span>
              <span className="text-surface-200">{preset.label}</span>
            </button>
          ))}
        </div>

        <div className="border-t border-surface-700/50 pt-4">
          <label className="flex items-center gap-2 text-xs text-surface-400 font-medium mb-2">
            <Clock size={12} />
            Custom Time
          </label>
          <input 
            aria-label="Reminder date and time"
            type="datetime-local"
            value={customDateTime}
            onChange={(e) => setCustomDateTime(e.target.value)}
            className="input-field mb-2"
          />
          <Button 
            variant="primary" 
            className="w-full"
            onClick={handleCustomReminder}
            disabled={!customDateTime}
          >
            Set Reminder
          </Button>
        </div>
      </div>
    </div>
  );
}
