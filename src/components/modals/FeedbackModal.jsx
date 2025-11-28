// Arquivo: src/components/modals/FeedbackModal.jsx
import React, { useState } from 'react';
import { X, Send, Image as ImageIcon, MessageSquare, Loader2, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebaseClient';

export default function FeedbackModal({ isOpen, onClose, isDarkMode, currentUser }) {
  const [message, setMessage] = useState('');
  const [selectedFileBase64, setSelectedFileBase64] = useState(null); // Guarda a imagem como texto
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [imageError, setImageError] = useState('');

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validação de tamanho mais rigorosa (400KB) para caber no Firestore
      if (file.size > 400 * 1024) {
        setImageError('Para envio sem Storage, a imagem deve ser menor que 400KB.');
        return;
      }
      // Validação de tipo
      if (!file.type.startsWith('image/')) {
        setImageError('Apenas arquivos de imagem são permitidos.');
        return;
      }

      setImageError('');
      
      // Converter imagem para Base64 (Texto)
      const reader = new FileReader();
      reader.onloadend = () => {
          setSelectedFileBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
        setImageError("Por favor, escreva uma mensagem.");
        return;
    }
    
    setIsSending(true);
    setImageError('');

    try {
      // Salvar no Firestore
      if (db) {
        const feedbackId = `feedback_${Date.now()}`;
        // Salvamos a imagem (se existir) diretamente dentro do documento como texto (imageBase64)
        await setDoc(doc(db, 'artifacts', 'emergency-guide-app', 'feedbacks', feedbackId), {
          userId: currentUser?.uid || 'anonymous',
          userName: currentUser?.name || 'Anônimo',
          userEmail: currentUser?.email || 'N/A',
          message: message,
          imageBase64: selectedFileBase64, // Salvando a string da imagem aqui
          createdAt: new Date().toISOString(),
          status: 'unread'
        });
      }

      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        setMessage('');
        setSelectedFileBase64(null);
        onClose();
      }, 2500);

    } catch (error) {
      console.error("Erro crítico ao enviar:", error);
      setImageError(error.message || "Erro ao salvar no banco de dados.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white'}`}>
        
        <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-gray-200'}`}>
          <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            <MessageSquare size={20} className="text-blue-500"/> Enviar Feedback
          </h3>
          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-slate-500'}`}>
            <X size={20}/>
          </button>
        </div>

        {sentSuccess ? (
           <div className="p-8 text-center flex flex-col items-center justify-center h-64 animate-in zoom-in duration-300">
             <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
               <CheckCircle2 size={32} />
             </div>
             <h4 className="text-xl font-bold text-green-600 mb-2">Recebido!</h4>
             <p className="text-sm text-gray-500">Seu feedback foi salvo no banco de dados com sucesso.</p>
           </div>
        ) : (
          <div className="p-6 space-y-4">
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Encontrou um erro ou tem uma sugestão? Descreva abaixo.
            </p>

            <textarea 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className={`w-full h-32 p-3 rounded-xl border resize-none outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-slate-800'}`}
            />

            <div>
              <label 
                htmlFor="feedback-image" 
                className={`flex items-center gap-2 w-fit px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors border ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-slate-600'}`}
              >
                <ImageIcon size={18} /> {selectedFileBase64 ? 'Trocar Imagem' : 'Anexar Print (Máx 400KB)'}
              </label>
              <input 
                id="feedback-image" 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageChange} 
              />
              
              {imageError && <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><AlertCircle size={12}/> {imageError}</p>}

              {selectedFileBase64 && (
                <div className="mt-3 relative w-full h-32 bg-black/50 rounded-lg overflow-hidden group border border-slate-700">
                  <img src={selectedFileBase64} alt="Preview" className="w-full h-full object-contain" />
                  <button 
                    onClick={() => { setSelectedFileBase64(null); }}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            <button 
              onClick={handleSend}
              disabled={isSending || !message.trim()}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${isSending || !message.trim() ? 'bg-slate-500 cursor-not-allowed opacity-70' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              {isSending ? <Loader2 size={20} className="animate-spin" /> : <><Send size={18} /> Enviar</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}