import { Configuration, OpenAIApi } from "openai";
import dotenv from "dotenv";
import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
dotenv.config()
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function sendAudioForTranscription(file_path) {
  try {
    const audioData = fs.createReadStream(file_path);
    const response = await openai.createTranscription(audioData, 'whisper-1')
    const transcribed = response.data.text
    return transcribed
  } catch (error) {
    console.error('Erro na transcrição do áudio:', error);
    return null;
  }
}
const convertAudioToMp3 = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .format('mp3')
      .on('error', (err) => {
        console.log('Erro na conversão:', err);
        reject(err);
      })
      .on('end', () => {
        resolve(outputPath);
      })
      .save(outputPath);
  });
}
export default {
    sendAudioForTranscription,
    convertAudioToMp3
};
