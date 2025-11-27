import React from 'react';
import { FilePlus, Printer, X, Activity } from 'lucide-react';

export default function PrescriptionModal({ isOpen, onClose, currentUser, selectedPrescriptionItems }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:p-0 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:h-full print:rounded-none print:shadow-none">
        <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center print:hidden">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><FilePlus size={20} /> Gerador de Receituário</h3>
          <div className="flex gap-2"><button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"><Printer size={16}/> Imprimir</button><button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-600 p-2 rounded-lg transition-colors"><X size={20}/></button></div>
        </div>
        <div className="p-12 overflow-y-auto print:overflow-visible font-serif text-slate-900 bg-white flex-1 flex flex-col h-full relative">
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none"><Activity size={400} /></div>
          <header className="flex flex-col items-center border-b-4 border-double border-slate-800 pb-6 mb-8"><h1 className="text-3xl font-bold tracking-widest uppercase text-slate-900">{currentUser?.name || "NOME DO MÉDICO"}</h1><div className="flex items-center gap-2 mt-2 text-sm font-bold text-slate-600 uppercase tracking-wide"><span>CRM: {currentUser?.crm || "00000/UF"}</span><span>•</span><span>CLÍNICA MÉDICA</span></div></header>
          <div className="flex-1 space-y-8">
            {['USO ORAL', 'USO TÓPICO', 'USO RETAL', 'USO INALATÓRIO', 'USO OFTÁLMICO', 'USO OTOLÓGICO'].map((usoType) => {
              const items = selectedPrescriptionItems.filter(item => item.receita?.uso?.toUpperCase().includes(usoType.replace('USO ', '')) || (usoType === 'USO ORAL' && !item.receita?.uso));
              if (items.length === 0) return null;
              return (
                <div key={usoType}>
                  <div className="flex items-center gap-4 mb-4"><h3 className="font-bold text-lg underline decoration-2 underline-offset-4">{usoType}</h3></div>
                  <ul className="space-y-6 list-none">{items.map((item, index) => (<li key={index} className="relative pl-6"><span className="absolute left-0 top-0 font-bold text-lg">{index + 1}.</span><div className="flex items-end mb-1 w-full"><span className="font-bold text-xl">{item.receita.nome_comercial || item.farmaco}</span><div className="flex-1 mx-2 border-b-2 border-dotted border-slate-400 mb-1.5"></div><span className="font-bold text-lg whitespace-nowrap">{item.receita.quantidade}</span></div><p className="text-base leading-relaxed text-slate-800 mt-1 pl-2 border-l-4 border-slate-200">{item.receita.instrucoes} {item.dias_tratamento ? `(Uso por ${item.dias_tratamento} dias)` : ''}</p></li>))}</ul>
                </div>
              )
            })}
          </div>
          <footer className="mt-auto pt-12"><div className="flex justify-between items-end"><div className="text-sm"><p className="font-bold">Data:</p><div className="w-40 border-b border-slate-800 mt-4 text-center relative top-1">{new Date().toLocaleDateString('pt-BR')}</div></div><div className="text-center"><div className="w-64 border-b border-slate-800 mb-2"></div><p className="font-bold uppercase text-sm">{currentUser?.name}</p><p className="text-xs text-slate-500">Assinatura e Carimbo</p></div></div><div className="text-center mt-8 pt-4 border-t border-slate-200 text-[10px] text-slate-400 uppercase">Rua da Medicina, 123 • Centro • Cidade/UF • Tel: (00) 1234-5678</div></footer>
        </div>
      </div>
    </div>
  );
}