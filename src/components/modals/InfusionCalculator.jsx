// Arquivo: src/components/modals/InfusionCalculator.jsx
import React, { useState, useEffect } from 'react';
import { Calculator, X, Syringe, Weight } from 'lucide-react';

export default function InfusionCalculator({ isOpen, onClose, isDarkMode }) {
  const [calcInputs, setCalcInputs] = useState({
    dose: '', 
    peso: '', 
    conc: '', 
    tp_dose: 'mcgmin', 
    tp_conc: 'mgml'
  });
  const [calcResult, setCalcResult] = useState('---');
  const [errorMsg, setErrorMsg] = useState('');

  const calcularMl = () => {
    // Pega os valores do Estado
    let dose = parseFloat(calcInputs.dose);
    let peso = parseFloat(calcInputs.peso);
    let conc = parseFloat(calcInputs.conc);
    
    let tp_dose = calcInputs.tp_dose; // ex: mcgmin, mgmin, mcgh, mgh
    let tp_conc = calcInputs.tp_conc; // ex: mgml, mcgml
    
    // Validação de entrada
    if (isNaN(dose) || isNaN(peso) || isNaN(conc) || dose <= 0 || peso <= 0 || conc <= 0) {
        setErrorMsg('Por favor, preencha todos os campos com valores válidos.');
        setCalcResult('---');
        return;
    } else {
        setErrorMsg('');
    }
    
    // 1. Ajusta Dose Pelo Peso
    let dosePeloPeso = dose * peso;
    
    // 2. Ajusta pelo Tempo (Minuto ou Hora)
    let doseTotalHora = 0;
    if (tp_dose.includes('min')) {
        doseTotalHora = dosePeloPeso * 60; // Converte de /min para /hora
    } else {
        doseTotalHora = dosePeloPeso; // Já está em /hora
    }
    
    // 3. Padroniza Unidades (tudo para mesma unidade antes de dividir)
    // Converte dose para mcg/hora se necessário (Lógica baseada no seu HTML)
    if (tp_dose.includes('mg') && !tp_dose.includes('mcg')) { 
        doseTotalHora = doseTotalHora * 1000; // mg para mcg
    }
    
    // Converte concentração para mcg/ml se necessário
    let concPadronizada = conc;
    if (tp_conc === 'mgml') {
        concPadronizada = conc * 1000; // mg/ml para mcg/ml
    }
    
    // 4. Cálculo Final: ml/h = (mcg/h) / (mcg/ml)
    let resultado = doseTotalHora / concPadronizada;
    
    // Exibe com formatação adequada
    if (resultado < 1) {
        setCalcResult(resultado.toFixed(2) + " ml/h");
    } else {
        setCalcResult(resultado.toFixed(1) + " ml/h");
    }
  };

  // Calcula automaticamente sempre que um input muda
  useEffect(() => {
    if (isOpen) calcularMl();
  }, [calcInputs, isOpen]);

  const handleCalcChange = (field, value) => {
    setCalcInputs(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
        
        {/* Header */}
        <div className="bg-blue-600 p-6 text-center relative">
            <button onClick={onClose} className="absolute right-4 top-4 text-blue-100 hover:text-white transition-colors">
                <X size={24}/>
            </button>
            <h1 className="text-white text-2xl font-bold flex items-center justify-center gap-2">
                <Syringe className="text-blue-200" size={24} /> Calc. Infusão
            </h1>
            <p className="text-blue-100 text-sm mt-1">Calculadora de Vazão (ml/h)</p>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
            
            {/* Peso do Paciente */}
            <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Peso do Paciente (kg)</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Weight className="text-gray-400" size={18} />
                    </div>
                    <input 
                        type="number" 
                        value={calcInputs.peso}
                        onChange={(e) => handleCalcChange('peso', e.target.value)}
                        placeholder="Ex: 70" 
                        className={`pl-10 block w-full rounded-lg border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                </div>
            </div>

            {/* Dose Desejada */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Dose</label>
                    <input 
                        type="number" 
                        value={calcInputs.dose}
                        onChange={(e) => handleCalcChange('dose', e.target.value)}
                        placeholder="Ex: 0.5" 
                        className={`block w-full rounded-lg border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Unidade</label>
                    <select 
                        value={calcInputs.tp_dose}
                        onChange={(e) => handleCalcChange('tp_dose', e.target.value)}
                        className={`block w-full rounded-lg border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    >
                        <option value="mcgmin">mcg/kg/min</option>
                        <option value="mgmin">mg/kg/min</option>
                        <option value="mcgh">mcg/kg/h</option>
                        <option value="mgh">mg/kg/h</option>
                    </select>
                </div>
            </div>

            <div className={`border-t border-dashed my-4 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}></div>

            {/* Concentração da Solução */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Concentração</label>
                    <input 
                        type="number" 
                        value={calcInputs.conc}
                        onChange={(e) => handleCalcChange('conc', e.target.value)}
                        placeholder="Ex: 2" 
                        className={`block w-full rounded-lg border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Unidade Conc.</label>
                    <select 
                        value={calcInputs.tp_conc}
                        onChange={(e) => handleCalcChange('tp_conc', e.target.value)}
                        className={`block w-full rounded-lg border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    >
                        <option value="mgml">mg/ml</option>
                        <option value="mcgml">mcg/ml</option>
                    </select>
                </div>
            </div>

            {/* Resultado */}
            {errorMsg ? (
                 <div className="text-center text-red-500 text-sm bg-red-50 p-2 rounded-lg border border-red-100">
                    {errorMsg}
                 </div>
            ) : (
                <div className={`rounded-xl p-4 text-center border ${isDarkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'}`}>
                    <p className={`text-sm font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>Vazão da Bomba</p>
                    <div className={`text-4xl font-bold ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                        {calcResult}
                    </div>
                </div>
            )}

        </div>
        
        <div className={`p-3 text-center text-xs ${isDarkMode ? 'bg-slate-950 text-slate-500' : 'bg-gray-50 text-gray-400'}`}>
            Verifique sempre os cálculos antes da administração.
        </div>
      </div>
    </div>
  );
}