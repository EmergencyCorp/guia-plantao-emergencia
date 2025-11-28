// Arquivo: src/components/DisclaimerScreen.jsx
import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function DisclaimerScreen({ onAccept, isDarkMode, toggleTheme }) {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-sans ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-slate-800'}`}>
      <div className={`rounded-3xl shadow-2xl border max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
        
        <div className="bg-gradient-to-br from-red-900 to-slate-900 p-6 text-center text-white relative shrink-0">
          <div className="absolute top-4 right-4"><ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} /></div>
          <div className="flex justify-center mb-2"><div className="bg-white/10 p-3 rounded-full"><ShieldAlert size={32} className="text-red-400" /></div></div>
          <h1 className="text-xl font-bold">Termo de Responsabilidade</h1>
          <p className="text-red-100 text-xs font-medium uppercase tracking-wider">Leitura Obrigatória</p>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className={`p-4 rounded-xl border text-xs sm:text-sm leading-relaxed text-justify mb-6 ${isDarkMode ? 'bg-slate-950/50 border-slate-800 text-slate-300' : 'bg-gray-50 border-gray-200 text-slate-600'}`}>
            <p className="mb-3"><strong>1. NATUREZA DA FERRAMENTA:</strong> Este aplicativo é suporte à decisão clínica. NÃO substitui o julgamento profissional.</p>
            <p className="mb-3"><strong>2. LIMITAÇÃO DE RESPONSABILIDADE:</strong> Baseado em diretrizes gerais. O autor isenta-se de erros ou consequências do uso.</p>
            <p className="mb-3"><strong>3. USO DE IA:</strong> A IA pode conter imprecisões. Todas sugestões devem ser validadas.</p>
            <p><strong>4. ACEITE:</strong> Você declara ser médico e assume total responsabilidade pelas condutas.</p>
          </div>

          <div onClick={() => setIsChecked(!isChecked)} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${isChecked ? (isDarkMode ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200') : (isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200')}`}>
            <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-400'}`}>{isChecked && <CheckCircle2 size={14} />}</div>
            <div><p className={`font-bold text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Declaro que li e concordo.</p></div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-slate-800 shrink-0">
          <button onClick={onAccept} disabled={!isChecked} className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${isChecked ? 'bg-red-700 hover:bg-red-800 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'}`}>
            {isChecked ? "Acessar Sistema" : "Aguardando Aceite..."}
          </button>
        </div>

      </div>
    </div>
  );
}