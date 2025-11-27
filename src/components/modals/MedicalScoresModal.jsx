// Arquivo: src/components/modals/MedicalScoresModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Calculator, ChevronRight, Activity, CheckCircle2, Search, AlertTriangle } from 'lucide-react';

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
    // Se vazio, salva como null para evitar que vire 0 em cálculos onde 0 é patológico (ex: Glasgow)
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
          case 'low': return isDarkMode ? 'bg-emerald-900/30 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800';
          case 'medium': return isDarkMode ? 'bg-amber-900/30 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800';
          case 'high': return isDarkMode ? 'bg-rose-900/30 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800';
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
            // SOFA 2.0 (2025)
            let sofa2 = 0;
            // Resp (Ratio)
            if(inputs.sf_ratio && inputs.sf_ratio < 150 && inputs.resp_support) sofa2 += 4;
            else if(inputs.sf_ratio && inputs.sf_ratio < 235 && inputs.resp_support) sofa2 += 3;
            else if(inputs.sf_ratio && inputs.sf_ratio < 315) sofa2 += 2;
            else if(inputs.sf_ratio && inputs.sf_ratio < 400) sofa2 += 1;
            
            // Coag (Plaq - se não preenchido, assume normal)
            if(inputs.plaq !== null && inputs.plaq < 20) sofa2 += 4; 
            else if(inputs.plaq !== null && inputs.plaq < 50) sofa2 += 3; 
            else if(inputs.plaq !== null && inputs.plaq < 100) sofa2 += 2; 
            else if(inputs.plaq !== null && inputs.plaq < 150) sofa2 += 1;
            
            // Liver (Bili)
            if(inputs.bili > 12) sofa2 += 4; else if(inputs.bili >= 6) sofa2 += 3; else if(inputs.bili >= 2) sofa2 += 2; else if(inputs.bili >= 1.2) sofa2 += 1;

            // Cardio (PAM ou Drogas - Mapeamento Direto do Select)
            // 0=Não, 2=Dop/Dob(Score 2), 3=Nor<=0.1(Score 3), 4=Nor>0.1(Score 4)
            if(inputs.drogas) sofa2 += inputs.drogas;
            else if(inputs.map !== null && inputs.map < 70) sofa2 += 1;

            // SNC (Glasgow - ignora se null)
            const gcs = inputs.glasgow;
            if(gcs !== null && gcs < 6) sofa2 += 4; 
            else if(gcs !== null && gcs <= 9) sofa2 += 3; 
            else if(gcs !== null && gcs <= 12) sofa2 += 2; 
            else if(gcs !== null && gcs <= 14) sofa2 += 1;

            // Renal (Cr)
            if(inputs.creat > 5) sofa2 += 4; else if(inputs.creat >= 3.5) sofa2 += 3; else if(inputs.creat >= 2) sofa2 += 2; else if(inputs.creat >= 1.2) sofa2 += 1;

            // Lactato (Bonus)
            if(inputs.lactate > 2) sofa2 += 1;

            score = sofa2;
            if (score < 2) { interpretation = 'Baixo risco de mortalidade.'; severity = 'low'; }
            else if (score < 6) { interpretation = 'Sepse possível (Monitorar).'; severity = 'medium'; }
            else { interpretation = 'Alto risco de mortalidade (Sepse Grave/Choque).'; severity = 'high'; }
            break;

        case 'phoenix':
            // Phoenix Sepsis Score (Pediatria)
            let phoenix = 0;
            // Resp
            if (inputs.imv && ((inputs.sf_ratio_ped !== null && inputs.sf_ratio_ped < 148) || (inputs.pf_ratio_ped !== null && inputs.pf_ratio_ped < 100))) phoenix += 3;
            else if (inputs.imv && ((inputs.sf_ratio_ped !== null && inputs.sf_ratio_ped < 220) || (inputs.pf_ratio_ped !== null && inputs.pf_ratio_ped < 200))) phoenix += 2;
            else if ((inputs.sf_ratio_ped !== null && inputs.sf_ratio_ped < 292) || (inputs.pf_ratio_ped !== null && inputs.pf_ratio_ped < 400)) phoenix += 1;
            
            // Cardio
            let cardioPts = 0;
            if (inputs.vasoactives >= 2) cardioPts = 6;
            else if (inputs.vasoactives === 1) cardioPts = 2;
            else if ((inputs.lactate_ped !== null && inputs.lactate_ped > 5) || inputs.low_map) cardioPts = 1;
            phoenix += cardioPts;
            
            // Coag
            if ((inputs.plaq_ped !== null && inputs.plaq_ped < 20) || (inputs.inr_ped > 3) || (inputs.fib_ped !== null && inputs.fib_ped < 100)) phoenix += 2;
            else if ((inputs.plaq_ped !== null && inputs.plaq_ped < 100) || (inputs.inr_ped > 1.3)) phoenix += 1;

            // Neuro (GCS 0 não existe, assumimos normal se vazio)
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

  const renderInputs = () => {
    switch (selectedScore?.id) {
      case 'glasgow': return (
          <div className="space-y-4">
            <label className="block text-sm font-bold">Abertura Ocular</label><select className="w-full p-2 rounded border dark:bg-slate-700 dark:border-slate-600" onChange={(e) => handleInputChange('ocular', e.target.value)}><option value="0">Selecione...</option><option value="4">4 - Espontânea</option><option value="3">3 - À voz</option><option value="2">2 - À dor</option><option value="1">1 - Ausente</option></select>
            <label className="block text-sm font-bold">Resposta Verbal</label><select className="w-full p-2 rounded border dark:bg-slate-700 dark:border-slate-600" onChange={(e) => handleInputChange('verbal', e.target.value)}><option value="0">Selecione...</option><option value="5">5 - Orientado</option><option value="4">4 - Confuso</option><option value="3">3 - Palavras inapropriadas</option><option value="2">2 - Sons incompreensíveis</option><option value="1">1 - Ausente</option></select>
            <label className="block text-sm font-bold">Resposta Motora</label><select className="w-full p-2 rounded border dark:bg-slate-700 dark:border-slate-600" onChange={(e) => handleInputChange('motor', e.target.value)}><option value="0">Selecione...</option><option value="6">6 - Obedece comandos</option><option value="5">5 - Localiza dor</option><option value="4">4 - Retirada</option><option value="3">3 - Decorticação</option><option value="2">2 - Descerebração</option><option value="1">1 - Ausente</option></select>
          </div>
        );
    case 'nihss':
        const nihssItems = [{ k: '1a', label: '1a. Nível de Consciência', opts: [{v:0, l:'0 - Alerta'}, {v:1, l:'1 - Sonolento'}, {v:2, l:'2 - Torporoso'}, {v:3, l:'3 - Coma'}]},{ k: '1b', label: '1b. Perguntas', opts: [{v:0, l:'0 - Ambas corretas'}, {v:1, l:'1 - Uma correta'}, {v:2, l:'2 - Nenhuma correta'}]},{ k: '1c', label: '1c. Comandos', opts: [{v:0, l:'0 - Ambos corretos'}, {v:1, l:'1 - Um correto'}, {v:2, l:'2 - Nenhum correto'}]},{ k: '2', label: '2. Mov. Ocular', opts: [{v:0, l:'0 - Normal'}, {v:1, l:'1 - Paralisia parcial'}, {v:2, l:'2 - Desvio forçado'}]},{ k: '3', label: '3. Campo Visual', opts: [{v:0, l:'0 - Sem perda'}, {v:1, l:'1 - Parcial'}, {v:2, l:'2 - Completa'}, {v:3, l:'3 - Cegueira'}]},{ k: '4', label: '4. Facial', opts: [{v:0, l:'0 - Normal'}, {v:1, l:'1 - Paresia leve'}, {v:2, l:'2 - Paralisia parcial'}, {v:3, l:'3 - Completa'}]},{ k: '5a', label: '5a. Motor MSE', opts: [{v:0, l:'0 - Sem queda'}, {v:1, l:'1 - Queda <10s'}, {v:2, l:'2 - Queda rápida'}, {v:3, l:'3 - Movimento'}, {v:4, l:'4 - Nenhum'}]},{ k: '5b', label: '5b. Motor MSD', opts: [{v:0, l:'0 - Sem queda'}, {v:1, l:'1 - Queda <10s'}, {v:2, l:'2 - Queda rápida'}, {v:3, l:'3 - Movimento'}, {v:4, l:'4 - Nenhum'}]}];
        return (<div className="space-y-3">{nihssItems.map((item) => (<div key={item.k}><label className="block text-xs font-bold mb-1">{item.label}</label><select className="w-full p-1.5 rounded border text-sm dark:bg-slate-700 dark:border-slate-600" onChange={(e) => handleInputChange(item.k, e.target.value)}>{item.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>))}<p className="text-xs italic opacity-60 mt-2">*Versão sumária.</p></div>);
    case 'grace': return (<div className="space-y-3 text-sm"><div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold">Idade</label><input type="number" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('age', e.target.value)} /></div><div><label className="text-xs font-bold">FC</label><input type="number" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('hr', e.target.value)} /></div><div><label className="text-xs font-bold">PAS</label><input type="number" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('sbp', e.target.value)} /></div><div><label className="text-xs font-bold">Creatinina</label><input type="number" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('creat', e.target.value)} /></div></div><div className="space-y-2 border-t pt-2 mt-2 dark:border-slate-700"><label className="text-xs font-bold">Killip</label><select className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('killip', e.target.value)}><option value="0">I - Sem crepitações</option><option value="20">II - Crepitações/B3</option><option value="39">III - EAP</option><option value="59">IV - Choque</option></select></div><div className="space-y-1"><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('arrest')} /> PCR na admissão</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('st')} /> Desvio ST</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('enzymes')} /> Enzimas elevadas</div></div></div>);
    case 'psi': return (<div className="space-y-3 text-sm"><h4 className="font-bold text-xs uppercase text-slate-500">Demografia</h4><div className="grid grid-cols-2 gap-2"><div><label className="text-xs">Idade</label><input type="number" className="w-full p-1 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('age', e.target.value)} /></div><div className="flex items-center gap-1 pt-4"><input type="checkbox" onChange={() => handleCheckboxChange('female')} /> Mulher</div><div className="flex items-center gap-1 col-span-2"><input type="checkbox" onChange={() => handleCheckboxChange('nursing')} /> Casa de repouso</div></div><h4 className="font-bold text-xs uppercase text-slate-500 mt-2">Comorbidades</h4><div className="grid grid-cols-2 gap-1"><label className="flex items-center gap-1"><input type="checkbox" onChange={() => handleCheckboxChange('neo')} /> Neoplasia</label><label className="flex items-center gap-1"><input type="checkbox" onChange={() => handleCheckboxChange('liver')} /> Hepatopatia</label><label className="flex items-center gap-1"><input type="checkbox" onChange={() => handleCheckboxChange('chf')} /> IC</label><label className="flex items-center gap-1"><input type="checkbox" onChange={() => handleCheckboxChange('cvd')} /> AVC</label><label className="flex items-center gap-1"><input type="checkbox" onChange={() => handleCheckboxChange('renal')} /> DRC</label></div><h4 className="font-bold text-xs uppercase text-slate-500 mt-2">Exame Físico/Labs (Marcar se alterado)</h4><div className="grid grid-cols-2 gap-2"><label className="flex items-center gap-1 col-span-2"><input type="checkbox" onChange={() => handleCheckboxChange('mental')} /> Alt. Mental</label><div><label className="text-xs">FR</label><input type="number" className="w-full p-1 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('rr', e.target.value)} /></div><div><label className="text-xs">PAS</label><input type="number" className="w-full p-1 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('sbp', e.target.value)} /></div></div></div>);
    case 'apache': return (<div className="space-y-3 text-sm"><p className="text-xs italic text-amber-600">Triagem rápida.</p><div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold">Idade</label><input type="number" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('age', e.target.value)} /></div><div><label className="text-xs font-bold">Temp</label><input type="number" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('temp', e.target.value)} /></div><div><label className="text-xs font-bold">PAM</label><input type="number" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('map', e.target.value)} /></div><div><label className="text-xs font-bold">FC</label><input type="number" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('hr', e.target.value)} /></div><div><label className="text-xs font-bold">Glasgow</label><input type="number" max="15" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('glasgow', e.target.value)} /></div><div><label className="text-xs font-bold">Cr</label><input type="number" step="0.1" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('creat', e.target.value)} /></div></div><div className="mt-2"><label className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('arf')} /> IRA</label><label className="flex items-center gap-2 mt-1"><input type="checkbox" onChange={() => handleCheckboxChange('severe_organ')} /> Doença Grave/Imuno</label></div></div>);
    case 'kdigo': return (<div className="space-y-4"><div><label className="block text-sm font-bold">TFG (ml/min)</label><input type="number" className="w-full p-2 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('gfr', e.target.value)} /></div><div><label className="block text-sm font-bold">Albuminúria</label><select className="w-full p-2 rounded border dark:bg-slate-700" onChange={(e)=>handleStringChange('alb_stage', e.target.value)}><option value="">Selecione...</option><option value="A1">A1 - Normal (&lt;30)</option><option value="A2">A2 - Moderada (30-300)</option><option value="A3">A3 - Grave (&gt;300)</option></select></div></div>);
    case 'cha2ds2': return (<div className="space-y-2"><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('icc')} /> IC (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('has')} /> HAS (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('dm')} /> DM (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('avc')} /> AVC/AIT (+2)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('vasc')} /> D. Vascular (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('female')} /> Mulher (+1)</div><div className="mt-2"><label className="block text-xs font-bold">Idade</label><input type="number" className="w-full p-2 rounded border dark:bg-slate-700" placeholder="Anos" onChange={(e) => handleInputChange('age', e.target.value)} /></div></div>);
    case 'curb65': return (<div className="space-y-2"><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('confusao')} /> Confusão (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('ureia')} /> Ureia &gt; 43 (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('fr')} /> FR &ge; 30 (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('pas')} /> PAS &lt; 90 (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('age')} /> Idade &ge; 65 (+1)</div></div>);
    case 'meld': return (<div className="space-y-3"><div><label className="text-xs font-bold">Bilirrubina</label><input type="number" className="w-full p-2 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('bili', e.target.value)} /></div><div><label className="text-xs font-bold">INR</label><input type="number" className="w-full p-2 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('inr', e.target.value)} /></div><div><label className="text-xs font-bold">Creatinina</label><input type="number" className="w-full p-2 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('cr', e.target.value)} /></div><div className="flex items-center gap-2 mt-2"><input type="checkbox" onChange={() => handleCheckboxChange('dialise')} /> Diálise?</div></div>);
    case 'heart': return (<div className="space-y-3"><label className="block text-sm font-bold">História</label><select className="w-full p-2 rounded border dark:bg-slate-700" onChange={(e) => handleInputChange('historia', e.target.value)}><option value="0">Baixa (0)</option><option value="1">Moderada (1)</option><option value="2">Alta (2)</option></select><label className="block text-sm font-bold">ECG</label><select className="w-full p-2 rounded border dark:bg-slate-700" onChange={(e) => handleInputChange('ecg', e.target.value)}><option value="0">Normal (0)</option><option value="1">Inespecífico (1)</option><option value="2">ST Alterado (2)</option></select><label className="block text-sm font-bold">Idade</label><select className="w-full p-2 rounded border dark:bg-slate-700" onChange={(e) => handleInputChange('idade', e.target.value)}><option value="0">&lt;45 (0)</option><option value="1">45-65 (1)</option><option value="2">&gt;65 (2)</option></select><label className="block text-sm font-bold">Fatores Risco</label><select className="w-full p-2 rounded border dark:bg-slate-700" onChange={(e) => handleInputChange('fatores', e.target.value)}><option value="0">0 (0)</option><option value="1">1-2 (1)</option><option value="2">3+ (2)</option></select><label className="block text-sm font-bold">Troponina</label><select className="w-full p-2 rounded border dark:bg-slate-700" onChange={(e) => handleInputChange('tropo', e.target.value)}><option value="0">Normal (0)</option><option value="1">1-3x (1)</option><option value="2">&gt;3x (2)</option></select></div>);
    case 'wells_tep': return (<div className="space-y-2 text-sm"><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('tvp_sinais')} /> Sinais TVP (+3)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('sem_diag_alt')} /> TEP #1 (+3)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('fc')} /> FC &gt; 100 (+1.5)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('imob')} /> Imob/Cirurgia (+1.5)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('hist_tev')} /> Hist. TEP/TVP (+1.5)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('hemoptise')} /> Hemoptise (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('cancer')} /> Câncer (+1)</div></div>);
    case 'wells_tvp': return (<div className="space-y-2 text-sm"><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('cancer_ativo')} /> Câncer (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('paralisia')} /> Paralisia (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('acamado')} /> Acamado/Cirurgia (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('dor_palpacao')} /> Dor palpação (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('edema_todo')} /> Edema total (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('edema_panturrilha')} /> Edema panturrilha (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('edema_cacifo')} /> Cacifo (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('veias_colaterais')} /> Veias superficiais (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('hist_tvp')} /> Hist. TVP (+1)</div><div className="flex items-center gap-2 font-bold text-rose-600"><input type="checkbox" onChange={() => handleCheckboxChange('diag_alternativo')} /> Diag. alternativo (-2)</div></div>);
    case 'sofa': const sofaOpts = [0,1,2,3,4].map(n => <option key={n} value={n}>{n}</option>); return (<div className="space-y-3"><div className="grid grid-cols-2 gap-2"><div><label className="text-xs font-bold">Resp</label><select className="w-full p-1 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('resp', e.target.value)}>{sofaOpts}</select></div><div><label className="text-xs font-bold">Coag</label><select className="w-full p-1 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('coag', e.target.value)}>{sofaOpts}</select></div><div><label className="text-xs font-bold">Fígado</label><select className="w-full p-1 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('hep', e.target.value)}>{sofaOpts}</select></div><div><label className="text-xs font-bold">Cardio</label><select className="w-full p-1 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('cardio', e.target.value)}>{sofaOpts}</select></div><div><label className="text-xs font-bold">SNC</label><select className="w-full p-1 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('snc', e.target.value)}>{sofaOpts}</select></div><div><label className="text-xs font-bold">Renal</label><select className="w-full p-1 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('renal', e.target.value)}>{sofaOpts}</select></div></div></div>);
    case 'qsofa': return (<div className="space-y-2"><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('pas')} /> PAS &le; 100 (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('fr')} /> FR &ge; 22 (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('glasgow')} /> Glasgow &lt; 15 (+1)</div></div>);
    
    case 'sofa2':
      return (
         <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold">SpO2/FiO2 (Ratio)</label><input type="number" placeholder="Ex: 300" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('sf_ratio', e.target.value)} /></div>
                <div className="flex items-center pt-4"><label className="flex items-center gap-2 text-xs"><input type="checkbox" onChange={() => handleCheckboxChange('resp_support')} /> Suporte Ventilatório</label></div>
                
                <div><label className="text-xs font-bold">Plaquetas (x10³)</label><input type="number" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('plaq', e.target.value)} /></div>
                <div><label className="text-xs font-bold">Bilirrubina (mg/dL)</label><input type="number" step="0.1" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('bili', e.target.value)} /></div>
                
                <div><label className="text-xs font-bold">PAM (mmHg)</label><input type="number" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('map', e.target.value)} /></div>
                <div><label className="text-xs font-bold">Drogas Vasoativas?</label><select className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('drogas', e.target.value)}><option value="0">Não</option><option value="2">Dop/Dob (Qualquer dose)</option><option value="3">Nor/Adre &le; 0.1</option><option value="4">Nor/Adre &gt; 0.1</option></select></div>
                
                <div><label className="text-xs font-bold">Glasgow</label><input type="number" max="15" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('glasgow', e.target.value)} /></div>
                <div><label className="text-xs font-bold">Creatinina (mg/dL)</label><input type="number" step="0.1" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('creat', e.target.value)} /></div>
                <div><label className="text-xs font-bold">Lactato (mmol/L)</label><input type="number" step="0.1" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('lactate', e.target.value)} /></div>
            </div>
         </div>
      );

    case 'phoenix':
      return (
         <div className="space-y-3 text-sm">
            <h4 className="font-bold text-xs uppercase text-emerald-600">Respiratório</h4>
            <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs">SpO2/FiO2</label><input type="number" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('sf_ratio_ped', e.target.value)} /></div>
                <div><label className="text-xs">PaO2/FiO2</label><input type="number" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('pf_ratio_ped', e.target.value)} /></div>
                <div className="col-span-2"><label className="flex items-center gap-2 text-xs"><input type="checkbox" onChange={() => handleCheckboxChange('imv')} /> Ventilação Mecânica Invasiva</label></div>
            </div>
            <h4 className="font-bold text-xs uppercase text-rose-600 mt-2">Cardiovascular</h4>
            <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs">Lactato (mmol/L)</label><input type="number" step="0.1" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('lactate_ped', e.target.value)} /></div>
                <div><label className="text-xs">Vasoativos</label><select className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('vasoactives', e.target.value)}><option value="0">Nenhum</option><option value="1">1 Droga</option><option value="2">2+ Drogas</option></select></div>
                <div className="col-span-2"><label className="flex items-center gap-2 text-xs"><input type="checkbox" onChange={() => handleCheckboxChange('low_map')} /> PAM baixa para idade</label></div>
            </div>
            <h4 className="font-bold text-xs uppercase text-blue-600 mt-2">Coagulação / Neuro</h4>
            <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs">Plaquetas</label><input type="number" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('plaq_ped', e.target.value)} /></div>
                <div><label className="text-xs">INR</label><input type="number" step="0.1" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('inr_ped', e.target.value)} /></div>
                <div><label className="text-xs">Fibrinogênio</label><input type="number" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('fib_ped', e.target.value)} /></div>
                <div><label className="text-xs">Glasgow</label><input type="number" max="15" className="w-full p-1.5 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('gcs_ped', e.target.value)} /></div>
                <div className="col-span-2"><label className="flex items-center gap-2 text-xs"><input type="checkbox" onChange={() => handleCheckboxChange('pupils_fixed')} /> Pupilas Fixas bilateralmente</label></div>
            </div>
         </div>
      );

    case 'child_pugh': return (
         <div className="space-y-3 text-sm">
            <div><label className="block text-xs font-bold">Encefalopatia</label><select className="w-full p-1 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('encef', e.target.value)}><option value="1">Ausente (1)</option><option value="2">Grau 1-2 (2)</option><option value="3">Grau 3-4 (3)</option></select></div>
            <div><label className="block text-xs font-bold">Ascite</label><select className="w-full p-1 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('ascite', e.target.value)}><option value="1">Ausente (1)</option><option value="2">Leve (2)</option><option value="3">Moderada (3)</option></select></div>
            <div><label className="block text-xs font-bold">Bilirrubina (mg/dL)</label><select className="w-full p-1 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('bili', e.target.value)}><option value="1">&lt; 2 (1)</option><option value="2">2 - 3 (2)</option><option value="3">&gt; 3 (3)</option></select></div>
            <div><label className="block text-xs font-bold">Albumina (g/dL)</label><select className="w-full p-1 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('alb', e.target.value)}><option value="1">&gt; 3.5 (1)</option><option value="2">2.8 - 3.5 (2)</option><option value="3">&lt; 2.8 (3)</option></select></div>
            <div><label className="block text-xs font-bold">INR</label><select className="w-full p-1 rounded border dark:bg-slate-700" onChange={(e)=>handleInputChange('inr', e.target.value)}><option value="1">&lt; 1.7 (1)</option><option value="2">1.7 - 2.3 (2)</option><option value="3">&gt; 2.3 (3)</option></select></div>
        </div>
    );
    case 'alvarado': return (<div className="space-y-2 text-sm"><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('migratoria')} /> Dor migratória (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('anorexia')} /> Anorexia (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('nauseas')} /> Náuseas (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('dor_qid')} /> Dor QID (+2)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('descompressao')} /> Descompressão (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('temp')} /> Tax &gt; 37.3 (+1)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('leuco')} /> Leuco &gt; 10k (+2)</div><div className="flex items-center gap-2"><input type="checkbox" onChange={() => handleCheckboxChange('desvio')} /> Desvio Esq. (+1)</div></div>);
    default: return <div className="text-center p-4 text-sm opacity-50">Selecione um score.</div>;
    }
  };

  const filteredScores = SCORES_DB.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.includes(searchTerm.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white'}`}>
        
        {/* SIDEBAR: LISTA */}
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
                        <div>
                            <span className="font-bold block">{score.name}</span>
                            <span className="text-[10px] opacity-70 uppercase tracking-wide">{score.category}</span>
                        </div>
                        <ChevronRight size={16} className={`opacity-0 group-hover:opacity-100 transition-opacity ${selectedScore?.id === score.id ? 'opacity-100' : ''}`}/>
                    </button>
                ))}
            </div>
        </div>

        {/* MAIN: CALCULADORA */}
        <div className="flex-1 flex flex-col h-full relative">
            <button onClick={onClose} className={`absolute right-4 top-4 p-2 rounded-full z-10 ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}><X size={20}/></button>
            
            {selectedScore ? (
                <>
                    <div className={`p-6 border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                        <h2 className="text-2xl font-bold">{selectedScore.name}</h2>
                        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{selectedScore.description}</p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6">
                        {renderInputs()}
                    </div>

                    {/* RESULTADO REATIVO EM TEMPO REAL */}
                    <div className={`p-6 border-t ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <span className="text-xs uppercase font-bold text-slate-500">Resultado Atual</span>
                                <div className={`text-3xl font-bold transition-colors ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{result ? result.value : '--'}</div>
                            </div>
                        </div>
                        {result && (
                            <div className={`p-4 rounded-xl border flex gap-4 items-start animate-in slide-in-from-bottom-2 ${result.color}`}>
                                <div className="mt-0.5"><AlertTriangle size={20} /></div>
                                <p className="text-sm font-bold leading-relaxed">{result.text}</p>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 p-8">
                    <Activity size={64} className="mb-4 text-slate-500"/>
                    <h3 className="text-xl font-bold">Selecione um Score</h3>
                    <p className="text-sm max-w-xs mx-auto mt-2">Escolha uma ferramenta na lista lateral para iniciar o cálculo em tempo real.</p>
                </div>
            )}
        </div>

      </div>
    </div>
  );
}