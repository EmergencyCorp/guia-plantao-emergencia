// Arquivo: src/components/modals/RealTimeChatModal.jsx

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, MessageCircle, ClipboardList, Loader2, Mic, UserCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown'; 

// --- HOOK CUSTOMIZADO PARA RECONHECIMENTO DE FALA (CÓPIA SEGURA) ---
const useSpeechRecognition = (onResult) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    const [isAPISupported, setIsAPISupported] = useState(false);
    
    // Flag interna para controle de escopo (corrige erros de referência no iOS/Cleanup)
    const [hasBeenStarted, setHasBeenStarted] = useState(false);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition || window.msSpeechRecognition;
        
        if (SpeechRecognition) {
            setIsAPISupported(true);
            const recognition = new SpeechRecognition();
            
            recognition.continuous = false; // Usamos false no chat, pois o input é pequeno
            recognition.interimResults = false; 
            recognition.lang = 'pt-BR'; 

            recognition.onstart = () => {
                setIsListening(true);
                setHasBeenStarted(true);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onerror = (event) => {
                console.error('Speech Recognition Error:', event.error);
                setIsListening(false);
                setHasBeenStarted(false);
                if (event.error === 'not-allowed') {
                    alert('Permissão de microfone negada. Verifique as configurações do navegador e do dispositivo.');
                }
            };

            recognition.onresult = (event) => {
                if (event.results.length > 0) {
                    const finalTranscript = event.results[0][0].transcript;
                    onResult(finalTranscript.trim());
                }
            };

            recognitionRef.current = recognition;
        } else {
            setIsAPISupported(false);
        }

        return () => {
            if (recognitionRef.current && hasBeenStarted) {
                 try {
                    recognitionRef.current.stop();
                 } catch(e) { /* ignore InvalidStateError on stop */ }
            }
        };
    }, [onResult, hasBeenStarted]);

    const startListening = () => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
                setHasBeenStarted(true);
            } catch (e) {
                if (e.name !== 'InvalidStateError') console.error(e);
            }
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };
    
    return { isListening, startListening, stopListening, isAPISupported };
};


export default function RealTimeChatModal({
    isOpen, onClose, isDarkMode, chatHistory, setChatHistory, sendMessage, isLoading
}) {
    if (!isOpen) return null;

    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef(null);

    // Callback para o input de voz
    const handleVoiceResult = (transcript) => {
        if (transcript) {
            setInputText(transcript);
            // Se o ditado terminar, envie a mensagem imediatamente para uma experiência ágil
            sendMessage(transcript);
            setInputText('');
        }
    };
    
    const speech = useSpeechRecognition(handleVoiceResult);

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
        speech.stopListening();
        onClose();
        setChatHistory([]); 
    };
    
    const toggleSpeechInput = () => {
        if (speech.isListening) {
            speech.stopListening();
        } else {
            // Se o campo de texto tiver conteúdo, envie-o antes de iniciar a escuta
            if (inputText.trim()) {
                handleSend(new Event('submit')); // Simula o envio
                // Pequeno delay para começar a escuta após o envio
                setTimeout(() => speech.startListening(), 100);
            } else {
                speech.startListening();
            }
        }
    };

    const isFirstMessage = chatHistory.length <= 1 && chatHistory[0]?.role === 'preceptor';

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className={`w-full max-w-3xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white'}`}>
                
                {/* Header (Título Dr. SilIA) */}
                <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-purple-900/30 border-slate-800' : 'bg-purple-600 border-purple-700'}`}>
                    <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-purple-300' : 'text-white'}`}><UserCheck size={24} /> Chat com Dr. SilIA</h3>
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
                                {/* AVATAR E NOME */}
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${message.role === 'user' ? (isDarkMode ? 'bg-white text-indigo-700' : 'bg-indigo-100 text-indigo-700') : 'bg-purple-700 text-white'}`}>
                                        {/* Ícone customizado de Preceptor Sênior (Dr. SilIA) */}
                                        {message.role === 'preceptor' ? <UserCheck size={16} /> : <User size={16} />}
                                    </div>
                                    <div className={`font-bold text-xs ${message.role === 'preceptor' ? 'text-purple-400' : 'text-white/80'}`}>
                                        {message.role === 'user' ? 'Você (Residente)' : 'Dr. SilIA (Preceptor Sênior)'}
                                    </div>
                                </div>
                                
                                {/* CONTEÚDO */}
                                <div className={`prose max-w-none ${isDarkMode && message.role === 'preceptor' ? 'prose-invert' : ''} text-sm`}>
                                    <ReactMarkdown>{message.text}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {isLoading && (
                        <div className="flex justify-start">
                             <div className={`max-w-[85%] px-4 py-3 rounded-xl shadow-md ${isDarkMode ? 'bg-slate-800 text-slate-200 rounded-tl-none' : 'bg-gray-100 text-slate-800 rounded-tl-none'}`}>
                                <div className="font-bold text-xs mb-1 text-purple-400">Dr. SilIA (Preceptor Sênior)</div>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Digitando...</span>
                                </div>
                             </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
                
                {/* Input e Microfone */}
                <div className={`p-4 border-t ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
                    <form onSubmit={handleSend} className="flex items-center gap-3">
                        {/* Botão de Microfone */}
                        {speech.isAPISupported && (
                            <button
                                type="button"
                                onClick={toggleSpeechInput}
                                disabled={isLoading}
                                className={`p-3 rounded-full transition-colors shrink-0 ${speech.isListening ? 'bg-red-500 text-white hover:bg-red-600' : (isDarkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-gray-200 text-slate-600 hover:bg-gray-300')} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                aria-label={speech.isListening ? "Parar de gravar" : "Ditado por voz"}
                            >
                                {speech.isListening ? <Loader2 size={20} className="animate-spin" /> : <Mic size={20} />}
                            </button>
                        )}
                        
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder={speech.isListening ? "Fale agora..." : (isFirstMessage ? "Apresente o caso clínico..." : "Sua resposta ou pergunta...")}
                            className={`flex-1 p-3 rounded-full border outline-none transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-purple-500' : 'bg-white border-gray-300 text-slate-800 focus:border-purple-500'}`}
                            disabled={isLoading || speech.isListening}
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim() || isLoading || speech.isListening}
                            className={`p-3 rounded-full transition-colors ${!inputText.trim() || isLoading || speech.isListening ? 'bg-slate-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
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