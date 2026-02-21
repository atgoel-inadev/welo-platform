import { Injectable } from '@nestjs/common';

export interface GoldComparisonResult {
  overallScore: number;
  labelF1: number;
  boundaryIou: number;
  attributeMatchScore: number;
  details: {
    truePositives: number;
    falsePositives: number;
    falseNegatives: number;
    matchedLabels: string[];
    missedLabels: string[];
    extraLabels: string[];
  };
}

@Injectable()
export class GoldComparisonEngine {
  compare(
    submittedAnnotation: any,
    goldAnnotation: any,
    tolerance: any = {},
  ): GoldComparisonResult {
    const weights = {
      labelF1: tolerance?.scoreWeights?.labelF1 ?? 0.5,
      boundaryIou: tolerance?.scoreWeights?.boundaryIou ?? 0.3,
      attributeMatch: tolerance?.scoreWeights?.attributeMatch ?? 0.2,
    };

    const labelF1Result = this.computeLabelF1(submittedAnnotation, goldAnnotation);
    const boundaryIou = this.computeBoundaryIou(
      submittedAnnotation,
      goldAnnotation,
      tolerance?.boundaryIouThreshold ?? 0.5,
    );
    const attributeMatchScore = this.computeAttributeMatch(
      submittedAnnotation,
      goldAnnotation,
      tolerance?.attributeMatch ?? 'partial',
    );

    const overallScore =
      labelF1Result.f1 * weights.labelF1 +
      boundaryIou * weights.boundaryIou +
      attributeMatchScore * weights.attributeMatch;

    return {
      overallScore: Math.round(overallScore * 100) / 100,
      labelF1: Math.round(labelF1Result.f1 * 100) / 100,
      boundaryIou: Math.round(boundaryIou * 100) / 100,
      attributeMatchScore: Math.round(attributeMatchScore * 100) / 100,
      details: {
        truePositives: labelF1Result.tp,
        falsePositives: labelF1Result.fp,
        falseNegatives: labelF1Result.fn,
        matchedLabels: labelF1Result.matched,
        missedLabels: labelF1Result.missed,
        extraLabels: labelF1Result.extra,
      },
    };
  }

  private computeLabelF1(submitted: any, gold: any) {
    const submittedLabels: string[] = (submitted?.labels || []).map(
      (l: any) => l.label || l.type || '',
    );
    const goldLabels: string[] = (gold?.labels || []).map(
      (l: any) => l.label || l.type || '',
    );

    const submittedSet = new Set(submittedLabels);
    const goldSet = new Set(goldLabels);

    const matched = submittedLabels.filter((l) => goldSet.has(l));
    const extra = submittedLabels.filter((l) => !goldSet.has(l));
    const missed = goldLabels.filter((l) => !submittedSet.has(l));

    const tp = matched.length;
    const fp = extra.length;
    const fn = missed.length;

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return { f1, precision, recall, tp, fp, fn, matched, extra, missed };
  }

  private computeBoundaryIou(submitted: any, gold: any, threshold: number): number {
    const submittedSpans = submitted?.labels || submitted?.spans || [];
    const goldSpans = gold?.labels || gold?.spans || [];

    if (goldSpans.length === 0) return 1.0; // No spans to compare → perfect score

    let totalIou = 0;
    let comparisons = 0;

    for (const goldSpan of goldSpans) {
      if (goldSpan.start === undefined || goldSpan.end === undefined) continue;
      let bestIou = 0;
      for (const subSpan of submittedSpans) {
        if (subSpan.start === undefined || subSpan.end === undefined) continue;
        const iou = this.spanIou(
          goldSpan.start,
          goldSpan.end,
          subSpan.start,
          subSpan.end,
        );
        if (iou > bestIou) bestIou = iou;
      }
      totalIou += bestIou;
      comparisons++;
    }

    return comparisons > 0 ? totalIou / comparisons : 1.0;
  }

  private spanIou(s1: number, e1: number, s2: number, e2: number): number {
    const overlapStart = Math.max(s1, s2);
    const overlapEnd = Math.min(e1, e2);
    const overlap = Math.max(0, overlapEnd - overlapStart);
    const union = e1 - s1 + (e2 - s2) - overlap;
    return union > 0 ? overlap / union : 0;
  }

  private computeAttributeMatch(
    submitted: any,
    gold: any,
    mode: 'exact' | 'partial' | 'none',
  ): number {
    if (mode === 'none') return 1.0;

    const goldAttrs = gold?.attributes || {};
    const subAttrs = submitted?.attributes || {};
    const goldKeys = Object.keys(goldAttrs);

    if (goldKeys.length === 0) return 1.0;

    let matches = 0;
    for (const key of goldKeys) {
      if (mode === 'exact') {
        if (subAttrs[key] === goldAttrs[key]) matches++;
      } else {
        // partial: key presence counts
        if (subAttrs[key] !== undefined) matches++;
      }
    }

    return matches / goldKeys.length;
  }
}
