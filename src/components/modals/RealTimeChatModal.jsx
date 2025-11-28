// Arquivo: src/components/modals/RealTimeChatModal.jsx

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, MessageCircle, ClipboardList, Loader2, Mic, UserCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown'; 

// --- HOOK CUSTOMIZADO PARA RECONHECIMENTO DE FALA (COM INTERIM RESULTS) ---
const useSpeechRecognition = (onResult) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    const [isAPISupported, setIsAPISupported] = useState(false);
    const [hasBeenStarted, setHasBeenStarted] = useState(false);

    useEffect(() => {
        // Suporte para diversos navegadores
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition || window.msSpeechRecognition;
        
        if (SpeechRecognition) {
            setIsAPISupported(true);
            const recognition = new SpeechRecognition();
            
            recognition.continuous = true; // Necessário para capturar mais de uma palavra
            recognition.interimResults = true; // CRUCIAL: Habilita resultados em tempo real
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
                let currentInterim = '';
                let finalTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        currentInterim += transcript;
                    }
                }
                
                // Chamamos o onResult com o texto final E o texto intermitente
                onResult(finalTranscript.trim(), currentInterim.trim());
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
    const [speakingInterim, setSpeakingInterim] = useState(''); // Estado para o feedback de voz

    // Callback para o input de voz
    const handleVoiceResult = (finalTranscript, interimTranscript) => {
        if (finalTranscript) {
            // Se houver texto final, define como input e envia
            setInputText(finalTranscript);
            setSpeakingInterim('');
            sendMessage(finalTranscript); 
        } else {
            // Se houver apenas resultado intermitente (usuário falando), atualiza o feedback
            setSpeakingInterim(interimTranscript);
        }
    };
    
    const speech = useSpeechRecognition(handleVoiceResult);

    // CRUCIAL: Define o valor exibido no input (intermitente ou digitado)
    const displayValue = speech.isListening ? speakingInterim : inputText;

    // Rola automaticamente para a última mensagem
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, speakingInterim]); 

    const handleSend = (e) => {
        e.preventDefault();
        const text = displayValue.trim();
        if (text && !isLoading) {
            // Para a escuta antes de enviar o texto
            if(speech.isListening) speech.stopListening();
            
            sendMessage(text);
            setInputText('');
            setSpeakingInterim('');
        }
    };
    
    const handleInputChange = (e) => {
        // Permite a digitação normal
        setInputText(e.target.value);
    };
    
    const handleClose = () => {
        speech.stopListening();
        onClose();
        setChatHistory([]); 
    };
    
    const toggleSpeechInput = () => {
        if (!speech.isAPISupported) {
            alert("O ditado por voz pode não ser suportado neste navegador (requer Chrome/Safari/Edge atualizados em ambiente seguro).");
            return;
        }

        if (speech.isListening) {
            // Se o usuário parar a escuta, o onend dispara o onResult final
            speech.stopListening();
        } else {
            // Limpa o input (pois o texto capturado será anexado no final) e inicia.
            setInputText(''); 
            setSpeakingInterim('');
            speech.startListening();
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
                                        {message.role === 'preceptor' ? <UserCheck size={16} /> : <User size={16} />}
                                    </div>
                                    <div className={`font-bold text-xs ${message.role === 'preceptor' ? 'text-purple-400' : 'text-white/80'}`}>
                                        {message.role === 'user' ? 'Você (Residente)' : 'Dr. SilIA (Preceptor Sênior)'}
                                    </div>
                                </div>
                                
                                {/* CONTEÚDO com quebra automática (via ReactMarkdown) */}
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
                            value={displayValue} // Usa o valor para feedback em tempo real
                            onChange={handleInputChange} // Permite digitação normal
                            placeholder={speech.isListening ? speakingInterim || "Fale agora..." : (isFirstMessage ? "Apresente o caso clínico..." : "Sua resposta ou pergunta...")}
                            className={`flex-1 p-3 rounded-full border outline-none transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-purple-500' : 'bg-white border-gray-300 text-slate-800 focus:border-purple-500'}`}
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!displayValue.trim() || isLoading}
                            className={`p-3 rounded-full transition-colors ${!displayValue.trim() || isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
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