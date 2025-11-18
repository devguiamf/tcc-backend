export enum FileModule {
  SERVICE = 'service',
  STORE = 'store',
}

export interface FileOutput {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  module: FileModule;
  entityId: string;
  filePath: string;
  url: string;
  base64?: string;
  createdAt: Date;
}

export interface UploadFileInput {
  module: FileModule;
  entityId: string;
}

