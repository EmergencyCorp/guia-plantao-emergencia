// Local: src/medicalData.js

export const MEDICAL_SCORES = {
  chadsvasc: {
    name: "CHA₂DS₂-VASc",
    desc: "Risco de AVC em Fibrilação Atrial",
    items: [
      { id: 'c', label: 'Insuficiência Cardíaca / Disfunção VE', points: 1, type: 'bool' },
      { id: 'h', label: 'Hipertensão', points: 1, type: 'bool' },
      { id: 'a2', label: 'Idade ≥ 75 anos', points: 2, type: 'bool' },
      { id: 'd', label: 'Diabetes Mellitus', points: 1, type: 'bool' },
      { id: 's2', label: 'AVC / AIT / Tromboembolismo prévio', points: 2, type: 'bool' },
      { id: 'v', label: 'Doença Vascular (IAM, DAP, Placa Aórtica)', points: 1, type: 'bool' },
      { id: 'a', label: 'Idade 65-74 anos', points: 1, type: 'bool' },
      { id: 'sc', label: 'Sexo Feminino', points: 1, type: 'bool' },
    ],
    getResult: (points) => {
      let risk = points === 0 ? "Baixo" : points === 1 ? "Moderado" : "Alto";
      return { points, risk, conduta: points >= 2 ? "Indicação formal de Anticoagulação Oral." : points === 1 ? "Considerar Anticoagulação." : "Sem indicação de anticoagulação (exceto se cardioversão)." };
    }
  },
  curb65: {
    name: "CURB-65",
    desc: "Gravidade da Pneumonia Adquirida na Comunidade",
    items: [
      { id: 'c', label: 'Confusão Mental', points: 1, type: 'bool' },
      { id: 'u', label: 'Ureia > 50 mg/dL (ou BUN > 19)', points: 1, type: 'bool' },
      { id: 'r', label: 'Frequência Respiratória ≥ 30 irpm', points: 1, type: 'bool' },
      { id: 'b', label: 'PAS < 90 ou PAD ≤ 60 mmHg', points: 1, type: 'bool' },
      { id: '65', label: 'Idade ≥ 65 anos', points: 1, type: 'bool' },
    ],
    getResult: (points) => {
      let risk = points <= 1 ? "Baixo Risco (Mortalidade < 1.5%)" : points === 2 ? "Risco Moderado (Mortalidade ~9%)" : "Alto Risco (Mortalidade > 22%)";
      let local = points <= 1 ? "Ambulatorial" : points === 2 ? "Internação (Enfermaria)" : "Internação (Considerar UTI)";
      return { points, risk, conduta: `Local sugerido: ${local}` };
    }
  },
  glasgow: {
    name: "Escala de Coma de Glasgow",
    desc: "Avaliação do Nível de Consciência",
    items: [
      { 
        id: 'eye', label: 'Abertura Ocular', type: 'select', 
        options: [
          { val: 4, text: 'Espontânea (4)' }, { val: 3, text: 'Ao comando verbal (3)' }, 
          { val: 2, text: 'À dor (2)' }, { val: 1, text: 'Ausente (1)' }
        ] 
      },
      { 
        id: 'verbal', label: 'Resposta Verbal', type: 'select', 
        options: [
          { val: 5, text: 'Orientado (5)' }, { val: 4, text: 'Confuso (4)' }, 
          { val: 3, text: 'Palavras inapropriadas (3)' }, { val: 2, text: 'Sons ininteligíveis (2)' }, { val: 1, text: 'Ausente (1)' }
        ] 
      },
      { 
        id: 'motor', label: 'Resposta Motora', type: 'select', 
        options: [
          { val: 6, text: 'Obedece comandos (6)' }, { val: 5, text: 'Localiza dor (5)' }, 
          { val: 4, text: 'Flexão normal/Retirada (4)' }, { val: 3, text: 'Flexão anormal/Decorticação (3)' }, 
          { val: 2, text: 'Extensão/Descerebração (2)' }, { val: 1, text: 'Ausente (1)' }
        ] 
      }
    ],
    getResult: (points) => {
      let trauma = points <= 8 ? "Trauma Grave (Necessidade de IOT)" : points <= 12 ? "Trauma Moderado" : "Trauma Leve";
      return { points, risk: trauma, conduta: points <= 8 ? "Proteger via aérea (Intubação)." : "Monitorar evolução neurológica." };
    }
  },
  wellstep: {
    name: "Wells para TEP",
    desc: "Probabilidade Pré-Teste de Embolia Pulmonar",
    items: [
      { id: '1', label: 'Sinais/Sintomas de TVP', points: 3, type: 'bool' },
      { id: '2', label: 'TEP é o diagnóstico mais provável', points: 3, type: 'bool' },
      { id: '3', label: 'FC > 100 bpm', points: 1.5, type: 'bool' },
      { id: '4', label: 'Imobilização ou Cirurgia < 4 sem', points: 1.5, type: 'bool' },
      { id: '5', label: 'História prévia de TVP/TEP', points: 1.5, type: 'bool' },
      { id: '6', label: 'Hemoptise', points: 1, type: 'bool' },
      { id: '7', label: 'Malignidade ativa', points: 1, type: 'bool' },
    ],
    getResult: (points) => {
      let prob = points > 6 ? "Alta Probabilidade" : points >= 2 ? "Moderada Probabilidade" : "Baixa Probabilidade";
      let conduta = points > 4 ? "TEP Provável -> Angio-TC de Tórax" : "TEP Improvável -> D-Dímero";
      return { points, risk: prob, conduta };
    }
  },
  wellstvp: {
    name: "Wells para TVP",
    desc: "Probabilidade de Trombose Venosa Profunda",
    items: [
      { id: '1', label: 'Câncer ativo', points: 1, type: 'bool' },
      { id: '2', label: 'Paralisia, paresia ou imobilização recente de MMII', points: 1, type: 'bool' },
      { id: '3', label: 'Acamado > 3 dias ou cirurgia grande < 12 sem', points: 1, type: 'bool' },
      { id: '4', label: 'Dor localizada no trajeto venoso profundo', points: 1, type: 'bool' },
      { id: '5', label: 'Edema de todo o membro', points: 1, type: 'bool' },
      { id: '6', label: 'Edema de panturrilha > 3cm (comp. lado assint.)', points: 1, type: 'bool' },
      { id: '7', label: 'Edema depressível (cacifo) no lado sintomático', points: 1, type: 'bool' },
      { id: '8', label: 'Veias colaterais superficiais (não varicosas)', points: 1, type: 'bool' },
      { id: '9', label: 'Diagnóstico alternativo mais provável que TVP', points: -2, type: 'bool' },
    ],
    getResult: (points) => {
      let prob = points >= 3 ? "Alta Probabilidade (TVP Provável)" : points >= 1 ? "Moderada" : "Baixa Probabilidade (TVP Improvável)";
      let conduta = points >= 2 ? "Solicitar USG Doppler Venoso" : "Solicitar D-Dímero (se disponível) ou USG seriado";
      return { points, risk: prob, conduta };
    }
  },
  grace: {
    name: "GRACE Score (Admissão)",
    desc: "Mortalidade intra-hospitalar em SCA (Estimativa por Pontos)",
    items: [
      { id: 'age', label: 'Idade', type: 'select', options: [{val:0, text:'<40'}, {val:18, text:'40-49'}, {val:36, text:'50-59'}, {val:55, text:'60-69'}, {val:73, text:'70-79'}, {val:91, text:'≥80'}] },
      { id: 'hr', label: 'Frequência Cardíaca', type: 'select', options: [{val:0, text:'<50'}, {val:3, text:'50-69'}, {val:9, text:'70-89'}, {val:15, text:'90-109'}, {val:24, text:'110-149'}, {val:38, text:'150-199'}, {val:46, text:'>200'}] },
      { id: 'sbp', label: 'PA Sistólica', type: 'select', options: [{val:58, text:'<80'}, {val:53, text:'80-99'}, {val:43, text:'100-119'}, {val:34, text:'120-139'}, {val:24, text:'140-159'}, {val:10, text:'160-199'}, {val:0, text:'>200'}] },
      { id: 'creat', label: 'Creatinina', type: 'select', options: [{val:1, text:'0-0.39'}, {val:4, text:'0.4-0.79'}, {val:7, text:'0.8-1.19'}, {val:10, text:'1.2-1.59'}, {val:13, text:'1.6-1.99'}, {val:21, text:'2.0-3.99'}, {val:28, text:'>4.0'}] },
      { id: 'killip', label: 'Classe Killip', type: 'select', options: [{val:0, text:'I (Sem IC)'}, {val:20, text:'II (Estertores/B3)'}, {val:39, text:'III (Edema Agudo)'}, {val:59, text:'IV (Choque)'}] },
      { id: 'arr', label: 'Parada Cardíaca na Admissão', points: 39, type: 'bool' },
      { id: 'dev', label: 'Desvio ST', points: 28, type: 'bool' },
      { id: 'enz', label: 'Enzimas Cardíacas Elevadas', points: 14, type: 'bool' },
    ],
    getResult: (points) => {
      let risk = points <= 108 ? "Baixo (<1% morte intra-hosp)" : points <= 140 ? "Intermediário (1-3% morte)" : "Alto (>3% morte)";
      return { points, risk, conduta: "Alto Risco: Estratégia Invasiva Precoce (<24h)." };
    }
  }
};