// Arquivo: src/components/modals/RealTimeChatModal.jsx

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, MessageCircle, ClipboardList, Loader2 } from 'lucide-react';
// Importação para renderizar Markdown
import ReactMarkdown from 'react-markdown'; 
// Se você não usa react-markdown, substitua o bloco <ReactMarkdown> por um div simples.
// Você precisará instalar: npm install react-markdown

export default function RealTimeChatModal({
    isOpen, onClose, isDarkMode, chatHistory, setChatHistory, sendMessage, isLoading
}) {
    if (!isOpen) return null;

    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef(null);

    // Rola automaticamente para a última mensagem
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory]);

    const handleSend = (e) => {
        e.preventDefault();
        const text = inputText.trim();
        if (text && !isLoading) {
            sendMessage(text);
            setInputText('');
        }
    };
    
    const handleClose = () => {
        onClose();
        // Opcional: Limpar histórico ao fechar
        setChatHistory([]); 
    };

    const isFirstMessage = chatHistory.length <= 1 && chatHistory[0]?.role === 'preceptor';

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className={`w-full max-w-3xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white'}`}>
                
                {/* Header */}
                <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-purple-900/30 border-slate-800' : 'bg-purple-600 border-purple-700'}`}>
                    <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-purple-300' : 'text-white'}`}><MessageCircle size={24} /> Chat com Preceptor Sênior</h3>
                    <button onClick={handleClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-purple-700 text-white'}`}><X size={20}/></button>
                </div>
                
                {/* Mensagens */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {chatHistory.map((message, index) => (
                        <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] px-4 py-3 rounded-xl shadow-md ${
                                message.role === 'user'
                                    ? (isDarkMode ? 'bg-indigo-700 text-white rounded-br-none' : 'bg-blue-600 text-white rounded-br-none')
                                    : (isDarkMode ? 'bg-slate-800 text-slate-200 rounded-tl-none' : 'bg-gray-100 text-slate-800 rounded-tl-none')
                            }`}>
                                <div className={`font-bold text-xs mb-1 ${message.role === 'preceptor' ? 'text-purple-400' : 'text-white/80'}`}>
                                    {message.role === 'user' ? 'Você (Residente)' : 'Preceptor Sênior (IA)'}
                                </div>
                                <div className={`prose max-w-none ${isDarkMode && message.role === 'preceptor' ? 'prose-invert' : ''} text-sm`}>
                                    <ReactMarkdown>{message.text}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {isLoading && (
                        <div className="flex justify-start">
                             <div className={`max-w-[85%] px-4 py-3 rounded-xl shadow-md ${isDarkMode ? 'bg-slate-800 text-slate-200 rounded-tl-none' : 'bg-gray-100 text-slate-800 rounded-tl-none'}`}>
                                <div className="font-bold text-xs mb-1 text-purple-400">Preceptor Sênior (IA)</div>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Digitando...</span>
                                </div>
                             </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
                
                {/* Input */}
                <div className={`p-4 border-t ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
                    <form onSubmit={handleSend} className="flex items-center gap-3">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder={isFirstMessage ? "Apresente o caso clínico..." : "Sua resposta ou pergunta..."}
                            className={`flex-1 p-3 rounded-full border outline-none transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-purple-500' : 'bg-white border-gray-300 text-slate-800 focus:border-purple-500'}`}
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim() || isLoading}
                            className={`p-3 rounded-full transition-colors ${!inputText.trim() || isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                            aria-label="Enviar mensagem"
                        >
                            <Send size={20} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}