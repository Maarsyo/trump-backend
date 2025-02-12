const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const OpenAI = require('openai');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configuração das APIs
const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

const TTS_API_KEY = '7fc9ac3e49cd4902b8d1a4c2350bf7b3';
const TTS_SPEAKER_ID = '7f954f14-55fa-11ef-a7a0-00163e0e200f';

// Endpoint para chat com IA e conversão de texto em fala
app.post('/api/chat', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || prompt.trim() === '') {
    return res.status(400).json({ error: 'O prompt não pode estar vazio.' });
  }

  try {
    console.log('Prompt recebido:', prompt);
    
    // 1. Obter resposta da NVIDIA AI
    const systemMessage = {
      role: "system",
      content: `PERSONALITY & STYLE:
- You are a charismatic crypto influencer
- Max 50 words!
- Extremely confident & assertive
- Speaks with authority and enthusiasm
- Uses superlatives ("tremendous", "huge", "the best")
- Always gives detailed, engaging responses
- Maintains high energy and excitement
- Must complete all thoughts and sentences
- Each response should be at least 2-3 sentences
- Responses should be energetic but coherent

CRYPTO OPINIONS:
- Pro-Bitcoin ("The best technology ever!")
- Supports Elon Musk ("A tremendous visionary, like me!")
- Against fiat currencies ("Dollar? Total mess! Sad!")
- Anti-regulation
- Promises to "make crypto great again"

KEY PHRASES & TONE:
- "Nobody understands crypto better than me!"
- "We're building the greatest blockchain ever!"
- "Web3 is going to be HUGE!"
- "NFTs are tremendous pieces of art"
- Always end with strong conviction or call to action
- Use exclamation marks for emphasis
- Add "Believe me!" or "Trust me!" occasionally

TECHNICAL REQUIREMENTS:
- Always complete your thoughts
- Never cut sentences in the middle
- Give thorough explanations
- Stay on topic and maintain coherence
- Minimum 2-3 sentences per response`
    };

    const completion = await openai.chat.completions.create({
      model: "nvidia/llama-3.1-nemotron-70b-instruct",
      messages: [systemMessage, { role: "user", content: prompt }],
      temperature: 0.7,  // Aumentado para mais criatividade
      top_p: 0.9,       // Ajustado para mais variedade
      max_tokens: 40,   // Aumentado significativamente
      stream: false,
      stop: ["<end>", "Human:", "Assistant:"] // Modificado para permitir pontuação natural
    });

    let aiResponse = completion.choices[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';
    
    // Limpa e formata a resposta
    aiResponse = aiResponse.trim();
    if (!aiResponse.match(/[.!?]$/)) {
      aiResponse += '!';  // Adiciona exclamação para manter o tom entusiasmado
    }

    console.log('Resposta da IA:', aiResponse);

    // 2. Converter texto em fala usando a TopMediaI API
    const ttsResponse = await fetch('https://api.topmediai.com/v1/text2speech', {
      method: 'POST',
      headers: {
        'x-api-key': TTS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: aiResponse,
        speaker: TTS_SPEAKER_ID,
        emotion: 'Excited'
      })
    });

    if (!ttsResponse.ok) {
      throw new Error('Falha na síntese de voz');
    }

    const ttsData = await ttsResponse.json();
    console.log("resposta link: ", ttsData.data.oss_url);

    // 3. Retornar tanto o texto quanto a URL do áudio
    res.json({
      response: aiResponse,
      audioUrl: ttsData.data.oss_url
    });

  } catch (error) {
    console.error('Erro ao processar a solicitação:', error);
    res.status(500).json({ 
      error: 'Erro ao processar a solicitação.',
      details: error.message 
    });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});