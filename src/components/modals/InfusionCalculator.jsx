import React, { useState, useEffect } from 'react';
import { Calculator, X } from 'lucide-react';

export default function InfusionCalculator({ isOpen, onClose, isDarkMode }) {
  const [calcInputs, setCalcInputs] = useState({
    dose: '', peso: '', conc: '', tp_dose: 'mcgmin', tp_conc: 'mgml'
  });
  const [calcResult, setCalcResult] = useState('---');

  const calcularMl = () => {
    const dose = parseFloat(calcInputs.dose);
    const peso = parseFloat(calcInputs.peso);
    const conc = parseFloat(calcInputs.conc);
    const tp_dose = calcInputs.tp_dose;
    const tp_conc = calcInputs.tp_conc;

    if (isNaN(dose) || isNaN(peso) || isNaN(conc) || dose <= 0 || peso <= 0 || conc <= 0) {
      setCalcResult("Preencha valores válidos.");
      return;
    }
    let dosePeloPeso = dose * peso;
    let doseTotalHora = tp_dose.includes('min') ? dosePeloPeso * 60 : dosePeloPeso;
    if (tp_dose.includes('mg')) doseTotalHora = doseTotalHora * 1000;
    
    let concPadronizada = tp_conc === 'mgml' ? conc * 1000 : conc;
    let resultado = doseTotalHora / concPadronizada;

    setCalcResult(resultado < 1 ? resultado.toFixed(2) + " ml/h" : resultado.toFixed(1) + " ml/h");
  };

  useEffect(() => { if (isOpen) calcularMl(); }, [calcInputs, isOpen]);
  const handleCalcChange = (field, value) => setCalcInputs(prev => ({ ...prev, [field]: value }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white'}`}>
        <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-rose-900/30 border-rose-800/50' : 'bg-rose-50 border-rose-100'}`}>
          <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-rose-300' : 'text-rose-800'}`}><Calculator size={20} /> Calculadora de Infusão</h3>
          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-rose-900/50 text-rose-300' : 'hover:bg-rose-100 text-rose-700'}`}><X size={20}/></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Peso do Paciente</label>
            <div className="relative">
                <input type="number" value={calcInputs.peso} onChange={(e) => handleCalcChange('peso', e.target.value)} placeholder="0.0" className={`w-full pl-4 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-rose-500 font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-slate-800'}`} />
                <span className="absolute right-4 top-3.5 text-xs font-bold text-gray-400">kg</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Dose Desejada</label>
            <div className="flex gap-2">
                <input type="number" value={calcInputs.dose} onChange={(e) => handleCalcChange('dose', e.target.value)} placeholder="0.0" className={`w-1/2 pl-4 py-3 border rounded-xl focus:ring-2 focus:ring-rose-500 font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-slate-800'}`} />
                <select value={calcInputs.tp_dose} onChange={(e) => handleCalcChange('tp_dose', e.target.value)} className={`w-1/2 px-2 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-rose-500 outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-gray-200 text-slate-600'}`}>
                  <option value="mcgmin">mcg/kg/min</option><option value="mgmin">mg/kg/min</option><option value="mcgh">mcg/kg/h</option><option value="mgh">mg/kg/h</option>
                </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Concentração da Solução</label>
            <div className="flex gap-2">
                <input type="number" value={calcInputs.conc} onChange={(e) => handleCalcChange('conc', e.target.value)} placeholder="0.0" className={`w-1/2 pl-4 py-3 border rounded-xl focus:ring-2 focus:ring-rose-500 font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-slate-800'}`} />
                <select value={calcInputs.tp_conc} onChange={(e) => handleCalcChange('tp_conc', e.target.value)} className={`w-1/2 px-2 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-rose-500 outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-gray-200 text-slate-600'}`}>
                  <option value="mgml">mg/ml</option><option value="mcgml">mcg/ml</option>
                </select>
            </div>
          </div>
          <div className={`rounded-xl p-6 text-center mt-6 ${isDarkMode ? 'bg-rose-900/20' : 'bg-rose-100'}`}>
            <span className={`text-xs font-bold uppercase mb-1 block ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>Velocidade de Infusão</span>
            <div className={`text-3xl font-extrabold ${isDarkMode ? 'text-rose-200' : 'text-rose-900'}`}>{calcResult}</div>
          </div>
        </div>
      </div>
    </div>
  );
}