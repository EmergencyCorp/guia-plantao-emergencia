// Arquivo: src/components/modals/PhysicalExamModal.jsx
import React, { useState } from 'react';
import { X, User, Copy, Check, Stethoscope } from 'lucide-react';

export default function PhysicalExamModal({ isOpen, onClose, isDarkMode }) {
  const [gender, setGender] = useState('male'); // 'male' | 'female'
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Conteúdo extraído e organizado do arquivo examefisicopadrão.txt
  const examText = gender === 'male' 
    ? `EFG: BEG, CORADO, HIDRATADO, ANICTERICO, EUPNEICO EM AA.\nNEURO: LÚCIDO E ORIENTADO EM TEMPO E ESPAÇO, PUPILAS ISOCÓRICAS E FOTORREAGENTES, SEM DÉFICITS NEUROLÓGICOS FOCAIS, AUSÊNCIA DE SINAIS DE IRRITAÇÃO MENÍNGEA.\nCP: AUSÊNCIA DE HIPEREMIA E EXSUDATO EM OROFARINGE, OLHOS E OUVIDOS SEM ALTERAÇÕES, AUSÊNCIA DE DOR À PALPAÇÃO DE SEIOS DA FACE.\nAR: MV+ UNIFORMEMENTE AUDÍVEL, SEM RA. SP02 %.\nACV: BRNF EM RCR2T, SEM SOPROS. PULSOS RADIAIS NORMOPALPÁVEIS, AMPLOS E SIMÉTRICOS.\nABDOME: GLOBOSO (OU PLANO), RHA PRESENTES, NÃO PALPO VISCEROMEGALIAS OU MASSAS, INDOLOR A PALPAÇÃO, SEM SINAIS DE IRRITAÇÃO PERITONEAL.\nMMII: PANTURILHAS LIVRES. PULSOS PEDIOSOS NORMOPALPÁVEIS, AMPLOS E SIMÉTRICOS. NÃO HÁ EDEMAS BILATERALMENTE.`
    : `EFG: BEG, CORADA, HIDRATADA, ANICTERICA, EUPNEICA EM AA.\nNEURO: LÚCIDA E ORIENTADA EM TEMPO E ESPAÇO, PUPILAS ISOCÓRICAS E FOTORREAGENTES, SEM DÉFICITS NEUROLÓGICOS FOCAIS, AUSÊNCIA DE SINAIS DE IRRITAÇÃO MENÍNGEA.\nCP: AUSÊNCIA DE HIPEREMIA E EXSUDATO EM OROFARINGE, OLHOS E OUVIDOS SEM ALTERAÇÕES, AUSÊNCIA DE DOR À PALPAÇÃO DE SEIOS DA FACE.\nAR: MV+ UNIFORMEMENTE AUDÍVEL, SEM RA. SP02 %.\nACV: BRNF EM RCR2T, SEM SOPROS. PULSOS RADIAIS NORMOPALPÁVEIS, AMPLOS E SIMÉTRICOS.\nABDOME: GLOBOSO (OU PLANO), RHA PRESENTES, NÃO PALPO VISCEROMEGALIAS OU MASSAS, INDOLOR A PALPAÇÃO, SEM SINAIS DE IRRITAÇÃO PERITONEAL.\nMMII: PANTURILHAS LIVRES. PULSOS PEDIOSOS NORMOPALPÁVEIS, AMPLOS E SIMÉTRICOS. NÃO HÁ EDEMAS BILATERALMENTE.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(examText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white'}`}>
        
        {/* Header */}
        <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-gray-200'}`}>
          <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            <Stethoscope size={20} className="text-blue-500"/> Exame Físico Padrão
          </h3>
          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-slate-500'}`}>
            <X size={20}/>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          
          {/* Seletor de Gênero */}
          <div className="flex gap-2 mb-6">
            <button 
              onClick={() => setGender('male')}
              className={`flex-1 py-2 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${gender === 'male' ? 'bg-blue-600 text-white shadow-md' : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}`}
            >
              <User size={18} /> Homem
            </button>
            <button 
              onClick={() => setGender('female')}
              className={`flex-1 py-2 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${gender === 'female' ? 'bg-pink-600 text-white shadow-md' : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}`}
            >
              <User size={18} /> Mulher
            </button>
          </div>

          {/* Área de Texto */}
          <div className={`p-4 rounded-xl border relative ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <textarea 
              className={`w-full h-64 bg-transparent resize-none outline-none font-mono text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}
              value={examText}
              readOnly
            />
            
            <div className="absolute bottom-4 right-4">
              <button 
                onClick={handleCopy}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-sm ${copied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                {copied ? <><Check size={16} /> Copiado!</> : <><Copy size={16} /> Copiar Texto</>}
              </button>
            </div>
          </div>

          <div className={`mt-4 text-center text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Modelo padrão para evolução. Edite os dados vitais (SP02, etc) após colar no prontuário.
          </div>

        </div>
      </div>
    </div>
  );
}