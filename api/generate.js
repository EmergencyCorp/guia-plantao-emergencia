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
    - "receita_estruturada": OBRIGATÓRIO.
    `;
  } else {
    promptExtra += `
    CONTEXTO SALA VERMELHA (CÁLCULO DE DOSE/BIC):
    Para drogas vasoativas, sedativos ou antibióticos que usam peso:
    1. "usa_peso": true
    2. "dose_padrao_kg": NÚMERO DECIMAL (ex: 0.3 para 0.3mg/kg)
    3. "unidade_base": "mg/kg", "mcg/kg/min", "mg/kg/h"
    4. "concentracao_mg_ml": NÚMERO da concentração final da solução (ex: 4mg em 250ml = 0.016).
    5. "unidade_concentracao": "mg/ml" ou "mcg/ml". (Fundamental para o cálculo correto).
    6. "diluicao_contexto": Texto (ex: "4 Ampolas em 250ml SG5%").
    7. "receita_estruturada": null.
    `;
  }

  if (searchQuery.toLowerCase().includes('dengue')) promptExtra += `\nPROTOCOLO DENGUE: Classifique A, B, C, D.`;
  if (searchQuery.toLowerCase().includes('trauma')) promptExtra += `\nPROTOCOLO TRAUMA: Preencha xabcde_trauma.`;

  const promptText = `Atue como médico especialista em emergência.
  Gere conduta para "${searchQuery}" na ${roomContext}.
  ${promptExtra}
  
  REGRAS RÍGIDAS JSON:
  1. JSON puro.
  2. "tratamento_medicamentoso": ARRAY.
  3. "apresentacao": OBRIGATÓRIO.
  4. "escalonamento_terapeutico": ARRAY OBRIGATÓRIO (Não deixe vazio).
  
  ESTRUTURA JSON:
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
        "apresentacao": "Ex: Ampola 2ml",
        "tipo": "Injetável",
        "sugestao_uso": "...", 
        "receita_estruturada": null, 
        "usa_peso": false, // ou true
        "dose_padrao_kg": 0, 
        "unidade_base": "...", 
        "concentracao_mg_ml": 0, 
        "unidade_concentracao": "mg/ml", // ou mcg/ml
        "diluicao_contexto": "...",
        "diluicao": "...", 
        "modo_admin": "...",
        "cuidados": "...", 
        "indicacao": "..."
      } 
    ],
    "escalonamento_terapeutico": [ 
       { "passo": "1ª Linha", "descricao": "..." },
       { "passo": "2ª Linha", "descricao": "..." }
    ],
    "medidas_gerais": ["..."],
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
