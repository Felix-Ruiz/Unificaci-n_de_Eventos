"use client";

import { Bell } from 'lucide-react';

interface Props {
  enabled: boolean;
  onChange: (val: boolean) => void;
}

export default function FeedbackAdminPanel({ enabled, onChange }: Props) {
  return (
    <div className="bg-surface border border-white/5 p-6 rounded-2xl">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Bell className="h-5 w-5 text-purple-500" /> 
        Encuesta de Satisfacción (Nativa)
      </h2>
      <div className="flex items-center justify-between bg-black/30 p-4 rounded-xl border border-gray-800">
        <div>
            <h3 className="text-sm font-bold text-white">Activar Feedback Post-Evento</h3>
            <p className="text-xs text-gray-400">Creará automáticamente la ruta: /e/[alias-del-evento]/feedback</p>
        </div>
        <button 
          type="button" 
          onClick={() => onChange(!enabled)} 
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            enabled ? 'bg-purple-500' : 'bg-gray-700'
          }`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </button>
      </div>
    </div>
  );
}