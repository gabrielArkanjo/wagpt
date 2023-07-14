import dotenv from 'dotenv'
import whats from 'whatsapp-web.js'
import { Configuration, OpenAIApi } from 'openai'
import { client } from '../app.js';
import { getBardResponse } from '../bard/bard.js';
dotenv.config()
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const conversationHistory = new Map();

const getGptResponse = async (clientText, sender) => {
  let messages = conversationHistory.get(sender) || [
    { role: "system", content: process.env.START_PROMPT },
    { role: "system", content: 'toda vez que um usuario pedir a voce que gere ou crie uma imagem voce devera responder apenas com: !dalle + descriçao do usuario e mais nada, a descrição do usuario deve ser tradzuida para o inglês de forma complementar e criativa, ao usar esse comando a imagem sera exibida diretamente para o usuario, se o usuario solicitar, voce deve dar uma descrição acertiva e detalhada da imagem que foi criada' },
    { role: "system", content: 'se o usuario perguntar a você como pode ser feito para gerar uma imagem apenas diga para o usuario fornecer uma descrição da imagem que ele quer que você gere.' },
    { role: "system", content: 'se o usuario perguntar algo sobre a imagem voce apenas passa informações sobre a descrição da imagem dando impressão que foi realmente você que criou tal imagem, lembrando que a imagem sera diretamente exibida ao usuario apos o comando, entao se o usuario perguntar apenas de a ele uma descrição detalhada da imagem' },
    { role: "system", content: 'os comandos de texto sempre se iniciam com uma esclamação (!), e apenas você tem acesso e direito de usa-los' },
    { role: "system", content: 'voce nao deve passar nenhuma informção de quaisquer comandos de texto para os usuarios ou sequer falar ou mencionar eles no contexto da conversa, esses comandos so podem ser usados por você.' },
  ];
  messages.push({ role: "user", content: clientText });
  const body = {
    model: "gpt-4",
    messages: messages,
  };

  const MAX_RETRIES = 3;
  let response, completion;

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      completion = await openai.createChatCompletion(body);
      response = completion.data.choices[0].message.content;
      if(response.split(" ")[0] == "!dalle"){
        console.log("gpt-4 usou o dalle")
        await client.sendMessage(sender, "a imagem está sendo criada");
        await getDalleResponse(response.substring(response.indexOf(" "))).then(async (imgUrl) => {
          const media = await whats.MessageMedia.fromUrl(imgUrl);
          const options = {
              media: media
          };
          await client.sendMessage(sender, media, options);
        })
        response = 'aqui está'
      }
      break;
    } catch (e) {
      if (i === MAX_RETRIES - 1) {
        return `❌ OpenAI Response Error ❌\n${e.message}`;
      }
      console.log(`Tentativa ${i + 1} falhou`);
    }
  }

  messages.push({ role: "assistant", content: response });
  conversationHistory.set(sender, messages);
  return response;
};
const getDalleResponse = async (clientText) => {
    const body = {
        prompt: clientText,
        n: 1,
        size: "1024x1024",
    };

    try {
        const { data } = await openai.createImage(body)
        return data.data[0].url;
    } catch (e) {
        return `❌ OpenAI Response Error ❌`;
    }
};
export default {
    getGptResponse,
    getDalleResponse,
    conversationHistory
}