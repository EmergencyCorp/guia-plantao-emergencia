// Arquivo: src/components/DisclaimerScreen.jsx
import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function DisclaimerScreen({ onAccept, isDarkMode, toggleTheme }) {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-sans ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-slate-800'}`}>
      <div className={`rounded-3xl shadow-2xl border max-w-2xl w-full overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
        
        {/* Cabeçalho */}
        <div className="bg-gradient-to-br from-red-900 to-slate-900 p-8 text-center text-white relative">
          <div className="absolute top-4 right-4">
             <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
          </div>
          <div className="flex justify-center mb-4">
            <div className="bg-white/10 p-4 rounded-full">
              <ShieldAlert size={48} className="text-red-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Termo de Responsabilidade</h1>
          <p className="text-red-100 text-sm font-medium uppercase tracking-wider">Leitura Obrigatória</p>
        </div>

        {/* Conteúdo do Aviso */}
        <div className="p-8 space-y-6">
          <div className={`p-6 rounded-xl border text-sm leading-relaxed text-justify overflow-y-auto max-h-[40vh] ${isDarkMode ? 'bg-slate-950/50 border-slate-800 text-slate-300' : 'bg-gray-50 border-gray-200 text-slate-600'}`}>
            <p className="mb-4">
              <strong>1. NATUREZA DA FERRAMENTA:</strong> Este aplicativo ("Lister Guidance") é uma ferramenta de <strong>suporte à decisão clínica</strong> destinada exclusivamente a médicos e profissionais de saúde habilitados. Ele NÃO substitui, em hipótese alguma, o julgamento clínico profissional, a anamnese detalhada, o exame físico e a avaliação individualizada do paciente.
            </p>
            <p className="mb-4">
              <strong>2. LIMITAÇÃO DE RESPONSABILIDADE:</strong> As condutas, doses e calculadoras aqui apresentadas são baseadas em diretrizes e literaturas médicas gerais. A medicina é uma ciência em constante evolução e sujeita a variações individuais. Os desenvolvedores e autores isentam-se de qualquer responsabilidade por erros, omissões ou consequências decorrentes da aplicação das informações aqui contidas.
            </p>
            <p className="mb-4">
              <strong>3. USO DE INTELIGÊNCIA ARTIFICIAL:</strong> Algumas funcionalidades utilizam Inteligência Artificial (IA) para auxiliar na busca e análise. A IA é suscetível a erros ("alucinações") e imprecisões. Todas as sugestões geradas pela IA devem ser rigorosamente conferidas e validadas pelo médico responsável antes de qualquer aplicação prática.
            </p>
            <p>
              <strong>4. ACEITE:</strong> Ao prosseguir, você declara ser um profissional de saúde habilitado, estar ciente das limitações da ferramenta e assumir total e exclusiva responsabilidade pelas condutas tomadas durante o seu plantão.
            </p>
          </div>

          {/* Checkbox de Aceite */}
          <div 
            onClick={() => setIsChecked(!isChecked)}
            className={`flex items-start gap-4 p-4 rounded-xl bordercursor-pointer transition-all cursor-pointer ${isChecked ? (isDarkMode ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200') : (isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 hover:bg-gray-50')}`}
          >
            <div className={`mt-1 w-6 h-6 rounded border flex items-center justify-center transition-colors shrink-0 ${isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-400'}`}>
              {isChecked && <CheckCircle2 size={16} />}
            </div>
            <div>
              <p className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Declaro que li e concordo com os termos.</p>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Estou ciente de que sou o único responsável pelas minhas decisões clínicas.</p>
            </div>
          </div>

          {/* Botão de Ação */}
          <button 
            onClick={onAccept}
            disabled={!isChecked}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${isChecked ? 'bg-red-700 hover:bg-red-800 text-white cursor-pointer hover:shadow-red-900/20' : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'}`}
          >
            {isChecked ? "Acessar Sistema" : "Aguardando Aceite..."}
          </button>
        </div>

        {/* Rodapé */}
        <div className={`p-4 text-center text-[10px] border-t ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
          &copy; {new Date().getFullYear()} EmergencyCorp. Uso Profissional Restrito.
        </div>
      </div>
    </div>
  );
}