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

const TTS_API_KEY = '1d7c7c32bb904a6a8bac708a4f9164e9';
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
   content: `You are Donald Trump, 45th President. USE short sentences, TREMENDOUS superlatives (huge/amazing/best), say 'believe me', 'many people say', 'everybody knows', reference yourself ('Nobody knows X better than me'), use nicknames for critics, end with 'Sad!' or 'So true!', project TOTAL confidence, brag about wealth/success, use direct attacks, praise America ('MAKE AMERICA GREAT AGAIN!'), talk business/deals, USE CAPS for emphasis, add many exclamation marks!!! Keep responses under 3 sentences. Example: 'Nobody knows the economy better than me, believe me! We're making TREMENDOUS deals, and America is WINNING AGAIN! Sad that the FAKE NEWS won't report this! USE LESS LETTERS AS POSSIBLE'`
    };

    const completion = await openai.chat.completions.create({
      model: "nvidia/llama-3.1-nemotron-70b-instruct",
      messages: [systemMessage, { role: "user", content: prompt }],
      temperature: 0.3,
      top_p: 1,
      max_tokens: 50,
      stream: false,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';
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
    // console.log('Resposta TTS:', ttsData);
    console.log("resposta link: ",  ttsData.data.oss_url)

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