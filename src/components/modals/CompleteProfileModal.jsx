// Arquivo: src/components/modals/CompleteProfileModal.jsx
import React, { useState } from 'react';
import { User, FileBadge, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function CompleteProfileModal({ isOpen, googleUser, onComplete }) {
  const [name, setName] = useState(googleUser?.displayName || '');
  const [crm, setCrm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onComplete(name, crm);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        <div className="bg-blue-900 p-6 text-center text-white">
          <h2 className="text-xl font-bold flex items-center justify-center gap-2">
            <User size={24} /> Completar Cadastro
          </h2>
          <p className="text-blue-200 text-xs mt-1">Precisamos de alguns dados para validar seu acesso médico.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg flex gap-3 items-start">
             <ShieldAlert className="text-yellow-600 shrink-0" size={20} />
             <p className="text-xs text-yellow-800 text-justify">
               Para garantir a segurança da plataforma, o acesso é restrito a médicos. Seu CRM será validado pelo administrador antes da liberação.
             </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nome Completo</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={20} />
              <input 
                type="text" 
                required
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-900 outline-none text-slate-800"
                placeholder="Dr. Nome Sobrenome"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">CRM / UF</label>
            <div className="relative">
              <FileBadge className="absolute left-3 top-3 text-gray-400" size={20} />
              <input 
                type="text" 
                required
                value={crm} 
                onChange={(e) => setCrm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-900 outline-none text-slate-800"
                placeholder="Ex: 123456/SP"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg mt-2"
          >
            {isLoading ? 'Salvando...' : <><CheckCircle2 size={20}/> Finalizar Solicitação</>}
          </button>
        </form>
      </div>
    </div>
  );
}