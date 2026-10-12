/* Shared membership semantics are bundled as YMMembership; this file only owns controls. */
function membershipRequirementOf(o) {
  return o.membershipRequirement || YMMembership.migrateLegacyMembership(o.r || o.requirements || [], MEMBERSHIP_CATALOG);
}
function membershipResult(o, subscriptions) {
  const requirement = membershipRequirementOf(o);
  if (requirement.status === 'not_required') return 'yes';
  if (!MEMBERSHIP_CATALOG_OK) return 'unknown';
  return YMMembership.matchMembership(requirement, subscriptions, MEMBERSHIP_CATALOG);
}
function migrateMembershipPreferences(previous) {
  if (previous.membershipStorageVersion === 1 || !MEMBERSHIP_CATALOG_OK) return previous;
  const result = YMMembership.migrateMemberSelections(previous.members || [], MEMBERSHIP_CATALOG);
  return { ...previous, subscriptions: result.subscriptions, unresolvedMembers: result.unresolved, membershipStorageVersion: 1 };
}
function membershipEditFields(original, editor, nonmember, otherTouched, evidenceUrl) {
  if (!editor?.touched) return otherTouched ? { requirements: [...nonmember, ...(original.requirements || []).filter(r => r.startsWith('member:'))] } : {};
  const requirement = structuredClone(editor.requirement);
  if (requirement.status === 'confirmed' && (!MEMBERSHIP_CATALOG_OK || editor.catalogAvailable === false)) throw new Error('会员目录未加载，不能保存已确认资格');
  requirement.catalogRevision = editor.catalogRevision ?? requirement.catalogRevision;
  if (requirement.status === 'not_required') requirement.anyOf = [];
  if (requirement.status === 'confirmed' && !requirement.evidenceUrls.length && evidenceUrl) requirement.evidenceUrls = [evidenceUrl];
  const errors = YMMembership.validateMembership(requirement, MEMBERSHIP_CATALOG);
  if (errors.length) throw new Error(errors.join('；'));
  // The API generates member: projections from the structured requirement.
  return { membershipRequirement: requirement, requirements: nonmember.filter(r => r !== 'none') };
}
const membershipOption = (value, label, selected) => `<option value="${esc(value)}" ${selected ? 'selected' : ''}>${esc(label)}</option>`;
function membershipPlanLabel(plan, catalog = MEMBERSHIP_CATALOG) {
  return YMMembership.formatMembership({schemaVersion:'membership-v1',status:'confirmed',catalogRevision:catalog.revision,anyOf:[{allOf:[{productId:plan.productId,scope:'plans',planIds:[plan.id],excludePlanIds:[]}]}],evidenceUrls:[]},catalog);
}
function subscriptionControls() {
  if (!MEMBERSHIP_CATALOG_OK) return '<p class="warn-note">会员目录暂时不可用，会员资格显示为还需确认；其他条件仍可使用。</p>';
  const subscriptions = C.subscriptions || [];
  return `<div data-owned-subscriptions>${C.unresolvedMembers?.length ? `<p class="warn-note">旧会员选择需要重新核对：${C.unresolvedMembers.map(esc).join('、')}。请选择实际持有的套餐。</p>` : ''}
  ${MEMBERSHIP_CATALOG.products.filter(p => MEMBERSHIP_CATALOG.plans.some(plan => plan.productId === p.id)).map(p => `<details><summary>${esc(p.name)}${p.status==='pending'?'（待核实）':''}</summary><div class="chips">${MEMBERSHIP_CATALOG.plans.filter(plan => plan.productId === p.id).map(plan => `<button type="button" class="btn sm" data-add-subscription="${esc(plan.id)}">＋ ${esc(membershipPlanLabel(plan))}${plan.status==='retired'?'（历史套餐）':plan.status==='pending'?'（待核实）':''}</button>`).join('')}</div></details>`).join('')}
  ${subscriptions.map((s, i) => { const plan = MEMBERSHIP_CATALOG.plans.find(p => p.id === s.planId), product = MEMBERSHIP_CATALOG.products.find(p => p.id === plan?.productId); return `<fieldset data-subscription="${i}" style="margin:10px 0"><legend>${esc(plan ? membershipPlanLabel(plan) : s.planId)}</legend><button type="button" class="btn sm" data-remove-subscription="${i}">移除这份订阅</button><details><summary>补充订阅资料（资格需要时填写）</summary><div class="filters">
  <label class="field">计费周期<select data-owned="billingCycle">${[['','未填写'],['monthly','月付'],['annual','年付']].map(([v,l])=>membershipOption(v,l,s.billingCycle===v)).join('')}</select></label>
  ${[['startedOn','开始日期','date'],['region','地区代码，如 US','text'],['seatType','席位类型','text']].map(([k,l,t])=>`<label class="field">${l}<input type="${t}" data-owned="${k}" value="${esc(s[k] || '')}"></label>`).join('')}
  ${[['trial','是否试用'],['legacy','是否旧版套餐']].map(([k,l])=>`<label class="field">${l}<select data-owned="${k}">${[['','未填写'],['true','是'],['false','否']].map(([v,label])=>membershipOption(v,label,String(s[k]??'')===v)).join('')}</select></label>`).join('')}</div></details></fieldset>`; }).join('')}</div>`;
}
function persistSubscriptionChange() {
  LS.set('ym-cond', C); RACE = computeRace(); TREND = computeTrend(); drawCondBtn();
  const holder = document.querySelector('[data-owned-subscriptions]');
  if (holder) holder.outerHTML = subscriptionControls();
  render(true);
}
function bindSubscriptionEvents() {
  document.addEventListener('click', e => {
    const add = e.target.closest('[data-add-subscription]'), remove = e.target.closest('[data-remove-subscription]');
    if (!add && !remove) return;
    C.subscriptions ||= [];
    if (add) C.subscriptions.push({planId:add.dataset.addSubscription});
    else C.subscriptions.splice(Number(remove.dataset.removeSubscription),1);
    persistSubscriptionChange();
  });
  document.addEventListener('change', e => {
    const input = e.target.closest('[data-owned]'); if (!input) return;
    const owned = C.subscriptions[Number(input.closest('[data-subscription]').dataset.subscription)];
    const key = input.dataset.owned;
    if (!input.value) delete owned[key];
    else owned[key] = ['trial','legacy'].includes(key) ? input.value === 'true' : input.value.trim();
    persistSubscriptionChange();
  });
}
function blankMembershipClause() { return { productId:'', scope:'plans', planIds:[], excludePlanIds:[] }; }
function membershipEditorMarkup(state) {
  const requirement = state.requirement;
  return `<label class="field">会员资格状态<select data-membership-status>${[['not_required','无需会员'],['needs_review','需要会员 · 待核实草稿'],['confirmed','需要会员 · 已核实']].map(([v,l])=>membershipOption(v,l,requirement.status===v)).join('')}</select></label>
  ${state.error ? `<p class="warn-note">${esc(state.error)}</p>` : ''}
  ${state.catalogRevision !== MEMBERSHIP_CATALOG.revision ? '<p class="warn-note">目录已更新。请核对已选条件，然后主动刷新目录版本；已选条件会保留。</p>' : ''}
  <button type="button" class="btn sm" data-membership-refresh>刷新目录并保留已选条件</button>
  ${requirement.legacyText?.length ? `<p class="small muted">原会员条件（供核对）：${requirement.legacyText.map(esc).join('；')}</p>` : ''}
  ${requirement.status !== 'not_required' ? `<p class="small">满足任意一组；每组内全部满足。未表达清楚的限制请保持待核实。</p>${requirement.anyOf.map((group,g)=>`<fieldset data-membership-group="${g}" style="margin:10px 0"><legend>${g?'或 · ':''}第 ${g+1} 组（全部满足）</legend>${group.allOf.map((clause,c)=>membershipClauseMarkup(clause,g,c)).join('')}<button class="btn sm" type="button" data-membership-add-clause="${g}">并且一项</button> <button class="btn sm" type="button" data-membership-remove-group="${g}">删除本组</button></fieldset>`).join('')}<button class="btn sm" type="button" data-membership-add-group>或另一组</button>${requirement.status==='needs_review'?'<button class="btn sm" type="button" data-membership-unresolved>清空未确认选择，保留待核实</button>':''}` : ''}
  <p data-membership-preview class="small" aria-live="polite">${esc(YMMembership.formatMembership(requirement,MEMBERSHIP_CATALOG))}</p>
  <details data-membership-detail="catalog"><summary>新增或核实会员目录</summary><div data-membership-catalog></div></details>`;
}
function membershipClauseMarkup(clause, g, c) {
  const plans = MEMBERSHIP_CATALOG.plans.filter(p=>p.productId===clause.productId && (p.status!=='retired' || clause.planIds.includes(p.id) || clause.excludePlanIds.includes(p.id)));
  const limits=clause.limits || {};
  return `<div data-membership-clause="${c}" data-group="${g}" style="border-bottom:1px solid var(--line);padding:10px 0"><div class="filters">
  <label class="field">会员产品<select data-clause="productId">${membershipOption('','请选择产品',!clause.productId)}${MEMBERSHIP_CATALOG.products.filter(p=>p.status!=='retired'||p.id===clause.productId).map(p=>membershipOption(p.id,p.name+(p.status==='verified'?'':p.status==='retired'?'（已停用）':'（待核实）'),p.id===clause.productId)).join('')}</select></label>
  <label class="field">合资格范围<select data-clause="scope">${[['plans','指定套餐'],['any_paid','任一付费订阅'],['any_subscription','任一订阅']].map(([v,l])=>membershipOption(v,l,clause.scope===v)).join('')}</select></label></div>
  ${clause.scope==='plans'?`<div>合资格套餐（任一个）<div class="chips">${plans.map(p=>`<label class="chip"><input type="checkbox" data-plan="planIds" value="${esc(p.id)}" ${clause.planIds.includes(p.id)?'checked':''}>${esc(membershipPlanLabel(p))}${p.status==='verified'?'':p.status==='retired'?'（已停用）':'（待核实）'}</label>`).join('') || '目录中暂无套餐'}</div></div>`:''}
  <details data-membership-detail="limits-${g}-${c}"><summary>排除套餐与补充限制</summary><div class="chips">${plans.map(p=>`<label class="chip"><input type="checkbox" data-plan="excludePlanIds" value="${esc(p.id)}" ${clause.excludePlanIds.includes(p.id)?'checked':''}>排除 ${esc(p.name)}</label>`).join('')}</div><div class="filters">
  ${[['startedAfter','订阅开始晚于','date'],['startedBefore','订阅开始早于','date'],['seatTypes','席位类型（逗号分隔）','text'],['regions','地区代码（逗号分隔）','text']].map(([k,l,t])=>`<label class="field">${l}<input type="${t}" data-limit="${k}" value="${esc(Array.isArray(limits[k])?limits[k].join(','):limits[k]||'')}"></label>`).join('')}
  <label class="field">计费周期<select data-limit="billingCycles">${[['','不限'],['monthly','月付'],['annual','年付'],['monthly,annual','月付或年付']].map(([v,l])=>membershipOption(v,l,(limits.billingCycles||[]).join(',')===v)).join('')}</select></label>
  <label class="field">试用<select data-limit="trial">${[['','未说明'],['include','允许试用'],['exclude','排除试用'],['only','仅试用']].map(([v,l])=>membershipOption(v,l,(limits.trial||'')===v)).join('')}</select></label>
  <label class="field">旧版套餐<select data-limit="legacy">${[['','不限'],['true','仅旧版'],['false','排除旧版']].map(([v,l])=>membershipOption(v,l,String(limits.legacy??'')===v)).join('')}</select></label></div></details><button class="btn sm" type="button" data-membership-remove-clause="${c}" data-group="${g}">移除此项</button></div>`;
}
async function mountMembershipEditor(form, original) {
  const host = form.querySelector('[data-membership-editor]');
  const state = {touched:false,requirement:structuredClone(membershipRequirementOf(original)),catalogRevision:MEMBERSHIP_CATALOG.revision,catalogAvailable:false,error:''};
  form.membershipEditor=state;
  form.addEventListener('change', e=>{ if(e.target.matches('[name="req"],[name="reqPay"]'))form.nonmemberTouched=true; });
  try { const catalog=await adm('/memberships'); if (!Array.isArray(catalog.products) || !Array.isArray(catalog.plans)) throw new Error('目录响应无效'); MEMBERSHIP_CATALOG=catalog; MEMBERSHIP_CATALOG_OK=true; state.catalogAvailable=true; state.catalogRevision=catalog.revision; }
  catch { state.error='会员目录加载失败：可编辑其他字段，不能确认会员资格'; }
  const redraw=()=>{const open=new Set([...host.querySelectorAll('details[data-membership-detail][open]')].map(x=>x.dataset.membershipDetail));host.innerHTML=membershipEditorMarkup(state);for(const detail of host.querySelectorAll('details[data-membership-detail]'))detail.toggleAttribute('open',open.has(detail.dataset.membershipDetail));renderMembershipCatalog(host.querySelector('[data-membership-catalog]'),redraw);};
  redraw();
  host.addEventListener('change', e=>{
    const input=e.target;
    if(input.closest('[data-membership-catalog]'))return;
    state.touched=true;
    if(input.matches('[data-membership-status]')){
      state.requirement.status=input.value;
      if(input.value!=='not_required'&&!state.requirement.anyOf.length)state.requirement.anyOf=[{allOf:[blankMembershipClause()]}];
    }else{
      const row=input.closest('[data-membership-clause]');if(!row)return;
      const clause=state.requirement.anyOf[+row.dataset.group].allOf[+row.dataset.membershipClause];
      if(input.dataset.clause){clause[input.dataset.clause]=input.value;if(input.dataset.clause==='productId'){clause.planIds=[];clause.excludePlanIds=[];}if(input.dataset.clause==='scope'&&input.value!=='plans')clause.planIds=[];}
      if(input.dataset.plan)clause[input.dataset.plan]=[...row.querySelectorAll(`[data-plan="${input.dataset.plan}"]:checked`)].map(x=>x.value);
      if(input.dataset.limit){const k=input.dataset.limit;clause.limits||={};if(!input.value)delete clause.limits[k];else clause.limits[k]=['seatTypes','regions','billingCycles'].includes(k)?input.value.split(',').map(x=>x.trim()).filter(Boolean):k==='legacy'?input.value==='true':input.value;}
    }
    redraw();
  });
  host.addEventListener('click',async e=>{
    const button=e.target.closest('button');if(!button||button.closest('[data-membership-catalog]'))return;
    const d=button.dataset;let changed=true;
    if('membershipRefresh'in d){
      button.disabled=true;
      try{const catalog=await adm('/memberships');if(!Array.isArray(catalog.products)||!Array.isArray(catalog.plans))throw new Error('目录响应无效');MEMBERSHIP_CATALOG=catalog;MEMBERSHIP_CATALOG_OK=true;state.catalogRevision=catalog.revision;state.catalogAvailable=true;state.error='';state.touched=true;}
      catch(error){state.error='目录刷新失败：'+error.message;state.catalogAvailable=false;}
      redraw();return;
    }
    if('membershipUnresolved'in d)state.requirement.anyOf=[];
    else if('membershipAddGroup'in d)state.requirement.anyOf.push({allOf:[blankMembershipClause()]});
    else if('membershipAddClause'in d)state.requirement.anyOf[+d.membershipAddClause].allOf.push(blankMembershipClause());
    else if('membershipRemoveGroup'in d)state.requirement.anyOf.splice(+d.membershipRemoveGroup,1);
    else if('membershipRemoveClause'in d)state.requirement.anyOf[+d.group].allOf.splice(+d.membershipRemoveClause,1);
    else changed=false;
    if(changed){state.touched=true;redraw();}
  });
}
function renderMembershipCatalog(host, redraw) {
  host.innerHTML=`<p class="small">新增目录项先保存为待核实；核实目录不会批准福利。</p><div class="filters"><label class="field">类别<select data-catalog="kind"><option value="plan">套餐</option><option value="product">产品</option></select></label><label class="field">所属产品<select data-catalog="productId">${MEMBERSHIP_CATALOG.products.map(p=>membershipOption(p.id,p.name,false)).join('')}</select></label><label class="field">正式名称<input data-catalog="name" type="text"></label><label class="field">官方来源<input data-catalog="sourceUrl" type="url"></label><label class="field">收费属性<select data-catalog="billing"><option value="unknown">未知</option><option value="paid">付费</option><option value="free">免费</option></select></label></div><button type="button" class="btn sm" data-catalog-create>新增待核实目录项</button><div data-catalog-msg role="status"></div>${['products','plans'].flatMap(key=>MEMBERSHIP_CATALOG[key].filter(p=>p.status==='pending').map(p=>`<p>${esc(p.name)} · 待核实 <a href="${esc(p.sourceUrl)}" target="_blank" rel="noopener">官方来源 ↗</a> <button class="btn sm" type="button" data-catalog-verify="${esc(p.id)}" data-kind="${key==='plans'?'plan':'product'}">查看影响并核实</button></p>`)).join('')}`;
  host.onclick=async e=>{
    const button=e.target.closest('button');if(!button)return;
    const message=host.querySelector('[data-catalog-msg]');button.disabled=true;
    try{
      if(button.hasAttribute('data-catalog-create')){
        const values=Object.fromEntries([...host.querySelectorAll('[data-catalog]')].map(x=>[x.dataset.catalog,x.value.trim()]));
        if(!values.name||!/^https?:\/\//.test(values.sourceUrl))throw new Error('请填写正式名称和官方来源链接');
        if(values.kind==='product'){delete values.productId;delete values.billing;}
        await adm('/memberships',{...values,expectedCatalogRevision:MEMBERSHIP_CATALOG.revision});
      }else if(button.dataset.catalogVerify){
        const kind=button.dataset.kind,id=button.dataset.catalogVerify;
        const impact=await adm(`/memberships/${encodeURIComponent(id)}/impact?kind=${kind}`);
        const entry=MEMBERSHIP_CATALOG[kind==='plan'?'plans':'products'].find(p=>p.id===id);
        message.innerHTML=`<p>受影响福利：${impact.affectedOffers.map(x=>esc(x.title)).join('、')||'无'}。确认官方来源后核实本目录项。</p><button type="button" class="btn sm" data-confirm-catalog>已核对来源，确认生效</button>`;
        message.querySelector('button').onclick=async event=>{event.stopPropagation();try{await adm(`/memberships/${encodeURIComponent(id)}/verify`,{kind,expectedCatalogRevision:impact.catalogRevision,expectedRevision:entry.revision,acknowledgeAffectedOffers:true});MEMBERSHIP_CATALOG=await adm('/memberships');redraw();}catch(error){message.textContent=error.message;}};
        return;
      }else return;
      MEMBERSHIP_CATALOG=await adm('/memberships');redraw();
    }catch(error){message.textContent=error.message;button.disabled=false;}
  };
}
