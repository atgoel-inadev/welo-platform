import { Injectable } from '@nestjs/common';
import { Task, Export, QualityCheck } from '@app/common';
import { IExportFormatter } from './formatter.interface';

/**
 * Produces COCO JSON structure:
 * { info, licenses, images[], annotations[], categories[] }
 *
 * images:      task.externalId → COCO image record
 * annotations: annotationData.labels/spans → COCO annotation records
 * categories:  from project.configuration.annotationQuestions[].options (not resolved here — left empty)
 */
@Injectable()
export class CocoFormatter implements IExportFormatter {
  readonly mimeType = 'application/json';
  readonly fileExtension = 'json';

  async format(tasks: Task[], exportRecord: Export): Promise<Buffer> {
    const includeQC = exportRecord.configuration?.includeQualityMetrics ?? false;

    const images = tasks.map((t, i) => ({
      id: i + 1,
      file_name: t.fileUrl ?? t.externalId ?? t.id,
      welo_task_id: t.id,
      welo_external_id: t.externalId,
    }));

    const cocoAnnotations: any[] = [];
    let annId = 1;
    tasks.forEach((t, imgIdx) => {
      (t.annotations ?? []).forEach((a) => {
        const entry: any = {
          id: annId++,
          image_id: imgIdx + 1,
          welo_annotation_id: a.id,
          annotation_data: a.annotationData,
          confidence_score: a.confidenceScore,
          version: a.version,
          is_final: a.isFinal,
          submitted_at: a.submittedAt,
        };
        if (includeQC && (a as any).qualityChecks) {
          entry.quality_checks = (a as any).qualityChecks.map((qc: QualityCheck) => ({
            type: qc.type,
            score: qc.score,
            passed: qc.passed,
          }));
        }
        cocoAnnotations.push(entry);
      });
    });

    const coco = {
      info: {
        description: 'Welo Platform Export',
        version: '1.0',
        date_created: new Date().toISOString(),
        batch_id: exportRecord.batchId,
        project_id: exportRecord.projectId,
      },
      licenses: [],
      images,
      annotations: cocoAnnotations,
      categories: [],
    };

    return Buffer.from(JSON.stringify(coco, null, 2), 'utf-8');
  }
}
