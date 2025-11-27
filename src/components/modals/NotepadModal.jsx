import React from 'react';
import { Edit, Cloud, CloudOff, X, Loader2, Save } from 'lucide-react';

export default function NotepadModal({ isOpen, onClose, isDarkMode, userNotes, handleNoteChange, currentUser, isCloudConnected, isSaving }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 print:hidden">
      <div className={`w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col h-[80vh] overflow-hidden ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
        <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}><Edit size={20} /></div><div><h3 className={`font-bold leading-none ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Meu Caderno</h3><div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">Anotações de {currentUser?.name}</span><span className="text-gray-300">•</span>{isCloudConnected ? (<span className="flex items-center gap-1 text-[10px] text-green-600 font-medium"><Cloud size={10} /> Nuvem Ativa</span>) : (<span className="flex items-center gap-1 text-[10px] text-amber-600 font-medium"><CloudOff size={10} /> Offline</span>)}</div></div></div>
          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-200 text-gray-500'}`}><X size={20}/></button>
        </div>
        <div className={`flex-1 relative ${isDarkMode ? 'bg-slate-800' : 'bg-yellow-50'}`}><textarea className={`w-full h-full p-6 resize-none focus:outline-none leading-relaxed bg-transparent text-lg font-medium font-serif ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`} placeholder="Escreva suas anotações..." value={userNotes} onChange={handleNoteChange} style={{ backgroundImage: isDarkMode ? 'linear-gradient(transparent, transparent 31px, #334155 31px)' : 'linear-gradient(transparent, transparent 31px, #e5e7eb 31px)', backgroundSize: '100% 32px', lineHeight: '32px' }} /></div>
        <div className={`p-3 border-t flex justify-between items-center text-xs text-gray-500 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}><div className="flex items-center gap-1.5">{isSaving ? (<><Loader2 size={14} className="text-blue-600 animate-spin" /><span className="text-blue-600">Salvando...</span></>) : (<><Save size={14} className="text-green-600" /><span>{isCloudConnected ? "Salvo na nuvem" : "Salvo localmente"}</span></>)}</div><span>{userNotes.length} caracteres</span></div>
      </div>
    </div>
  );
}
