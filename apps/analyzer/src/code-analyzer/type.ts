export type CodeNodeInfo = {
  fullText: string;
  signature: string;
  filePath: string;
  startLine?: number; // Start line number (1-indexed)
  endLine?: number;   // End line number (1-indexed)
}