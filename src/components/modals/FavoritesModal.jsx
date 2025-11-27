import React from 'react';
import { Star, X, Trash2 } from 'lucide-react';

export default function FavoritesModal({ isOpen, onClose, isDarkMode, favorites, loadFavoriteConduct, removeFavoriteFromList }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
        <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-yellow-900/20 border-yellow-800/30' : 'bg-yellow-50 border-yellow-100'}`}>
          <div className={`flex items-center gap-2 font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-800'}`}><Star size={20} fill="currentColor" /> Meus Favoritos</div>
          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-yellow-100 text-yellow-700'}`}><X size={20} /></button>
        </div>
        <div className={`p-2 max-h-[60vh] overflow-y-auto ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
          {favorites.length === 0 ? (<div className="text-center p-8 text-slate-400 text-sm">Você ainda não tem favoritos.</div>) : (<div className="space-y-2">{favorites.map((fav) => (<div key={fav.id} className={`p-3 rounded-lg border shadow-sm flex items-center justify-between group transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-blue-500' : 'bg-white border-gray-200 hover:border-blue-300'}`}><button onClick={() => loadFavoriteConduct(fav)} className="flex-1 text-left"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full shrink-0 ${fav.room === 'verde' ? 'bg-emerald-500' : fav.room === 'amarela' ? 'bg-amber-500' : 'bg-rose-500'}`} /><span className={`font-bold text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{fav.query}</span></div><span className="text-[10px] text-slate-400 ml-4">{new Date(fav.lastAccessed).toLocaleDateString()}</span></button><button onClick={(e) => { e.stopPropagation(); removeFavoriteFromList(fav.id); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors" title="Remover"><Trash2 size={16} /></button></div>))}</div>)}
        </div>
      </div>
    </div>
  );
}