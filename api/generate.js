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
    CONTEXTO SALA VERDE (RECEITA DE ALTA):
    - OBRIGATÓRIO: Para cada item, preencha o objeto "receita".
    - "receita": {
        "uso": "USO ORAL", "USO TÓPICO", etc.
        "nome_comercial": "Nome + Concentração" (ex: Dipirona 500mg),
        "quantidade": "ex: 1 caixa",
        "instrucoes": "ex: Tomar 1 cp de 6/6h se dor",
        "dias_sugeridos": 5,
        "calculo_qnt": { "frequencia_diaria": 4, "qtd_por_dose": 1, "unidade_form": "comprimidos" }
    }
    `;
  } else {
    promptExtra += `
    CONTEXTO SALA VERMELHA (CÁLCULO DE DOSE/BIC):
    - OBRIGATÓRIO: Para drogas vasoativas, sedativos ou antibióticos que usam peso.
    - "usa_peso": true
    - "dose_padrao_kg": NÚMERO DECIMAL (ex: 0.3 para 0.3mg/kg)
    - "unidade_base": "mg/kg", "mcg/kg/min", "mg/kg/h"
    - "concentracao_mg_ml": NÚMERO (Concentração final da solução. Ex: Nora 4mg em 250ml = 0.016 mg/ml ou 16 mcg/ml).
    - "diluicao_contexto": Texto (ex: "4 Ampolas em 250ml SG5%").
    - "receita": null.
    `;
  }

  const promptText = `Atue como médico especialista em emergência.
  Gere conduta para "${searchQuery}" na ${roomContext}.
  ${promptExtra}
  
  REGRAS RÍGIDAS JSON:
  1. JSON puro sem markdown.
  2. "tratamento_medicamentoso": ARRAY.
  3. "apresentacao": OBRIGATÓRIO (ex: Ampola 2ml, Comp 500mg).
  4. "tipo": ['Comprimido', 'Gotas', 'Xarope', 'Injetável', 'Tópico', 'Inalatório'].
  
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
        "receita": null, // OU OBJETO SE SALA VERDE
        "usa_peso": false, // OU TRUE SE SALA VERMELHA
        "dose_padrao_kg": 0, 
        "unidade_base": "...", 
        "concentracao_mg_ml": 0, 
        "diluicao_contexto": "...",
        "diluicao": "...", 
        "modo_admin": "...",
        "cuidados": "...", 
        "indicacao": "..."
      } 
    ],
    "escalonamento_terapeutico": [ { "passo": "1ª Linha", "descricao": "..." } ],
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
