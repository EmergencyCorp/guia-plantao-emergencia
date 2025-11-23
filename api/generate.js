// Este arquivo roda nos servidores da Vercel. Ninguém tem acesso a ele.
// Salve como: api/generate.js

export default async function handler(req, res) {
  // Apenas aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { searchQuery, activeRoom } = req.body;

  // A Chave fica SEGURA no servidor (configure GEMINI_API_KEY nas variáveis da Vercel)
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Configuração de servidor ausente (API Key).' });
  }

  if (!searchQuery) {
    return res.status(400).json({ error: 'Busca vazia.' });
  }

  // --- LÓGICA INTELECTUAL (PROMPT SECRETO) ---
  // Movemos toda a lógica complexa para cá. O usuário final nunca verá isso.

  const roomContext = activeRoom === 'verde' ? 'SALA VERDE (AMBULATORIAL)' : 'SALA VERMELHA (EMERGÊNCIA)';
  const lowerQuery = searchQuery.toLowerCase();
  
  let promptExtra = "";

  // Lógica de Sala
  if (activeRoom === 'verde') {
    promptExtra += `
    IMPORTANTE (SALA VERDE):
    Para cada item em "tratamento_medicamentoso", inclua "receita":
    "receita": {
       "uso": "USO ORAL/TÓPICO/etc",
       "nome_comercial": "Nome + Concentração",
       "quantidade": "Qtd total (ex: 1 cx)",
       "instrucoes": "Posologia para o paciente",
       "dias_sugeridos": 5,
       "calculo_qnt": { "frequencia_diaria": 3, "unidade": "comprimidos" }
    }
    Se o medicamento for uso imediato, "receita": null.
    `;
  } else {
    promptExtra += `
    IMPORTANTE (SALA VERMELHA - CÁLCULO):
    Para drogas tituláveis (sedação, aminas):
    1. "usa_peso": true
    2. "dose_padrao_kg": número (ex: 0.3)
    3. "unidade_base": "mg/kg"
    4. "concentracao_mg_ml": NÚMERO (ex: 5)
    5. "diluicao_contexto": Texto explicativo
    `;
  }

  // Lógica Clínica Específica (Seu Segredo Industrial)
  if (lowerQuery.includes('dengue')) {
    promptExtra += `
    CONTEXTO DENGUE (Protocolo MS):
    - Classifique Grupos A, B, C, D.
    - Hidratação específica ml/kg conforme grupo.
    `;
  }
  if (lowerQuery.includes('trauma') || lowerQuery.includes('acid') || lowerQuery.includes('poli')) {
    promptExtra += `
    CONTEXTO TRAUMA (ATLS):
    - OBRIGATÓRIO preencher objeto "xabcde_trauma".
    `;
  }

  const promptText = `Atue como médico especialista em emergência.
  Gere conduta clínica para "${searchQuery}" na ${roomContext}.
  ${promptExtra}
  
  REGRAS RÍGIDAS DE OUTPUT:
  1. Retorne APENAS JSON válido.
  2. Separe apresentações (Gotas/Comp) em objetos diferentes.
  3. "tipo": OBRIGATÓRIO (Comprimido, Injetável, Gotas...).
  4. "sugestao_uso": Linguagem de bula para Sala Verde, técnica para Vermelha.
  
  ESTRUTURA JSON:
  {
    "condicao": "Nome",
    "estadiamento": "Classificação",
    "classificacao": "${roomContext}",
    "resumo_clinico": "Texto técnico detalhado...",
    "xabcde_trauma": null, 
    "avaliacao_inicial": { 
      "sinais_vitais_alvos": ["PAM > 65mmHg", "SatO2 > 94%"], 
      "exames_prioridade1": ["..."], 
      "exames_complementares": ["..."] 
    },
    "achados_exames": { "ecg": "...", "laboratorio": "...", "imagem": "..." },
    "criterios_gravidade": ["..."],
    "tratamento_medicamentoso": [ 
      { 
        "farmaco": "Nome + Concentração", 
        "tipo": "Comprimido",
        "sugestao_uso": "...",
        "diluicao": "...",
        "modo_admin": "...",
        "cuidados": "...", 
        "indicacao": "...",
        "receita": { ... }, 
        "usa_peso": false, 
        "dose_padrao_kg": 0,
        "unidade_base": "mg/kg",
        "concentracao_mg_ml": 0,
        "diluicao_contexto": "..."
      } 
    ],
    "escalonamento_terapeutico": [ { "passo": "1ª Linha", "descricao": "..." } ],
    "medidas_gerais": ["..."],
    "criterios_internacao": ["..."],
    "criterios_alta": ["..."],
    "guideline_referencia": "Fonte"
  }
  Doses adulto 70kg.`;

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
      throw new Error(`Erro na API do Google: ${response.statusText}`);
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    // Retorna apenas o JSON limpo para o frontend
    res.status(200).json(JSON.parse(textResponse));

  } catch (error) {
    console.error("Erro no Backend:", error);
    res.status(500).json({ error: "Erro interno ao gerar conduta." });
  }
}