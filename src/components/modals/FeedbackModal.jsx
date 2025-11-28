// Arquivo: src/components/modals/FeedbackModal.jsx
import React, { useState } from 'react';
import { X, Send, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { doc, collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebaseClient';

export default function FeedbackModal({ isOpen, onClose, isDarkMode, currentUser }) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSendFeedback = async () => {
    if (!message.trim()) return;

    setIsSending(true);
    try {
      // 1. Salvar no Firestore para você ler depois
      await addDoc(collection(db, 'feedback'), {
        userId: currentUser?.uid || 'anonymous',
        userName: currentUser?.name || 'Anônimo',
        userEmail: currentUser?.email || 'Sem email',
        message: message,
        createdAt: new Date().toISOString(),
        status: 'unread'
      });

      // 2. Função de mandar e-mail (Abre o cliente de email do usuário)
      const subject = encodeURIComponent("Feedback - Lister Guidance");
      const body = encodeURIComponent(`Mensagem de ${currentUser?.name || 'Usuário'}:\n\n${message}`);
      window.open(`mailto:emergencycorp22@gmail.com?subject=${subject}&body=${body}`, '_blank');

      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        setMessage('');
        onClose();
      }, 2500);

    } catch (error) {
      console.error("Erro ao enviar feedback:", error);
      alert("Erro ao salvar feedback. Tente novamente.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl border transform transition-all scale-100 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
        
        {/* Cabeçalho */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
              <Mail size={20} />
            </div>
            <h3 className={`font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Enviar Feedback</h3>
          </div>
          <button onClick={onClose} className={`p-1 rounded-full hover:bg-opacity-10 ${isDarkMode ? 'hover:bg-slate-500 text-slate-400' : 'hover:bg-gray-200 text-gray-400'}`}>
            <X size={20} />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-4">
          {sentSuccess ? (
            <div className="py-8 flex flex-col items-center text-center animate-in zoom-in">
              <div className="mb-3 text-emerald-500"><CheckCircle2 size={48} /></div>
              <h4 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Feedback Enviado!</h4>
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Obrigado por contribuir com a EmergencyCorp.</p>
            </div>
          ) : (
            <>
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                Encontrou um erro ou tem uma sugestão? Escreva abaixo. Sua mensagem será salva e enviada para nossa equipe.
              </p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite seu feedback aqui..."
                className={`w-full h-32 p-3 rounded-xl border outline-none resize-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-600' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
              />
            </>
          )}
        </div>

        {/* Rodapé do Modal */}
        {!sentSuccess && (
          <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
            <button onClick={onClose} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}>
              Cancelar
            </button>
            <button 
              onClick={handleSendFeedback} 
              disabled={!message.trim() || isSending}
              className={`px-6 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-2 transition-all ${!message.trim() || isSending ? 'bg-slate-600 cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-blue-500/25'}`}
            >
              {isSending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              {isSending ? 'Enviando...' : 'Enviar Feedback'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}