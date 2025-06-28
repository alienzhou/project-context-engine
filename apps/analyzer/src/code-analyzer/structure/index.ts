import * as fs from 'node:fs';
import * as path from 'node:path';
import { DIR_SUMMARY_FILENAME } from '../../utils/const';
import Logger from '../../utils/log';
import { getAIAnswer } from '../../utils/ai';

const logger = Logger('ProjectStructure');

interface FileNode {
  type: 'file' | 'directory';
  name: string;
  path: string;
  children?: FileNode[];
}

interface SummaryNode {
  depth: number;
  filepath: string;
  content: string;
}

/**
 * Filter files or directories that should not be processed
 * @param name File or directory name
 */
function shouldProcess(name: string): boolean {
  const ignoredItems = [
    'node_modules',
    'dist',
    '.git',
    'logs',
    '.DS_Store',
    'coverage',
    '.cache',
    '.next',
    '.nuxt',
  ];

  return !ignoredItems.some(item => name.includes(item));
}

/**
 * Recursively scan directory to build file tree structure
 * @param dirPath Directory path to scan
 * @returns File tree structure
 */
async function buildFileTree(dirPath: string, summaryFiles: SummaryNode[], depth = 0): Promise<FileNode> {
  const baseName = path.basename(dirPath);

  const node: FileNode = {
    type: 'directory',
    name: baseName,
    path: dirPath,
    children: [],
  };

  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    // Sort: directories first, then files, alphabetically
    const sortedEntries = entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of sortedEntries) {
      const entryPath = path.join(dirPath, entry.name);

      // Skip files or directories that should not be processed
      if (!shouldProcess(entry.name)) continue;

      if (entry.isDirectory()) {
        const childTree = await buildFileTree(entryPath, summaryFiles, depth + 1);
        node.children!.push(childTree);
      }
      else if (entry.name === DIR_SUMMARY_FILENAME) {
        summaryFiles.push({
          depth,
          filepath: entryPath,
          content: await fs.promises.readFile(entryPath, 'utf-8'),
        });
      }
      else {
        node.children!.push({
          type: 'file',
          name: entry.name.replace(/\.md$/, ''),
          path: entryPath,
        });
      }
    }

    return node;
  } catch (error) {
    logger.error(`Error reading directory ${dirPath}:`, error);
    return node;
  }
}

/**
 * Generate string representation of tree structure
 * @param node File tree node
 * @param prefix Prefix string for each line (for indentation)
 * @param isLast Whether this is the last child of its parent
 * @returns String representation of tree structure
 */
function generateTreeString(node: FileNode, prefix: string = '', isLast: boolean = true): string {
  let result = '';

  // Add current node
  const marker = isLast ? '└── ' : '├── ';
  const nodeName = node.name;
  result += `${prefix}${marker}${nodeName}\n`;

  // Prepare new prefix for children
  const childPrefix = prefix + (isLast ? '    ' : '│   ');

  // Recursively process children
  if (node.children && node.children.length > 0) {
    const lastIndex = node.children.length - 1;

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const isChildLast = i === lastIndex;
      result += generateTreeString(child, childPrefix, isChildLast);
    }
  }

  return result;
}

/**
 * Traverse project directory, output tree structure, and find all SUMMARY.md files
 * @param dirpath Target directory path
 * @returns Object containing tree structure string and SUMMARY.md file paths
 */
export async function listProject(dirpath: string, maxCount = 50): Promise<{
  treeString: string;
  summaryFiles: SummaryNode[];
  text: string;
}> {
  logger.info(`Starting to scan project directory: ${dirpath}`);
  const summaryFiles: SummaryNode[] = [];

  try {
    // Build file tree
    const fileTree = await buildFileTree(dirpath, summaryFiles);

    // Generate tree structure string
    const rootDir = path.basename(dirpath);
    const treeString = `${rootDir}\n${generateTreeString(fileTree, '', true).replace(`└── ${rootDir}\n`, '')}`;

    summaryFiles.sort((a, b) => a.depth - b.depth);

    // Print tree structure
    logger.info('Directory tree structure:');
    logger.info(`\n${treeString}`);

    // Print found SUMMARY.md files
    logger.info(`Found ${summaryFiles.length} SUMMARY.md files:`);
    summaryFiles.forEach((file, index) => {
      logger.info(`${index + 1}. ${file.filepath} (depth: ${file.depth})`);
    });

    const text = await getAIAnswer({
      systemPrompt: `You are a professional code repository analyst. I will provide you with the project's original file/directory structure and corresponding directory summary documents.

Based on this information, you need to summarize the project's core business functionality and create an outline for a wiki site for this project. Specific requirements are:
1. Complete structure of the project wiki
2. Provide title, purpose, and keyQuestions for each wiki page. keyQuestions must be based on specific technical or business content appearing in the SUMMARY and be presented in direct question form
3. Focus on the implementation of project core source code, not files related to code building, deployment, testing, linting, etc.
4. Create a separate simple chapter for files related to code building, deployment, testing, linting, etc. that are not related to core business logic implementation
5. DO NOT be influenced by the original project file structure, but analyze project content, integrate logically, and extract core concepts
6. Control keyQuestions to 3-5 per page, avoid general statements or statements unrelated to content

Output format example:
[
  {
    "title": "Express.js Overview",
    "purpose": "This page provides an overview of the Express.js framework, its core concepts, and its high-level architecture.",": "This page provides an overview of its core concepts, high-level architecture, and how the main components (such as the application object, request/response objects, and middleware) collaborate to handle HTTP requests and responses.",
    "keyQuestions": [
      "What is the core philosophy of Express.js?",
      "Core Architecture of Express.js",
    ],
    "children": [
      {
        "title": "Guide",
        "purpose": "This section provides a guide to using the Express.js framework, including installation, configuration, and basic usage.",
        "keyQuestions": [
          "How do I install and configure the Express.js framework?",
        ],
      }
    ]
  },
  {
    "title": "Core Architecture",
    "purpose": "This page explains the core architecture of the Express.js framework, including its request/response objects, middleware, and routing system.",
    "keyQuestions": [
      "What are the main components of the Express.js architecture?",
    ],
    "children": [
      {
        "title": "Request",
        "purpose": "This section explains the Express.js Request object, which represents the incoming HTTP request and provides methods and properties to access and manipulate request data.",
        "keyQuestions": [
          "Which properties and methods does the req object expose to access and manipulate incoming HTTP request data?",
          "What is the Express.js Request Object, and how does it extend Node.js's native http.IncomingMessage?", 
        ],
      },
      {
        "title": "Response",
        "purpose": "This section explains the Express.js Response object, which represents the HTTP response and provides methods and properties to send responses back to the client.",
        "keyQuestions": [
          "Which helper methods and properties does the res object provide for sending content (e.g., HTML, JSON, files), manipulating headers, managing cookies, performing redirects, and rendering views? ",
          "What is the Express.js Response object, and how does it extend Node.js's native http.ServerResponse? ",
        ],
      },
      {
        "title": "Router",
        "purpose": "This section explains the Express.js Router, which is used to define routes and handle HTTP requests.",
        "keyQuestions": [
          "What is the role of the Express Router?",
        ],
      }
    ]
  },
  //...
]
`,
      question: `<project_structure>
${treeString}
</project_structure>

<summary>
${summaryFiles.slice(0, maxCount).map(s => `filepath: ${s.filepath}\n${s.content}`).join('\n\n------------\n\n')}
</summary>`,
    });

    return {
      treeString,
      summaryFiles,
      text,
    };
  } catch (error) {
    logger.error(`Error scanning project directory: ${error}`);
    return {
      treeString: `Cannot scan directory ${dirpath}: ${error}`,
      summaryFiles: [],
      text: '',
    };
  }
}
