// Arquivo: src/components/modals/HelpModal.jsx
import React from 'react';
import { 
  X, Search, Camera, ClipboardList, Calculator, Star, Edit, HelpCircle, 
  FileText, Activity, UserCheck 
} from 'lucide-react';

export default function HelpModal({ isOpen, onClose, isDarkMode }) {
  if (!isOpen) return null;

  const FeatureItem = ({ icon: Icon, title, desc, color }) => (
    <div className={`flex gap-4 p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
      <div className={`p-3 rounded-lg h-fit ${isDarkMode ? 'bg-slate-900' : 'bg-white'} ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <h4 className={`font-bold text-sm mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{title}</h4>
        <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{desc}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white'}`}>
        
        <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-gray-200'}`}>
          <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            <HelpCircle size={20} className="text-blue-500"/> Central de Ajuda
          </h3>
          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-slate-500'}`}>
            <X size={20}/>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <p className={`text-sm mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Bem-vindo ao <strong>Lister Guidance</strong>. Abaixo estão as ferramentas disponíveis para auxiliar no seu plantão:
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <FeatureItem 
              icon={Search} 
              color="text-blue-500"
              title="Busca de Condutas" 
              desc="Digite qualquer condição clínica (ex: IAM, Sepse) na barra principal para receber um guia completo de tratamento baseado na sala (Verde, Amarela ou Vermelha)."
            />
            <FeatureItem 
              icon={FileText} 
              color="text-teal-500"
              title="Receitas Rápidas" 
              desc="Banco de dados com prescrições prontas para as patologias mais comuns (Cardio, Pneumo, Gastro, etc.), ideal para agilizar o atendimento ambulatorial."
            />
            <FeatureItem 
              icon={Activity} 
              color="text-emerald-500"
              title="Scores Médicos" 
              desc="Calculadoras integradas para os principais scores de risco e prognóstico (Glasgow, CURB-65, Wells, SOFA, HEART, etc.)."
            />
            <FeatureItem 
              icon={UserCheck} 
              color="text-sky-500"
              title="Exame Físico Padrão" 
              desc="Modelos de descrição de exame físico normal (Masculino/Feminino) prontos para copiar e colar no prontuário."
            />
            <FeatureItem 
              icon={Camera} 
              color="text-indigo-500"
              title="IA Vision" 
              desc="Envie fotos de ECGs, exames de imagem ou lesões dermatológicas para receber uma segunda opinião instantânea da Inteligência Artificial."
            />
            <FeatureItem 
              icon={ClipboardList} 
              color="text-emerald-500"
              title="BedSide Guidance" 
              desc="Ferramenta para casos complexos à beira leito. Insira a anamnese completa e exames para gerar uma conduta personalizada."
            />
            <FeatureItem 
              icon={Calculator} 
              color="text-rose-500"
              title="Calculadora de Infusão" 
              desc="Calcule rapidamente a vazão (ml/h) de drogas vasoativas e sedativos baseando-se no peso e concentração."
            />
            <FeatureItem 
              icon={Edit} 
              color="text-amber-500"
              title="Meu Caderno" 
              desc="Um bloco de notas pessoal persistente. Suas anotações são salvas automaticamente na nuvem e sincronizadas."
            />
             <FeatureItem 
              icon={Star} 
              color="text-yellow-500"
              title="Favoritos" 
              desc="Salve as condutas mais utilizadas para acesso rápido. Os favoritos recentes ficam armazenados para acesso ágil."
            />
          </div>
          
          <div className={`mt-6 p-4 rounded-xl border text-center ${isDarkMode ? 'bg-blue-900/20 border-blue-800 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
            <p className="text-xs font-bold">Dica Pro</p>
            <p className="text-xs mt-1">Use a ferramenta de <strong>Gerar Receita</strong> que aparece automaticamente ao selecionar medicamentos (checkbox) na Sala Verde.</p>
          </div>
        </div>

      </div>
    </div>
  );
}