import { parseModelJson } from '../llm';
import { callScreeningModel } from './model';
import { buildScreeningContext, contextHash, type ScreeningContext, type ScreeningSubject } from './context';
import { buildScreeningPrompt, SCREENING_PROMPT_VERSION } from './prompt';
import { validateVerdict } from '../../src/shared/screening/validate';
import type { MemorySnapshot, ScreeningVerdict } from '../../src/shared/screening/types';

export { SCREENING_PROMPT_VERSION } from './prompt';

function unsure(subject: ScreeningSubject): ScreeningVerdict {
  return { verdict: 'unsure', matchId: null, ruleId: null, reasonCategory: null, occurrenceCheck: null, confidence: 0, evidenceQuote: '', explanation: '', urgency: subject.deterministicUrgency };
}

export async function screenSubject(subject: ScreeningSubject, memory: MemorySnapshot, o: { purpose: 'urgent' | 'normal' | 'backfill'; deadlineAt: number; platforms: { id: string; name: string }[] }): Promise<{ verdict: ScreeningVerdict; model: string; calibrated: boolean; contextHash: string; downgradeReasons: string[] }> {
  const context = buildScreeningContext(subject, memory, o.platforms);
  const hash = contextHash(context, subject, SCREENING_PROMPT_VERSION);
  const prompt = buildScreeningPrompt(context, subject);
  let note = '';
  let lastReasons: string[] = [];
  let model = 'unavailable';
  let calibrated = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await callScreeningModel({ system: prompt.system, user: prompt.user + note, purpose: o.purpose, deadlineAt: o.deadlineAt, calibrations: memory.calibrations });
    model = response.model;
    calibrated = response.calibrated;
    let raw: unknown;
    try { raw = parseModelJson(response.text); } catch {
      lastReasons = ['model_output_invalid'];
      note = `\n上一次输出无法解析：${lastReasons.join(',')}`;
      continue;
    }
    const checked = validateVerdict(raw, {
      subjectText: `${subject.title}\n${subject.text}`,
      supplied: new Map([...context.records, ...context.crossPlatform, ...context.precedents].map(record => [record.ref, record])),
      crossPlatformRefs: new Set(context.crossPlatform.map(record => record.ref)),
      subjectPlatformIds: subject.platformIds,
      activeRuleIds: new Set(context.rules.map(rule => rule.id)),
      subjectDates: { claimStart: typeof subject.extracted?.claimStart === 'string' ? subject.extracted.claimStart : null, claimEnd: typeof subject.extracted?.claimEnd === 'string' ? subject.extracted.claimEnd : null },
      deterministicUrgency: subject.deterministicUrgency,
    });
    if (!checked.downgradeReasons.length) return { verdict: checked.verdict, model, calibrated, contextHash: hash, downgradeReasons: [] };
    lastReasons = checked.downgradeReasons;
    note = `\n上一次输出未通过校验：${lastReasons.join(',')}`;
  }
  return { verdict: unsure(subject), model, calibrated, contextHash: hash, downgradeReasons: lastReasons.includes('model_output_invalid') && lastReasons.length === 1 ? ['model_output_invalid'] : lastReasons };
}
