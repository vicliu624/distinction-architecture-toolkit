export interface SourceFile {
  path: string;
  content: string;
}

export interface SourceScanner {
  scan(root: string): Promise<SourceFile[]>;
}

export class InMemorySourceScanner implements SourceScanner {
  constructor(private readonly files: SourceFile[]) {}

  async scan(): Promise<SourceFile[]> {
    return this.files;
  }
}
