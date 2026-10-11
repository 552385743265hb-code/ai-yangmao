import { z } from 'zod';

export interface MembershipProduct {
  id: string; name: string; aliases: string[]; status: 'pending' | 'verified' | 'retired';
  sourceUrl: string; verifiedAt: string | null; revision: number;
}
export interface MembershipPlan extends MembershipProduct {
  productId: string; billing: 'free' | 'paid' | 'unknown';
}
export interface MembershipCatalog { revision: number; products: MembershipProduct[]; plans: MembershipPlan[] }
const strings = () => z.array(z.string().trim().min(1).max(200)).max(100);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const parsed = new Date(`${v}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === v;
}, '日期不存在');
const url = z.string().max(2000).refine(v => {
  try { const u = new URL(v); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password; } catch { return false; }
}, '证据必须为无凭据的 HTTP(S) URL');
const limitsSchema = z.object({
  billingCycles: z.array(z.enum(['monthly', 'annual'])).min(1).max(2).optional(),
  seatTypes: strings().min(1).optional(), regions: strings().min(1).optional(),
  startedBefore: date.optional(), startedAfter: date.optional(),
  trial: z.enum(['include', 'exclude', 'only']).optional(), legacy: z.boolean().optional(),
}).strict().refine(v => !v.startedBefore || !v.startedAfter || v.startedAfter < v.startedBefore, '开始日期区间必须非空');
const clauseSchema = z.object({
  productId: z.string().trim().min(1).max(200), scope: z.enum(['plans', 'any_paid', 'any_subscription']),
  planIds: strings(), excludePlanIds: strings(), limits: limitsSchema.optional(),
}).strict().superRefine((v, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (v.scope === 'plans' && !v.planIds.length) issue('指定套餐不能为空');
  if (v.scope !== 'plans' && v.planIds.length) issue('广泛范围不能同时指定套餐');
  if (v.scope === 'plans' && v.planIds.every(id => v.excludePlanIds.includes(id))) issue('不能排除全部指定套餐');
});
const membershipBaseSchema = z.object({
  schemaVersion: z.literal('membership-v1'), status: z.enum(['not_required', 'needs_review', 'confirmed']),
  catalogRevision: z.number().int().nonnegative(), anyOf: z.array(z.object({ allOf: z.array(clauseSchema).min(1).max(20) }).strict()).max(20),
  evidenceUrls: z.array(url).max(50), legacyText: z.array(z.string().max(4000)).max(100).optional(),
}).strict();
export const membershipFactsSchema = membershipBaseSchema.omit({ catalogRevision: true, evidenceUrls: true, legacyText: true }).superRefine((v, ctx) => {
  if (v.status === 'not_required' && v.anyOf.length) ctx.addIssue({ code: 'custom', message: '无需会员不能包含资格项' });
  if (v.status === 'confirmed' && !v.anyOf.length) ctx.addIssue({ code: 'custom', message: '确认资格需要非空条件' });
});
export const membershipSchema = membershipBaseSchema.superRefine((v, ctx) => {
  if (v.status === 'not_required' && v.anyOf.length) ctx.addIssue({ code: 'custom', message: '无需会员不能包含资格项' });
  if (v.status === 'confirmed' && (!v.anyOf.length || !v.evidenceUrls.length)) ctx.addIssue({ code: 'custom', message: '确认资格需要非空条件和证据链接' });
});
export type MembershipRequirement = z.infer<typeof membershipSchema>;
export type MembershipClause = z.infer<typeof clauseSchema>;
export interface OwnedSubscription {
  planId: string; billingCycle?: 'monthly' | 'annual'; seatType?: string; region?: string;
  startedOn?: string; trial?: boolean; legacy?: boolean;
}
export type MembershipMatch = 'yes' | 'no' | 'unknown';

/** Catalog checks are for new writes; retired references remain readable and matchable historically. */
export function validateMembership(requirement: MembershipRequirement, catalog: MembershipCatalog): string[] {
  const parsed = membershipSchema.safeParse(requirement);
  if (!parsed.success) return parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
  const r = parsed.data;
  const errors: string[] = [];
  if (r.status === 'confirmed' && r.catalogRevision !== catalog.revision) errors.push('会员目录版本已变化');
  for (const { allOf } of r.anyOf) for (const clause of allOf) {
    const product = catalog.products.find(p => p.id === clause.productId);
    if (!product) errors.push(`未知会员产品: ${clause.productId}`);
    else if (r.status === 'confirmed' && product.status !== 'verified') errors.push(`会员产品未经核实或已停用: ${product.id}`);
    for (const id of [...clause.planIds, ...clause.excludePlanIds]) {
      const plan = catalog.plans.find(p => p.id === id);
      if (!plan) errors.push(`未知套餐: ${id}`);
      else if (plan.productId !== clause.productId) errors.push(`套餐不属于所选产品: ${id}`);
      else if (r.status === 'confirmed' && plan.status !== 'verified') errors.push(`套餐未经核实或已停用: ${id}`);
    }
    if (clause.scope !== 'plans') {
      const candidates = catalog.plans.filter(p => p.productId === clause.productId && p.status === 'verified' && (clause.scope === 'any_subscription' || p.billing !== 'free'));
      if (candidates.length && candidates.every(p => clause.excludePlanIds.includes(p.id))) errors.push('不能排除全部适用套餐');
    }
  }
  return [...new Set(errors)];
}
const sorted = <T extends string>(values: T[]): T[] => [...new Set(values)].sort();
const canonical = <T>(values: T[]): T[] => [...new Map(values.map(v => [JSON.stringify(v), v])).entries()].sort(([a], [b]) => a.localeCompare(b, 'en')).map(([, v]) => v);
export function normalizeMembership(r: MembershipRequirement): MembershipRequirement {
  return {
    schemaVersion: r.schemaVersion, status: r.status, catalogRevision: r.catalogRevision,
    anyOf: canonical(r.anyOf.map(g => ({ allOf: canonical(g.allOf.map(c => {
      const l = c.limits;
      const limits = l ? {
        ...(l.billingCycles ? { billingCycles: sorted(l.billingCycles) } : {}),
        ...(l.seatTypes ? { seatTypes: sorted(l.seatTypes) } : {}),
        ...(l.regions ? { regions: sorted(l.regions) } : {}),
        ...(l.startedBefore ? { startedBefore: l.startedBefore } : {}),
        ...(l.startedAfter ? { startedAfter: l.startedAfter } : {}),
        ...(l.trial && l.trial !== 'include' ? { trial: l.trial } : {}),
        ...(l.legacy !== undefined ? { legacy: l.legacy } : {}),
      } : undefined;
      return { productId: c.productId, scope: c.scope, planIds: sorted(c.planIds), excludePlanIds: sorted(c.excludePlanIds), ...(limits && Object.keys(limits).length ? { limits } : {}) };
    })) }))), evidenceUrls: sorted(r.evidenceUrls), ...(r.legacyText ? { legacyText: [...r.legacyText] } : {}),
  };
}
export function membershipFacts(r: MembershipRequirement) {
  const { catalogRevision: _revision, evidenceUrls: _evidence, legacyText: _legacy, ...facts } = normalizeMembership(r);
  return facts;
}
/** Match complete name boundaries: Alpha must not match Alphabet. */
function qualifiedPlanName(plan: MembershipPlan, catalog: MembershipCatalog): string {
  const product = catalog.products.find(p => p.id === plan.productId);
  if (!product) return plan.name;
  const escaped = product.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const containsName = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'iu').test(plan.name);
  return containsName ? plan.name : `${product.name} ${plan.name}`;
}
export function formatMembership(r: MembershipRequirement, catalog: MembershipCatalog): string {
  if (r.status === 'not_required') return '无需会员';
  const name = (id: string) => { const plan = catalog.plans.find(p => p.id === id); return plan ? qualifiedPlanName(plan, catalog) : id; };
  const text = r.anyOf.map(g => g.allOf.map(c => {
    const product = catalog.products.find(p => p.id === c.productId)?.name ?? c.productId;
    let text = c.scope === 'plans' ? c.planIds.map(name).join(' / ') : `${product}${c.scope === 'any_paid' ? '任一付费订阅' : '任一订阅'}`;
    if (c.excludePlanIds.length) text += `（排除 ${c.excludePlanIds.map(name).join('、')}）`;
    const l = c.limits; const qualifiers: string[] = [];
    if (l?.billingCycles) qualifiers.push(l.billingCycles.map(v => v === 'monthly' ? '月付' : '年付').join('/'));
    if (l?.seatTypes) qualifiers.push(`席位：${l.seatTypes.join('/')}`);
    if (l?.regions) qualifiers.push(`地区：${l.regions.join('/')}`);
    if (l?.startedBefore) qualifiers.push(`订阅开始早于 ${l.startedBefore}`);
    if (l?.startedAfter) qualifiers.push(`订阅开始晚于 ${l.startedAfter}`);
    if (l?.trial === 'exclude') qualifiers.push('不含试用');
    if (l?.trial === 'only') qualifiers.push('仅试用');
    if (l?.legacy !== undefined) qualifiers.push(l.legacy ? '仅旧版套餐' : '不含旧版套餐');
    return text + (qualifiers.length ? `（${qualifiers.join('；')}）` : '');
  }).join(' 且 ')).map(t => r.anyOf.length > 1 ? `（${t}）` : t).join(' 或 ');
  return r.status === 'needs_review' ? `待核实：${text || r.legacyText?.join('；') || '会员条件'}` : text;
}
const and = (values: MembershipMatch[]): MembershipMatch => values.includes('no') ? 'no' : values.includes('unknown') ? 'unknown' : 'yes';
const or = (values: MembershipMatch[]): MembershipMatch => values.includes('yes') ? 'yes' : values.includes('unknown') ? 'unknown' : 'no';
export function matchMembership(r: MembershipRequirement, owned: OwnedSubscription[], catalog: MembershipCatalog): MembershipMatch {
  const parsed = membershipSchema.safeParse(r);
  if (!parsed.success) return 'unknown';
  r = parsed.data;
  if (r.status === 'not_required') return 'yes';
  if (r.status !== 'confirmed') return 'unknown';
  return or(r.anyOf.map(g => and(g.allOf.map(c => {
    const product = catalog.products.find(p => p.id === c.productId);
    if (!product || product.status === 'pending') return 'unknown';
    if ([...c.planIds, ...c.excludePlanIds].some(id => !catalog.plans.some(p => p.id === id && p.productId === c.productId && p.status !== 'pending'))) return 'unknown';
    return or(owned.map(s => {
      const p = catalog.plans.find(p => p.id === s.planId);
      if (!p) return 'unknown';
      if (p.productId !== c.productId || c.excludePlanIds.includes(p.id) || (c.scope === 'plans' && !c.planIds.includes(p.id))) return 'no';
      if (p.status === 'pending') return 'unknown';
      const checks: MembershipMatch[] = [];
      if (c.scope === 'any_paid') checks.push(p.billing === 'unknown' ? 'unknown' : p.billing === 'paid' ? 'yes' : 'no');
      const l = c.limits;
      const check = (needed: string[] | undefined, actual: string | undefined) => { if (needed) checks.push(actual === undefined ? 'unknown' : needed.includes(actual) ? 'yes' : 'no'); };
      check(l?.billingCycles, s.billingCycle === 'monthly' || s.billingCycle === 'annual' ? s.billingCycle : undefined); check(l?.seatTypes, s.seatType); check(l?.regions, s.region);
      if (l?.startedBefore || l?.startedAfter) {
        if (!s.startedOn || !date.safeParse(s.startedOn).success) checks.push('unknown');
        else checks.push((!l.startedBefore || s.startedOn < l.startedBefore) && (!l.startedAfter || s.startedOn > l.startedAfter) ? 'yes' : 'no');
      }
      if (l?.trial && l.trial !== 'include') checks.push(typeof s.trial !== 'boolean' ? 'unknown' : s.trial === (l.trial === 'only') ? 'yes' : 'no');
      if (l?.legacy !== undefined) checks.push(typeof s.legacy !== 'boolean' ? 'unknown' : s.legacy === l.legacy ? 'yes' : 'no');
      return and(checks);
    }));
  }))));
}
/** Only exact, qualified full names are safe without a product context. */
function exactPlan(value: string, catalog: MembershipCatalog): MembershipPlan | undefined {
  const target = value.trim().replace(/^member:/, '').trim().toLocaleLowerCase('en');
  const candidates = catalog.plans.filter(p => {
    const product = catalog.products.find(x => x.id === p.productId && x.status === 'verified');
    if (p.status !== 'verified' || !product) return false;
    const fullName = qualifiedPlanName(p, catalog);
    return target === fullName.toLocaleLowerCase('en');
  });
  return candidates.length === 1 ? candidates[0] : undefined;
}
export function migrateMemberSelections(values: string[], catalog: MembershipCatalog): { subscriptions: OwnedSubscription[]; unresolved: string[] } {
  const subscriptions: OwnedSubscription[] = []; const unresolved: string[] = [];
  for (const value of values) { const plan = exactPlan(value, catalog); if (plan) { if (!subscriptions.some(s => s.planId === plan.id)) subscriptions.push({ planId: plan.id }); } else unresolved.push(value); }
  return { subscriptions, unresolved };
}
export function migrateLegacyMembership(requirements: string[], catalog: MembershipCatalog): MembershipRequirement {
  const legacyText = requirements.filter(v => v.startsWith('member:')).map(v => v.slice(7).trim());
  if (!legacyText.length) return { schemaVersion: 'membership-v1', status: 'not_required', catalogRevision: catalog.revision, anyOf: [], evidenceUrls: [] };
  const clauses = legacyText.map(v => exactPlan(v, catalog));
  // Recognition proposes choices only: no evidence or human confirmation is invented.
  return { schemaVersion: 'membership-v1', status: 'needs_review', catalogRevision: catalog.revision,
    anyOf: clauses.every(Boolean) ? [{ allOf: clauses.map(p => ({ productId: p!.productId, scope: 'plans', planIds: [p!.id], excludePlanIds: [] })) }] : [], evidenceUrls: [], legacyText };
}
