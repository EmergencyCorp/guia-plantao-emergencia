// Arquivo: api/analyze.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 1. Verifica se a chave existe no ambiente
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("A chave GEMINI_API_KEY não foi encontrada nas variáveis de ambiente do servidor.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const { image, prompt } = req.body;

    if (!image || !prompt) {
      return res.status(400).json({ error: 'Imagem e pergunta são obrigatórias.' });
    }

    // 2. Tenta instanciar o modelo
    const model = genAI.getModel({ model: "gemini-1.5-flash" });

    // 3. Limpeza do Base64
    const base64Data = image.includes('base64,') ? image.split('base64,')[1] : image;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg", // Forçamos JPEG pois vamos converter no front
      },
    };

    // 4. Chamada à IA
    const result = await model.generateContent([
      `Atue como um médico especialista. Analise a imagem anexa com rigor técnico.
       Contexto: ${prompt}
       Seja direto e conclusivo.`, 
      imagePart
    ]);
    
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ result: text });

  } catch (error) {
    console.error("ERRO DETALHADO NO BACKEND:", error);
    // Aqui retornamos a mensagem real do erro para aparecer na sua tela
    return res.status(500).json({ 
        error: `Erro na API: ${error.message}` 
    });
  }
}