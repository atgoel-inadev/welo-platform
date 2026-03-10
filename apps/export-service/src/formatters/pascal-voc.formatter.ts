import { Injectable } from '@nestjs/common';
import { Task, Export } from '@app/common';
import { IExportFormatter } from './formatter.interface';

/**
 * Generates one Pascal VOC XML document per task, bundled as a JSON array of XML strings.
 * In production these would be individual .xml files compressed into a .zip archive.
 */
@Injectable()
export class PascalVocFormatter implements IExportFormatter {
  readonly mimeType = 'application/json';
  readonly fileExtension = 'json';

  async format(tasks: Task[], _exportRecord: Export): Promise<Buffer> {
    const xmlDocs = tasks.map((t) => {
      const annotations = t.annotations ?? [];
      const objects = annotations
        .flatMap((a) => a.annotationData?.labels ?? [])
        .map((label: any) => {
          const bbox = label.bbox ?? {};
          return [
            '<object>',
            `  <name>${this.escapeXml(String(label.label ?? label.name ?? 'unknown'))}</name>`,
            '  <pose>Unspecified</pose>',
            '  <truncated>0</truncated>',
            '  <difficult>0</difficult>',
            '  <bndbox>',
            `    <xmin>${bbox.x ?? 0}</xmin>`,
            `    <ymin>${bbox.y ?? 0}</ymin>`,
            `    <xmax>${(bbox.x ?? 0) + (bbox.width ?? 0)}</xmax>`,
            `    <ymax>${(bbox.y ?? 0) + (bbox.height ?? 0)}</ymax>`,
            '  </bndbox>',
            '</object>',
          ].join('\n');
        });

      return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<annotation>',
        `  <filename>${this.escapeXml(t.fileUrl ?? t.externalId ?? t.id)}</filename>`,
        `  <welo_task_id>${t.id}</welo_task_id>`,
        '  <source><database>Welo Platform</database></source>',
        ...objects,
        '</annotation>',
      ].join('\n');
    });

    return Buffer.from(JSON.stringify(xmlDocs, null, 2), 'utf-8');
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
