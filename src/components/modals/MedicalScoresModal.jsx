// Arquivo: src/components/modals/MedicalScoresModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  X, Calculator, ChevronRight, Activity, AlertTriangle, ArrowLeft,
  Brain, HeartPulse, Wind, AlertOctagon, Thermometer, Baby, Beaker, Check, Search
} from 'lucide-react';

// --- CONFIGURAÇÃO DOS SCORES ---
const SCORES_DB = [
  { id: 'glasgow', name: 'Escala de Coma de Glasgow', category: 'Neurologia', description: 'Avaliação do nível de consciência.' },
  { id: 'nihss', name: 'NIHSS (AVC)', category: 'Neurologia', description: 'Gravidade do AVC Isquêmico e prognóstico.' },
  { id: 'cha2ds2', name: 'CHA₂DS₂-VASc', category: 'Cardiologia', description: 'Risco de AVC em Fibrilação Atrial.' },
  { id: 'heart', name: 'HEART Score', category: 'Cardiologia', description: 'Risco de eventos cardíacos em dor torácica.' },
  { id: 'grace', name: 'GRACE Risk Score', category: 'Cardiologia', description: 'Mortalidade intra-hospitalar em SCA.' },
  { id: 'curb65', name: 'CURB-65', category: 'Pneumologia', description: 'Gravidade da Pneumonia Adquirida na Comunidade.' },
  { id: 'psi', name: 'PSI (PORT Score)', category: 'Pneumologia', description: 'Pneumonia Severity Index (Estratificação fina).' },
  { id: 'wells_tep', name: 'Score de Wells (TEP)', category: 'Vascular', description: 'Probabilidade de Embolia Pulmonar.' },
  { id: 'wells_tvp', name: 'Score de Wells (TVP)', category: 'Vascular', description: 'Probabilidade de Trombose Venosa Profunda.' },
  { id: 'sofa', name: 'SOFA Score', category: 'Terapia Intensiva', description: 'Avaliação de falência orgânica na Sepse.' },
  { id: 'sofa2', name: 'SOFA-2 Score (2025)', category: 'Terapia Intensiva', description: 'Atualização com SpO2/FiO2 e Lactato.' },
  { id: 'qsofa', name: 'qSOFA', category: 'Terapia Intensiva', description: 'Screening rápido de sepse à beira leito.' },
  { id: 'phoenix', name: 'Phoenix (Sepse Pediátrica)', category: 'Pediatria', description: 'Critérios de Sepse e Choque Séptico em crianças (2024).' },
  { id: 'apache', name: 'APACHE II', category: 'Terapia Intensiva', description: 'Classificação de gravidade e prognóstico em UTI.' },
  { id: 'child_pugh', name: 'Child-Pugh', category: 'Hepatologia', description: 'Prognóstico na Cirrose Hepática.' },
  { id: 'meld', name: 'MELD Score', category: 'Hepatologia', description: 'Model for End-Stage Liver Disease.' },
  { id: 'alvarado', name: 'Escore de Alvarado', category: 'Cirurgia', description: 'Probabilidade de Apendicite Aguda.' },
  { id: 'kdigo', name: 'KDIGO (DRC)', category: 'Nefrologia', description: 'Estadiamento e Prognóstico da Doença Renal.' },
];

const getCategoryIcon = (category) => {
    switch (category) {
        case 'Neurologia': return <Brain size={16} />;
        case 'Cardiologia': return <HeartPulse size={16} />;
        case 'Pneumologia': return <Wind size={16} />;
        case 'Terapia Intensiva': return <AlertOctagon size={16} />;
        case 'Pediatria': return <Baby size={16} />;
        case 'Hepatologia': case 'Nefrologia': return <Beaker size={16} />;
        case 'Cirurgia': return <Thermometer size={16} />;
        default: return <Activity size={16} />;
    }
};

// --- COMPONENTES DE UI (Movidos para fora para corrigir o bug de foco) ---
const ScoreInput = ({ label, children, isDarkMode }) => (
  <div className="mb-4">
      <label className={`block text-xs font-bold uppercase mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</label>
      {children}
  </div>
);

const Select = ({ onChange, options, value, isDarkMode }) => (
  <div className="relative">
      <select 
          className={`w-full p-3 rounded-xl appearance-none outline-none border transition-all font-medium ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-500'}`}
          onChange={onChange}
          value={value !== undefined && value !== null ? value : ''} 
      >
          {options.map((opt, i) => <option key={i} value={opt.val}>{opt.label}</option>)}
      </select>
      <div className="absolute right-3 top-3.5 pointer-events-none opacity-50"><ChevronRight size={16} className="rotate-90"/></div>
  </div>
);

const NumberInput = ({ onChange, placeholder, step, max, value, isDarkMode }) => (
  <input 
      type="number" 
      placeholder={placeholder} 
      step={step}
      max={max}
      value={value !== undefined && value !== null ? value : ''} 
      className={`w-full p-3 rounded-xl outline-none border transition-all font-medium ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-500'}`}
      onChange={onChange}
  />
);

const Checkbox = ({ label, onChange, checked, isDarkMode }) => (
  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all group select-none ${checked ? (isDarkMode ? 'bg-blue-900/30 border-blue-500 ring-1 ring-blue-500' : 'bg-blue-50 border-blue-500 ring-1 ring-blue-500') : (isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-slate-500' : 'bg-white border-gray-200 hover:border-gray-400')}`}>
      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-400 text-transparent'}`}>
          <Check size={14} strokeWidth={3} />
      </div>
      <input type="checkbox" className="hidden" checked={!!checked} onChange={onChange} />
      <span className={`text-sm font-medium ${checked ? (isDarkMode ? 'text-blue-200' : 'text-blue-800') : (isDarkMode ? 'text-slate-300' : 'text-slate-700')}`}>{label}</span>
  </label>
);

export default function MedicalScoresModal({ isOpen, onClose, isDarkMode }) {
  const [selectedScore, setSelectedScore] = useState(null);
  const [inputs, setInputs] = useState({});
  const [result, setResult] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setInputs({});
    setResult(null);
  }, [selectedScore]);

  useEffect(() => {
    if (selectedScore) calculateResult();
  }, [inputs, selectedScore]);

  if (!isOpen) return null;

  const handleInputChange = (key, value) => {
    const val = value === '' ? null : parseFloat(value);
    setInputs(prev => ({ ...prev, [key]: val }));
  };
  
  const handleStringChange = (key, value) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const handleCheckboxChange = (key) => {
    setInputs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getSeverityColor = (severity) => {
      switch(severity) {
          case 'low': return isDarkMode ? 'bg-emerald-900/40 border-emerald-700 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-800';
          case 'medium': return isDarkMode ? 'bg-amber-900/40 border-amber-700 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800';
          case 'high': return isDarkMode ? 'bg-rose-900/40 border-rose-700 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-800';
          default: return isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-800';
      }
  };

  const calculateResult = () => {
    let score = 0;
    let interpretation = '';
    let severity = 'low';

    try {
      switch (selectedScore.id) {
        case 'glasgow':
          score = (inputs.ocular || 0) + (inputs.verbal || 0) + (inputs.motor || 0);
          if(score === 0) score = 3; 
          if (score <= 8) { interpretation = 'Coma / Trauma Grave (IOT Indicada)'; severity = 'high'; }
          else if (score <= 12) { interpretation = 'Trauma Moderado'; severity = 'medium'; }
          else { interpretation = 'Trauma Leve'; severity = 'low'; }
          break;

        case 'sofa2':
            let sofa2 = 0;
            if(inputs.sf_ratio && inputs.sf_ratio < 150 && inputs.resp_support) sofa2 += 4;
            else if(inputs.sf_ratio && inputs.sf_ratio < 235 && inputs.resp_support) sofa2 += 3;
            else if(inputs.sf_ratio && inputs.sf_ratio < 315) sofa2 += 2;
            else if(inputs.sf_ratio && inputs.sf_ratio < 400) sofa2 += 1;
            
            if(inputs.plaq !== null && inputs.plaq !== undefined && inputs.plaq < 20) sofa2 += 4; 
            else if(inputs.plaq !== null && inputs.plaq !== undefined && inputs.plaq < 50) sofa2 += 3; 
            else if(inputs.plaq !== null && inputs.plaq !== undefined && inputs.plaq < 100) sofa2 += 2; 
            else if(inputs.plaq !== null && inputs.plaq !== undefined && inputs.plaq < 150) sofa2 += 1;
            
            if(inputs.bili > 12) sofa2 += 4; else if(inputs.bili >= 6) sofa2 += 3; else if(inputs.bili >= 2) sofa2 += 2; else if(inputs.bili >= 1.2) sofa2 += 1;

            if(inputs.drogas) sofa2 += inputs.drogas;
            else if(inputs.map !== null && inputs.map !== undefined && inputs.map < 70) sofa2 += 1;

            const gcs = inputs.glasgow;
            if(gcs !== null && gcs !== undefined && gcs < 6) sofa2 += 4; 
            else if(gcs !== null && gcs !== undefined && gcs <= 9) sofa2 += 3; 
            else if(gcs !== null && gcs !== undefined && gcs <= 12) sofa2 += 2; 
            else if(gcs !== null && gcs !== undefined && gcs <= 14) sofa2 += 1;

            if(inputs.creat > 5) sofa2 += 4; else if(inputs.creat >= 3.5) sofa2 += 3; else if(inputs.creat >= 2) sofa2 += 2; else if(inputs.creat >= 1.2) sofa2 += 1;
            if(inputs.lactate > 2) sofa2 += 1;

            score = sofa2;
            if (score < 2) { interpretation = 'Baixo risco de mortalidade.'; severity = 'low'; }
            else if (score < 6) { interpretation = 'Sepse possível (Monitorar).'; severity = 'medium'; }
            else { interpretation = 'Alto risco de mortalidade (Sepse Grave/Choque).'; severity = 'high'; }
            break;

        case 'phoenix':
            let phoenix = 0;
            if (inputs.imv && ((inputs.sf_ratio_ped !== null && inputs.sf_ratio_ped < 148) || (inputs.pf_ratio_ped !== null && inputs.pf_ratio_ped < 100))) phoenix += 3;
            else if (inputs.imv && ((inputs.sf_ratio_ped !== null && inputs.sf_ratio_ped < 220) || (inputs.pf_ratio_ped !== null && inputs.pf_ratio_ped < 200))) phoenix += 2;
            else if ((inputs.sf_ratio_ped !== null && inputs.sf_ratio_ped < 292) || (inputs.pf_ratio_ped !== null && inputs.pf_ratio_ped < 400)) phoenix += 1;
            
            let cardioPts = 0;
            if (inputs.vasoactives >= 2) cardioPts = 6;
            else if (inputs.vasoactives === 1) cardioPts = 2;
            else if ((inputs.lactate_ped !== null && inputs.lactate_ped > 5) || inputs.low_map) cardioPts = 1;
            phoenix += cardioPts;
            
            if ((inputs.plaq_ped !== null && inputs.plaq_ped < 20) || (inputs.inr_ped > 3) || (inputs.fib_ped !== null && inputs.fib_ped < 100)) phoenix += 2;
            else if ((inputs.plaq_ped !== null && inputs.plaq_ped < 100) || (inputs.inr_ped > 1.3)) phoenix += 1;

            if ((inputs.gcs_ped !== null && inputs.gcs_ped <= 6) || inputs.pupils_fixed) phoenix += 2;
            else if (inputs.gcs_ped !== null && inputs.gcs_ped <= 10) phoenix += 1;

            score = phoenix;
            if (score < 2) { interpretation = 'Baixa probabilidade de sepse.'; severity = 'low'; }
            else { interpretation = 'Phoenix Score ≥ 2: Sepse confirmada em suspeita de infecção.'; severity = 'high'; }
            break;

        case 'nihss':
            Object.values(inputs).forEach(val => score += (typeof val === 'number' ? val : 0));
            if (score === 0) { interpretation = 'Normal'; severity = 'low'; }
            else if (score <= 4) { interpretation = 'AVC Leve'; severity = 'low'; }
            else if (score <= 15) { interpretation = 'AVC Moderado'; severity = 'medium'; }
            else if (score <= 20) { interpretation = 'AVC Moderado a Grave'; severity = 'high'; }
            else { interpretation = 'AVC Grave'; severity = 'high'; }
            break;
        
        case 'cha2ds2':
          if (inputs.icc) score += 1; if (inputs.has) score += 1;
          if (inputs.age >= 75) score += 2; else if (inputs.age >= 65) score += 1;
          if (inputs.dm) score += 1; if (inputs.avc) score += 2; if (inputs.vasc) score += 1; if (inputs.female) score += 1;
          if (score === 0) { interpretation = 'Baixo Risco (0%).'; severity = 'low'; }
          else if (score === 1) { interpretation = 'Risco Intermediário. Considerar AAS ou ACO.'; severity = 'medium'; }
          else { interpretation = 'Alto Risco. Anticoagulação Indicada.'; severity = 'high'; }
          break;

        case 'curb65':
          if (inputs.confusao) score += 1; if (inputs.ureia > 43) score += 1; if (inputs.fr >= 30) score += 1;
          if (inputs.pas < 90 || inputs.pad <= 60) score += 1; if (inputs.age >= 65) score += 1;
          if (score <= 1) { interpretation = 'Baixo Risco. Ambulatorial.'; severity = 'low'; }
          else if (score === 2) { interpretation = 'Risco Moderado. Considerar Internação.'; severity = 'medium'; }
          else { interpretation = 'Alto Risco. Internação (UTI).'; severity = 'high'; }
          break;

        case 'meld':
          const biliM = inputs.bili < 1 ? 1 : (inputs.bili || 1);
          const inrM = inputs.inr < 1 ? 1 : (inputs.inr || 1);
          const crM = inputs.cr < 1 ? 1 : (inputs.cr > 4 ? 4 : (inputs.cr || 1));
          let meld = 3.78 * Math.log(biliM) + 11.2 * Math.log(inrM) + 9.57 * Math.log(crM) + 6.43;
          if(inputs.dialise) meld = 3.78 * Math.log(biliM) + 11.2 * Math.log(inrM) + 9.57 * Math.log(4) + 6.43;
          score = Math.round(meld);
          if (score < 10) { interpretation = 'Mortalidade 3m: 1.9%'; severity = 'low'; }
          else if (score < 20) { interpretation = 'Mortalidade 3m: 6%'; severity = 'medium'; }
          else if (score < 30) { interpretation = 'Mortalidade 3m: 19.6%'; severity = 'high'; }
          else { interpretation = 'Mortalidade 3m: > 50%'; severity = 'high'; }
          break;

        case 'heart':
          score = (inputs.historia || 0) + (inputs.ecg || 0) + (inputs.idade || 0) + (inputs.fatores || 0) + (inputs.tropo || 0);
          if (score <= 3) { interpretation = 'Baixo Risco. Considerar alta.'; severity = 'low'; }
          else if (score <= 6) { interpretation = 'Risco Intermediário. Observação.'; severity = 'medium'; }
          else { interpretation = 'Alto Risco. Intervenção.'; severity = 'high'; }
          break;

        case 'grace':
            let grace = 0;
            const age = inputs.age || 0; const hr = inputs.hr || 0; const sbp = inputs.sbp || 0; const creat = inputs.creat || 0;
            if (age >= 90) grace += 100; else if (age >= 80) grace += 91; else if (age >= 70) grace += 75; else if (age >= 60) grace += 58; else if (age >= 50) grace += 41; else if (age >= 40) grace += 25;
            if (hr >= 200) grace += 46; else if (hr >= 150) grace += 38; else if (hr >= 110) grace += 23; else if (hr >= 80) grace += 14; else if (hr >= 50) grace += 3;
            if (sbp < 80) grace += 58; else if (sbp < 100) grace += 53; else if (sbp < 120) grace += 43; else if (sbp < 140) grace += 34; else if (sbp < 160) grace += 24; else if (sbp < 200) grace += 10;
            if (creat >= 4) grace += 28; else if (creat >= 2) grace += 21; else if (creat >= 1.2) grace += 10; else if (creat >= 0.8) grace += 4; else grace += 1;
            if (inputs.killip) grace += parseInt(inputs.killip);
            if (inputs.arrest) grace += 39; if (inputs.st) grace += 28; if (inputs.enzymes) grace += 14;
            score = grace;
            if (score < 109) { interpretation = 'Baixo Risco (<1% mortalidade)'; severity = 'low'; }
            else if (score < 140) { interpretation = 'Risco Intermediário (1-3%)'; severity = 'medium'; }
            else { interpretation = 'Alto Risco (>3%)'; severity = 'high'; }
            break;

        case 'wells_tep':
          if (inputs.tvp_sinais) score += 3; if (inputs.sem_diag_alt) score += 3; if (inputs.fc > 100) score += 1.5;
          if (inputs.imob) score += 1.5; if (inputs.hist_tev) score += 1.5; if (inputs.hemoptise) score += 1; if (inputs.cancer) score += 1;
          if (score <= 4) { interpretation = 'TEP Improvável (D-Dímero)'; severity = 'low'; } else { interpretation = 'TEP Provável (Angio-TC)'; severity = 'high'; }
          break;

        case 'wells_tvp':
            if(inputs.cancer_ativo) score += 1; if(inputs.paralisia) score += 1; if(inputs.acamado) score += 1; if(inputs.dor_palpacao) score += 1;
            if(inputs.edema_todo) score += 1; if(inputs.edema_panturrilha) score += 1; if(inputs.edema_cacifo) score += 1; if(inputs.veias_colaterais) score += 1;
            if(inputs.hist_tvp) score += 1; if(inputs.diag_alternativo) score -= 2;
            if (score < 1) { interpretation = 'TVP Improvável'; severity = 'low'; } else if (score <= 2) { interpretation = 'Risco Moderado'; severity = 'medium'; } else { interpretation = 'TVP Provável'; severity = 'high'; }
            break;

        case 'child_pugh':
            score = (inputs.encef || 1) + (inputs.ascite || 1) + (inputs.inr || 1) + (inputs.alb || 1) + (inputs.bili || 1);
            if (score <= 6) { interpretation = 'Classe A (5-6): Sobrevida 100% 1 ano'; severity = 'low'; }
            else if (score <= 9) { interpretation = 'Classe B (7-9): Sobrevida 80% 1 ano'; severity = 'medium'; }
            else { interpretation = 'Classe C (10-15): Sobrevida 45% 1 ano'; severity = 'high'; }
            break;

        case 'alvarado':
            if(inputs.migratoria) score+=1; if(inputs.anorexia) score+=1; if(inputs.nauseas) score+=1; if(inputs.dor_qid) score+=2;
            if(inputs.descompressao) score+=1; if(inputs.temp) score+=1; if(inputs.leuco) score+=2; if(inputs.desvio) score+=1;
            if (score < 4) { interpretation = 'Improvável'; severity = 'low'; } else if (score < 7) { interpretation = 'Possível'; severity = 'medium'; } else { interpretation = 'Muito Provável'; severity = 'high'; }
            break;

        case 'sofa':
            score = (inputs.resp || 0) + (inputs.coag || 0) + (inputs.hep || 0) + (inputs.cardio || 0) + (inputs.snc || 0) + (inputs.renal || 0);
            if (score < 2) { interpretation = 'Baixa disfunção.'; severity = 'low'; } else { interpretation = 'Sepse provável.'; severity = 'high'; }
            break;

        case 'qsofa':
            if(inputs.pas <= 100) score+=1; if(inputs.fr >= 22) score+=1; if(inputs.glasgow !== null && inputs.glasgow < 15) score+=1;
            if (score < 2) { interpretation = 'Baixo risco.'; severity = 'low'; } else { interpretation = 'Alto risco (Sepse).'; severity = 'high'; }
            break;
            
        case 'psi':
             let psi = 0;
             psi += (inputs.age || 0);
             if (inputs.female) psi -= 10; if (inputs.nursing) psi += 10;
             if (inputs.neo) psi += 30; if (inputs.liver) psi += 20; if (inputs.chf) psi += 10; if (inputs.cvd) psi += 10; if (inputs.renal) psi += 10;
             if (inputs.mental) psi += 20; if ((inputs.rr || 0) >= 30) psi += 20; if ((inputs.sbp || 120) < 90) psi += 20;
             if ((inputs.temp || 36) < 35 || (inputs.temp || 36) >= 40) psi += 15; if ((inputs.pulse || 80) >= 125) psi += 10;
             if ((inputs.ph || 7.4) < 7.35) psi += 30; if ((inputs.bun || 20) >= 30) psi += 20; if ((inputs.sodium || 140) < 130) psi += 20;
             if ((inputs.glucose || 100) >= 250) psi += 10; if ((inputs.hct || 40) < 30) psi += 10; if ((inputs.po2 || 90) < 60) psi += 10; if (inputs.pleural) psi += 10;
             score = psi;
             if (score <= 70) { interpretation = 'Classe II - Baixo'; severity = 'low'; } else if (score <= 90) { interpretation = 'Classe III - Moderado'; severity = 'medium'; } else { interpretation = 'Classe IV/V - Alto Risco'; severity = 'high'; }
             break;
        
        case 'apache':
            let apache = 0; const ageApache = inputs.age || 0;
            if (ageApache >= 75) apache += 6; else if (ageApache >= 65) apache += 5; else if (ageApache >= 55) apache += 3; else if (ageApache >= 45) apache += 2;
            if (inputs.severe_organ) apache += 5;
            if ((inputs.temp || 37) >= 41 || (inputs.temp || 37) <= 32) apache += 4; else if ((inputs.temp || 37) >= 39 || (inputs.temp || 37) <= 34) apache += 1;
            if ((inputs.map || 90) >= 160 || (inputs.map || 90) <= 49) apache += 4; else if ((inputs.map || 90) >= 130) apache += 3; else if ((inputs.map || 90) <= 69) apache += 2;
            if ((inputs.hr || 80) >= 180 || (inputs.hr || 80) <= 39) apache += 4; else if ((inputs.hr || 80) >= 140 || (inputs.hr || 80) <= 54) apache += 3;
            const gcsApache = inputs.glasgow || 15;
            apache += (15 - gcsApache);
            if ((inputs.creat || 1) >= 3.5 && inputs.arf) apache += 8; else if ((inputs.creat || 1) >= 2 && inputs.arf) apache += 6; else if ((inputs.creat || 1) >= 3.5) apache += 4;
            score = apache;
            if (score < 10) { interpretation = 'Mortalidade ~4%'; severity = 'low'; } else if (score < 25) { interpretation = 'Mortalidade ~40%'; severity = 'medium'; } else { interpretation = 'Mortalidade > 70%'; severity = 'high'; }
            break;

        case 'kdigo':
            const gfr = inputs.gfr; const alb = inputs.alb_stage;
            if (!gfr || !alb) { score = "---"; interpretation = "Insira os dados."; severity = "low"; break;}
            let g_stage = gfr >= 90 ? 'G1' : gfr >= 60 ? 'G2' : gfr >= 45 ? 'G3a' : gfr >= 30 ? 'G3b' : gfr >= 15 ? 'G4' : 'G5';
            score = `${g_stage} ${alb}`;
            if (g_stage === 'G5' || (g_stage === 'G4' && alb !== 'A1') || (g_stage === 'G3b' && alb === 'A3')) { interpretation = 'Risco Muito Alto'; severity = 'high'; }
            else if (g_stage === 'G1' && alb === 'A1') { interpretation = 'Risco Baixo'; severity = 'low'; } else { interpretation = 'Risco Moderado'; severity = 'medium'; }
            break;
        default: score = "---"; interpretation = "Selecione um score.";
      }
      setResult({ value: score, text: interpretation, color: getSeverityColor(severity) });
    } catch (e) { setResult({ value: "Erro", text: "Verifique os dados.", color: getSeverityColor('medium') }); }
  };

  // --- RENDERIZADORES DE INPUTS ---
  const renderInputs = () => {
    switch (selectedScore?.id) {
      case 'glasgow': return (
          <div className="space-y-2">
            <ScoreInput label="Abertura Ocular" isDarkMode={isDarkMode}>
                <Select isDarkMode={isDarkMode} onChange={(e) => handleInputChange('ocular', e.target.value)} value={inputs.ocular} options={[
                    {val:0, label:'Selecione...'}, {val:4, label:'4 - Espontânea'}, {val:3, label:'3 - À voz'}, {val:2, label:'2 - À dor'}, {val:1, label:'1 - Ausente'}
                ]} />
            </ScoreInput>
            <ScoreInput label="Resposta Verbal" isDarkMode={isDarkMode}>
                <Select isDarkMode={isDarkMode} onChange={(e) => handleInputChange('verbal', e.target.value)} value={inputs.verbal} options={[
                    {val:0, label:'Selecione...'}, {val:5, label:'5 - Orientado'}, {val:4, label:'4 - Confuso'}, {val:3, label:'3 - Palavras inapropriadas'}, {val:2, label:'2 - Sons incompreensíveis'}, {val:1, label:'1 - Ausente'}
                ]} />
            </ScoreInput>
            <ScoreInput label="Resposta Motora" isDarkMode={isDarkMode}>
                <Select isDarkMode={isDarkMode} onChange={(e) => handleInputChange('motor', e.target.value)} value={inputs.motor} options={[
                    {val:0, label:'Selecione...'}, {val:6, label:'6 - Obedece comandos'}, {val:5, label:'5 - Localiza dor'}, {val:4, label:'4 - Retirada'}, {val:3, label:'3 - Decorticação'}, {val:2, label:'2 - Descerebração'}, {val:1, label:'1 - Ausente'}
                ]} />
            </ScoreInput>
          </div>
      );

      case 'sofa2': return (
          <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <ScoreInput label="SpO2/FiO2 Ratio" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('sf_ratio', e.target.value)} value={inputs.sf_ratio} placeholder="Ex: 300" /></ScoreInput>
                  <div className="pt-6"><Checkbox isDarkMode={isDarkMode} label="Suporte Ventilatório?" onChange={() => handleCheckboxChange('resp_support')} checked={inputs.resp_support} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <ScoreInput label="Plaquetas (x10³)" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('plaq', e.target.value)} value={inputs.plaq} placeholder="Ex: 150" /></ScoreInput>
                  <ScoreInput label="Bilirrubina (mg/dL)" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} step="0.1" onChange={(e)=>handleInputChange('bili', e.target.value)} value={inputs.bili} placeholder="Ex: 1.0" /></ScoreInput>
              </div>
              <ScoreInput label="Cardiovascular" isDarkMode={isDarkMode}>
                  <Select isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('drogas', e.target.value)} value={inputs.drogas} options={[
                      {val:0, label:'Sem drogas vasoativas (PAM ≥ 70)'}, {val:1, label:'PAM < 70 mmHg'}, {val:2, label:'Dopamina/Dobutamina (qualquer dose)'}, {val:3, label:'Nora/Adrenalina ≤ 0.1 mcg/kg/min'}, {val:4, label:'Nora/Adrenalina > 0.1 mcg/kg/min'}
                  ]} />
              </ScoreInput>
              <div className="grid grid-cols-3 gap-4">
                   <ScoreInput label="Glasgow" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} max="15" onChange={(e)=>handleInputChange('glasgow', e.target.value)} value={inputs.glasgow} placeholder="3-15" /></ScoreInput>
                   <ScoreInput label="Creatinina" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} step="0.1" onChange={(e)=>handleInputChange('creat', e.target.value)} value={inputs.creat} placeholder="Ex: 1.0" /></ScoreInput>
                   <ScoreInput label="Lactato" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} step="0.1" onChange={(e)=>handleInputChange('lactate', e.target.value)} value={inputs.lactate} placeholder="mmol/L" /></ScoreInput>
              </div>
          </div>
      );

      case 'phoenix': return (
          <div className="space-y-6">
              <div>
                  <h4 className="text-sm font-bold text-emerald-600 mb-3 flex items-center gap-2"><Wind size={16}/> Respiratório</h4>
                  <div className="grid grid-cols-2 gap-4">
                      <ScoreInput label="SpO2/FiO2" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('sf_ratio_ped', e.target.value)} value={inputs.sf_ratio_ped} placeholder="Ratio" /></ScoreInput>
                      <ScoreInput label="PaO2/FiO2" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('pf_ratio_ped', e.target.value)} value={inputs.pf_ratio_ped} placeholder="Ratio" /></ScoreInput>
                      <div className="col-span-2"><Checkbox isDarkMode={isDarkMode} label="Ventilação Mecânica Invasiva?" onChange={() => handleCheckboxChange('imv')} checked={inputs.imv} /></div>
                  </div>
              </div>
              <div>
                  <h4 className="text-sm font-bold text-rose-600 mb-3 flex items-center gap-2"><HeartPulse size={16}/> Cardiovascular</h4>
                  <div className="grid grid-cols-2 gap-4">
                      <ScoreInput label="Lactato (mmol/L)" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} step="0.1" onChange={(e)=>handleInputChange('lactate_ped', e.target.value)} value={inputs.lactate_ped} placeholder="Ex: 2.0" /></ScoreInput>
                      <ScoreInput label="Vasoativos" isDarkMode={isDarkMode}>
                          <Select isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('vasoactives', e.target.value)} value={inputs.vasoactives} options={[{val:0, label:'Nenhum'}, {val:1, label:'1 Droga'}, {val:2, label:'2+ Drogas'}]} />
                      </ScoreInput>
                      <div className="col-span-2"><Checkbox isDarkMode={isDarkMode} label="PAM baixa para a idade?" onChange={() => handleCheckboxChange('low_map')} checked={inputs.low_map} /></div>
                  </div>
              </div>
              <div>
                  <h4 className="text-sm font-bold text-blue-600 mb-3 flex items-center gap-2"><Activity size={16}/> Coagulação / Neuro</h4>
                  <div className="grid grid-cols-2 gap-4">
                      <ScoreInput label="Plaquetas" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('plaq_ped', e.target.value)} value={inputs.plaq_ped} placeholder="x10³" /></ScoreInput>
                      <ScoreInput label="INR" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} step="0.1" onChange={(e)=>handleInputChange('inr_ped', e.target.value)} value={inputs.inr_ped} placeholder="Ex: 1.0" /></ScoreInput>
                      <ScoreInput label="Fibrinogênio" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('fib_ped', e.target.value)} value={inputs.fib_ped} placeholder="mg/dL" /></ScoreInput>
                      <ScoreInput label="Glasgow" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} max="15" onChange={(e)=>handleInputChange('gcs_ped', e.target.value)} value={inputs.gcs_ped} placeholder="3-15" /></ScoreInput>
                      <div className="col-span-2"><Checkbox isDarkMode={isDarkMode} label="Pupilas fixas bilateralmente?" onChange={() => handleCheckboxChange('pupils_fixed')} checked={inputs.pupils_fixed} /></div>
                  </div>
              </div>
          </div>
      );
      
      case 'cha2ds2': return (
          <div className="space-y-3">
            <Checkbox isDarkMode={isDarkMode} label="Insuficiência Cardíaca (+1)" onChange={() => handleCheckboxChange('icc')} checked={inputs.icc} />
            <Checkbox isDarkMode={isDarkMode} label="Hipertensão (+1)" onChange={() => handleCheckboxChange('has')} checked={inputs.has} />
            <Checkbox isDarkMode={isDarkMode} label="Diabetes (+1)" onChange={() => handleCheckboxChange('dm')} checked={inputs.dm} />
            <Checkbox isDarkMode={isDarkMode} label="AVC/AIT Prévio (+2)" onChange={() => handleCheckboxChange('avc')} checked={inputs.avc} />
            <Checkbox isDarkMode={isDarkMode} label="Doença Vascular (+1)" onChange={() => handleCheckboxChange('vasc')} checked={inputs.vasc} />
            <Checkbox isDarkMode={isDarkMode} label="Sexo Feminino (+1)" onChange={() => handleCheckboxChange('female')} checked={inputs.female} />
            <ScoreInput label="Idade (Anos)" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} onChange={(e) => handleInputChange('age', e.target.value)} value={inputs.age} placeholder="Ex: 65" /></ScoreInput>
          </div>
      );
      
      case 'nihss':
        const nihssItems = [{ k: '1a', label: '1a. Nível de Consciência', opts: [{v:0, l:'0 - Alerta'}, {v:1, l:'1 - Sonolento'}, {v:2, l:'2 - Torporoso'}, {v:3, l:'3 - Coma'}]},{ k: '1b', label: '1b. Perguntas', opts: [{v:0, l:'0 - Ambas corretas'}, {v:1, l:'1 - Uma correta'}, {v:2, l:'2 - Nenhuma correta'}]},{ k: '1c', label: '1c. Comandos', opts: [{v:0, l:'0 - Ambos corretos'}, {v:1, l:'1 - Um correto'}, {v:2, l:'2 - Nenhum correto'}]},{ k: '2', label: '2. Mov. Ocular', opts: [{v:0, l:'0 - Normal'}, {v:1, l:'1 - Paralisia parcial'}, {v:2, l:'2 - Desvio forçado'}]},{ k: '3', label: '3. Campo Visual', opts: [{v:0, l:'0 - Sem perda'}, {v:1, l:'1 - Parcial'}, {v:2, l:'2 - Completa'}, {v:3, l:'3 - Cegueira'}]},{ k: '4', label: '4. Facial', opts: [{v:0, l:'0 - Normal'}, {v:1, l:'1 - Paresia leve'}, {v:2, l:'2 - Paralisia parcial'}, {v:3, l:'3 - Completa'}]},{ k: '5a', label: '5a. Motor MSE', opts: [{v:0, l:'0 - Sem queda'}, {v:1, l:'1 - Queda <10s'}, {v:2, l:'2 - Queda rápida'}, {v:3, l:'3 - Movimento'}, {v:4, l:'4 - Nenhum'}]},{ k: '5b', label: '5b. Motor MSD', opts: [{v:0, l:'0 - Sem queda'}, {v:1, l:'1 - Queda <10s'}, {v:2, l:'2 - Queda rápida'}, {v:3, l:'3 - Movimento'}, {v:4, l:'4 - Nenhum'}]}];
        return (<div className="space-y-4">{nihssItems.map((item) => (<ScoreInput key={item.k} label={item.label} isDarkMode={isDarkMode}><Select isDarkMode={isDarkMode} onChange={(e) => handleInputChange(item.k, e.target.value)} value={inputs[item.k]} options={item.opts.map(o => ({val: o.v, label: o.l}))} /></ScoreInput>))}<p className="text-xs italic opacity-60 text-center mt-4">*Versão sumária para uso rápido.</p></div>);

      case 'curb65': return (<div className="space-y-3"><Checkbox isDarkMode={isDarkMode} label="Confusão Mental (+1)" onChange={() => handleCheckboxChange('confusao')} checked={inputs.confusao} /><Checkbox isDarkMode={isDarkMode} label="Ureia > 43 mg/dL (+1)" onChange={() => handleCheckboxChange('ureia')} checked={inputs.ureia} /><Checkbox isDarkMode={isDarkMode} label="FR ≥ 30 irpm (+1)" onChange={() => handleCheckboxChange('fr')} checked={inputs.fr} /><Checkbox isDarkMode={isDarkMode} label="PAS < 90 ou PAD ≤ 60 (+1)" onChange={() => handleCheckboxChange('pas')} checked={inputs.pas} /><Checkbox isDarkMode={isDarkMode} label="Idade ≥ 65 anos (+1)" onChange={() => handleCheckboxChange('age')} checked={inputs.age} /></div>);

      case 'meld': return (<div className="space-y-4"><ScoreInput label="Bilirrubina (mg/dL)" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} step="0.1" onChange={(e)=>handleInputChange('bili', e.target.value)} value={inputs.bili} placeholder="Ex: 1.2" /></ScoreInput><ScoreInput label="INR" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} step="0.1" onChange={(e)=>handleInputChange('inr', e.target.value)} value={inputs.inr} placeholder="Ex: 1.1" /></ScoreInput><ScoreInput label="Creatinina (mg/dL)" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} step="0.1" onChange={(e)=>handleInputChange('cr', e.target.value)} value={inputs.cr} placeholder="Ex: 0.9" /></ScoreInput><Checkbox isDarkMode={isDarkMode} label="Paciente em Diálise?" onChange={() => handleCheckboxChange('dialise')} checked={inputs.dialise} /></div>);

      case 'child_pugh': return (<div className="space-y-4"><ScoreInput label="Encefalopatia" isDarkMode={isDarkMode}><Select isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('encef', e.target.value)} value={inputs.encef} options={[{val:1, label:'Ausente (1)'}, {val:2, label:'Grau 1-2 (2)'}, {val:3, label:'Grau 3-4 (3)'}]} /></ScoreInput><ScoreInput label="Ascite" isDarkMode={isDarkMode}><Select isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('ascite', e.target.value)} value={inputs.ascite} options={[{val:1, label:'Ausente (1)'}, {val:2, label:'Leve (2)'}, {val:3, label:'Moderada (3)'}]} /></ScoreInput><ScoreInput label="Bilirrubina" isDarkMode={isDarkMode}><Select isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('bili', e.target.value)} value={inputs.bili} options={[{val:1, label:'< 2 (1)'}, {val:2, label:'2 - 3 (2)'}, {val:3, label:'> 3 (3)'}]} /></ScoreInput><ScoreInput label="Albumina" isDarkMode={isDarkMode}><Select isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('alb', e.target.value)} value={inputs.alb} options={[{val:1, label:'> 3.5 (1)'}, {val:2, label:'2.8 - 3.5 (2)'}, {val:3, label:'< 2.8 (3)'}]} /></ScoreInput><ScoreInput label="INR" isDarkMode={isDarkMode}><Select isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('inr', e.target.value)} value={inputs.inr} options={[{val:1, label:'< 1.7 (1)'}, {val:2, label:'1.7 - 2.3 (2)'}, {val:3, label:'> 2.3 (3)'}]} /></ScoreInput></div>);

      case 'kdigo': return (<div className="space-y-4"><ScoreInput label="TFG (ml/min)" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('gfr', e.target.value)} value={inputs.gfr} placeholder="Ex: 60" /></ScoreInput><ScoreInput label="Albuminúria" isDarkMode={isDarkMode}><Select isDarkMode={isDarkMode} onChange={(e)=>handleStringChange('alb_stage', e.target.value)} value={inputs.alb_stage} options={[{val:'', label:'Selecione...'}, {val:'A1', label:'A1 - Normal (<30)'}, {val:'A2', label:'A2 - Moderada (30-300)'}, {val:'A3', label:'A3 - Grave (>300)'}]} /></ScoreInput></div>);

      case 'sofa': const sofaOpts = [0,1,2,3,4].map(n => ({val:n, label: n.toString()})); return (<div className="grid grid-cols-2 gap-4"><ScoreInput label="Resp" isDarkMode={isDarkMode}><Select isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('resp', e.target.value)} value={inputs.resp} options={sofaOpts} /></ScoreInput><ScoreInput label="Coag" isDarkMode={isDarkMode}><Select isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('coag', e.target.value)} value={inputs.coag} options={sofaOpts} /></ScoreInput><ScoreInput label="Fígado" isDarkMode={isDarkMode}><Select isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('hep', e.target.value)} value={inputs.hep} options={sofaOpts} /></ScoreInput><ScoreInput label="Cardio" isDarkMode={isDarkMode}><Select isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('cardio', e.target.value)} value={inputs.cardio} options={sofaOpts} /></ScoreInput><ScoreInput label="SNC" isDarkMode={isDarkMode}><Select isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('snc', e.target.value)} value={inputs.snc} options={sofaOpts} /></ScoreInput><ScoreInput label="Renal" isDarkMode={isDarkMode}><Select isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('renal', e.target.value)} value={inputs.renal} options={sofaOpts} /></ScoreInput></div>);

      case 'qsofa': return (<div className="space-y-3"><Checkbox isDarkMode={isDarkMode} label="PAS ≤ 100 mmHg (+1)" onChange={() => handleCheckboxChange('pas')} checked={inputs.pas} /><Checkbox isDarkMode={isDarkMode} label="FR ≥ 22 irpm (+1)" onChange={() => handleCheckboxChange('fr')} checked={inputs.fr} /><Checkbox isDarkMode={isDarkMode} label="Glasgow < 15 (+1)" onChange={() => handleCheckboxChange('glasgow')} checked={inputs.glasgow} /></div>);

      case 'alvarado': return (<div className="space-y-3"><Checkbox isDarkMode={isDarkMode} label="Dor migratória (+1)" onChange={() => handleCheckboxChange('migratoria')} checked={inputs.migratoria} /><Checkbox isDarkMode={isDarkMode} label="Anorexia (+1)" onChange={() => handleCheckboxChange('anorexia')} checked={inputs.anorexia} /><Checkbox isDarkMode={isDarkMode} label="Náuseas (+1)" onChange={() => handleCheckboxChange('nauseas')} checked={inputs.nauseas} /><Checkbox isDarkMode={isDarkMode} label="Dor QID (+2)" onChange={() => handleCheckboxChange('dor_qid')} checked={inputs.dor_qid} /><Checkbox isDarkMode={isDarkMode} label="Descompressão (+1)" onChange={() => handleCheckboxChange('descompressao')} checked={inputs.descompressao} /><Checkbox isDarkMode={isDarkMode} label="Tax > 37.3 (+1)" onChange={() => handleCheckboxChange('temp')} checked={inputs.temp} /><Checkbox isDarkMode={isDarkMode} label="Leuco > 10k (+2)" onChange={() => handleCheckboxChange('leuco')} checked={inputs.leuco} /><Checkbox isDarkMode={isDarkMode} label="Desvio Esq. (+1)" onChange={() => handleCheckboxChange('desvio')} checked={inputs.desvio} /></div>);
      
      case 'wells_tvp': return (<div className="space-y-3"><Checkbox isDarkMode={isDarkMode} label="Câncer Ativo (+1)" onChange={() => handleCheckboxChange('cancer_ativo')} checked={inputs.cancer_ativo} /><Checkbox isDarkMode={isDarkMode} label="Paralisia/Paresia (+1)" onChange={() => handleCheckboxChange('paralisia')} checked={inputs.paralisia} /><Checkbox isDarkMode={isDarkMode} label="Acamado > 3d / Cirurgia (+1)" onChange={() => handleCheckboxChange('acamado')} checked={inputs.acamado} /><Checkbox isDarkMode={isDarkMode} label="Dor no trajeto venoso (+1)" onChange={() => handleCheckboxChange('dor_palpacao')} checked={inputs.dor_palpacao} /><Checkbox isDarkMode={isDarkMode} label="Edema de todo membro (+1)" onChange={() => handleCheckboxChange('edema_todo')} checked={inputs.edema_todo} /><Checkbox isDarkMode={isDarkMode} label="Edema panturrilha > 3cm (+1)" onChange={() => handleCheckboxChange('edema_panturrilha')} checked={inputs.edema_panturrilha} /><Checkbox isDarkMode={isDarkMode} label="Edema de cacifo (+1)" onChange={() => handleCheckboxChange('edema_cacifo')} checked={inputs.edema_cacifo} /><Checkbox isDarkMode={isDarkMode} label="Veias colaterais (+1)" onChange={() => handleCheckboxChange('veias_colaterais')} checked={inputs.veias_colaterais} /><Checkbox isDarkMode={isDarkMode} label="Histórico de TVP (+1)" onChange={() => handleCheckboxChange('hist_tvp')} checked={inputs.hist_tvp} /><div className="border-t pt-2"><Checkbox isDarkMode={isDarkMode} label="Diag. Alternativo mais provável (-2)" onChange={() => handleCheckboxChange('diag_alternativo')} checked={inputs.diag_alternativo} /></div></div>);
      
      case 'wells_tep': return (<div className="space-y-3"><Checkbox isDarkMode={isDarkMode} label="Sinais clínicos TVP (+3)" onChange={() => handleCheckboxChange('tvp_sinais')} checked={inputs.tvp_sinais} /><Checkbox isDarkMode={isDarkMode} label="TEP é a hipótese nº 1 (+3)" onChange={() => handleCheckboxChange('sem_diag_alt')} checked={inputs.sem_diag_alt} /><Checkbox isDarkMode={isDarkMode} label="FC > 100 bpm (+1.5)" onChange={() => handleCheckboxChange('fc')} checked={inputs.fc} /><Checkbox isDarkMode={isDarkMode} label="Imobilização/Cirurgia (+1.5)" onChange={() => handleCheckboxChange('imob')} checked={inputs.imob} /><Checkbox isDarkMode={isDarkMode} label="Histórico TEP/TVP (+1.5)" onChange={() => handleCheckboxChange('hist_tev')} checked={inputs.hist_tev} /><Checkbox isDarkMode={isDarkMode} label="Hemoptise (+1)" onChange={() => handleCheckboxChange('hemoptise')} checked={inputs.hemoptise} /><Checkbox isDarkMode={isDarkMode} label="Câncer ativo (+1)" onChange={() => handleCheckboxChange('cancer')} checked={inputs.cancer} /></div>);
      
      case 'heart': return (
          <div className="space-y-4">
            <ScoreInput label="História" isDarkMode={isDarkMode}><Select isDarkMode={isDarkMode} onChange={(e) => handleInputChange('historia', e.target.value)} value={inputs.historia} options={[{val:0, label:'Baixa (0)'}, {val:1, label:'Moderada (1)'}, {val:2, label:'Alta (2)'}]} /></ScoreInput>
            <ScoreInput label="ECG" isDarkMode={isDarkMode}><Select isDarkMode={isDarkMode} onChange={(e) => handleInputChange('ecg', e.target.value)} value={inputs.ecg} options={[{val:0, label:'Normal (0)'}, {val:1, label:'Inespecífico (1)'}, {val:2, label:'ST Alterado (2)'}]} /></ScoreInput>
            <ScoreInput label="Idade" isDarkMode={isDarkMode}><Select isDarkMode={isDarkMode} onChange={(e) => handleInputChange('idade', e.target.value)} value={inputs.idade} options={[{val:0, label:'<45 (0)'}, {val:1, label:'45-65 (1)'}, {val:2, label:'>65 (2)'}]} /></ScoreInput>
            <ScoreInput label="Fatores Risco" isDarkMode={isDarkMode}><Select isDarkMode={isDarkMode} onChange={(e) => handleInputChange('fatores', e.target.value)} value={inputs.fatores} options={[{val:0, label:'0 (0)'}, {val:1, label:'1-2 (1)'}, {val:2, label:'3+ (2)'}]} /></ScoreInput>
            <ScoreInput label="Troponina" isDarkMode={isDarkMode}><Select isDarkMode={isDarkMode} onChange={(e) => handleInputChange('tropo', e.target.value)} value={inputs.tropo} options={[{val:0, label:'Normal (0)'}, {val:1, label:'1-3x (1)'}, {val:2, label:'>3x (2)'}]} /></ScoreInput>
          </div>
      );

      case 'grace': return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <ScoreInput label="Idade" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('age', e.target.value)} value={inputs.age} placeholder="Anos" /></ScoreInput>
                    <ScoreInput label="FC (bpm)" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('hr', e.target.value)} value={inputs.hr} placeholder="Ex: 80" /></ScoreInput>
                    <ScoreInput label="PAS (mmHg)" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('sbp', e.target.value)} value={inputs.sbp} placeholder="Ex: 120" /></ScoreInput>
                    <ScoreInput label="Creatinina" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} step="0.1" onChange={(e)=>handleInputChange('creat', e.target.value)} value={inputs.creat} placeholder="mg/dL" /></ScoreInput>
                </div>
                <ScoreInput label="Killip" isDarkMode={isDarkMode}><Select isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('killip', e.target.value)} value={inputs.killip} options={[{val:0, label:'I - Sem crepitações'}, {val:20, label:'II - Crepitações/B3'}, {val:39, label:'III - EAP'}, {val:59, label:'IV - Choque'}]} /></ScoreInput>
                <div className="space-y-2 pt-2">
                    <Checkbox isDarkMode={isDarkMode} label="PCR na admissão?" onChange={() => handleCheckboxChange('arrest')} checked={inputs.arrest} />
                    <Checkbox isDarkMode={isDarkMode} label="Desvio ST?" onChange={() => handleCheckboxChange('st')} checked={inputs.st} />
                    <Checkbox isDarkMode={isDarkMode} label="Enzimas elevadas?" onChange={() => handleCheckboxChange('enzymes')} checked={inputs.enzymes} />
                </div>
            </div>
      );

      case 'psi': return (
            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                   <ScoreInput label="Idade" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('age', e.target.value)} value={inputs.age} placeholder="Anos" /></ScoreInput>
                   <div className="pt-6 space-y-2">
                       <Checkbox isDarkMode={isDarkMode} label="Mulher?" onChange={() => handleCheckboxChange('female')} checked={inputs.female} />
                       <Checkbox isDarkMode={isDarkMode} label="Casa de repouso?" onChange={() => handleCheckboxChange('nursing')} checked={inputs.nursing} />
                   </div>
               </div>
               
               <h4 className="font-bold text-xs uppercase text-slate-500 mt-2">Comorbidades</h4>
               <div className="grid grid-cols-2 gap-2">
                   <Checkbox isDarkMode={isDarkMode} label="Neoplasia" onChange={() => handleCheckboxChange('neo')} checked={inputs.neo} />
                   <Checkbox isDarkMode={isDarkMode} label="Hepatopatia" onChange={() => handleCheckboxChange('liver')} checked={inputs.liver} />
                   <Checkbox isDarkMode={isDarkMode} label="IC" onChange={() => handleCheckboxChange('chf')} checked={inputs.chf} />
                   <Checkbox isDarkMode={isDarkMode} label="AVC" onChange={() => handleCheckboxChange('cvd')} checked={inputs.cvd} />
                   <Checkbox isDarkMode={isDarkMode} label="DRC" onChange={() => handleCheckboxChange('renal')} checked={inputs.renal} />
               </div>

               <h4 className="font-bold text-xs uppercase text-slate-500 mt-2">Exame Físico</h4>
               <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2"><Checkbox isDarkMode={isDarkMode} label="Alteração Mental?" onChange={() => handleCheckboxChange('mental')} checked={inputs.mental} /></div>
                    <ScoreInput label="FR" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('rr', e.target.value)} value={inputs.rr} placeholder="irpm" /></ScoreInput>
                    <ScoreInput label="PAS" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('sbp', e.target.value)} value={inputs.sbp} placeholder="mmHg" /></ScoreInput>
                    <ScoreInput label="Temp" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} step="0.1" onChange={(e)=>handleInputChange('temp', e.target.value)} value={inputs.temp} placeholder="ºC" /></ScoreInput>
                    <ScoreInput label="FC" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('pulse', e.target.value)} value={inputs.pulse} placeholder="bpm" /></ScoreInput>
               </div>

               <h4 className="font-bold text-xs uppercase text-slate-500 mt-2">Laboratório (Marcar se alterado)</h4>
               <div className="grid grid-cols-2 gap-2">
                    <Checkbox isDarkMode={isDarkMode} label="pH < 7.35" onChange={() => handleCheckboxChange('ph')} checked={inputs.ph} />
                    <Checkbox isDarkMode={isDarkMode} label="Ureia ≥ 30" onChange={() => handleCheckboxChange('bun')} checked={inputs.bun} />
                    <Checkbox isDarkMode={isDarkMode} label="Na < 130" onChange={() => handleCheckboxChange('sodium')} checked={inputs.sodium} />
                    <Checkbox isDarkMode={isDarkMode} label="Glic ≥ 250" onChange={() => handleCheckboxChange('glucose')} checked={inputs.glucose} />
                    <Checkbox isDarkMode={isDarkMode} label="Ht < 30" onChange={() => handleCheckboxChange('hct')} checked={inputs.hct} />
                    <Checkbox isDarkMode={isDarkMode} label="PaO2 < 60" onChange={() => handleCheckboxChange('po2')} checked={inputs.po2} />
                    <Checkbox isDarkMode={isDarkMode} label="Derrame Pleural" onChange={() => handleCheckboxChange('pleural')} checked={inputs.pleural} />
               </div>
            </div>
      );

      case 'apache': return (
            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                   <ScoreInput label="Idade" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('age', e.target.value)} value={inputs.age} placeholder="Anos" /></ScoreInput>
                   <ScoreInput label="Temp (ºC)" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} step="0.1" onChange={(e)=>handleInputChange('temp', e.target.value)} value={inputs.temp} placeholder="Ex: 37" /></ScoreInput>
                   <ScoreInput label="PAM (mmHg)" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('map', e.target.value)} value={inputs.map} placeholder="Ex: 90" /></ScoreInput>
                   <ScoreInput label="FC (bpm)" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} onChange={(e)=>handleInputChange('hr', e.target.value)} value={inputs.hr} placeholder="Ex: 80" /></ScoreInput>
                   <ScoreInput label="Glasgow" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} max="15" onChange={(e)=>handleInputChange('glasgow', e.target.value)} value={inputs.glasgow} placeholder="3-15" /></ScoreInput>
                   <ScoreInput label="Creatinina" isDarkMode={isDarkMode}><NumberInput isDarkMode={isDarkMode} step="0.1" onChange={(e)=>handleInputChange('creat', e.target.value)} value={inputs.creat} placeholder="mg/dL" /></ScoreInput>
               </div>
               <div className="space-y-2 pt-2">
                   <Checkbox isDarkMode={isDarkMode} label="Insuficiência Renal Aguda?" onChange={() => handleCheckboxChange('arf')} checked={inputs.arf} />
                   <Checkbox isDarkMode={isDarkMode} label="Doença Crônica Grave / Imuno?" onChange={() => handleCheckboxChange('severe_organ')} checked={inputs.severe_organ} />
               </div>
            </div>
      );

      default: return <div className="text-center p-8 text-sm opacity-50">Selecione uma ferramenta na lista ao lado.</div>;
    }
  };

  const filteredScores = SCORES_DB.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.includes(searchTerm.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white'}`}>
        
        {/* SIDEBAR (LISTA DE SCORES) */}
        <div className={`w-full md:w-80 border-r flex flex-col ${isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-gray-100 bg-gray-50'} ${selectedScore ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-5 border-b border-gray-200 dark:border-slate-800">
                <h3 className="font-bold flex items-center gap-2 mb-4 text-lg"><Activity size={22} className="text-blue-500"/> Scores Médicos</h3>
                <div className="relative group">
                    <input type="text" placeholder="Buscar..." className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800 group-hover:border-slate-700' : 'bg-white border-gray-200 group-hover:border-gray-300'}`} onChange={(e) => setSearchTerm(e.target.value)} />
                    <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {filteredScores.map(score => (
                    <button key={score.id} onClick={() => setSelectedScore(score)} className={`w-full text-left p-3 rounded-xl text-sm transition-all flex items-center justify-between group ${selectedScore?.id === score.id ? (isDarkMode ? 'bg-blue-900/30 text-blue-300 border border-blue-800' : 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm') : (isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-gray-100')}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${selectedScore?.id === score.id ? 'bg-blue-500 text-white' : (isDarkMode ? 'bg-slate-800' : 'bg-gray-200 text-gray-500')}`}>
                                {getCategoryIcon(score.category)}
                            </div>
                            <div>
                                <span className="font-bold block truncate w-40">{score.name}</span>
                                <span className="text-[10px] opacity-70 uppercase tracking-wide font-semibold">{score.category}</span>
                            </div>
                        </div>
                        {selectedScore?.id === score.id && <ChevronRight size={16} className="text-blue-500"/>}
                    </button>
                ))}
            </div>
        </div>

        {/* MAIN CONTENT (CALCULADORA) */}
        <div className={`flex-1 flex flex-col h-full relative bg-opacity-50 ${!selectedScore ? 'hidden md:flex' : 'flex'}`}>
            {/* BOTÃO VOLTAR (SÓ MOBILE) */}
            {selectedScore && (
                <button onClick={() => setSelectedScore(null)} className="md:hidden absolute left-4 top-4 p-2 rounded-full z-10 bg-gray-100 dark:bg-slate-800 text-slate-500">
                    <ArrowLeft size={24}/>
                </button>
            )}

            <button onClick={onClose} className={`absolute right-4 top-4 p-2 rounded-full z-10 transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}><X size={24}/></button>
            
            {selectedScore ? (
                <>
                    <div className={`p-8 border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                        <div className="md:hidden h-8"></div> {/* Espaço para o botão voltar no mobile */}
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent w-fit">{selectedScore.name}</h2>
                        <p className={`text-sm mt-2 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{selectedScore.description}</p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-8">
                        {renderInputs()}
                    </div>

                    <div className={`p-6 border-t ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]'}`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                           <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Resultado em Tempo Real</span>
                                <div className="text-4xl font-black tracking-tight flex items-baseline gap-2">
                                   {result?.value || '--'}
                                   {result && <span className="text-sm font-medium text-slate-500">pontos</span>}
                                </div>
                           </div>
                           {result && (
                               <div className={`px-6 py-4 rounded-2xl border-l-4 w-full md:max-w-md flex-1 md:ml-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 ${result.color}`}>
                                   <p className="font-bold text-sm leading-relaxed flex gap-2">
                                     <AlertTriangle size={18} className="shrink-0 mt-0.5"/>
                                     {result.text}
                                   </p>
                               </div>
                           )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-60">
                    <div className={`p-6 rounded-full mb-6 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}><Activity size={48} className="text-slate-400"/></div>
                    <h3 className="text-2xl font-bold mb-2">Nenhum Score Selecionado</h3>
                    <p className="text-slate-500 max-w-xs">Selecione uma ferramenta clínica na barra lateral para iniciar os cálculos.</p>
                </div>
            )}
        </div>

      </div>
    </div>
  );
}