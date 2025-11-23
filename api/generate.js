// Este arquivo roda nos servidores da Vercel (Serverless Function).
// Localização: /api/generate.js na raiz do projeto.

export default async function handler(req, res) {
  // Configurações de CORS (Para permitir que seu frontend acesse esta API)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Responder a preflight request (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Apenas aceita método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { searchQuery, activeRoom } = req.body;

  // Recupera a chave da API das variáveis de ambiente do servidor
  // Tenta ler GEMINI_API_KEY ou VITE_GEMINI_API_KEY (para compatibilidade)
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Configuração de servidor ausente (API Key).' });
  }

  if (!searchQuery) {
    return res.status(400).json({ error: 'Busca vazia.' });
  }

  // --- CONSTRUÇÃO DO PROMPT INTELIGENTE (O "CÉREBRO") ---
  
  const roomContext = activeRoom === 'verde' ? 'SALA VERDE (AMBULATORIAL)' : 'SALA VERMELHA (EMERGÊNCIA)';
  const lowerQuery = searchQuery.toLowerCase();
  
  let promptExtra = "";

  // 1. Lógica Específica de Sala (Receita vs Cálculo)
  if (activeRoom === 'verde') {
    promptExtra += `
    IMPORTANTE (SALA VERDE - RECEITUÁRIO):
    Para cada item em "tratamento_medicamentoso", inclua o objeto "receita":
    "receita": {
       "uso": "USO ORAL", "USO TÓPICO", "USO RETAL", "USO OFTÁLMICO" ou "USO OTOLÓGICO",
       "nome_comercial": "Nome + Concentração",
       "quantidade": "Qtd total (ex: 1 caixa)",
       "instrucoes": "Posologia amigável para o paciente (ex: Tomar 1 cp de 8/8h...)",
       "dias_sugeridos": 5,
       "calculo_qnt": { "frequencia_diaria": 3, "unidade": "comprimidos" }
    }
    Se o medicamento for de uso imediato na unidade e não para casa, "receita": null.
    `;
  } else {
    promptExtra += `
    IMPORTANTE (SALA VERMELHA - CÁLCULO DE DOSES):
    Para drogas tituláveis ou críticas (sedação, aminas, trombólise):
    1. "usa_peso": true
    2. "dose_padrao_kg": número (ex: 0.3 para 0.3mg/kg)
    3. "unidade_base": "mg/kg", "mcg/kg/min" ou "UI/kg"
    4. "concentracao_mg_ml": NÚMERO da concentração final da solução (ex: 5 para 5mg/ml)
    5. "diluicao_contexto": Texto explicando a diluição padrão usada para o cálculo.
    `;
  }

  // 2. Lógica Clínica Específica
  if (lowerQuery.includes('dengue')) {
    promptExtra += `
    CONTEXTO DENGUE (Protocolo MS Brasil):
    - Classifique obrigatoriamente em Grupo A, B, C ou D.
    - Hidratação: Especifique ml/kg conforme o grupo.
    `;
  }

  if (lowerQuery.includes('geca') || lowerQuery.includes('diarreia') || lowerQuery.includes('desidrat')) {
    promptExtra += `
    CONTEXTO REIDRATAÇÃO (OMS):
    - Classifique em Plano A, B ou C.
    - Detalhe SRO ou Ringer Lactato conforme plano.
    `;
  }

  if (lowerQuery.includes('trauma') || lowerQuery.includes('acid') || lowerQuery.includes('poli')) {
    promptExtra += `
    CONTEXTO TRAUMA (ATLS):
    - OBRIGATÓRIO preencher o objeto "xabcde_trauma" com passo a passo (X, A, B, C, D, E).
    `;
  }

  const promptText = `Atue como médico especialista em emergência.
  Gere conduta clínica para "${searchQuery}" na ${roomContext}.
  ${promptExtra}
  
  REGRAS RÍGIDAS DE OUTPUT (JSON):
  1. Retorne APENAS JSON válido. Sem markdown.
  2. "tratamento_medicamentoso": ARRAY de objetos.
  3. SEPARAÇÃO: Se houver apresentações diferentes (ex: Dipirona Comprimido vs Gotas), crie DOIS OBJETOS distintos no array.
  4. "tipo": OBRIGATÓRIO. Escolha UM: ['Comprimido', 'Cápsula', 'Xarope', 'Suspensão', 'Gotas', 'Solução Oral', 'Injetável', 'Tópico', 'Inalatório', 'Supositório'].
  5. "sugestao_uso": Texto descritivo da administração.
  
  ESTRUTURA JSON:
  {
    "condicao": "Nome",
    "estadiamento": "Classificação",
    "classificacao": "${roomContext}",
    "resumo_clinico": "Texto técnico detalhado...",
    "xabcde_trauma": null, // OU { "x": "...", "a": "...", ... } se for trauma
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
        "diluicao": "...", // Apenas se Injetável
        "modo_admin": "...", // Apenas se Injetável
        "cuidados": "...", 
        "indicacao": "...",
        "receita": { // APENAS SALA VERDE
           "uso": "...",
           "nome_comercial": "...",
           "quantidade": "...",
           "instrucoes": "...",
           "dias_sugeridos": 5,
           "calculo_qnt": { "frequencia_diaria": 0, "unidade": "..." }
        }, 
        "usa_peso": false, // APENAS SALA VERMELHA
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
  Doses adulto 70kg (base).`;

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

    // Retorna o JSON processado para o frontend
    res.status(200).json(JSON.parse(textResponse));

  } catch (error) {
    console.error("Erro interno na API:", error);
    res.status(500).json({ error: "Erro ao processar conduta clínica.", details: error.message });
  }
}
