import { getAIAnswer } from '../../utils/ai';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { type CodeNodeInfo } from '../type';

const PROMPT = `You are a code reading expert who can read code and summarize its functionality and key points.
1. Please provide a clear and concise analysis
2. Focus on the core technologies and business concepts involved in the code`;

const USER = (code: string, filepath: string) => `filepath: ${filepath}

code: ${code}


Please analyze:
`;

export const readingCode = async (info: CodeNodeInfo) => {
  const text = await getAIAnswer({
    systemPrompt: PROMPT,
    question: USER(info.fullText, info.filePath),
  });

  return text;
}