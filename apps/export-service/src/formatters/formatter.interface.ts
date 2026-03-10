import { Task, Export } from '@app/common';

export interface IExportFormatter {
  readonly mimeType: string;
  readonly fileExtension: string;
  format(tasks: Task[], exportRecord: Export): Promise<Buffer>;
}

export const FORMATTERS_TOKEN = 'EXPORT_FORMATTERS';
