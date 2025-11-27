import React from 'react';
import { CheckCircle2, FlaskConical, Timer, AlertTriangle, CalendarDays, Pill, Syringe as SyringeIcon, Droplets, Tablets, Pipette, SprayCan } from 'lucide-react';

export default function MedicationCard({ med, activeRoom, selectedPrescriptionItems, togglePrescriptionItem, updateItemDays, isDarkMode }) {
  
  const getMedTypeIcon = (type) => {
    if (!type) return <Pill size={14} />;
    const t = type.toLowerCase();
    if (t.includes('injet')) return <SyringeIcon size={14} className="text-rose-500" />;
    if (t.includes('gota') || t.includes('solu') || t.includes('xarope') || t.includes('susp')) return <Droplets size={14} className="text-blue-500" />;
    if (t.includes('comp') || t.includes('cap')) return <Tablets size={14} className="text-emerald-500" />;
    if (t.includes('tópi') || t.includes('pomada') || t.includes('creme')) return <Pipette size={14} className="text-amber-500" />;
    if (t.includes('inal') || t.includes('spray')) return <SprayCan size={14} className="text-purple-500" />;
    return <Pill size={14} className="text-slate-500" />;
  };

  const inferMedType = (med) => {
    if (med.tipo && med.tipo !== "N/A") return med.tipo;
    const name = med.farmaco?.toLowerCase() || "";
    const via = med.via?.toLowerCase() || "";
    if (via.includes('ev') || via.includes('iv') || via.includes('im') || via.includes('sc')) return "Injetável";
    if (name.includes('gotas')) return "Gotas";
    if (name.includes('xarope')) return "Xarope";
    if (name.includes('comprimido')) return "Comprimido";
    if (name.includes('creme') || name.includes('pomada')) return "Tópico";
    if (name.includes('spray') || name.includes('bombinha')) return "Inalatório";
    return "Medicamento";
  };

  const getMedTypeColor = (type) => {
    const base = isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200';
    if (!type) return base;
    const t = type.toLowerCase();
    if (isDarkMode) {
        if (t.includes('injet')) return 'bg-rose-900/30 text-rose-300 border-rose-800/50';
        if (t.includes('gota') || t.includes('solu') || t.includes('xarope')) return 'bg-blue-900/30 text-blue-300 border-blue-800/50';
        if (t.includes('comp') || t.includes('cap')) return 'bg-emerald-900/30 text-emerald-300 border-emerald-800/50';
        if (t.includes('tópi')) return 'bg-amber-900/30 text-amber-300 border-amber-800/50';
        return base;
    } else {
        if (t.includes('injet')) return 'bg-rose-50 text-rose-700 border-rose-200';
        if (t.includes('gota') || t.includes('solu') || t.includes('xarope')) return 'bg-blue-50 text-blue-700 border-blue-200';
        if (t.includes('comp') || t.includes('cap')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (t.includes('tópi')) return 'bg-amber-50 text-amber-700 border-amber-200';
        return base;
    }
  };

  const itemId = med.farmaco + (med.receita?.nome_comercial || "");
  const isSelected = selectedPrescriptionItems.some(item => (item.farmaco + (item.receita?.nome_comercial || "")) === itemId);
  const canSelect = activeRoom === 'verde' && med.receita;
  const medType = inferMedType(med); 
  const isInjectable = medType.toLowerCase().includes('injet');
  const selectedItemState = selectedPrescriptionItems.find(item => (item.farmaco + (item.receita?.nome_comercial || "")) === itemId);
  const currentDays = selectedItemState ? selectedItemState.dias_tratamento : (med.receita?.dias_sugeridos || 5);

  return (
    <div 
      onClick={() => canSelect && togglePrescriptionItem(med)}
      className={`${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-gray-200'} rounded-xl border p-5 shadow-sm transition-all relative overflow-hidden group mb-4 ${canSelect ? 'cursor-pointer hover:border-blue-300 hover:shadow-md' : ''} ${isSelected ? (isDarkMode ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-900/20' : 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/30') : ''}`}
    >
       <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isSelected ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
       {canSelect && (<div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 text-transparent'}`}><CheckCircle2 size={14} /></div>)}
       
       <div className="absolute top-4 right-12">
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getMedTypeColor(medType)}`}>{getMedTypeIcon(medType)} {medType}</span>
       </div>

       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-3 pl-3 pr-20">
          <div>
             <div className="flex items-center gap-2"><h4 className={`text-xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{med.farmaco}</h4></div>
             <span className={`text-sm italic ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{med.indicacao}</span>
          </div>
          {med.via && <span className={`text-xs font-bold px-3 py-1 rounded-full border ${isDarkMode ? 'bg-emerald-900/30 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{med.via}</span>}
       </div>
       
       <div className={`${isDarkMode ? 'bg-slate-900/50 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-700'} rounded-lg p-3 ml-3 mb-3 font-mono text-sm border`}><strong className={`block text-xs uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Sugestão de Uso / Dose:</strong>{med.sugestao_uso || med.dose}</div>
       
       {canSelect && isSelected && (
         <div className="ml-3 mb-3 animate-in slide-in-from-top-1" onClick={(e) => e.stopPropagation()}>
            <label className={`text-xs font-bold flex items-center gap-1 mb-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}><CalendarDays size={12} /> Duração (Dias):</label>
            <input type="number" min="1" className={`w-20 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold ${isDarkMode ? 'bg-slate-900 border-slate-600 text-white' : 'border-blue-300 text-blue-900'}`} value={currentDays} onChange={(e) => updateItemDays(itemId, parseInt(e.target.value))} />
         </div>
       )}
       
       <div className="grid sm:grid-cols-2 gap-4 ml-3 text-sm">
          {isInjectable && med.diluicao && (<div className={`flex gap-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}><FlaskConical size={16} className="shrink-0 mt-0.5"/><span><strong>Diluição:</strong> {med.diluicao}</span></div>)}
          {isInjectable && med.modo_admin && (<div className={`flex gap-2 ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}><Timer size={16} className="shrink-0 mt-0.5"/><span><strong>Infusão:</strong> {med.modo_admin} {med.tempo_infusao ? `(${med.tempo_infusao})` : ''}</span></div>)}
          {med.cuidados && <div className={`flex gap-2 col-span-2 ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}><AlertTriangle size={16} className="shrink-0 mt-0.5"/><span><strong>Atenção:</strong> {med.cuidados}</span></div>}
       </div>
    </div>
  );
}