// Arquivo: src/components/modals/PrescriptionModal.jsx
import React, { useState, useEffect } from 'react';
import { FilePlus, Printer, X, Activity, Trash2 } from 'lucide-react';

export default function PrescriptionModal({ isOpen, onClose, currentUser, selectedPrescriptionItems }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setItems(JSON.parse(JSON.stringify(selectedPrescriptionItems)));
    }
  }, [isOpen, selectedPrescriptionItems]);

  if (!isOpen) return null;

  const handleUpdateItem = (index, field, value) => {
    const newItems = [...items];
    if (field === 'nome') {
        if (newItems[index].receita) newItems[index].receita.nome_comercial = value;
        else newItems[index].farmaco = value;
    } else if (field === 'quantidade') {
        if (newItems[index].receita) newItems[index].receita.quantidade = value;
    } else if (field === 'instrucoes') {
        if (newItems[index].receita) newItems[index].receita.instrucoes = value;
    }
    setItems(newItems);
  };

  const handleRemoveItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-0 md:p-4 print:p-0 animate-in fade-in duration-200">
      <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-3xl md:rounded-xl shadow-2xl overflow-hidden flex flex-col print:max-h-none print:h-full print:rounded-none print:shadow-none">
        
        <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center print:hidden">
          <div>
             <h3 className="font-bold text-slate-800 flex items-center gap-2"><FilePlus size={20} /> Gerador de Receituário</h3>
             <p className="text-xs text-slate-500 hidden sm:block">Edite os campos abaixo antes de imprimir.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
                <Printer size={16}/> <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-600 p-2 rounded-lg transition-colors">
                <X size={20}/>
            </button>
          </div>
        </div>

        <div className="p-6 md:p-12 overflow-y-auto print:overflow-visible font-serif text-slate-900 bg-white flex-1 flex flex-col h-full relative">
          
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
            <Activity size={400} />
          </div>

          <header className="flex flex-col items-center border-b-4 border-double border-slate-800 pb-6 mb-8">
            <h1 className="text-2xl md:text-3xl font-bold tracking-widest uppercase text-slate-900 text-center">{currentUser?.name || "NOME DO MÉDICO"}</h1>
            <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2 mt-2 text-sm font-bold text-slate-600 uppercase tracking-wide text-center">
                <span>CRM: {currentUser?.crm || "00000/UF"}</span>
                <span className="hidden md:inline">•</span>
                <span>CLÍNICA MÉDICA</span>
            </div>
          </header>

          <div className="flex-1 space-y-8">
            {['USO ORAL', 'USO TÓPICO', 'USO RETAL', 'USO INALATÓRIO', 'USO OFTÁLMICO', 'USO OTOLÓGICO'].map((usoType) => {
              const filteredItems = items.map((item, index) => ({ ...item, originalIndex: index }))
                                         .filter(item => {
                                            const uso = item.receita?.uso?.toUpperCase() || '';
                                            return uso.includes(usoType.replace('USO ', '')) || (usoType === 'USO ORAL' && !uso);
                                         });

              if (filteredItems.length === 0) return null;

              return (
                <div key={usoType}>
                  <div className="flex items-center gap-4 mb-4">
                    <h3 className="font-bold text-lg underline decoration-2 underline-offset-4">{usoType}</h3>
                  </div>
                  <ul className="space-y-6 list-none">
                    {filteredItems.map((item, idx) => (
                      <li key={item.originalIndex} className="relative pl-6 group">
                        <button 
                            onClick={() => handleRemoveItem(item.originalIndex)}
                            className="absolute -left-8 top-2 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all print:hidden"
                        >
                            <Trash2 size={16} />
                        </button>

                        <span className="absolute left-0 top-1.5 font-bold text-lg">{idx + 1}.</span>
                        
                        <div className="flex flex-col sm:flex-row sm:items-end mb-1 w-full">
                          <input 
                            type="text" 
                            className="font-bold text-xl bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none w-full print:border-none transition-colors p-0 m-0"
                            value={item.receita?.nome_comercial || item.farmaco}
                            onChange={(e) => handleUpdateItem(item.originalIndex, 'nome', e.target.value)}
                          />
                          
                          <div className="hidden sm:block flex-1 mx-2 border-b-2 border-dotted border-slate-400 mb-1.5 opacity-30"></div>
                          
                          <input 
                            type="text" 
                            className="font-bold text-lg whitespace-nowrap sm:text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none w-full sm:w-40 print:border-none transition-colors p-0 m-0 mt-1 sm:mt-0"
                            value={item.receita?.quantidade || "1 un"}
                            onChange={(e) => handleUpdateItem(item.originalIndex, 'quantidade', e.target.value)}
                          />
                        </div>
                        
                        <textarea 
                            className="w-full text-base leading-relaxed text-slate-800 mt-1 pl-2 border-l-4 border-slate-200 bg-transparent outline-none resize-none overflow-hidden hover:border-l-blue-300 focus:border-l-blue-500 print:border-l-slate-300 transition-colors"
                            rows={2}
                            value={`${item.receita?.instrucoes || ''}${item.dias_tratamento ? ` (Uso por ${item.dias_tratamento} dias)` : ''}`}
                            onChange={(e) => handleUpdateItem(item.originalIndex, 'instrucoes', e.target.value)}
                            onInput={(e) => {
                                e.target.style.height = "auto";
                                e.target.style.height = e.target.scrollHeight + "px";
                            }}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
            
            {items.length === 0 && (
                <div className="text-center py-20 text-slate-400 italic print:hidden border-2 border-dashed border-slate-200 rounded-xl">
                    <p>Nenhum medicamento selecionado.</p>
                </div>
            )}
          </div>

          <footer className="mt-auto pt-12 print:break-inside-avoid">
            <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-8">
                <div className="text-sm text-center sm:text-left w-full sm:w-auto">
                    <p className="font-bold">Data:</p>
                    <div className="w-full sm:w-40 border-b border-slate-800 mt-4 text-center relative top-1 font-mono">
                        {new Date().toLocaleDateString('pt-BR')}
                    </div>
                </div>
                <div className="text-center w-full sm:w-auto">
                    <div className="w-64 border-b border-slate-800 mb-2 mx-auto"></div>
                    <p className="font-bold uppercase text-sm">{currentUser?.name}</p>
                    <p className="text-xs text-slate-500">Assinatura e Carimbo</p>
                </div>
            </div>
            <div className="text-center mt-8 pt-4 border-t border-slate-200 text-[10px] text-slate-400 uppercase">
                Receituário gerado via Lister Guidance • Uso Profissional
            </div>
          </footer>

        </div>
      </div>
    </div>
  );
}