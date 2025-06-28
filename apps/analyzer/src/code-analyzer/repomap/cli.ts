import { generateRepoMap } from './index';
import * as path from 'node:path';
import * as fs from 'node:fs';
import Logger from '../../utils/log';

const logger = Logger('repo-map-cli');

export async function generateRepoMapCli(options: {
  input: string;
  output?: string;
  maxTokens?: number;
  format?: 'text' | 'json';
  language?: string;
}) {
  const { input, output, maxTokens = 1024, format = 'text', language } = options;

  try {
    logger.info(`Starting to generate repo map...`);
    logger.info(`Input directory: ${input}`);
    logger.info(`Max tokens: ${maxTokens}`);
    if (language) {
      logger.info(`Specified language: ${language}`);
    }

    const result = await generateRepoMap(input, { maxTokens, language });

    if (format === 'json') {
      const jsonOutput = JSON.stringify(result, null, 2);
      if (output) {
        await fs.promises.writeFile(output, jsonOutput, 'utf-8');
        logger.info(`JSON format saved to: ${output}`);
      } else {
        console.log(jsonOutput);
      }
    } else {
      if (output) {
        await fs.promises.writeFile(output, result.map, 'utf-8');
        logger.info(`Repo map saved to: ${output}`);
      } else {
        console.log('\n=== Repository Map ===\n');
        console.log(result.map);
      }
    }

    logger.info(`\nStatistics:`);
    logger.info(`- Number of files: ${result.files.length}`);
    logger.info(`- Total symbols: ${result.totalSymbols}`);
    logger.info(`- Estimated tokens: ${result.estimatedTokens}`);

  } catch (error) {
    logger.error('Failed to generate repo map:', error);
    throw error;
  }
}

// Get list of supported languages
function getSupportedLanguages(): string[] {
  return [
    'javascript', 'typescript', 'python', 'java', 'kotlin', 'cpp', 'c',
    'go', 'rust', 'swift', 'scala', 'csharp', 'ruby', 'php', 'lua',
    'bash', 'html', 'css', 'vue', 'json', 'yaml', 'xml'
  ];
}

// Parse command line arguments
function parseArgs(args: string[]): {
  input?: string;
  output?: string;
  maxTokens?: number;
  format?: 'text' | 'json';
  language?: string;
  help?: boolean;
} {
  const result: any = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--language' || arg === '-l') {
      result.language = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      result.output = args[++i];
    } else if (arg === '--max-tokens' || arg === '-t') {
      result.maxTokens = parseInt(args[++i]);
    } else if (arg === '--format' || arg === '-f') {
      result.format = args[++i];
    } else if (!result.input && !arg.startsWith('-')) {
      result.input = arg;
    }
  }

  return result;
}

// Display help information
function showHelp() {
  console.log(`
Usage: node cli.js <input-dir> [options]

Options:
  -l, --language <lang>     Specify language to analyze (optional)
  -o, --output <file>       Output file path (optional)
  -t, --max-tokens <num>    Maximum number of tokens (default: 1024)
  -f, --format <format>     Output format: text | json (default: text)
  -h, --help               Show help information

Supported languages:
  ${getSupportedLanguages().join(', ')}

Examples:
  node cli.js ./src                           # Analyze all supported languages
  node cli.js ./src --language python         # Only analyze Python files
  node cli.js ./src -l typescript -o map.md   # Only analyze TypeScript and save to file
`);
}

// If running this script directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (!options.input) {
    console.error('Error: Please specify input directory');
    showHelp();
    process.exit(1);
  }

  // Validate language parameter
  if (options.language) {
    const supportedLanguages = getSupportedLanguages();
    if (!supportedLanguages.includes(options.language)) {
      console.error(`Error: Unsupported language "${options.language}"`);
      console.error(`Supported languages: ${supportedLanguages.join(', ')}`);
      process.exit(1);
    }
  }

  // Validate format parameter
  if (options.format && !['text', 'json'].includes(options.format)) {
    console.error('Error: Format must be text or json');
    process.exit(1);
  }

  const input = path.resolve(options.input);
  const output = options.output ? path.resolve(options.output) : undefined;
  const maxTokens = options.maxTokens || 1024;
  const format = (options.format as 'text' | 'json') || 'text';
  const language = options.language;

  generateRepoMapCli({ input, output, maxTokens, format, language })
    .then(() => {
      console.log('✅ Done');
    })
    .catch(error => {
      console.error('❌ Failed:', error.message);
      process.exit(1);
    });
}
