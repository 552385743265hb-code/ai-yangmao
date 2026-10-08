/** 调度信号只决定处理先后，不是真实性判断，也不自动批准条目。 */
export interface LeadSignal { id: number; origin: string; title: string | null; raw?: string | null; createdAt?: string }
export function leadPriority(l: LeadSignal): number {
  const text = `${l.title ?? ''}\n${(l.raw ?? '').slice(0, 4000)}`;
  if (l.origin === 'manual' || l.origin === 'telegram') return 0;
  const ai = /\b(API|Codex|Claude|Anthropic|OpenAI|Gemini|Kiro|GLM|token|Windsurf|Cursor|Qoder|DeepSeek|MiniMax)\b|智谱|大模型|算力额度/i.test(text) || /\bAI\b/i.test(l.title ?? '');
  if (ai && /重置|reset|限免|限时|截止|到期|赠送|赠金|发放|免费.*额度|free.*credits?/i.test(text)) return l.origin === 'aihot' ? 1 : 2;
  if (l.origin === 'aihot') return 2;
  return 3;
}
export function selectLeads<T extends LeadSignal>(rows: T[], limit: number): T[] {
  const ranked = [...rows].sort((a,b) => leadPriority(a)-leadPriority(b) || b.id-a.id);
  // 留出 20% 给最早的积压，避免新线索持续涌入使旧线索永远饿死。
  const reserve = limit >= 5 ? Math.max(1, Math.floor(limit / 5)) : 0;
  const first = ranked.slice(0, limit-reserve), ids = new Set(first.map(l=>l.id));
  return [...first, ...rows.filter(l=>!ids.has(l.id)).sort((a,b)=>a.id-b.id).slice(0,limit-first.length)];
}
