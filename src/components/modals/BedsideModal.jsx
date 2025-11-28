// Arquivo: components/modals/BedsideModal.jsx

import React, { useState, useRef, useEffect } from 'react';
import { ClipboardList, X, Loader2, UserCheck, Pill, Mic } from 'lucide-react';

// Função auxiliar para inicializar o Speech Recognition
const useSpeechRecognition = (onResult) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    const textAreaRef = useRef(null);

    useEffect(() => {
        // Verifica se a API está disponível no navegador
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true; // Continua a escutar
            recognition.interimResults = true; // Permite resultados intermediários

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onerror = (event) => {
                console.error('Speech Recognition Error:', event.error);
                setIsListening(false);
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
            console.warn("Speech Recognition API não é suportada neste navegador.");
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [onResult]);

    const startListening = (targetRef) => {
        if (recognitionRef.current && !isListening) {
            // Salva o alvo (textarea) para direcionar o texto
            textAreaRef.current = targetRef; 
            recognitionRef.current.start();
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    };
    
    // Retorna a referência do textarea alvo (usado pela função onResult)
    const getTargetRef = () => textAreaRef.current;

    return { isListening, startListening, stopListening, getTargetRef, isAPISupported: !!recognitionRef.current };
};


export default function BedsideModal({ 
	isOpen, onClose, isDarkMode, bedsideAnamnesis, setBedsideAnamnesis, 
	bedsideExams, setBedsideExams, generateBedsideConduct, isGeneratingBedside, bedsideResult 
}) {
	if (!isOpen) return null;

    const anamnesisRef = useRef(null);
    const examsRef = useRef(null);
    const [activeSpeechField, setActiveSpeechField] = useState(null); // 'anamnesis' ou 'exams'
    const [currentInterimTranscript, setCurrentInterimTranscript] = useState('');

    // Função de callback para processar o resultado da fala
    const handleSpeechResult = (final, interim) => {
        const target = speech.getTargetRef();
        if (!target) return;

        const currentText = target === anamnesisRef.current 
            ? bedsideAnamnesis 
            : bedsideExams;

        // Anexa o resultado final ao estado principal
        if (final) {
            const newText = currentText + (currentText.endsWith(' ') || currentText === '' ? '' : ' ') + final;
            target === anamnesisRef.current ? setBedsideAnamnesis(newText) : setBedsideExams(newText);
            setCurrentInterimTranscript('');
        } else {
            // Exibe o texto intermediário para feedback
            setCurrentInterimTranscript(interim);
        }
    };

    const speech = useSpeechRecognition(handleSpeechResult);


    // Função para alternar o microfone em um campo específico
    const toggleSpeech = (fieldRef, fieldName) => {
        if (!speech.isAPISupported) {
            alert("O reconhecimento de fala não é suportado no seu navegador.");
            return;
        }
        
        if (speech.isListening) {
            // Se já estiver escutando, pare.
            speech.stopListening();
            setActiveSpeechField(null);
        } else {
            // Se não estiver escutando, comece no campo selecionado.
            speech.startListening(fieldRef);
            setActiveSpeechField(fieldName);
        }
    };
    
    // Lógica para mostrar o texto intermediário (placeholder/feedback)
    const getFieldContent = (field) => {
        const text = field === 'anamnesis' ? bedsideAnamnesis : bedsideExams;
        if (speech.isListening && activeSpeechField === field) {
            return text + (currentInterimTranscript ? ` (${currentInterimTranscript})` : '');
        }
        return text;
    };
    
    // Efeito para garantir que se fechar o modal, a escuta pare
    useEffect(() => {
        if (!isOpen && speech.isListening) {
            speech.stopListening();
        }
    }, [isOpen, speech.isListening]);

	return (
		<div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
			<div className={`w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white'}`}>
				<div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-indigo-900/30 border-slate-800' : 'bg-indigo-600 border-indigo-700'}`}>
					<h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-indigo-300' : 'text-white'}`}><ClipboardList size={24} /> BedSide - Clinical Guidance</h3>
					<button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-indigo-700 text-white'}`}><X size={20}/></button>
				</div>
					
				<div className="p-6 overflow-y-auto flex-1 grid md:grid-cols-2 gap-6">
					<div className="space-y-4">
                        {/* --- ANAMNESE --- */}
						<div>
							<label className={`text-xs font-bold uppercase mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Anamnese Completa</label>
                            <div className="relative">
                                <textarea 
                                    ref={anamnesisRef}
                                    className={`w-full h-40 p-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed resize-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-slate-800'} ${speech.isListening && activeSpeechField === 'anamnesis' ? 'ring-2 ring-red-500' : ''}`} 
                                    placeholder="Descreva a história clínica..." 
                                    value={getFieldContent('anamnesis')} 
                                    onChange={(e) => setBedsideAnamnesis(e.target.value)} 
                                />
                                <button 
                                    onClick={() => toggleSpeech(anamnesisRef.current, 'anamnesis')}
                                    className={`absolute right-3 bottom-3 p-2 rounded-full transition-colors ${speech.isListening && activeSpeechField === 'anamnesis' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'} ${speech.isListening && activeSpeechField !== 'anamnesis' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={speech.isListening && activeSpeechField !== 'anamnesis'}
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
                                    className={`w-full h-32 p-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed resize-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-slate-800'} ${speech.isListening && activeSpeechField === 'exams' ? 'ring-2 ring-red-500' : ''}`} 
                                    placeholder="PA, FC, exames..." 
                                    value={getFieldContent('exams')} 
                                    onChange={(e) => setBedsideExams(e.target.value)} 
                                />
                                <button 
                                    onClick={() => toggleSpeech(examsRef.current, 'exams')}
                                    className={`absolute right-3 bottom-3 p-2 rounded-full transition-colors ${speech.isListening && activeSpeechField === 'exams' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'} ${speech.isListening && activeSpeechField !== 'exams' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={speech.isListening && activeSpeechField !== 'exams'}
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