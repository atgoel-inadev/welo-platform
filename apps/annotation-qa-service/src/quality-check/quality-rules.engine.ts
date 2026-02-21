import { Injectable, Logger } from '@nestjs/common';
import { QualityRule, QualityRuleType, IssueSeverity } from '@app/common';

export interface RuleEvaluationResult {
  ruleName: string;
  ruleType: QualityRuleType;
  passed: boolean;
  score: number;
  weight: number;
  issues: Array<{ category: string; severity: IssueSeverity; description: string; location?: Record<string, any> }>;
}

@Injectable()
export class QualityRulesEngine {
  private readonly logger = new Logger(QualityRulesEngine.name);

  evaluate(
    annotationData: any,
    confidenceScore: number,
    rules: QualityRule[],
    goldSimilarity?: number,
  ): { overallScore: number; passed: boolean; results: RuleEvaluationResult[] } {
    const results: RuleEvaluationResult[] = [];

    for (const rule of rules.filter((r) => r.isActive)) {
      const result = this.evaluateRule(rule, annotationData, confidenceScore, goldSimilarity);
      results.push(result);
    }

    // Weighted average score across all active rules
    const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
    const weightedScore =
      totalWeight > 0
        ? results.reduce((sum, r) => sum + r.score * r.weight, 0) / totalWeight
        : 100;

    // Failed if any ERROR-severity rule failed
    const passed = !results.some(
      (r) =>
        !r.passed &&
        rules.find((rule) => rule.ruleName === r.ruleName)?.severity === 'ERROR',
    );

    return {
      overallScore: Math.round(weightedScore * 100) / 100,
      passed,
      results,
    };
  }

  private evaluateRule(
    rule: QualityRule,
    annotationData: any,
    confidenceScore: number,
    goldSimilarity?: number,
  ): RuleEvaluationResult {
    const issues: RuleEvaluationResult['issues'] = [];
    let passed = true;

    switch (rule.ruleType) {
      case QualityRuleType.COMPLETENESS:
        passed = this.checkCompleteness(rule.configuration, annotationData, issues);
        break;
      case QualityRuleType.FORMAT:
        passed = this.checkFormat(rule.configuration, annotationData, issues);
        break;
      case QualityRuleType.CONFIDENCE_THRESHOLD:
        passed = this.checkConfidence(rule.configuration, confidenceScore, issues);
        break;
      case QualityRuleType.GOLD_MATCH:
        passed = this.checkGoldMatch(rule.configuration, goldSimilarity, issues);
        break;
      default:
        this.logger.warn(`Unknown rule type: ${rule.ruleType}`);
    }

    return {
      ruleName: rule.ruleName,
      ruleType: rule.ruleType,
      passed,
      score: passed ? 100 : 0,
      weight: Number(rule.weight),
      issues,
    };
  }

  private checkCompleteness(config: any, data: any, issues: any[]): boolean {
    let passed = true;

    if (config.requiredFields) {
      for (const field of config.requiredFields) {
        const value = data?.[field];
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
          issues.push({
            category: 'MISSING_REQUIRED_FIELD',
            severity: IssueSeverity.HIGH,
            description: `Required field '${field}' is missing or empty`,
          });
          passed = false;
        }
      }
    }

    if (config.minLabelCount !== undefined) {
      const labelCount = (data?.labels || []).length;
      if (labelCount < config.minLabelCount) {
        issues.push({
          category: 'INSUFFICIENT_LABELS',
          severity: IssueSeverity.MEDIUM,
          description: `Minimum ${config.minLabelCount} labels required, found ${labelCount}`,
        });
        passed = false;
      }
    }

    return passed;
  }

  private checkFormat(config: any, data: any, issues: any[]): boolean {
    let passed = true;

    if (config.allowedLabels) {
      const allowedSet = new Set(config.allowedLabels);
      const labels = data?.labels || [];
      for (const label of labels) {
        if (label.label && !allowedSet.has(label.label)) {
          issues.push({
            category: 'INVALID_LABEL',
            severity: IssueSeverity.HIGH,
            description: `Label '${label.label}' is not in the allowed set`,
            location: { label: label.label },
          });
          passed = false;
        }
      }
    }

    if (config.maxSpanOverlap === false) {
      const spans = data?.labels || data?.spans || [];
      const overlapping = this.findOverlappingSpans(spans);
      if (overlapping.length > 0) {
        issues.push({
          category: 'OVERLAPPING_SPANS',
          severity: IssueSeverity.MEDIUM,
          description: `Found ${overlapping.length} overlapping span pair(s)`,
          location: { overlappingPairs: overlapping },
        });
        passed = false;
      }
    }

    return passed;
  }

  private checkConfidence(config: any, confidenceScore: number, issues: any[]): boolean {
    const minConfidence = config.minConfidence ?? 0.5;
    if (confidenceScore !== undefined && confidenceScore < minConfidence) {
      issues.push({
        category: 'LOW_CONFIDENCE',
        severity: IssueSeverity.MEDIUM,
        description: `Confidence score ${confidenceScore} is below threshold ${minConfidence}`,
      });
      return false;
    }
    return true;
  }

  private checkGoldMatch(config: any, goldSimilarity: number, issues: any[]): boolean {
    if (goldSimilarity === undefined) return true; // No gold to compare against
    const minSimilarity = config.minGoldSimilarity ?? 0.7;
    if (goldSimilarity < minSimilarity) {
      issues.push({
        category: 'GOLD_MISMATCH',
        severity: IssueSeverity.HIGH,
        description: `Gold similarity ${goldSimilarity.toFixed(2)} below threshold ${minSimilarity}`,
      });
      return false;
    }
    return true;
  }

  private findOverlappingSpans(spans: any[]): Array<[number, number]> {
    const pairs: Array<[number, number]> = [];
    for (let i = 0; i < spans.length; i++) {
      for (let j = i + 1; j < spans.length; j++) {
        const a = spans[i];
        const b = spans[j];
        if (a.start !== undefined && a.end !== undefined && b.start !== undefined && b.end !== undefined) {
          if (a.start < b.end && b.start < a.end) {
            pairs.push([i, j]);
          }
        }
      }
    }
    return pairs;
  }
}
