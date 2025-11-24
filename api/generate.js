export default async function handler(req, res) {
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

  const roomContext = activeRoom === 'verde' ? 'SALA VERDE (AMBULATORIAL)' : 'SALA VERMELHA (EMERGÊNCIA/UTI)';
  
  let promptExtra = "";

  if (activeRoom === 'verde') {
    promptExtra += `
    CONTEXTO SALA VERDE:
    - Foco: Receituário e alta.
    - "receita": Obrigatório preencher para medicamentos de casa.
    - "sugestao_uso": Linguagem simples para o paciente (ex: "Tomar 1 comprimido após almoço").
    `;
  } else {
    promptExtra += `
    CONTEXTO SALA VERMELHA (CRÍTICO):
    - Foco: Estabilização, Intubação, Vasoativos.
    - "receita": null.
    - "sugestao_uso": Linguagem técnica para enfermagem (ex: "Infundir em BIC", "Bolus lento 3 min").
    
    TABELA MESTRA DE DILUIÇÕES PADRÃO (USE ESTAS SE O FÁRMACO FOR CITADO):
    1. **Noradrenalina**: 4 ampolas (16mg) + SG5% 234ml (Total 250ml). Conc: 64 mcg/ml. Dose inicial: 0.05 mcg/kg/min.
    2. **Dobutamina**: 1 ampola (250mg) + SG5% 230ml (Total 250ml). Conc: 1000 mcg/ml. Dose inicial: 2.5 mcg/kg/min.
    3. **Nitroprussiato (Nipride)**: 1 ampola (50mg) + SG5% 248ml (Total 250ml). Conc: 200 mcg/ml. Dose inicial: 0.3 mcg/kg/min.
    4. **Nitroglicerina (Tridil)**: 1 ampola (50mg) + SG5% 240ml (Total 250ml). Conc: 200 mcg/ml. Dose inicial: 5-10 mcg/min (sem peso).
    5. **Fentanil (Sedação Contínua)**: 4 ampolas (2000mcg) + SF0.9% 60ml (Total 100ml). Conc: 20 mcg/ml. Dose: 0.02-0.05 mcg/kg/min.
    6. **Midazolam (Sedação Contínua)**: 10 ampolas (150mg) + SF0.9% 120ml (Total 150ml). Conc: 1 mg/ml. Dose: 0.02-0.1 mg/kg/h.
    7. **Propofol**: Puro (10mg/ml). Dose: mg/kg/h.
    8. **Amiodarona**: Ataque 150mg em 100ml SG5% (10-15min). Manutenção: 900mg em 500ml SG5% em 24h.
    9. **Hidrocortisona (Choque)**: 200mg/dia (50mg 6/6h) ou infusão contínua.
    
    REGRAS DE CÁLCULO (Json Fields):
    - "usa_peso": true (se a dose depende de peso).
    - "dose_padrao_kg": APENAS O NÚMERO da dose inicial (ex: 0.05).
    - "unidade_base": "mcg/kg/min", "mg/kg/h", "mcg/min" ou "mg/kg".
    - "concentracao_mg_ml": NÚMERO da concentração da solução padrão acima (ex: 64 para Nora). ATENÇÃO À UNIDADE (se base é mcg, aqui deve ser mcg/ml).
    - "diluicao_contexto": Texto descrevendo a diluição padrão usada (ex: "4 amp em 234ml SG5%").
    `;
  }

  const promptText = `Atue como médico intensivista sênior.
  Gere conduta para "${searchQuery}" na ${roomContext}.
  ${promptExtra}
  
  ESTRUTURA JSON OBRIGATÓRIA:
  {
    "condicao": "Nome",
    "estadiamento": "...",
    "classificacao": "${roomContext}",
    "resumo_clinico": "...",
    "xabcde_trauma": null, 
    "avaliacao_inicial": { "sinais_vitais_alvos": [], "exames_prioridade1": [], "exames_complementares": [] },
    "achados_exames": { "ecg": "...", "laboratorio": "...", "imagem": "..." },
    "criterios_gravidade": [],
    "tratamento_medicamentoso": [ 
      { 
        "farmaco": "Nome", 
        "tipo": "Injetável/Comprimido",
        "sugestao_uso": "...",
        "diluicao": "...",
        "modo_admin": "...",
        "cuidados": "...", 
        "indicacao": "...",
        "receita": null, 
        "usa_peso": false, 
        "dose_padrao_kg": 0, 
        "unidade_base": "...", 
        "concentracao_mg_ml": 0, 
        "diluicao_contexto": "..."
      } 
    ],
    "escalonamento_terapeutico": [],
    "medidas_gerais": [],
    "criterios_internacao": [],
    "criterios_alta": [],
    "guideline_referencia": "..."
  }`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) throw new Error(`Erro Google API: ${response.status}`);
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.status(200).json(JSON.parse(text));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno." });
  }
}
