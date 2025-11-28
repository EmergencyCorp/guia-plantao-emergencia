// Arquivo: api/analyze.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// Certifique-se de definir GEMINI_API_KEY nas variáveis de ambiente da Vercel
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  // Configurar CORS para permitir chamadas do frontend
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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, prompt } = req.body;

    if (!image || !prompt) {
      return res.status(400).json({ error: 'Imagem e pergunta são obrigatórias.' });
    }

    // Modelo Gemini 1.5 Flash (Rápido e eficiente para visão)
    const model = genAI.getModel({ model: "gemini-1.5-flash" });

    // Remove o cabeçalho data:image/..., mantendo apenas o base64 puro
    const base64Data = image.split(',')[1] || image;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/png", // O Gemini aceita png/jpeg genericamente
      },
    };

    const result = await model.generateContent([
      `Atue como um médico especialista sênior.
       Analise a imagem médica anexa com rigor técnico.
       
       Contexto da solicitação: ${prompt}
       
       Se for um ECG: Descreva ritmo, frequência, eixos, ondas e intervalos. Dê o laudo.
       Se for Raio-X/TC: Descreva achados patológicos e normais.
       Se for lesão dermatológica: Descreva características e hipóteses.
       
       Seja direto, técnico e conclusivo.`, 
      imagePart
    ]);
    
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ result: text });

  } catch (error) {
    console.error("Erro na API de Visão:", error);
    return res.status(500).json({ error: "Falha ao processar imagem na IA." });
  }
}