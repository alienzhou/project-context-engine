import { SyntaxNode } from 'web-tree-sitter';

interface SymbolTable {
  [key: string]: Set<SyntaxNode>;
}

export function constructSymbolTable(captures: Array<{ node: SyntaxNode; name: string }>): SymbolTable {
  const symbolTable: SymbolTable = {};

  for (const { node, name } of captures) {
    if (name === 'attribute.value') {
      const elementNode = getCorrespondingElement(node);
      if (elementNode === null) {
        continue;
      }

      const attributeValue = node.text;
      if (attributeValue in symbolTable) {
        symbolTable[attributeValue].add(elementNode);
      } else {
        symbolTable[attributeValue] = new Set([elementNode]);
      }
    }
  }

  return symbolTable;
}

export function getCorrespondingElement(node: SyntaxNode): SyntaxNode | null {
  let elementNode: SyntaxNode | null = node;

  while (elementNode !== null) {
    if (elementNode.type === 'element') {
      return elementNode;
    } else if (elementNode.type === 'script_element') {
      return null;
    }
    elementNode = elementNode.parent;
  }

  return null;
}
