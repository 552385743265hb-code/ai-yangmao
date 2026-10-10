import { z } from 'zod';
import { officialTier } from '../../shared/official-review';
import { candidateBatchInputSchema, observationInputSchema, observationReceiptSchema, intakeReceiptSchema, type CandidateBatchInput, type IntakeReceipt, type ObservationInput, type ObservationReceipt } from '../../shared/identity/types';
import { hashTerms, normalizeDocumentUrl, normalizeTerms, sha256, stableJson } from '../../shared/identity/normalize';

export class IdentityError extends Error {
  constructor(public status: 400 | 403 | 404 | 409 | 503, message: string) { super(message); }
}
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const value = schema.safeParse(input);
  if (!value.success) throw new IdentityError(400, 'invalid identity input');
  return value.data;
}
type CommandRow = { payload_hash: string; state: string; result_json: string | null };
type ObservationRow = { id: string; text: string; text_truncated: number; fetch_kind: string; trust_json: string };

export class IdentityStore {
  constructor(readonly db: D1Database) {}

  private async prior(requestId: string, hash: string): Promise<CommandRow | null> {
    const row = await this.db.prepare('SELECT payload_hash,state,result_json FROM identity_commands WHERE request_id=?').bind(requestId).first<CommandRow>();
    if (row && (row.payload_hash !== hash || row.state !== 'applied')) throw new IdentityError(409, 'requestId payload or state conflict');
    return row;
  }
  // Shadow intake has no business revision dependency. Every statement is tied to
  // the staged command, including the final invariant; D1 rolls back on CHECK failure.
  private async storageCommand<T>(requestId: string, hash: string, receipt: T, writes: (guard: string, guardArgs: string[]) => D1PreparedStatement[], invariant = '1', invariantArgs: (string|number|null)[] = []): Promise<T> {
    const prior = await this.prior(requestId,hash);
    if (prior) return JSON.parse(prior.result_json!) as T;
    const guard = "EXISTS(SELECT 1 FROM identity_commands WHERE request_id=? AND payload_hash=? AND state='staged')";
    await this.db.batch([
      this.db.prepare("INSERT OR IGNORE INTO identity_commands(request_id,payload_hash,state,expected_json) VALUES(?,?,'staged','[]')").bind(requestId,hash),
      ...writes(guard,[requestId,hash]),
      this.db.prepare(`UPDATE identity_commands SET state=CASE WHEN (${invariant}) THEN 'applied' ELSE 'invalid' END,result_json=? WHERE request_id=? AND payload_hash=? AND state='staged'`).bind(...invariantArgs,JSON.stringify(receipt),requestId,hash),
    ]);
    const applied = await this.prior(requestId,hash);
    if (!applied) throw new IdentityError(409,'intake command was not applied');
    return JSON.parse(applied.result_json!) as T;
  }

  async recordObservation(raw: ObservationInput): Promise<ObservationReceipt> {
    const input = parse(observationInputSchema,raw);
    const hash = await sha256(stableJson(input));
    const commandId = `observation:${input.requestId}`;
    const prior = await this.prior(commandId,hash);
    if (prior) return observationReceiptSchema.parse(JSON.parse(prior.result_json!));
    const urlKey = normalizeDocumentUrl(input.originalUrl);
    const documentId = `doc_${await sha256(urlKey)}`;
    const contentHash = await sha256(input.text);
    const observationId = `obs_${await sha256(stableJson([documentId,contentHash,input.fetchKind]))}`;
    const truncated = input.truncated || input.text.length > 250000;
    let sourceVerified = false, productId: string | null = null;
    if (input.sourceId && input.fetchKind === 'direct' && new URL(input.originalUrl).hostname === new URL(input.finalUrl).hostname) {
      const source = await this.db.prepare('SELECT s.url,s.tier,p.id,p.name,p.site,p.x_handles,p.staff_handles FROM sources s JOIN platforms p ON p.id=s.platform_id WHERE s.id=?').bind(input.sourceId).first<{url:string;tier:string;id:string;name:string;site:string|null;x_handles:string;staff_handles:string}>();
      if (source) {
        const platform = {id:source.id,name:source.name,site:source.site,xHandles:JSON.parse(source.x_handles),staffHandles:JSON.parse(source.staff_handles)};
        sourceVerified = !!officialTier(input.originalUrl,platform,[source]) && !!officialTier(input.finalUrl,platform,[source]);
        if (sourceVerified) productId=source.id;
      }
    }
    const trust = JSON.stringify({sourceVerified,productId,sourceId:input.sourceId??null});
    const receipt = {observationId,documentId,contentHash,truncated};
    return this.storageCommand(commandId,hash,receipt,(guard,args)=>[
      this.db.prepare(`INSERT INTO source_documents(id,original_url,url_key,first_seen_at,last_seen_at) SELECT ?,?,?,?,? WHERE ${guard} ON CONFLICT(url_key) DO UPDATE SET last_seen_at=max(last_seen_at,excluded.last_seen_at)`).bind(documentId,input.originalUrl,urlKey,input.observedAt,input.observedAt,...args),
      this.db.prepare(`INSERT INTO source_observations(id,document_id,content_hash,text,text_truncated,fetch_kind,final_url,observed_at,last_seen_at,trust_json) SELECT ?,?,?,?,?,?,?,?,?,? WHERE ${guard} ON CONFLICT(document_id,content_hash,fetch_kind) DO UPDATE SET last_seen_at=max(last_seen_at,excluded.last_seen_at)`).bind(observationId,documentId,contentHash,input.text.slice(0,250000),Number(truncated),input.fetchKind,input.finalUrl,input.observedAt,input.observedAt,trust,...args),
    ],'EXISTS(SELECT 1 FROM source_observations WHERE id=?)',[observationId]);
  }

  async recordCandidates(raw: CandidateBatchInput): Promise<IntakeReceipt[]> {
    const input = parse(candidateBatchInputSchema,raw);
    const payloadHash = await sha256(stableJson(input));
    const request = `batch:${input.requestId}`;
    const observation = await this.db.prepare('SELECT id,text,text_truncated,fetch_kind,trust_json FROM source_observations WHERE id=?').bind(input.observationId).first<ObservationRow>();
    if (!observation) throw new IdentityError(404,'observation not found');
    for (const leadId of input.leadIds) if (!await this.db.prepare('SELECT id FROM leads WHERE id=?').bind(leadId).first()) throw new IdentityError(400,'lead not found');
    const readable = observation.fetch_kind !== 'unavailable' && !!observation.text && !observation.text_truncated;
    const nonBenefit = input.nonBenefitEvidence;
    const complete = input.extractionComplete && readable && (input.candidates.length > 0 || !!(nonBenefit && observation.text.slice(nonBenefit.start,nonBenefit.end) === nonBenefit.quote));
    // An extraction marker records incomplete/empty work without rejecting a lead.
    await this.storageCommand(request,payloadHash,{extractionComplete:complete,reasonCodes:complete?[]:['extraction_incomplete']},()=>[]);
    const receipts: IntakeReceipt[]=[];
    for (const candidate of input.candidates) {
      const facts = normalizeTerms(candidate.facts);
      const mechanism = facts.mechanism;
      const spanKey = `${candidate.span.start}:${candidate.span.end}`;
      const key = await sha256(stableJson([input.observationId,input.extractionVersion,spanKey,mechanism.state==='known'?mechanism.value:null]));
      const candidateId = `candidate_${key}`;
      const base: IntakeReceipt = {inputId:candidate.inputId,candidateId,canonicalOfferId:null,entityId:null,versionId:null,decisionId:null,taskId:null,outcome:'deferred',retryable:true,reasonCodes:['shadow_pending_resolution']};
      try {
        const previous = await this.db.prepare('SELECT receipt_json FROM intake_candidates WHERE candidate_key=?').bind(key).first<{receipt_json:string|null}>();
        const quoteMap = new Map(candidate.quotes.map(q=>[q.id,q]));
        let grounded = quoteMap.size === candidate.quotes.length && observation.text.slice(candidate.span.start,candidate.span.end) === candidate.span.quote;
        const checkRefs = (value: unknown): void => {
          if (Array.isArray(value)) { value.forEach(checkRefs); return; }
          if (!value || typeof value !== 'object') return;
          for (const [key,val] of Object.entries(value)) {
            if (key === 'evidenceRefs') for (const ref of val as string[]) {
              const q=quoteMap.get(ref);
              if (!q || observation.text.slice(q.start,q.end) !== q.quote) grounded=false;
            }
            else checkRefs(val);
          }
        };
        checkRefs(facts);
        const receipt = previous?.receipt_json ? {...intakeReceiptSchema.parse(JSON.parse(previous.receipt_json)),inputId:candidate.inputId} : {...base,reasonCodes:!grounded?['invalid_evidence_reference']:!readable?['source_incomplete']:base.reasonCodes};
        const command = `candidate:${await sha256(stableJson([input.requestId,candidate.inputId]))}`;
        const factsHash = await hashTerms(facts);
        const result = await this.storageCommand(command,payloadHash,receipt,(guard,args)=>[
          this.db.prepare(`INSERT INTO intake_candidates(id,observation_id,extraction_version,span_key,candidate_key,raw_candidate_json,facts_json,facts_hash,state,last_error,receipt_json) SELECT ?,?,?,?,?,?,?,?,'deferred',?,? WHERE ${guard} ON CONFLICT(candidate_key) DO NOTHING`).bind(candidateId,input.observationId,input.extractionVersion,spanKey,key,JSON.stringify({candidate:candidate.rawCandidate,quotes:candidate.quotes,span:candidate.span}),JSON.stringify(facts),factsHash,receipt.reasonCodes.join(','),JSON.stringify(receipt),...args),
          ...input.leadIds.map(leadId=>this.db.prepare(`INSERT INTO lead_candidate_links(lead_id,candidate_id) SELECT ?,? WHERE ${guard} ON CONFLICT DO NOTHING`).bind(leadId,candidateId,...args)),
        ],'EXISTS(SELECT 1 FROM intake_candidates WHERE id=?)',[candidateId]);
        receipts.push(result);
      } catch (error) {
        if (error instanceof IdentityError && error.status < 500) throw error;
        receipts.push({...base,reasonCodes:['storage_unavailable']});
      }
    }
    return receipts;
  }
}
