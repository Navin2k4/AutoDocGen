export interface ParsedFunction {
  name: string;
  params: { name: string; type?: string }[];
  returnType?: string;
  startIndex: number;
  endIndex: number;
  body: string;
  language: string;
}

export interface LocalModel {
  name: string; 
  value: string;
  path: string; 
  downloaded: boolean;
}
