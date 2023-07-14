import whats from 'whatsapp-web.js'
import qrcode from 'qrcode-terminal';
import { deleteContent } from './utils/delete.js';
import fs from 'fs'
import transcript from './openai/transcript.js';
import path from 'path';
import callApi from './openai/openai.js';
import { getBardResponse } from './bard/bard.js';
export const client = new whats.Client({
    authStrategy: new whats.LocalAuth()
});

client.on('qr', qr => {
    qrcode.generate(qr, {small: true})
});
client.on('authenticated', (session) => console.log(`Autenticado`));

client.on('ready', () => console.log('O ChatGpt está pronto'));

client.on('message_create', message => commands(message));

client.initialize();

let ia = 'gpt';

const commands = async (message) => {
    if (message.from.includes(process.env.PHONE_NUMBER)) return;
    const contact = await message.getContact();
    let firstWord = message.body.split(" ")[0];
    const sender = message.from.includes(process.env.PHONE_NUMBER) ? message.to : message.from;

    if (message.hasMedia) {
        const media = await message.downloadMedia();
        if (media.mimetype.startsWith("audio/")){
            client.sendMessage(sender, '...', { mentions: [contact] })
            console.log('audio recebido de: ' + sender);
            const audioFilesDir = path.join('./src/', 'audio_files');
            if (!fs.existsSync(audioFilesDir)) {
                fs.mkdirSync(audioFilesDir);
            }
    
            const inputPath = path.join(audioFilesDir, `${message.id._serialized}.ogg`);
            const outputPath = path.join(audioFilesDir, `${message.id._serialized}.mp3`);
            fs.writeFileSync(inputPath, media.data, { encoding: 'base64' });

            try {
                await transcript.convertAudioToMp3(inputPath, outputPath);
                console.log('Áudio convertido para MP3 com sucesso!');
    
                const res = await transcript.sendAudioForTranscription(outputPath)
                callApi.getGptResponse(res, sender).then(async (response) => {
                client.sendMessage(sender, response, { mentions: [contact] });
            });
            deleteContent('./src/audio_files/')
            } catch (err) {
            console.log('Erro na conversão de áudio:', err);
            }
        }
    }
    else{
    console.log('mensagem recebida de: ' + sender);
    const iaCommands = {
        dalle: "!dalle",
        reset: "!reset",
        bard: "!bard",
        alBard: ":bard",
        algpt: ":gpt"
    };

    switch (firstWord) {
        case iaCommands.dalle:
            const imgDescription = message.body.substring(message.body.indexOf(" "));
            client.sendMessage(sender, 'gerando imagem...', { mentions: [contact] });
            callApi.getDalleResponse(imgDescription, message).then(async (imgUrl)  => {
                const media = await whats.MessageMedia.fromUrl(imgUrl);
                const options = {
                    mentions: [contact],
                    media: media
                };
                await client.sendMessage(sender, media, options);
            });
            break;
        case iaCommands.reset:
            callApi.conversationHistory.delete(sender);
            getBardResponse("bardcallresetrequest")
            client.sendMessage(sender, 'conversa resetada.', { mentions: [contact] });
            break;
        case iaCommands.bard:
            const bardPrompt = message.body.substring(message.body.indexOf(" "));
            const resp = await getBardResponse(bardPrompt)
            client.sendMessage(sender, '...', { mentions: [contact] })
            client.sendMessage(sender, resp, { mentions: [contact] })
            break;
        case iaCommands.alBard:
            client.sendMessage(sender, 'você esta usando o modelo bard agora', { mentions: [contact] })
            ia = 'bard';
            break;
        case iaCommands.algpt:
            client.sendMessage(sender, 'voce esta usando o modelo GPT-4 agora', { mentions: [contact] })
            ia = 'gpt';
            break;
        default:
            client.sendMessage(sender, '...', { mentions: [contact] });
            const question = message.body;
            if(ia == 'gpt'){
                callApi.getGptResponse(question, sender).then(async (response) => {
                    client.sendMessage(sender, response, { mentions: [contact] });
                });
            }
            if(ia == 'bard'){
                const response = await getBardResponse(question)
                client.sendMessage(sender, response, { mentions: [contact] });
            }
            break;
    }}
};
export default {
    commands,
    client
}