// Arquivo: src/components/modals/ImageAnalysisModal.jsx
import React from 'react';
import { Camera, X, Upload, Eye, Microscope, Loader2, AlertTriangle } from 'lucide-react';

export default function ImageAnalysisModal({ 
  isOpen, onClose, isDarkMode, selectedImage, handleImageUpload, 
  imageQuery, setImageQuery, handleAnalyzeImage, isAnalyzingImage, imageAnalysisResult, setImageAnalysisResult 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white'}`}>
        <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-blue-900/30 border-slate-800' : 'bg-blue-600 border-blue-700'}`}>
          <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-blue-300' : 'text-white'}`}><Camera size={24} /> IA Vision - Análise de Exames</h3>
          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-blue-700 text-white'}`}><X size={20}/></button>
        </div>
          
        <div className="p-6 overflow-y-auto flex-1">
          {!imageAnalysisResult ? (
            <div className="space-y-6">
              <div className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors group ${isDarkMode ? 'border-slate-700 bg-slate-800/50 hover:border-blue-500' : 'border-gray-300 bg-gray-50 hover:border-blue-500'}`}>
                {/* ADICIONADO O ID AQUI ABAIXO */}
                <input id="image-upload-input" type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                {selectedImage ? (
                  <div className="relative h-64 w-full">
                    <img src={selectedImage} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                    <div className="absolute bottom-2 right-2 bg-black/50 text-white px-3 py-1 rounded text-xs">Clique para trocar</div>
                  </div>
                ) : (
                  <div className="space-y-2 pointer-events-none">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-transform group-hover:scale-110 ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}><Upload size={32} /></div>
                    <h4 className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Arraste ou clique para enviar</h4>
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Suporta: ECG, Raio-X, Tomografia, Fotos de Lesões...</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">O que você deseja saber?</label>
                <div className="relative">
                  <input type="text" value={imageQuery} onChange={(e) => setImageQuery(e.target.value)} placeholder="Ex: Onde está a fratura? / Qual o ritmo deste ECG?" className={`w-full pl-4 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 font-medium ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-200 text-slate-800'}`} />
                  <Eye className="absolute right-4 top-3 text-gray-400" size={20} />
                </div>
              </div>

              <button onClick={handleAnalyzeImage} disabled={isAnalyzingImage || !selectedImage} className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg ${isAnalyzingImage || !selectedImage ? 'bg-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {isAnalyzingImage ? <Loader2 className="animate-spin" /> : <><Camera size={20}/> Analisar Imagem</>}
              </button>
              
              <div className={`border p-3 rounded-lg flex gap-3 items-start ${isDarkMode ? 'bg-yellow-900/20 border-yellow-800/30' : 'bg-yellow-50 border-yellow-100'}`}>
                <AlertTriangle className={`shrink-0 w-5 h-5 mt-0.5 ${isDarkMode ? 'text-yellow-500' : 'text-yellow-600'}`} />
                <p className={`text-xs text-justify ${isDarkMode ? 'text-yellow-200' : 'text-yellow-800'}`}><strong>Atenção:</strong> As imagens são processadas em tempo real e <strong>deletadas imediatamente</strong> após fechar esta janela.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className={`flex gap-4 items-start p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-black border border-slate-300"><img src={selectedImage} alt="Miniatura" className="w-full h-full object-cover" /></div>
                <div><span className="text-xs font-bold text-slate-400 uppercase">Sua Pergunta:</span><p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>"{imageQuery}"</p></div>
              </div>

              <div className={`p-6 rounded-xl border shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-100'}`}>
                <h4 className={`font-bold flex items-center gap-2 mb-4 border-b pb-2 ${isDarkMode ? 'text-blue-300 border-slate-600' : 'text-blue-900 border-blue-50'}`}><Microscope size={20}/> Laudo Preliminar IA</h4>
                <div className={`prose prose-sm max-w-none leading-relaxed whitespace-pre-wrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{imageAnalysisResult}</div>
              </div>

              <button onClick={() => setImageAnalysisResult(null)} className={`w-full py-3 border-2 rounded-xl font-bold transition-colors ${isDarkMode ? 'border-slate-600 text-slate-400 hover:bg-slate-800' : 'border-gray-200 text-slate-600 hover:bg-gray-50'}`}>Nova Análise</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}