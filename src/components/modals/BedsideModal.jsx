import React from 'react';
import { ClipboardList, X, Loader2, UserCheck, Pill, Search } from 'lucide-react';

export default function BedsideModal({ 
  isOpen, onClose, isDarkMode, bedsideAnamnesis, setBedsideAnamnesis, 
  bedsideExams, setBedsideExams, generateBedsideConduct, isGeneratingBedside, bedsideResult 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white'}`}>
        <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-indigo-900/30 border-slate-800' : 'bg-indigo-600 border-indigo-700'}`}>
          <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-indigo-300' : 'text-white'}`}><ClipboardList size={24} /> BedSide - Clinical Guidance</h3>
          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-indigo-700 text-white'}`}><X size={20}/></button>
        </div>
          
        <div className="p-6 overflow-y-auto flex-1 grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className={`text-xs font-bold uppercase mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Anamnese Completa</label>
              <textarea className={`w-full h-40 p-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed resize-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-slate-800'}`} placeholder="Descreva a história clínica..." value={bedsideAnamnesis} onChange={(e) => setBedsideAnamnesis(e.target.value)} />
            </div>
            <div>
              <label className={`text-xs font-bold uppercase mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Exames / Sinais Vitais</label>
              <textarea className={`w-full h-32 p-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed resize-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-slate-800'}`} placeholder="PA, FC, exames..." value={bedsideExams} onChange={(e) => setBedsideExams(e.target.value)} />
            </div>
            <button onClick={generateBedsideConduct} disabled={isGeneratingBedside} className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg ${isGeneratingBedside ? 'bg-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              {isGeneratingBedside ? <Loader2 className="animate-spin" /> : <><UserCheck size={20}/> Gerar Conduta Personalizada</>}
            </button>
          </div>

          <div className={`rounded-xl border p-4 overflow-y-auto max-h-[600px] ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-indigo-50 border-indigo-100'}`}>
            {!bedsideResult ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50"><ClipboardList size={48} className="mb-4 text-indigo-400" /><p className="text-sm font-bold">Aguardando dados...</p></div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div><h4 className={`text-xs font-bold uppercase border-b pb-1 mb-2 ${isDarkMode ? 'text-indigo-300 border-slate-600' : 'text-indigo-800 border-indigo-200'}`}>Hipóteses Diagnósticas</h4><ul className="list-disc list-inside text-sm space-y-1">{bedsideResult.hipoteses_diagnosticas?.map((h, i) => (<li key={i} className="font-bold">{h}</li>))}</ul></div>
                <div className={`p-3 rounded-lg text-sm italic border ${isDarkMode ? 'bg-slate-900/50 border-slate-600 text-slate-300' : 'bg-white border-indigo-100 text-slate-600'}`}>{bedsideResult.racional_clinico}</div>
                <div><h4 className={`text-xs font-bold uppercase border-b pb-1 mb-2 flex items-center gap-2 ${isDarkMode ? 'text-emerald-400 border-slate-600' : 'text-emerald-800 border-emerald-200'}`}><Pill size={14}/> Conduta Terapêutica</h4><div className="space-y-2">{bedsideResult.conduta_terapeutica?.map((item, i) => (<div key={i} className={`p-2 rounded border text-sm flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-600' : 'bg-white border-gray-200'}`}><span className="font-bold text-xs uppercase opacity-70">{item.tipo}</span><span className="font-medium">{item.detalhe}</span></div>))}</div></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}