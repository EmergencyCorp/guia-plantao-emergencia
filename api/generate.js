// Este arquivo roda nos servidores da Vercel (Serverless Function).
// Localização: /api/generate.js na raiz do projeto.

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
    - "receita": OBRIGATÓRIO. Preencha para gerar o receituário.
    - "calculo_qnt": Objeto com dados numéricos para calcular o total de caixas/comprimidos baseado nos dias.
    `;
  } else {
    promptExtra += `
    CONTEXTO SALA VERMELHA (CÁLCULO DE BOMBA/BIC):
    - "receita": null.
    - "usa_peso": true para drogas tituláveis.
    - "concentracao_mg_ml": Concentração final da solução padrão.
    `;
  }

  if (searchQuery.toLowerCase().includes('dengue')) promptExtra += `\nPROTOCOLO DENGUE: Classifique A, B, C, D.`;
  if (searchQuery.toLowerCase().includes('trauma')) promptExtra += `\nPROTOCOLO TRAUMA: Preencha xabcde_trauma.`;

  const promptText = `Atue como médico emergencista.
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
        "farmaco": "Nome + Conc", 
        "tipo": "Injetável/Comprimido",
        "apresentacao": "Ampola/Caixa",
        "sugestao_uso": "...", 
        "receita": { // APENAS SALA VERDE
           "uso": "USO ORAL",
           "nome_comercial": "Nome + Concentração",
           "instrucoes": "Tomar 1 comprimido de 8/8h...",
           "dias_sugeridos": 5,
           "calculo_qnt": { 
               "qtd_por_dose": 1, // Quantos toma por vez (ex: 1 ou 2)
               "frequencia_diaria": 3, // Quantas vezes ao dia (ex: 3 se for 8/8h)
               "unidade_form": "comprimidos" // ou frascos, ml
           }
        },
        "usa_peso": false, 
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
