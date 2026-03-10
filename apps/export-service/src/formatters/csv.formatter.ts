import { Injectable } from '@nestjs/common';
import { Task, Export } from '@app/common';
import { IExportFormatter } from './formatter.interface';

@Injectable()
export class CsvFormatter implements IExportFormatter {
  readonly mimeType = 'text/csv';
  readonly fileExtension = 'csv';

  async format(tasks: Task[], exportRecord: Export): Promise<Buffer> {
    const includeMeta = exportRecord.configuration?.includeMetadata ?? true;

    const metaCols = includeMeta ? ',taskType,createdAt,updatedAt' : '';
    const header = `id,externalId,status,fileUrl,annotationCount${metaCols},annotationData\n`;

    const rows = tasks.map((t) => {
      const annotations = t.annotations ?? [];
      const annotationData = JSON.stringify(annotations.map((a) => a.annotationData)).replace(/"/g, '""');
      const meta = includeMeta
        ? `,"${t.taskType ?? ''}","${t.createdAt?.toISOString() ?? ''}","${t.updatedAt?.toISOString() ?? ''}"`
        : '';
      return `"${t.id}","${t.externalId ?? ''}","${t.status}","${t.fileUrl ?? ''}",${annotations.length}${meta},"${annotationData}"`;
    });

    return Buffer.from(header + rows.join('\n'), 'utf-8');
  }
}
