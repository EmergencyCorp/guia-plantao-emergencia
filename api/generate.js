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
    - "receita_estruturada": OBRIGATÓRIO para itens de alta.
    `;
  } else {
    promptExtra += `
    CONTEXTO SALA VERMELHA (CRÍTICO - CÁLCULO DE BIC):
    Para medicamentos que exigem Bomba de Infusão (Noradrenalina, Dobutamina, Fentanil, Midazolam, Propofol, Nitroglicerina, Nitroprussiato, Amiodarona), utilize OBRIGATORIAMENTE os dados abaixo para preencher os campos de cálculo:

    TABELA DE DILUIÇÕES PADRÃO (USE ESTES VALORES):
    1. **Noradrenalina**: 4 ampolas (16mg) + SG5% 234ml (Total 250ml). Conc: 64 mcg/ml. Dose ref: 0.1 mcg/kg/min.
    2. **Dobutamina**: 1 ampola (250mg) + SG5% 230ml (Total 250ml). Conc: 1000 mcg/ml (ou 1 mg/ml). Dose ref: 2.5 mcg/kg/min.
    3. **Nitroprussiato**: 1 ampola (50mg) + SG5% 248ml (Total 250ml). Conc: 200 mcg/ml. Dose ref: 0.3 mcg/kg/min.
    4. **Nitroglicerina**: 1 ampola (50mg) + SG5% 240ml (Total 250ml). Conc: 200 mcg/ml. Dose ref: 5 mcg/min (sem peso).
    5. **Fentanil**: 5 ampolas (250mcg cada = 10ml) = 50ml PURO ou diluído para 50mcg/ml. Se usar padrão 500mcg em 100ml = 5 mcg/ml. USE PADRÃO: 50 mcg/ml (Puro). Dose ref: 0.02 mcg/kg/min.
    6. **Midazolam**: 5 ampolas (50mg/10ml) + 40ml SF (Total 50ml). Conc: 1 mg/ml. Dose ref: 0.05 mg/kg/h.
    7. **Propofol**: Puro 1%. Conc: 10 mg/ml. Dose ref: 1-3 mg/kg/h.
    8. **Amiodarona**: Ataque 150mg/100ml. Manutenção: 900mg + SG5% 500ml. Conc: 1.8 mg/ml. Dose: 1 mg/min (6h) depois 0.5 mg/min.
    
    PREENCHIMENTO DO JSON PARA BIC:
    - "usa_bic": true
    - "dose_referencia": NÚMERO (ex: 0.1)
    - "unidade_dose": "mcg/kg/min", "mg/kg/h", "mcg/min" ou "mg/min"
    - "concentracao_solucao": NÚMERO da concentração final (ex: 64 para Nora)
    - "unidade_concentracao": "mcg/ml" ou "mg/ml" (Deve ser compatível com a unidade da dose para facilitar conversão)
    - "diluicao_contexto": Texto (ex: "4 Ampolas em 234ml SG5%")
    `;
  }

  // Lógica Clínica
  if (searchQuery.toLowerCase().includes('dengue')) promptExtra += `\nPROTOCOLO DENGUE: Classifique A, B, C, D.`;
  if (searchQuery.toLowerCase().includes('trauma')) promptExtra += `\nPROTOCOLO TRAUMA: Preencha xabcde_trauma.`;

  const promptText = `Atue como médico intensivista.
  Gere conduta para "${searchQuery}" na ${roomContext}.
  ${promptExtra}
  
  REGRAS RÍGIDAS JSON:
  1. "tratamento_medicamentoso": ARRAY.
  2. "tipo": Use lista fechada [Comprimido, Injetável...].
  
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
        "tipo": "Injetável/Comprimido",
        "sugestao_uso": "...", 
        "receita_estruturada": null,
        "usa_bic": false, // TRUE PARA DROGAS DE BOMBA
        "dose_referencia": 0, 
        "unidade_dose": "...", 
        "concentracao_solucao": 0, 
        "unidade_concentracao": "...",
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
