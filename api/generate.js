// Este arquivo roda nos servidores da Vercel (Serverless Function).
// Localização: /api/generate.js na raiz do projeto.

export default async function handler(req, res) {
  // Configurações de CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { searchQuery, activeRoom } = req.body;
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Configuração de servidor ausente (API Key).' });
  }

  if (!searchQuery) {
    return res.status(400).json({ error: 'Busca vazia.' });
  }

  // --- CONSTRUÇÃO DO PROMPT DE ALTA PRECISÃO ---
  
  const roomContext = activeRoom === 'verde' ? 'SALA VERDE (AMBULATORIAL)' : 'SALA VERMELHA (EMERGÊNCIA/UTI)';
  const lowerQuery = searchQuery.toLowerCase();
  
  let promptExtra = "";
  let roleDefinition = "";

  // 1. Lógica Específica de Sala (SALA VERMELHA "HARDCORE")
  if (activeRoom === 'vermelha') {
    roleDefinition = "Você é um médico INTENSIVISTA e EMERGENCISTA SÊNIOR. Sua prioridade é salvar a vida do paciente com precisão absoluta e tolerância zero para erros.";
    
    // PROTOCOLOS INSTITUCIONAIS EXTRAÍDOS DAS IMAGENS
    const institutionalProtocols = `
    ATENÇÃO: PARA AS DROGAS ABAIXO, USE ESTRITAMENTE AS DILUIÇÕES E CONCENTRAÇÕES PADRÃO DA INSTITUIÇÃO (NÃO INVENTE):
    
    1. VASOATIVAS:
       - NORADRENALINA: 4 Ampolas (16mg) + 234mL SG 5% (Total 250mL). Concentração: 64 mcg/mL.
       - DOBUTAMINA: 4 Ampolas (1000mg) + 170mL SG 5% (Total 250mL). Concentração: 4000 mcg/mL (4 mg/mL).
       - NITROPRUSSIATO (NIPRIDE): 1 Ampola (50mg) + 248mL SG 5% (Total 250mL). Concentração: 200 mcg/mL.
       - NITROGLICERINA (TRIDIL): 1 Ampola (50mg) + 240mL SG 5% (Total 250mL). Concentração: 200 mcg/mL.
       - VASOPRESSINA: 1 Ampola (20UI) + 100mL SF 0.9%. Concentração: 0.2 UI/mL.
       - ADRENALINA (INFUSÃO): 6 Ampolas (6mg) + 94mL SF 0.9% (Total 100mL). Concentração: 60 mcg/mL.
       - DOPAMINA: 5 Ampolas (250mg) + 200mL SG 5%. Concentração: 1000 mcg/mL.

    2. SEDAÇÃO E ANALGESIA CONTÍNUA (BOMBA):
       - FENTANIL: 2 Ampolas (1000mcg) + 80mL SF 0.9% (Total 100mL). Concentração: 10 mcg/mL.
       - MIDAZOLAM: 10 Ampolas (3mL cada = 150mg totais) + 120mL SF 0.9% (Total 150mL). Concentração: 1 mg/mL.
       - PROPOFOL: Puro (Sem diluição). Concentração: 10 mg/mL.
       - DEXMEDETOMIDINA (PRECEDEX): 2 Ampolas (400mcg) + 96mL SF 0.9% (Total 100mL). Concentração: 4 mcg/mL.
       - KETAMINA: 1 Ampola (2mL/100mg) + 98mL SF 0.9%. Concentração: 1 mg/mL.

    3. BLOQUEADORES NEUROMUSCULARES:
       - ROCURÔNIO: 10 Ampolas (500mg) + 50mL SF 0.9%. Concentração: 5000 mcg/mL (5 mg/mL).
       - CISATRACÚRIO: 5 Ampolas + 25mL SF 0.9%.

    4. OUTROS:
       - AMIODARONA (ATAQUE): 150mg + 100mL SG5% em 20-30 min.
       - AMIODARONA (MANUTENÇÃO): 900mg (6 amp) + 250mL SG5% em 24h.
       - ESMOLOL: 1 Ampola (2.5g) + 240mL SG 5%. Concentração: 10 mg/mL.
    `;

    promptExtra += `
    CRITICIDADE MÁXIMA (SALA VERMELHA):
    1. **Alvos Terapêuticos (Obrigatório):** Defina metas numéricas precisas (PAM, SatO2, etc).
    2. **Exames (Obrigatório):** Seja específico nos pedidos.
    3. **Cálculo de Doses (OBRIGATÓRIO SEGUIR O PADRÃO ACIMA):** - Se a droga estiver na lista acima, preencha:
         - "usa_peso": true (se aplicável, ex: Nora, Dobuta, Fentanil contínuo)
         - "dose_padrao_kg": O valor inicial recomendado (ex: Nora iniciar 0.05 mcg/kg/min).
         - "unidade_base": ex: "mcg/kg/min" ou "mcg/kg/h".
         - "concentracao_mg_ml": O VALOR EXATO DA CONCENTRAÇÃO CALCULADA ACIMA (ex: Nora = 0.064 mg/mL ou 64 mcg/mL. Converta para a mesma grandeza da dose. Se dose é mcg, aqui deve ser mcg/ml).
         - "diluicao_contexto": Texto exato da diluição (ex: "4 Ampolas (16mg) + 234mL SG 5%").
    
    ${institutionalProtocols}
    `;
  } else {
    roleDefinition = "Você é um médico generalista experiente em pronto atendimento.";
    promptExtra += `
    CONTEXTO SALA VERDE (AMBULATORIAL):
    - Foco em alívio sintomático e tratamento domiciliar.
    - "receita": OBRIGATÓRIO preencher objeto para prescrição de alta com "nome_comercial" (ex: "Novalgina 1g"), "uso" (ORAL, TÓPICO), "quantidade" e "instrucoes".
    - "instrucoes": Linguagem clara para o paciente (ex: "Tomar 1 cp após o almoço").
    `;
  }

  // 2. Lógica Clínica Específica
  if (lowerQuery.includes('dengue')) {
    promptExtra += ` PROTOCOLO DENGUE (MS BRASIL)... `;
  }
  if (lowerQuery.includes('sepse') || lowerQuery.includes('septico')) {
    promptExtra += ` PROTOCOLO SEPSE (Surviving Sepsis Campaign)... `;
  }
  if (lowerQuery.includes('iam') || lowerQuery.includes('infarto')) {
    promptExtra += ` PROTOCOLO IAM (SBC/AHA)... `;
  }
  if (lowerQuery.includes('trauma') || lowerQuery.includes('acid') || lowerQuery.includes('poli')) {
    promptExtra += ` PROTOCOLO TRAUMA (ATLS 10ª Ed)... `;
  }

  const promptText = `${roleDefinition}
  Gere a conduta clínica IMPECÁVEL para "${searchQuery}" na ${roomContext}.
  ${promptExtra}
  
  REGRAS DE FORMATO (JSON):
  1. Retorne APENAS JSON válido.
  2. "tratamento_medicamentoso": array de objetos.
  3. Se Sala Vermelha, "receita" deve ser null. Se Sala Verde, preencha "receita".
  
  ESTRUTURA JSON ESPERADA:
  {
    "condicao": "Nome Técnico Completo",
    "estadiamento": "Classificação",
    "classificacao": "${roomContext}",
    "resumo_clinico": "...",
    "xabcde_trauma": null,
    "avaliacao_inicial": { "sinais_vitais_alvos": [], "exames_prioridade1": [], "exames_complementares": [] },
    "achados_exames": { "ecg": "...", "laboratorio": "...", "imagem": "..." },
    "criterios_gravidade": [],
    "tratamento_medicamentoso": [ 
      { 
        "farmaco": "Nome", 
        "tipo": "Injetável",
        "sugestao_uso": "...",
        "diluicao": "...", 
        "modo_admin": "BIC", 
        "cuidados": "...", 
        "indicacao": "...",
        "receita": { "nome_comercial": "...", "quantidade": "...", "instrucoes": "...", "uso": "...", "dias_sugeridos": 5 },
        "usa_peso": true,
        "dose_padrao_kg": 0.0,
        "unidade_base": "mcg/kg/min",
        "concentracao_mg_ml": 64, // Exemplo Nora: 64 mcg/ml
        "diluicao_contexto": "4 Amp + 234ml SG5%"
      } 
    ],
    "escalonamento_terapeutico": [],
    "medidas_gerais": [],
    "criterios_internacao": [],
    "criterios_alta": [],
    "guideline_referencia": "..."
  }
  Baseie-se em doses para adulto 70kg (padrão).`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Erro Gemini API:", response.status, errText);
      throw new Error(`Erro na API IA: ${response.status}`);
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    res.status(200).json(JSON.parse(textResponse));

  } catch (error) {
    console.error("Erro interno na API:", error);
    res.status(500).json({ error: "Erro ao processar conduta clínica.", details: error.message });
  }
}
