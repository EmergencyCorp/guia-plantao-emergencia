// Arquivo: src/components/modals/MedicalScoresModal.jsx
import React, { useState, useEffect } from 'react';
// CORREÇÃO: Adicionado 'Search' na importação abaixo
import { X, Calculator, ChevronRight, Activity, CheckCircle2, Search } from 'lucide-react';

// --- CONFIGURAÇÃO DOS SCORES ---
const SCORES_DB = [
  { id: 'glasgow', name: 'Escala de Coma de Glasgow', category: 'Neurologia', description: 'Avaliação do nível de consciência.' },
  { id: 'cha2ds2', name: 'CHA₂DS₂-VASc', category: 'Cardiologia', description: 'Risco de AVC em Fibrilação Atrial.' },
  { id: 'curb65', name: 'CURB-65', category: 'Pneumologia', description: 'Gravidade da Pneumonia Adquirida na Comunidade.' },
  { id: 'wells_tep', name: 'Score de Wells (TEP)', category: 'Vascular', description: 'Probabilidade de Embolia Pulmonar.' },
  { id: 'wells_tvp', name: 'Score de Wells (TVP)', category: 'Vascular', description: 'Probabilidade de Trombose Venosa Profunda.' },
  { id: 'sofa', name: 'SOFA Score', category: 'Terapia Intensiva', description: 'Avaliação de falência orgânica na Sepse.' },
  { id: 'qsofa', name: 'qSOFA', category: 'Terapia Intensiva', description: 'Screening rápido de sepse à beira leito.' },
  { id: 'child_pugh', name: 'Child-Pugh', category: 'Hepatologia', description: 'Prognóstico na Cirrose Hepática.' },
  { id: 'meld', name: 'MELD Score', category: 'Hepatologia', description: 'Model for End-Stage Liver Disease.' },
  { id: 'heart', name: 'HEART Score', category: 'Cardiologia', description: 'Risco de eventos cardíacos em dor torácica.' },
  { id: 'alvarado', name: 'Escore de Alvarado', category: 'Cirurgia', description: 'Probabilidade de Apendicite Aguda.' },
  { id: 'grace', name: 'GRACE Risk Score', category: 'Cardiologia', description: 'Mortalidade em SCA (Estimativa Simplificada).' },
  { id: 'kdigo', name: 'KDIGO Staging', category: 'Nefrologia', description: 'Estadiamento da Doença Renal Crônica.' },
  { id: 'nihss', name: 'NIHSS', category: 'Neurologia', description: 'Gravidade do AVC Isquêmico (Sumário).' },
  { id: 'apache', name: 'APACHE II', category: 'UTI', description: 'Classificação de gravidade de doença (Simplificado).' }
];

export default function MedicalScoresModal({ isOpen, onClose, isDarkMode }) {
  const [selectedScore, setSelectedScore] = useState(null);
  const [inputs, setInputs] = useState({});
  const [result, setResult] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setInputs({});
    setResult(null);
  }, [selectedScore]);

  if (!isOpen) return null;

  const handleInputChange = (key, value) => {
    setInputs(prev => ({ ...prev, [key]: parseFloat(value) || value }));
  };

  const handleCheckboxChange = (key) => {
    setInputs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const calculateResult = () => {
    let score = 0;
    let interpretation = '';

    try {
      switch (selectedScore.id) {
        case 'glasgow':
          score = (inputs.ocular || 0) + (inputs.verbal || 0) + (inputs.motor || 0);
          if(score < 3) score = 3; 
          interpretation = score <= 8 ? 'Coma / Trauma Grave (IOT Indicada)' : score <= 12 ? 'Trauma Moderado' : 'Trauma Leve';
          break;
        case 'cha2ds2':
          if (inputs.icc) score += 1;
          if (inputs.has) score += 1;
          if (inputs.age >= 75) score += 2; else if (inputs.age >= 65) score += 1;
          if (inputs.dm) score += 1;
          if (inputs.avc) score += 2;
          if (inputs.vasc) score += 1;
          if (inputs.female) score += 1;
          interpretation = score >= 2 ? 'Alto Risco (Anticoagulação Indicada)' : score === 1 ? 'Risco Moderado' : 'Baixo Risco';
          break;
        case 'curb65':
          if (inputs.confusao) score += 1;
          if (inputs.ureia > 43) score += 1; 
          if (inputs.fr >= 30) score += 1;
          if (inputs.pas < 90 || inputs.pad <= 60) score += 1;
          if (inputs.age >= 65) score += 1;
          interpretation = score <= 1 ? 'Baixo Risco (Ambulatorial)' : score === 2 ? 'Moderado (Considerar Internação)' : 'Alto Risco (UTI)';
          break;
        case 'meld':
          const bili = inputs.bili < 1 ? 1 : inputs.bili;
          const inr = inputs.inr < 1 ? 1 : inputs.inr;
          const cr = inputs.cr < 1 ? 1 : (inputs.cr > 4 ? 4 : inputs.cr);
          let meld = 3.78 * Math.log(bili) + 11.2 * Math.log(inr) + 9.57 * Math.log(cr) + 6.43;
          if(inputs.dialise) meld = 3.78 * Math.log(bili) + 11.2 * Math.log(inr) + 9.57 * Math.log(4) + 6.43;
          score = Math.round(meld);
          interpretation = `Mortalidade em 3 meses estimada. Score > 40: ~71.3% mortalidade.`;
          break;
        case 'heart':
          score = (inputs.historia || 0) + (inputs.ecg || 0) + (inputs.idade || 0) + (inputs.fatores || 0) + (inputs.tropo || 0);
          interpretation = score <= 3 ? 'Baixo Risco (0-3) - Considerar alta' : score <= 6 ? 'Risco Intermediário (4-6) - Observação' : 'Alto Risco (7-10) - Intervenção';
          break;
        case 'wells_tep':
          if (inputs.tvp_sinais) score += 3;
          if (inputs.sem_diag_alt) score += 3;
          if (inputs.fc > 100) score += 1.5;
          if (inputs.imob) score += 1.5;
          if (inputs.hist_tev) score += 1.5;
          if (inputs.hemoptise) score += 1;
          if (inputs.cancer) score += 1;
          interpretation = score <= 4 ? 'TEP Improvável (D-Dímero indicado)' : 'TEP Provável (Angio-TC indicada)';
          break;
        case 'wells_tvp':
            if(inputs.cancer_ativo) score += 1;
            if(inputs.paralisia) score += 1;
            if(inputs.acamado) score += 1;
            if(inputs.dor_palpacao) score += 1;
            if(inputs.edema_todo) score += 1;
            if(inputs.edema_panturrilha) score += 1;
            if(inputs.edema_cacifo) score += 1;
            if(inputs.veias_colaterais) score += 1;
            if(inputs.hist_tvp) score += 1;
            if(inputs.diag_alternativo) score -= 2;
            interpretation = score >= 2 ? 'TVP Provável' : 'TVP Improvável';
            break;
        case 'child_pugh':
            score = (inputs.encef || 1) + (inputs.ascite || 1) + (inputs.inr || 1) + (inputs.alb || 1) + (inputs.bili || 1);
            interpretation = score <= 6 ? 'Classe A (5-6): Sobrevida 100% 1 ano' : score <= 9 ? 'Classe B (7-9): Sobrevida 80% 1 ano' : 'Classe C (10-15): Sobrevida 45% 1 ano';
            break;
        case 'alvarado':
            if(inputs.migratoria) score+=1;
            if(inputs.anorexia) score+=1;
            if(inputs.nauseas) score+=1;
            if(inputs.dor_qid) score+=2;
            if(inputs.descompressao) score+=1;
            if(inputs.temp) score+=1;
            if(inputs.leuco) score+=2;
            if(inputs.desvio) score+=1;
            interpretation = score < 4 ? 'Improvável' : score < 7 ? 'Possível (Observação/Imagem)' : 'Muito Provável (Cirurgia)';
            break;
        case 'sofa':
            score = (inputs.resp || 0) + (inputs.coag || 0) + (inputs.hep || 0) + (inputs.cardio || 0) + (inputs.snc || 0) + (inputs.renal || 0);
            interpretation = score >= 2 ? 'Aumento agudo de ≥2 pontos sugere sepse com maior risco de mortalidade.' : 'Monitorar evolução.';
            break;
        case 'qsofa':
            if(inputs.pas <= 100) score+=1;
            if(inputs.fr >= 22) score+=1;
            if(inputs.glasgow < 15) score+=1;
            interpretation = score >= 2 ? 'Alto risco de desfecho desfavorável (Sepse).' : 'Baixo risco, mas não exclui sepse.';
            break;
        case 'kdigo':
            interpretation = `Estágio G${inputs.gfr_stage || '?'} A${inputs.alb_stage || '?'}. Consulte diretriz para frequência de monitoramento.`;
            score = "Classificação";
            break;
        default:
            score = "N/A";
            interpretation = "Calculadora em desenvolvimento ou requer dados complexos.";
      }
      setResult({ value: score, text: interpretation });
    } catch (e) {
      setResult({ value: "Erro", text: "Verifique os valores inseridos." });
    }
  };

  const renderInputs = () => {
    switch (selectedScore?.id) {
      case 'glasgow':
        return (
          <div className="space-y-4">
            <label className="block text-sm font-bold">Abertura Ocular</label>
            <select className="w-full p-2 rounded border dark:bg-slate-700 dark:border-slate-600" onChange={(e) => handleInputChange('ocular', e.target.value)}>
              <option value="0">Selecione...</option><option value="4">4 - Espontânea</option><option value="3">3 - À voz</option><option value="2">2 - À dor</option><option value="1">1 - Ausente</option>
            </select>
            <label className="block text-sm font-bold">Resposta Verbal</label>
            <select className="w-full p-2 rounded border dark:bg-slate-700 dark:border-slate-600" onChange={(e) => handleInputChange('verbal', e.target.value)}>
              <option value="0">Selecione...</option><option value="5">5 - Orientado</option><option value="4">4 - Confuso</option><option value="3">3 - Palavras inapropriadas</option><option value="2">2 - Sons incompreensíveis</option><option value="1">1 - Ausente</option>
            </select>
            <label className="block text-sm font-bold">Resposta Motora</label>
            <select className="w-full p-2 rounded border dark:bg-slate-700 dark:border-slate-600" onChange={(e) => handleInputChange('motor', e.target.value)}>
              <option value="0">Selecione...</option><option value="6">6 - Obedece comandos</option><option value="5">5 - Localiza dor</option><option value="4">4 - Movimento de retirada</option><option value="3">3 - Flexão anormal (Decorticação)</option><option value="2">2 - Extensão anormal (Descerebração)</option><option value="1">1 - Ausente</option>
            </select>
          </div>
        );
      case 'cha2ds2':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('icc')} /> Insuficiência Cardíaca (+1)</div>
            <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('has')} /> Hipertensão (+1)</div>
            <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('dm')} /> Diabetes (+1)</div>
            <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('avc')} /> AVC/AIT Prévio (+2)</div>
            <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('vasc')} /> Doença Vascular (+1)</div>
            <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('female')} /> Sexo Feminino (+1)</div>
            <div className="mt-2"><label className="block text-xs font-bold">Idade</label><input type="number" className="w-full p-2 rounded border dark:bg-slate-700" placeholder="Anos" onChange={(e) => handleInputChange('age', e.target.value)} /></div>
          </div>
        );
      case 'curb65':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('confusao')} /> Confusão Mental (+1)</div>
            <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('ureia')} /> Ureia {'>'} 43 mg/dL (+1)</div>
            <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('fr')} /> FR {'>='} 30 irpm (+1)</div>
            <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('pas')} /> PAS {'<'} 90 ou PAD {'<='} 60 (+1)</div>
            <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('age')} /> Idade {'>='} 65 anos (+1)</div>
          </div>
        );
      case 'meld':
        return (
          <div className="space-y-3">
            <div><label className="text-xs font-bold">Bilirrubina (mg/dL)</label><input type="number" className="w-full p-2 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('bili', e.target.value)} /></div>
            <div><label className="text-xs font-bold">INR</label><input type="number" className="w-full p-2 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('inr', e.target.value)} /></div>
            <div><label className="text-xs font-bold">Creatinina (mg/dL)</label><input type="number" className="w-full p-2 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('cr', e.target.value)} /></div>
            <div className="flex items-center gap-2 mt-2"><input type="checkbox" onChange={() => handleCheckboxChange('dialise')} /> Paciente em Diálise?</div>
          </div>
        );
      case 'heart':
        return (
          <div className="space-y-3">
            <label className="block text-sm font-bold">História</label><select className="w-full p-2 rounded border dark:bg-slate-700" onChange={(e) => handleInputChange('historia', e.target.value)}><option value="0">Pouco suspeita (0)</option><option value="1">Moderadamente suspeita (1)</option><option value="2">Altamente suspeita (2)</option></select>
            <label className="block text-sm font-bold">ECG</label><select className="w-full p-2 rounded border dark:bg-slate-700" onChange={(e) => handleInputChange('ecg', e.target.value)}><option value="0">Normal (0)</option><option value="1">Repolarização inespecífica (1)</option><option value="2">Desvio ST signiticativo (2)</option></select>
            <label className="block text-sm font-bold">Idade</label><select className="w-full p-2 rounded border dark:bg-slate-700" onChange={(e) => handleInputChange('idade', e.target.value)}><option value="0">{'<'} 45 (0)</option><option value="1">45-65 (1)</option><option value="2">{'>'} 65 (2)</option></select>
            <label className="block text-sm font-bold">Fatores de Risco</label><select className="w-full p-2 rounded border dark:bg-slate-700" onChange={(e) => handleInputChange('fatores', e.target.value)}><option value="0">Nenhum (0)</option><option value="1">1-2 fatores (1)</option><option value="2">3+ fatores ou doença prévia (2)</option></select>
            <label className="block text-sm font-bold">Troponina</label><select className="w-full p-2 rounded border dark:bg-slate-700" onChange={(e) => handleInputChange('tropo', e.target.value)}><option value="0">Normal (0)</option><option value="1">1-3x limite (1)</option><option value="2">{'>'} 3x limite (2)</option></select>
          </div>
        );
      case 'wells_tep':
        return (
            <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('tvp_sinais')} /> Sinais clínicos de TVP (+3.0)</div>
                <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('sem_diag_alt')} /> TEP é a hipótese nº 1 (+3.0)</div>
                <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('fc')} /> FC {'>'} 100 bpm (+1.5)</div>
                <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('imob')} /> Imobilização/Cirurgia recente (+1.5)</div>
                <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('hist_tev')} /> História prévia de TVP/TEP (+1.5)</div>
                <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('hemoptise')} /> Hemoptise (+1.0)</div>
                <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('cancer')} /> Câncer ativo (+1.0)</div>
            </div>
        );
      case 'sofa':
        const sofaOptions = [0,1,2,3,4].map(n => <option key={n} value={n}>{n}</option>);
        return (
            <div className="space-y-3">
                <p className="text-xs italic opacity-70">Selecione a pontuação para cada sistema:</p>
                <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs font-bold">Resp (PaO2/FiO2)</label><select className="w-full p-1 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('resp', e.target.value)}>{sofaOptions}</select></div>
                    <div><label className="text-xs font-bold">Coag (Plaquetas)</label><select className="w-full p-1 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('coag', e.target.value)}>{sofaOptions}</select></div>
                    <div><label className="text-xs font-bold">Fígado (Bili)</label><select className="w-full p-1 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('hep', e.target.value)}>{sofaOptions}</select></div>
                    <div><label className="text-xs font-bold">Cardio (PAM/Drogas)</label><select className="w-full p-1 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('cardio', e.target.value)}>{sofaOptions}</select></div>
                    <div><label className="text-xs font-bold">SNC (Glasgow)</label><select className="w-full p-1 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('snc', e.target.value)}>{sofaOptions}</select></div>
                    <div><label className="text-xs font-bold">Renal (Cr/Diurese)</label><select className="w-full p-1 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('renal', e.target.value)}>{sofaOptions}</select></div>
                </div>
            </div>
        );
      case 'alvarado':
        return (
            <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('migratoria')} /> Dor migratória para FID (+1)</div>
                <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('anorexia')} /> Anorexia (+1)</div>
                <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('nauseas')} /> Náuseas / Vômitos (+1)</div>
                <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('dor_qid')} /> Dor à palpação em QID (+2)</div>
                <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('descompressao')} /> Descompressão brusca dolorosa (+1)</div>
                <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('temp')} /> Tax {'>'} 37.3ºC (+1)</div>
                <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('leuco')} /> Leucocitose {'>'} 10k (+2)</div>
                <div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('desvio')} /> Desvio à esquerda (+1)</div>
            </div>
        );
      default:
        return <div className="text-center p-4 text-sm opacity-50">Este score requer muitos dados ou tabelas complexas.<br/>Use a versão simplificada ou consulte a tabela completa em "Buscar Condutas".</div>;
    }
  };

  const filteredScores = SCORES_DB.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.includes(searchTerm.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white'}`}>
        
        <div className={`w-full md:w-1/3 border-r flex flex-col ${isDarkMode ? 'border-slate-800' : 'border-gray-200'}`}>
            <div className={`p-4 border-b ${isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-gray-200 bg-gray-50'}`}>
                <h3 className="font-bold flex items-center gap-2 mb-3"><Activity size={20} className="text-blue-500"/> Scores Médicos</h3>
                <div className="relative">
                    <input type="text" placeholder="Buscar score..." className={`w-full pl-8 pr-2 py-2 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300'}`} onChange={(e) => setSearchTerm(e.target.value)} />
                    <Search className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredScores.map(score => (
                    <button key={score.id} onClick={() => setSelectedScore(score)} className={`w-full text-left p-3 rounded-lg text-sm transition-all flex items-center justify-between group ${selectedScore?.id === score.id ? (isDarkMode ? 'bg-blue-900/40 text-blue-300 border border-blue-800' : 'bg-blue-50 text-blue-700 border border-blue-200') : (isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-50 text-slate-600')}`}>
                        <div><span className="font-bold block">{score.name}</span><span className="text-[10px] opacity-70 uppercase tracking-wide">{score.category}</span></div>
                        <ChevronRight size={16} className={`opacity-0 group-hover:opacity-100 transition-opacity ${selectedScore?.id === score.id ? 'opacity-100' : ''}`}/>
                    </button>
                ))}
            </div>
        </div>

        <div className="flex-1 flex flex-col h-full relative">
            <button onClick={onClose} className={`absolute right-4 top-4 p-2 rounded-full z-10 ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}><X size={20}/></button>
            {selectedScore ? (
                <>
                    <div className={`p-6 border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                        <h2 className="text-2xl font-bold">{selectedScore.name}</h2>
                        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{selectedScore.description}</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">{renderInputs()}</div>
                    <div className={`p-6 border-t ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex justify-between items-center mb-4">
                            <div><span className="text-xs uppercase font-bold text-slate-500">Resultado</span><div className={`text-3xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{result ? result.value : '--'}</div></div>
                            <button onClick={calculateResult} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95"><Calculator size={18} /> Calcular</button>
                        </div>
                        {result && (
                            <div className={`p-3 rounded-lg border flex gap-3 items-start animate-in slide-in-from-bottom-2 ${isDarkMode ? 'bg-blue-900/20 border-blue-800 text-blue-200' : 'bg-blue-100 border-blue-200 text-blue-800'}`}>
                                <CheckCircle2 size={20} className="shrink-0 mt-0.5" /><p className="text-sm font-medium">{result.text}</p>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 p-8">
                    <Activity size={64} className="mb-4 text-slate-500"/><h3 className="text-xl font-bold">Selecione um Score</h3><p className="text-sm max-w-xs mx-auto mt-2">Escolha uma ferramenta na lista lateral para iniciar o cálculo.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}