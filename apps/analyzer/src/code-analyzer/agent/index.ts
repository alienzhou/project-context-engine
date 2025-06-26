import { Logger } from '../../utils/log';
import * as fs from 'node:fs';

// Wiki 元数据节点接口，keyQuestions 应聚焦于 SUMMARY 中的实际技术或业务点，
// 每个页面仅保留 3~5 个以问句形式呈现的问题
interface WikiMetadataNode {
  title: string;
  purpose: string;
  keyQuestions: string[];
  children?: WikiMetadataNode[];
  agentPrompt?: string;
}

const logger = Logger('wiki-agent');

const AGENT_PROMPT = (titile: string, purpose: string, quetions: string[]) => `详细分析当前代码仓库中的内容，生成一篇《${titile}》的技术分析文章，作为该仓库的wiki文档，要求如下：
1. 文档的主要目标是: ${purpose}
2. 语言使用中文，但是涉及关键技术名词、源代码时，用原语言即可
3. 使用 mermaid 来绘制相关的技术图表
4. 保持良好的行为结构和逻辑性，除了图表外，给出必要的文字说明
5. 文档的内容可以用来回答以下问题：
${quetions.map((q) => `- ${q}`).join('\n')}

关于参考引用的：
1. 如果最终输出的文档，参考了一些项目中的代码文件或代码片段，需要按如下格式标注出来，示例：
Behavior varies by input type:
String: Sent as HTML with Content-Type: text/html[1]
Buffer/ArrayBuffer view: Sent as binary with Content-Type: application/octet-stream
Object/Array: Converted to JSON and sent as application/json[2]
null/undefined: Converted to empty string
Boolean/Number[2]: Converted to JSON

<source>
[1] lib/response.js (L1-L10)
[2] lib/context.js (L11-L200)
<source>
`;

/**
 * 为Wiki元数据中的每个节点生成AGENT_PROMPT
 * @param metadataPath Wiki元数据文件路径
 */
export async function generateAgentPromptsForWiki(metadataPath: string): Promise<void> {
  logger.info(`开始为Wiki元数据生成AGENT_PROMPT: ${metadataPath}`);
  
  try {
    // 读取Wiki元数据
    const metadataContent = await fs.promises.readFile(metadataPath, 'utf-8');
    const wikiMetadata = JSON.parse(metadataContent) as WikiMetadataNode[];
    
    // 递归处理每个节点
    const processNode = (node: WikiMetadataNode): void => {
      // 为当前节点生成AGENT_PROMPT
      const { title, purpose, keyQuestions } = node;
      node.agentPrompt = AGENT_PROMPT(title, purpose, keyQuestions);
      logger.info(`为节点 "${title}" 生成了AGENT_PROMPT`);
      
      // 处理子节点
      if (node.children && node.children.length > 0) {
        logger.info(`处理节点 "${title}" 的 ${node.children.length} 个子节点`);
        node.children.forEach(processNode);
      }
    };
    
    // 处理所有顶级节点
    wikiMetadata.forEach(processNode);
    logger.info(`完成处理 ${wikiMetadata.length} 个顶级节点`);
    
    // 将更新后的元数据写回文件
    await fs.promises.writeFile(
      metadataPath, 
      JSON.stringify(wikiMetadata, null, 2), 
      'utf-8'
    );

    printAllAgentPrompts(metadataPath);
    
    logger.info(`成功更新Wiki元数据文件: ${metadataPath}`);
  } catch (error) {
    logger.error(`为Wiki元数据生成AGENT_PROMPT时出错: ${error}`);
  }
}

/**
 * 输出wiki内容中所有生成的AGENT_PROMPT
 * @param metadataPath Wiki元数据文件路径
 */
async function printAllAgentPrompts(metadataPath: string): Promise<void> {
  logger.info(`输出所有生成的AGENT_PROMPT: ${metadataPath}`);
  
  try {
    // 读取Wiki元数据
    const metadataContent = await fs.promises.readFile(metadataPath, 'utf-8');
    const wikiMetadata = JSON.parse(metadataContent) as WikiMetadataNode[];
    
    // 递归打印每个节点的AGENT_PROMPT
    const printNodePrompt = (node: WikiMetadataNode, depth: number = 0): void => {
      const indent = '  '.repeat(depth);
      logger.info(`${indent}节点: ${node.title}`);
      
      if (node.agentPrompt) {
        // 压缩日志中的AGENT_PROMPT显示，避免过长
        const compressedPrompt = node.agentPrompt.substring(0, 50) + '...';
        logger.info(`${indent}AGENT_PROMPT: ${compressedPrompt}`);
      } else {
        logger.warn(`${indent}警告: 节点 "${node.title}" 没有AGENT_PROMPT`);
      }
      
      // 打印子节点的AGENT_PROMPT
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => printNodePrompt(child, depth + 1));
      }
    };
    
    // 打印所有顶级节点的AGENT_PROMPT
    wikiMetadata.forEach(node => printNodePrompt(node));
    
  } catch (error) {
    logger.error(`输出所有AGENT_PROMPT时出错: ${error}`);
  }
}