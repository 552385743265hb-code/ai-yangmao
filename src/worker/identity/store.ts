import {verifyFetchProvenance} from './fetch-provenance';
import { commitIdentityMutation, commandGuard } from './commit';
import { z } from 'zod';
import { officialTier } from '../../shared/official-review';
import { candidateBatchInputSchema, observationInputSchema, observationReceiptSchema, intakeReceiptSchema, type CandidateBatchInput, type IntakeReceipt, type ObservationInput, type ObservationReceipt, type CanonicalTermsV1, type RetrievalPage, type VersionedEntity, reviewDecisionSchema, canonicalTermsSchema } from '../../shared/identity/types';
import { claimIdentityKey, identitySearchTokens, hashTerms, normalizeDocumentUrl, normalizeTerms, sha256, stableJson } from '../../shared/identity/normalize';

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

export function readReviewDecision(row:Record<string,unknown>) { return reviewDecisionSchema.parse({id:row.id,entityId:row.entity_id,candidateId:row.candidate_id,versionId:row.version_id,action:row.action,reasonCode:row.reason_code,reasonText:row.reason_text,basis:JSON.parse(String(row.basis_json??'{}')),scope:JSON.parse(String(row.scope_json)),reopenPolicy:JSON.parse(String(row.reopen_policy_json)),rulesVersion:row.rules_version,evidenceRefs:JSON.parse(String(row.evidence_refs_json)),actor:row.actor,baseVersionId:row.base_version_id,targetVersionId:row.target_version_id,idempotencyKey:row.idempotency_key,supersedesId:row.supersedes_id,createdAt:row.created_at}); }

export class IdentityStore {
  constructor(readonly db: D1Database) {}

  async indexEntity(id:string,productId:string,text:string):Promise<void> {
    if(text.length>25000)throw new IdentityError(400,'search document too large');
    const tokens=identitySearchTokens(text).join(' ');
    await this.db.batch([
      this.db.prepare('DELETE FROM identity_search WHERE entity_id=? AND platform_id=?').bind(id,productId),
      this.db.prepare('INSERT INTO identity_search(entity_id,platform_id,search_text) SELECT id,platform_id,? FROM benefit_entities WHERE id=? AND platform_id=?').bind(tokens,id,productId),
    ]);
  }
  async searchIdentity(productId:string,text:string):Promise<{ids:string[];complete:boolean}> {
    if(text.length>2000)throw new IdentityError(400,'search input too large');
    const tokens=identitySearchTokens(text);
    if(!tokens.length)return {ids:[],complete:true};
    const match=tokens.map(token=>'"'+token.replaceAll('"','""')+'"').join(' OR ');
    try {
      const rows=await this.db.prepare('SELECT entity_id FROM identity_search WHERE identity_search MATCH ? AND platform_id=? ORDER BY rank,entity_id LIMIT 41').bind(match,productId).all<{entity_id:string}>();
      return {ids:rows.results.slice(0,40).map(row=>row.entity_id),complete:rows.results.length<=40};
    } catch {throw new IdentityError(503,'search index unavailable');}
  }

  async lookupAlias(namespace: 'legacy_offer_id'|'official_campaign'|'manual', key: string, scope: string): Promise<string|null> {
    try {
      const row=await this.db.prepare("SELECT e.id,e.state,e.platform_id,r.id root_id,r.state root_state,r.platform_id root_platform FROM identity_aliases a JOIN benefit_entities e ON e.id=a.entity_id LEFT JOIN benefit_entities r ON r.id=e.merged_into WHERE a.namespace=? AND a.alias_key=? AND a.status='active' AND (a.namespace='legacy_offer_id' OR a.scope_key=?) LIMIT 1").bind(namespace,key,scope).first<{id:string;state:string;platform_id:string;root_id:string|null;root_state:string|null;root_platform:string|null}>();
      if(!row)return null;if(row.state==='active')return row.id;
      if(row.root_state==='active'&&row.root_platform===row.platform_id)return row.root_id;
      throw new IdentityError(503,'invalid canonical alias route');
    } catch { throw new IdentityError(503,'alias retrieval unavailable'); }
  }

  async retrieveCandidates(productId: string, raw: CanonicalTermsV1, cursor?: string): Promise<RetrievalPage> {
    const facts=normalizeTerms(canonicalTermsSchema.parse(raw));
    const cursorSchema=z.strictObject({v:z.literal(1),product:z.string(),entity:z.string(),decision:z.string(),exactSeen:z.boolean()});
    let page={v:1 as const,product:productId,entity:'',decision:'',exactSeen:false};
    if(cursor) {
      try { page=cursorSchema.parse(JSON.parse(atob(cursor))); }
      catch { throw new IdentityError(400,'invalid retrieval cursor'); }
      if(page.product!==productId)throw new IdentityError(400,'cursor product mismatch');
    }
    const select=`SELECT e.id,e.platform_id,e.business_revision,e.publication_revision,e.current_approved_version_id,v.facts_json
      FROM benefit_entities e LEFT JOIN benefit_versions v ON v.id=coalesce(e.current_approved_version_id,
        (SELECT id FROM benefit_versions WHERE entity_id=e.id ORDER BY created_at DESC,id DESC LIMIT 1))`;
    type EntityRow={id:string;platform_id:string;business_revision:number;publication_revision:number;current_approved_version_id:string|null;facts_json:string|null};
    const view=(row:EntityRow):VersionedEntity=>({id:row.id,platformId:row.platform_id,revision:row.business_revision,publicationRevision:row.publication_revision,approvedVersionId:row.current_approved_version_id,terms:row.facts_json?canonicalTermsSchema.parse(JSON.parse(row.facts_json)):null});
    try {
      const anchor=facts.occurrenceAnchor.state==='known'?facts.occurrenceAnchor.value:null;
      const scope=productId+':'+(facts.mechanism.state==='known'?facts.mechanism.value:'unknown');
      const alias=anchor?await this.lookupAlias('official_campaign',anchor,scope):null;
      const exact=alias?await this.db.prepare(select+' WHERE e.id=? AND e.platform_id=?').bind(alias,productId).first<EntityRow>():null;
      const take=exact&&!page.exactSeen?39:40;
      const rows=await this.db.prepare(select+" WHERE e.state='active' AND e.platform_id=? AND e.id>? AND e.id<>? ORDER BY e.id LIMIT ?").bind(productId,page.entity,exact?.id??'',take+1).all<EntityRow>();
      const visible=rows.results.slice(0,take);
      const entities=[...(exact&&!page.exactSeen?[view(exact)]:[]),...visible.map(view)];
      // Independent indexed streams cover entity and lead-only decisions in all states.
      const decisionRows=await Promise.all([
        this.db.prepare("SELECT d.* FROM review_decisions d JOIN benefit_entities e ON e.id=d.entity_id WHERE e.platform_id=? AND d.id>? AND d.action='reject' AND NOT EXISTS(SELECT 1 FROM review_decisions n WHERE n.supersedes_id=d.id) ORDER BY d.id LIMIT 41").bind(productId,page.decision).all<Record<string,unknown>>(),
        this.db.prepare("SELECT d.* FROM intake_candidates c JOIN review_decisions d ON d.candidate_id=c.id WHERE json_extract(c.facts_json,'$.issuerProductId.value')=? AND d.id>? AND d.action='reject' AND NOT EXISTS(SELECT 1 FROM review_decisions n WHERE n.supersedes_id=d.id) ORDER BY d.id LIMIT 41").bind(productId,page.decision).all<Record<string,unknown>>(),
        this.db.prepare("SELECT d.* FROM review_decisions d WHERE json_extract(d.scope_json,'$.productId')=? AND d.id>? AND d.action='reject' AND NOT EXISTS(SELECT 1 FROM review_decisions n WHERE n.supersedes_id=d.id) ORDER BY d.id LIMIT 41").bind(productId,page.decision).all<Record<string,unknown>>(),
      ]);
      const allDecisions=[...new Map(decisionRows.flatMap(r=>r.results).map(row=>[String(row.id),row])).values()].sort((a,b)=>String(a.id)<String(b.id)?-1:1);
      const searchText=[facts.issuerProductId.state==='known'?facts.issuerProductId.value:'',...facts.benefitPools.flatMap(p=>[p.poolKey,...(p.models.state==='known'?p.models.value:[])])].join(' ');
      const ranked=await this.searchIdentity(productId,searchText.slice(0,2000));
      const rank=(id:string)=>id===exact?.id?-1:ranked.ids.includes(id)?ranked.ids.indexOf(id):41;
      entities.sort((a,b)=>rank(a.id)-rank(b.id));
      const decisions=allDecisions.slice(0,40).map(readReviewDecision);
      const complete=rows.results.length<=take&&allDecisions.length<=40;
      const nextCursor=complete?null:btoa(JSON.stringify({v:1,product:productId,entity:visible.at(-1)?.id??page.entity,decision:decisions.at(-1)?.id??page.decision,exactSeen:true}));
      return {entities,decisions,complete,nextCursor};
    } catch(error) {
      if(error instanceof IdentityError)throw error;
      throw new IdentityError(503,'identity retrieval incomplete');
    }
  }

  private async prior(requestId: string, hash: string): Promise<CommandRow | null> {
    const row = await this.db.prepare('SELECT payload_hash,state,result_json FROM identity_commands WHERE request_id=?').bind(requestId).first<CommandRow>();
    if (row && (row.payload_hash !== hash || row.state !== 'applied')) throw new IdentityError(409, 'requestId payload or state conflict');
    return row;
  }
  // Shadow intake has no business revision dependency. Every statement is tied to
  // the staged command, including the final invariant; D1 rolls back on CHECK failure.
  private async storageCommand<T>(requestId: string, hash: string, receipt: T, writes: (guard: string, guardArgs: string[]) => D1PreparedStatement[], invariant = '1', invariantArgs: (string|number|null)[] = []): Promise<T> {
    const executionToken=crypto.randomUUID();
    const result=await commitIdentityMutation(this.db,{requestId,payloadHash:hash,executionToken,expected:[],statements:writes(commandGuard,[requestId,hash,executionToken]),receipt,assertions:[{sql:invariant,args:invariantArgs}]});
    if(result.status==='conflict'||result.value===null)throw new IdentityError(409,'intake command was not applied');
    return result.value;
  }

  async recordObservation(raw: ObservationInput): Promise<ObservationReceipt> {
    const input = parse(observationInputSchema,raw);
    const hash = await sha256(stableJson(input));
    const commandId = `observation:${input.requestId}`;
    const urlKey = normalizeDocumentUrl(input.originalUrl);
    const documentId = `doc_${await sha256(urlKey)}`;
    const contentHash = await sha256(input.text);
    const verifiedFetch=input.fetchEvidence?await verifyFetchProvenance(input.fetchEvidence,input.originalUrl,input.finalUrl,input.text):null;
    if(verifiedFetch&&!verifiedFetch.valid)throw new IdentityError(400,'fetch provenance does not match source body or URLs');
    const truncated = input.truncated || input.fetchEvidence?.truncated===true || input.text.length > 250000;
    let sourceVerified = false, productId: string | null = null;
    if ((input.sourceId||input.issuerProductId) && input.fetchKind === 'direct' && !truncated && (!verifiedFetch||verifiedFetch.direct) && new URL(input.originalUrl).hostname === new URL(input.finalUrl).hostname) {
      const source = input.sourceId?await this.db.prepare('SELECT s.url,s.tier,p.id,p.name,p.site,p.x_handles,p.staff_handles FROM sources s JOIN platforms p ON p.id=s.platform_id WHERE s.id=?').bind(input.sourceId).first<{url:string;tier:string;id:string;name:string;site:string|null;x_handles:string;staff_handles:string}>():await this.db.prepare("SELECT site AS url,'site' AS tier,id,name,site,x_handles,staff_handles FROM platforms WHERE id=? AND site IS NOT NULL").bind(input.issuerProductId!).first<{url:string;tier:string;id:string;name:string;site:string|null;x_handles:string;staff_handles:string}>();
      if (source && (!input.issuerProductId||input.issuerProductId===source.id)) {
        const platform = {id:source.id,name:source.name,site:source.site,xHandles:JSON.parse(source.x_handles),staffHandles:JSON.parse(source.staff_handles)};
        sourceVerified = !!officialTier(input.originalUrl,platform,[source]) && !!officialTier(input.finalUrl,platform,[source]);
        if (sourceVerified) productId=source.id;
      }
    }
    const fetchKind=input.fetchKind==='unavailable'?'unavailable':sourceVerified?'direct':'indirect';
    const observationId = `obs_${await sha256(stableJson([documentId,contentHash,fetchKind]))}`;
    const fetchId='fetch_'+await sha256(commandId);
    const trust = JSON.stringify({sourceVerified,productId,sourceId:input.sourceId??null});
    const provenance=JSON.stringify({...input.fetchEvidence,originalUrl:input.originalUrl,finalUrl:input.finalUrl,fetchedUrl:input.fetchEvidence?.fetchedUrl??null,method:input.fetchEvidence?.method??input.fetchKind,reportedSourceVerified:input.fetchEvidence?.sourceVerified??null,sourceVerified,productId,truncated,contentHash});
    const receipt = {observationId,documentId,contentHash,truncated,fetchId};
    return this.storageCommand(commandId,hash,receipt,(guard,args)=>[
      this.db.prepare(`INSERT INTO source_documents(id,original_url,url_key,first_seen_at,last_seen_at) SELECT ?,?,?,?,? WHERE ${guard} ON CONFLICT(url_key) DO UPDATE SET last_seen_at=max(last_seen_at,excluded.last_seen_at)`).bind(documentId,input.originalUrl,urlKey,input.observedAt,input.observedAt,...args),
      this.db.prepare(`INSERT INTO source_observations(id,document_id,content_hash,text,text_truncated,fetch_kind,final_url,observed_at,last_seen_at,trust_json,fetch_provenance_json) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE ${guard} ON CONFLICT(document_id,content_hash,fetch_kind) DO UPDATE SET last_seen_at=max(last_seen_at,excluded.last_seen_at)`).bind(observationId,documentId,contentHash,input.text.slice(0,250000),Number(truncated),fetchKind,input.finalUrl,input.observedAt,input.observedAt,trust,provenance,...args),
      this.db.prepare(`INSERT INTO source_observation_fetches(id,observation_id,request_id,provenance_json,observed_at) SELECT ?,?,?,?,? WHERE ${guard}`).bind(fetchId,observationId,commandId,provenance,input.observedAt,...args),
    ],'EXISTS(SELECT 1 FROM source_observations WHERE id=?)',[observationId]);
  }

  async recordCandidates(raw: CandidateBatchInput): Promise<IntakeReceipt[]> {
    const input = parse(candidateBatchInputSchema,raw);
    const payloadHash = await sha256(stableJson(input));
    const request = `batch:${input.requestId}`;
    const observation = await this.db.prepare('SELECT id,text,text_truncated,fetch_kind,trust_json FROM source_observations WHERE id=?').bind(input.observationId).first<ObservationRow>();
    if (!observation) throw new IdentityError(404,'observation not found');
    for (const leadId of input.leadIds) if (!await this.db.prepare('SELECT id FROM leads WHERE id=?').bind(leadId).first()) throw new IdentityError(400,'lead not found');
    if(input.sourceFetchId){const fetch=await this.db.prepare('SELECT provenance_json FROM source_observation_fetches WHERE id=? AND observation_id=?').bind(input.sourceFetchId,input.observationId).first<{provenance_json:string}>();if(!fetch)throw new IdentityError(400,'fetch does not belong to observation');if(JSON.parse(fetch.provenance_json).truncated)observation.text_truncated=1;}
    const readable = observation.fetch_kind !== 'unavailable' && !!observation.text && !observation.text_truncated;
    const nonBenefit = input.nonBenefitEvidence;
    const complete = input.extractionComplete && readable && (input.candidates.length > 0 || !!(nonBenefit && observation.text.slice(nonBenefit.start,nonBenefit.end) === nonBenefit.quote));
    // An extraction marker records incomplete/empty work without rejecting a lead.
    await this.storageCommand(request,payloadHash,{extractionComplete:complete,reasonCodes:complete?[]:['extraction_incomplete']},(guard,args)=>[
      this.db.prepare(`INSERT INTO intake_extractions(request_id,observation_id,extraction_version,input_json,state,extraction_complete,next_attempt_at,last_error) SELECT ?,?,?,?,'deferred',?,?,? WHERE ${guard}`)
        .bind(request,input.observationId,input.extractionVersion,JSON.stringify(input),Number(complete),new Date(Date.now()+20*60_000).toISOString(),'intake_pending',...args),
      ...input.leadIds.map(leadId=>this.db.prepare(`INSERT INTO identity_extraction_leads(request_id,lead_id) SELECT ?,? WHERE ${guard} ON CONFLICT DO NOTHING`).bind(request,leadId,...args)),
    ]);
    const receipts: IntakeReceipt[]=[];
    for (const candidate of input.candidates) {
      const facts = normalizeTerms(candidate.facts);
      const mechanism = facts.mechanism;
      const spanKey = `${candidate.span.start}:${candidate.span.end}`;
      const familyKey = await sha256(stableJson([input.observationId,input.extractionVersion,spanKey,mechanism.state==='known'?mechanism.value:candidate.mechanismHint??null]));
      const factsHash = await hashTerms(facts);
      let key = await sha256(stableJson(['candidate-assertion-v2',familyKey,factsHash]));
      let candidateId = `candidate_${key}`;
      const mechanismKey = mechanism.state==='known'?mechanism.value:candidate.mechanismHint??null;
      const ambiguous = input.candidates.some(other => other.inputId !== candidate.inputId
        && other.span.start === candidate.span.start && other.span.end === candidate.span.end
        && (other.facts.mechanism.state==='known'?other.facts.mechanism.value:other.mechanismHint??null) === mechanismKey
        && stableJson(other.rawCandidate) !== stableJson(candidate.rawCandidate));
      const base: IntakeReceipt = {inputId:candidate.inputId,candidateId,canonicalOfferId:null,entityId:null,versionId:null,decisionId:null,taskId:null,outcome:'deferred',retryable:true,reasonCodes:['shadow_pending_resolution']};
      try {
        const previous = await this.db.prepare('SELECT id,candidate_key,receipt_json FROM intake_candidates WHERE claim_family_key=? AND assertion_facts_hash=? ORDER BY id LIMIT 1').bind(familyKey,factsHash).first<{id:string;candidate_key:string;receipt_json:string|null}>();
        if(previous){key=previous.candidate_key;candidateId=previous.id;base.candidateId=candidateId;}
        const conflictingAssertion=await this.db.prepare('SELECT 1 FROM intake_candidates WHERE claim_family_key=? AND assertion_facts_hash<>? LIMIT 1').bind(familyKey,factsHash).first();
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
        if (ambiguous||conflictingAssertion) { receipt.reasonCodes=['ambiguous_subitems']; receipt.outcome='deferred'; receipt.retryable=true; }
        const command = `candidate:${await sha256(stableJson([input.requestId,candidate.inputId]))}`;
        const result = await this.storageCommand(command,payloadHash,receipt,(guard,args)=>[
          this.db.prepare(`INSERT INTO intake_candidates(id,observation_id,extraction_version,span_key,candidate_key,claim_family_key,assertion_facts_hash,claim_identity_key,source_fetch_id,raw_candidate_json,facts_json,facts_hash,state,last_error,receipt_json) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,'deferred',?,? WHERE ${guard} ON CONFLICT(candidate_key) DO NOTHING`).bind(candidateId,input.observationId,input.extractionVersion,spanKey,key,familyKey,factsHash,claimIdentityKey(facts),input.sourceFetchId??null,JSON.stringify({candidate:candidate.rawCandidate,quotes:candidate.quotes,span:candidate.span}),JSON.stringify(facts),factsHash,receipt.reasonCodes.join(','),JSON.stringify(receipt),...args),
          ...input.leadIds.map(leadId=>this.db.prepare(`INSERT INTO lead_candidate_links(lead_id,candidate_id) SELECT ?,? WHERE ${guard} ON CONFLICT DO NOTHING`).bind(leadId,candidateId,...args)),
        ],'EXISTS(SELECT 1 FROM intake_candidates WHERE id=?)',[candidateId]);
        receipts.push(result);
      } catch (error) {
        if (error instanceof IdentityError && error.status < 500) throw error;
        receipts.push({...base,reasonCodes:['storage_unavailable']});
      }
    }
    const failed=receipts.some(r=>r.reasonCodes.some(code=>code!=='shadow_pending_resolution'));
    const summary={state:complete&&!failed?'received':'deferred',reason:!complete?'extraction_incomplete':failed?'candidate_intake_incomplete':null};
    // A failed child never turns the extraction record into an untraceable success.
    await this.storageCommand(`batch-final:${await sha256(stableJson([input.requestId,summary]))}`,payloadHash,summary,(guard,args)=>[
      this.db.prepare(`UPDATE intake_extractions SET state=?,last_error=?,next_attempt_at=? WHERE request_id=? AND ${guard}`)
        .bind(summary.state,summary.reason,summary.state==='deferred'?new Date(Date.now()+20*60_000).toISOString():null,request,...args),
    ]);
    return receipts;
  }
}
