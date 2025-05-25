import { createAzure } from '@ai-sdk/azure';
import { generateText } from 'ai';

const RESOURCE_NAME = process.env.AZURE_RESOURCE_NAME;
const API_KEY = process.env.AZURE_API_KEY;
const MODEL_ID = process.env.AZURE_MODEL_ID;

const azure = createAzure({
  resourceName: RESOURCE_NAME, // Azure resource name
  apiKey: API_KEY,
  apiVersion: '2024-06-01',
});

export async function getAIAnswer(opt: {
  question: string;
  systemPrompt: string;
}) {
  if (!RESOURCE_NAME) {
    throw new Error('AZURE_RESOURCE_NAME is required');
  }
  if (!API_KEY) {
    throw new Error('AZURE_API_KEY is required');
  }
  if (!MODEL_ID) {
    throw new Error('AZURE_MODEL_ID is required');
  }

  const { question, systemPrompt } = opt;
  const { text } = await generateText({
    model: azure(MODEL_ID),
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: question
      }
    ]
  });

  return text;
}
