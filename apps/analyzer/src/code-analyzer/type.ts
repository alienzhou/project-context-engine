export type CodeNodeInfo = {
  fullText: string;
  signature: string;
  filePath: string;
  startLine?: number; // 起始行号（1-indexed）
  endLine?: number;   // 结束行号（1-indexed）
}