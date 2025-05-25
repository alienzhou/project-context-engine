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
 * 过滤不需要处理的文件或目录
 * @param name 文件或目录名称
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
 * 递归扫描目录，构建文件树结构
 * @param dirPath 要扫描的目录路径
 * @returns 文件树结构
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
    
    // 排序：先目录，后文件，按字母顺序
    const sortedEntries = entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });
    
    for (const entry of sortedEntries) {
      const entryPath = path.join(dirPath, entry.name);
      
      // 忽略不需要处理的文件或目录
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
    logger.error(`读取目录 ${dirPath} 时出错:`, error);
    return node;
  }
}

/**
 * 生成树形结构的字符串表示
 * @param node 文件树节点
 * @param prefix 每行的前缀字符串（用于缩进）
 * @param isLast 是否是父节点的最后一个子节点
 * @returns 树形结构的字符串表示
 */
function generateTreeString(node: FileNode, prefix: string = '', isLast: boolean = true): string {
  let result = '';
  
  // 添加当前节点
  const marker = isLast ? '└── ' : '├── ';
  const nodeName = node.name;
  result += `${prefix}${marker}${nodeName}\n`;
  
  // 为子节点准备新的前缀
  const childPrefix = prefix + (isLast ? '    ' : '│   ');
  
  // 递归处理子节点
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
 * 遍历项目目录，以树形结构输出，并找出所有SUMMARY.md文件
 * @param dirpath 目标目录路径
 * @returns 包含树形结构字符串和SUMMARY.md文件路径的对象
 */
export async function listProject(dirpath: string, maxCount = 50): Promise<{
  treeString: string;
  summaryFiles: SummaryNode[];
  text: string;
}> {
  logger.info(`开始扫描项目目录: ${dirpath}`);
  const summaryFiles: SummaryNode[] = [];
  
  try {
    // 构建文件树
    const fileTree = await buildFileTree(dirpath, summaryFiles);
    
    // 生成树形结构字符串
    const rootDir = path.basename(dirpath);
    const treeString = `${rootDir}\n${generateTreeString(fileTree, '', true).replace(`└── ${rootDir}\n`, '')}`;

    summaryFiles.sort((a, b) => a.depth - b.depth);
    
    // 打印树形结构
    logger.info('目录树形结构:');
    logger.info(`\n${treeString}`);
    
    // 打印找到的SUMMARY.md文件
    logger.info(`找到 ${summaryFiles.length} 个 SUMMARY.md 文件:`);
    summaryFiles.forEach((file, index) => {
      logger.info(`${index + 1}. ${file.filepath} (${file.depth}层)`);
    });

    const text = await getAIAnswer({
      systemPrompt: `你是一个专业的代码仓库的分析师，我会给你提供项目的原始文件/目录结构，以及对应目录的总结文档。

你需要根据这些信息，总结该项目的核心业务功能，并给出针对该项目创建一个wiki站点，给出wiki的大纲和目录。具体要求如下：
1. 项目wiki的完整结构
2. 给出每个wiki项目的title（标题）、purpose（这个页面的主要用途）、keyQuestions（这个页面要回答的关键问题/技术点/业务功能）
3. 关注项目**核心源码**相关的实现，而不是一些代码构建、部署、测试、lint等无关的文件
4. 为代码构建、部署、测试、lint等和核心业务逻辑实现无关的文件，生成一个单独的简单章节
5. **一定**不要受到原来项目文件结构的影响，而是通过分析项目内容，进行逻辑整合，抽取核心概念

输出格式的示例如下：
[
  {
    "title": "Express.js Overview",
    "purpose": "This page provides an overview of the Express.js framework, its core concepts, and its high-level architecture.",": "This page provides an overview of its core concepts, high-level architecture, and how the main components (such as the application object, request/response objects, and middleware) collaborate to handle HTTP requests and responses.",
    "keyQuestions": [
      "What is the core philosophy of Express.js?",
      "Core Architecture of Express.js",
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
        "keyQuestions": [
          "Which properties and methods does the req object expose to access and manipulate incoming HTTP request data?",
          "What is the Express.js Request Object, and how does it extend Node.js’s native http.IncomingMessage?", 
        ],
      },
      {
        "title": "Response",
        "keyQuestions": [
          "Which helper methods and properties does the res object provide for sending content (e.g., HTML, JSON, files), manipulating headers, managing cookies, performing redirects, and rendering views? ",
          "What is the Express.js Response object, and how does it extend Node.js’s native http.ServerResponse? ",
        ],
      },
      {
        "title": "Router",
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
${summaryFiles.map(s => `filepath: ${s.filepath}\n${s.content}`).join('\n\n------------\n\n')}
</summary>`,
    });
    
    return {
      treeString,
      summaryFiles,
      text,
    };
  } catch (error) {
    logger.error(`扫描项目目录时出错: ${error}`);
    return {
      treeString: `无法扫描目录 ${dirpath}: ${error}`,
      summaryFiles: [],
      text: '',
    };
  }
}
