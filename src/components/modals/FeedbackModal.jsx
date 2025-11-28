// Arquivo: src/components/modals/FeedbackModal.jsx
import React, { useState } from 'react';
import { X, Send, Image as ImageIcon, MessageSquare, Loader2, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // Novos imports
import { db, storage } from '../../firebaseClient'; // Importando storage

export default function FeedbackModal({ isOpen, onClose, isDarkMode, currentUser }) {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null); // Guarda o arquivo real
  const [previewUrl, setPreviewUrl] = useState(null);   // Guarda o preview pra mostrar na tela
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [imageError, setImageError] = useState('');

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // Aumentei para 5MB já que agora vai pro Storage
        setImageError('A imagem deve ter no máximo 5MB.');
        return;
      }
      setImageError('');
      setSelectedFile(file);
      
      // Cria preview local apenas para mostrar ao usuário antes de enviar
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setIsSending(true);

    try {
      let imageUrl = null;

      // 1. Se tem imagem, faz upload para o Firebase Storage
      if (selectedFile && storage) {
        const storageRef = ref(storage, `feedbacks/${currentUser?.uid}/${Date.now()}_${selectedFile.name}`);
        const snapshot = await uploadBytes(storageRef, selectedFile);
        imageUrl = await getDownloadURL(snapshot.ref); // Pega o link curto (https://...)
      }

      // 2. Salva no Firestore (Com o link da imagem, não o código gigante)
      if (db && currentUser) {
        const feedbackId = `feedback_${Date.now()}`;
        await setDoc(doc(db, 'artifacts', 'emergency-guide-app', 'feedbacks', feedbackId), {
          userId: currentUser.uid,
          userName: currentUser.name,
          userEmail: currentUser.email,
          message: message,
          imageUrl: imageUrl, // Salva apenas a URL
          createdAt: new Date().toISOString(),
          status: 'unread'
        });
      }

      // 3. Abre o cliente de e-mail (Opcional, como backup)
      const subject = encodeURIComponent(`Feedback Lister Guidance - ${currentUser?.name || 'Usuário'}`);
      const body = encodeURIComponent(`Olá Equipe Lister Guidance,\n\n${message}\n\n---\nEnviado por: ${currentUser?.name}\nCRM: ${currentUser?.crm || 'N/A'}\n\n(Imagem anexada no sistema interno)`);
      
      window.location.href = `mailto:emergencycorp22@gmail.com?subject=${subject}&body=${body}`;
      
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        setMessage('');
        setSelectedFile(null);
        setPreviewUrl(null);
        onClose();
      }, 3000);

    } catch (error) {
      console.error("Erro ao enviar feedback:", error);
      alert("Erro ao salvar feedback. Tente novamente.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white'}`}>
        
        {/* Header */}
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
             <h4 className="text-xl font-bold text-green-600 mb-2">Obrigado!</h4>
             <p className="text-sm text-gray-500">Seu feedback foi registrado com sucesso.</p>
           </div>
        ) : (
          <div className="p-6 space-y-4">
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Encontrou um erro ou tem uma sugestão? Descreva abaixo e anexe um print se necessário.
            </p>

            {/* Área de Texto */}
            <textarea 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem aqui..."
              className={`w-full h-32 p-3 rounded-xl border resize-none outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-slate-800'}`}
            />

            {/* Área de Imagem */}
            <div>
              <label 
                htmlFor="feedback-image" 
                className={`flex items-center gap-2 w-fit px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors border ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-slate-600'}`}
              >
                <ImageIcon size={18} /> {selectedFile ? 'Trocar Print' : 'Anexar Print'}
              </label>
              <input 
                id="feedback-image" 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageChange} 
              />
              
              {imageError && <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><AlertCircle size={12}/> {imageError}</p>}

              {previewUrl && (
                <div className="mt-3 relative w-full h-32 bg-black/50 rounded-lg overflow-hidden group border border-slate-700">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                  <button 
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Botão Enviar */}
            <button 
              onClick={handleSend}
              disabled={isSending || !message.trim()}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${isSending || !message.trim() ? 'bg-slate-500 cursor-not-allowed opacity-70' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              {isSending ? <Loader2 size={20} className="animate-spin" /> : <><Send size={18} /> Enviar Feedback</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}