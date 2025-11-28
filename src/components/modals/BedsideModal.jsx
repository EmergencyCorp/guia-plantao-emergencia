// Arquivo: components/modals/BedsideModal.jsx

import React, { useState, useRef, useEffect } from 'react';
import { ClipboardList, X, Loader2, UserCheck, Pill, Mic, AlertTriangle } from 'lucide-react';

// --- HOOK CUSTOMIZADO PARA RECONHECIMENTO DE FALA ---
const useSpeechRecognition = (onResult) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    const textAreaRef = useRef(null);
    const [isAPISupported, setIsAPISupported] = useState(false);

    useEffect(() => {
        // Verifica a compatibilidade (Chrome/Safari/Outros)
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition || window.msSpeechRecognition;
        
        if (SpeechRecognition) {
            setIsAPISupported(true);
            const recognition = new SpeechRecognition();
            
            // Configurações para ditado contínuo e feedback
            recognition.continuous = true; 
            recognition.interimResults = true; 
            
            // Define o idioma principal para o Português do Brasil, melhorando a precisão
            recognition.lang = 'pt-BR'; 

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onerror = (event) => {
                console.error('Speech Recognition Error:', event.error);
                setIsListening(false);
                // Feedback mais explícito ao usuário
                alert(`Erro de Microfone: ${event.error === 'not-allowed' ? 'Permissão negada. Verifique as configurações do navegador para acesso ao microfone.' : 'Ocorreu um erro. Tente novamente.'}`);
            };

            recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                    } else {
                        interimTranscript += transcript;
                    }
                }
                onResult(finalTranscript.trim(), interimTranscript.trim());
            };

            recognitionRef.current = recognition;
        } else {
            setIsAPISupported(false);
        }

        return () => {
            if (recognitionRef.current && isListening) {
                recognitionRef.current.stop();
            }
        };
    }, [onResult, isListening]); // Adicionado isListening para evitar loop infinito em alguns casos

    const startListening = (targetRef) => {
        if (recognitionRef.current && !isListening) {
            textAreaRef.current = targetRef; 
            recognitionRef.current.start();
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    };
    
    const getTargetRef = () => textAreaRef.current;

    return { isListening, startListening, stopListening, getTargetRef, isAPISupported };
};


export default function BedsideModal({ 
	isOpen, onClose, isDarkMode, bedsideAnamnesis, setBedsideAnamnesis, 
	bedsideExams, setBedsideExams, generateBedsideConduct, isGeneratingBedside, bedsideResult 
}) {
	if (!isOpen) return null;

    const anamnesisRef = useRef(null);
    const examsRef = useRef(null);
    const [activeSpeechField, setActiveSpeechField] = useState(null); 
    const [currentInterimTranscript, setCurrentInterimTranscript] = useState('');

    const handleSpeechResult = (final, interim) => {
        const target = speech.getTargetRef();
        if (!target) return;

        // Determina o estado (anamnese ou exames) que está sendo atualizado
        const currentStateValue = target === anamnesisRef.current 
            ? bedsideAnamnesis 
            : bedsideExams;
            
        const setStateFunction = target === anamnesisRef.current
            ? setBedsideAnamnesis
            : setBedsideExams;


        // Anexa o resultado final ao estado principal
        if (final) {
            // Garante um espaço se não for o início do texto
            const separator = currentStateValue.length > 0 && !currentStateValue.endsWith(' ') ? ' ' : '';
            const newText = currentStateValue + separator + final;
            setStateFunction(newText);
            setCurrentInterimTranscript('');
        } else {
            // Exibe o texto intermediário (feedback visual)
            setCurrentInterimTranscript(interim);
        }
    };

    const speech = useSpeechRecognition(handleSpeechResult);


    // Função para alternar o microfone em um campo específico
    const toggleSpeech = (fieldRef, fieldName) => {
        if (!speech.isAPISupported) {
            alert("O ditado por voz não é suportado ou requer a última versão do Chrome/Edge/Safari (HTTPS obrigatório).");
            return;
        }
        
        if (speech.isListening && activeSpeechField === fieldName) {
            // Se já estiver escutando no campo ATUAL, pare.
            speech.stopListening();
            setActiveSpeechField(null);
        } else if (!speech.isListening) {
            // Se não estiver escutando, comece no campo selecionado.
            speech.startListening(fieldRef);
            setActiveSpeechField(fieldName);
        } else if (speech.isListening && activeSpeechField !== fieldName) {
            // Se estiver escutando em outro campo, pare e reinicie no novo.
            speech.stopListening();
            setActiveSpeechField(fieldName);
            // Pequeno delay para reiniciar após parar (necessário em alguns navegadores)
            setTimeout(() => speech.startListening(fieldRef), 100);
        }
    };
    
    // Lógica para mostrar o texto intermediário (placeholder/feedback)
    const getFieldContent = (field) => {
        const text = field === 'anamnesis' ? bedsideAnamnesis : bedsideExams;
        if (speech.isListening && activeSpeechField === field) {
            // Retorna o texto atual + o transcrito intermediário (em cinza, se aplicável)
            return text + (currentInterimTranscript ? ` ${currentInterimTranscript}` : '');
        }
        return text;
    };

    // Estilo especial para o placeholder/texto intermediário
    const getTextAreaClasses = (field) => {
        const baseClasses = `w-full p-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed resize-none ${isDarkMode ? 'bg-slate-800 border-slate-700 placeholder-slate-500' : 'bg-gray-50 border-gray-200'} h-40`;
        const activeClasses = speech.isListening && activeSpeechField === field 
            ? `ring-2 ring-red-500 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`
            : (isDarkMode ? 'text-slate-200' : 'text-slate-800');
            
        // Adiciona classe customizada para o texto intermediário se estiver ativo
        const interimClass = speech.isListening && activeSpeechField === field && currentInterimTranscript 
            ? 'interim-speech' // Classe CSS customizada para estilizar o texto intermediário
            : '';
            
        return `${baseClasses} ${activeClasses} ${interimClass} h-40`;
    }
    
    // Adiciona CSS para o texto intermediário (precisa ser adicionado globalmente ou em um arquivo CSS)
    // Para fins deste exemplo, vou mantê-lo como um lembrete.
    // Você pode ignorar esta parte se já tiver um arquivo CSS onde adicionar.
    if (speech.isAPISupported) {
         // O CSS correto deve ser adicionado globalmente:
         // textarea.interim-speech::placeholder { color: #ccc; }
    }


	return (
		<div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
			<div className={`w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white'}`}>
				<div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-indigo-900/30 border-slate-800' : 'bg-indigo-600 border-indigo-700'}`}>
					<h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-indigo-300' : 'text-white'}`}><ClipboardList size={24} /> BedSide - Clinical Guidance</h3>
					<button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-indigo-700 text-white'}`}><X size={20}/></button>
				</div>
					
				<div className="p-6 overflow-y-auto flex-1 grid md:grid-cols-2 gap-6">
					<div className="space-y-4">
                        
                        {/* --- AVISO DE COMPATIBILIDADE --- */}
                        {!speech.isAPISupported && (
                            <div className={`border p-3 rounded-lg flex gap-3 items-start text-sm ${isDarkMode ? 'bg-yellow-900/20 border-yellow-800/30 text-yellow-200' : 'bg-yellow-50 border-yellow-100 text-yellow-800'}`}>
                                <AlertTriangle className="shrink-0 w-5 h-5 mt-0.5" />
                                <p>O ditado por voz pode não ser suportado neste dispositivo/navegador. Tente usar o Chrome ou Edge em uma conexão HTTPS.</p>
                            </div>
                        )}
                        
                        {/* --- ANAMNESE --- */}
						<div>
							<label className={`text-xs font-bold uppercase mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Anamnese Completa</label>
                            <div className="relative">
                                <textarea 
                                    ref={anamnesisRef}
                                    className={getTextAreaClasses('anamnesis').replace('h-40', '') + ' h-40'} // Garante altura
                                    placeholder="Descreva a história clínica..." 
                                    value={getFieldContent('anamnesis')} 
                                    onChange={(e) => setBedsideAnamnesis(e.target.value)} 
                                />
                                <button 
                                    onClick={() => toggleSpeech(anamnesisRef.current, 'anamnesis')}
                                    className={`absolute right-3 bottom-3 p-2 rounded-full transition-colors ${speech.isListening && activeSpeechField === 'anamnesis' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'} ${speech.isListening && activeSpeechField !== 'anamnesis' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={speech.isListening && activeSpeechField !== 'anamnesis' || !speech.isAPISupported}
                                >
                                    {speech.isListening && activeSpeechField === 'anamnesis' ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
                                </button>
                            </div>
						</div>
                        
                        {/* --- EXAMES / SINAIS VITAIS --- */}
						<div>
							<label className={`text-xs font-bold uppercase mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Exames / Sinais Vitais</label>
                            <div className="relative">
							    <textarea 
                                    ref={examsRef}
                                    className={getTextAreaClasses('exams').replace('h-40', '') + ' h-32'} // Garante altura
                                    placeholder="PA, FC, exames..." 
                                    value={getFieldContent('exams')} 
                                    onChange={(e) => setBedsideExams(e.target.value)} 
                                />
                                <button 
                                    onClick={() => toggleSpeech(examsRef.current, 'exams')}
                                    className={`absolute right-3 bottom-3 p-2 rounded-full transition-colors ${speech.isListening && activeSpeechField === 'exams' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'} ${speech.isListening && activeSpeechField !== 'exams' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={speech.isListening && activeSpeechField !== 'exams' || !speech.isAPISupported}
                                >
                                    {speech.isListening && activeSpeechField === 'exams' ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
                                </button>
                            </div>
						</div>
                        
                        {/* --- BOTÃO GERAR CONDUTA --- */}
						<button onClick={generateBedsideConduct} disabled={isGeneratingBedside || speech.isListening} className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg ${isGeneratingBedside || speech.isListening ? 'bg-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
							{isGeneratingBedside ? <Loader2 className="animate-spin" /> : <><UserCheck size={20}/> Gerar Conduta Personalizada</>}
						</button>
					</div>

					<div className={`rounded-xl border p-4 overflow-y-auto max-h-[600px] ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-indigo-50 border-indigo-100'}`}>
						{!bedsideResult ? (
							<div className="h-full flex flex-col items-center justify-center text-center opacity-50"><ClipboardList size={48} className="mb-4 text-indigo-400" /><p className="text-sm font-bold">Aguardando dados...</p></div>
						) : (
							<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
								<div><h4 className={`text-xs font-bold uppercase border-b pb-1 mb-2 ${isDarkMode ? 'text-indigo-300 border-slate-600' : 'text-indigo-800 border-indigo-200'}`}>Hipóteses Diagnósticas</h4><ul className="list-disc list-inside text-sm space-y-1">{bedsideResult.hipoteses_diagnosticas?.map((h, i) => (<li key={i} className="font-bold">{h}</li>))}</ul></div>
								<div className={`p-3 rounded-lg text-sm italic border ${isDarkMode ? 'bg-slate-900/50 border-slate-600 text-slate-300' : 'bg-white border-indigo-100 text-slate-600'}`}>{bedsideResult.racional_clinico}</div>
								<div><h4 className={`text-xs font-bold uppercase border-b pb-1 mb-2 flex items-center gap-2 ${isDarkMode ? 'text-emerald-400 border-slate-600' : 'text-emerald-800 border-emerald-200'}`}><Pill size={14}/> Conduta Terapêutica</h4><div className="space-y-2">{bedsideResult.conduta_terapeutica?.map((item, i) => (<div key={i} className={`p-2 rounded border text-sm flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-600' : 'bg-white border-gray-200'}`}><span className="font-bold text-xs uppercase opacity-70">{item.tipo}</span><span className="font-medium">{item.detalhe}</span></div>))}</div></div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}