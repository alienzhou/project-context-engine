import { Logger } from '../../utils/log';
import * as fs from 'node:fs';

// Wiki metadata node interface, keyQuestions should focus on actual technical or business points in SUMMARY,
// Each page should only retain 3-5 questions presented in interrogative form
interface WikiMetadataNode {
  title: string;
  purpose: string;
  keyQuestions: string[];
  children?: WikiMetadataNode[];
  agentPrompt?: string;
}

const logger = Logger('wiki-agent');

const AGENT_PROMPT = (titile: string, purpose: string, quetions: string[]) => `Analyze the current code repository in detail and generate a technical analysis article titled "${titile}" as a wiki document for this repository, with the following requirements:
1. The main objective of the document is: ${purpose}
2. Provide an overview of the overall architecture modules and their interactions, using mermaid to draw technical diagrams when helpful
3. Maintain clear hierarchy and logic, explain step by step, and add textual explanations where necessary
4. Content should avoid templated or hollow descriptions, directly showcase the design purpose and implementation of key functions, classes, or interfaces
5. Answer each of the following questions sequentially, providing in-depth analysis with numbered responses:
${quetions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
6. When referencing or analyzing source code, please indicate file paths and line numbers, with brief explanations
7. 使用中文回答

Regarding references:
1. If the final document references code files or code snippets from the project, they should be annotated in the following format:
<source>
[1] lib/response.js (L1-L10)
[2] lib/context.js (L11-L200)
<source>
`;

/**
 * Generate AGENT_PROMPT for each node in Wiki metadata
 * @param metadataPath Path to Wiki metadata file
 */
export async function generateAgentPromptsForWiki(metadataPath: string): Promise<void> {
  logger.info(`Starting to generate AGENT_PROMPT for Wiki metadata: ${metadataPath}`);

  try {
    // Read Wiki metadata
    const metadataContent = await fs.promises.readFile(metadataPath, 'utf-8');
    const wikiMetadata = JSON.parse(metadataContent) as WikiMetadataNode[];

    // Process each node recursively
    const processNode = (node: WikiMetadataNode): void => {
      // Generate AGENT_PROMPT for current node
      const { title, purpose, keyQuestions } = node;
      node.agentPrompt = AGENT_PROMPT(title, purpose, keyQuestions);
      logger.info(`Generated AGENT_PROMPT for node "${title}"`);

      // Process child nodes
      if (node.children && node.children.length > 0) {
        logger.info(`Processing ${node.children.length} child nodes for "${title}"`);
        node.children.forEach(processNode);
      }
    };

    // Process all top-level nodes
    wikiMetadata.forEach(processNode);
    logger.info(`Completed processing ${wikiMetadata.length} top-level nodes`);

    // Write updated metadata back to file
    await fs.promises.writeFile(
      metadataPath,
      JSON.stringify(wikiMetadata, null, 2),
      'utf-8'
    );

    printAllAgentPrompts(metadataPath);

    logger.info(`Successfully updated Wiki metadata file: ${metadataPath}`);
  } catch (error) {
    logger.error(`Error generating AGENT_PROMPT for Wiki metadata: ${error}`);
  }
}

/**
 * Output all AGENT_PROMPTs generated in wiki content
 * @param metadataPath Path to Wiki metadata file
 */
async function printAllAgentPrompts(metadataPath: string): Promise<void> {
  logger.info(`Outputting all generated AGENT_PROMPTs: ${metadataPath}`);

  try {
    // Read Wiki metadata
    const metadataContent = await fs.promises.readFile(metadataPath, 'utf-8');
    const wikiMetadata = JSON.parse(metadataContent) as WikiMetadataNode[];

    // Recursively print AGENT_PROMPT for each node
    const printNodePrompt = (node: WikiMetadataNode, depth: number = 0): void => {
      const indent = '  '.repeat(depth);
      logger.info(`${indent}Node: ${node.title}`);

      if (node.agentPrompt) {
        // Compress AGENT_PROMPT display in logs to avoid excessive length
        const compressedPrompt = node.agentPrompt.substring(0, 50) + '...';
        logger.info(`${indent}AGENT_PROMPT: ${compressedPrompt}`);
      } else {
        logger.warn(`${indent}Warning: Node "${node.title}" has no AGENT_PROMPT`);
      }

      // Print AGENT_PROMPT for child nodes
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => printNodePrompt(child, depth + 1));
      }
    };

    // Print AGENT_PROMPT for all top-level nodes
    wikiMetadata.forEach(node => printNodePrompt(node));

  } catch (error) {
    logger.error(`Error outputting all AGENT_PROMPTs: ${error}`);
  }
}