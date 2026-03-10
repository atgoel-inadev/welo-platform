import { Injectable } from '@nestjs/common';
import { Task, Export } from '@app/common';
import { IExportFormatter } from './formatter.interface';

@Injectable()
export class JsonlFormatter implements IExportFormatter {
  readonly mimeType = 'application/x-ndjson';
  readonly fileExtension = 'jsonl';

  async format(tasks: Task[], exportRecord: Export): Promise<Buffer> {
    const includeMeta = exportRecord.configuration?.includeMetadata ?? true;
    const lines = tasks.map((t) => JSON.stringify(this.toRow(t, includeMeta)));
    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  private toRow(task: Task, includeMeta: boolean): Record<string, any> {
    const row: Record<string, any> = {
      id: task.id,
      externalId: task.externalId,
      status: task.status,
      fileUrl: task.fileUrl,
      taskType: task.taskType,
      annotations: (task.annotations ?? []).map((a) => ({
        id: a.id,
        userId: a.userId,
        annotationData: a.annotationData,
        confidenceScore: a.confidenceScore,
        version: a.version,
        isFinal: a.isFinal,
        submittedAt: a.submittedAt,
      })),
    };
    if (includeMeta) {
      row.createdAt = task.createdAt;
      row.updatedAt = task.updatedAt;
    }
    return row;
  }
}
