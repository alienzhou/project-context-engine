import { getAIAnswer } from '../../utils/ai';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { type CodeNodeInfo } from '../type';

const PROMPT = `你是一个代码阅读专家，可以阅读代码并总结出代码的功能和关键点。
1. 请用中文回答，代码的关键词保留英文
2. 注意要给出代码中涉及的核心技术和业务概念`;

const USER = (code: string, filepath: string) => `filepath: ${filepath}

code: ${code}


请回答:
`;

export const readingCode = async (info: CodeNodeInfo) => {
  const text = await getAIAnswer({
    systemPrompt: PROMPT,
    question: USER(info.fullText, info.filePath),
  });

  return text;
}