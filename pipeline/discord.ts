// Read only the configured receiver; official source identity comes from verified follow references.
import type {Source} from './collectors';
import type {LeadIn} from '../src/shared/ingest';
import {isFreebie} from './lib';
interface Publisher {platformId:string;name:string;guildId:string;channelId:string}
interface Message {id:string;channel_id:string;type:number;flags?:number;content?:string;embeds?:{title?:string;description?:string;url?:string;fields?:{name?:string;value?:string}[]}[];attachments?:{filename?:string;url?:string}[];message_reference?:{type?:number;guild_id?:string;channel_id?:string;message_id?:string}}
const snowflake=(value:unknown):value is string=>typeof value==='string'&&/^\d{17,20}$/.test(value);
async function read(route:string,token:string):Promise<unknown>{
  let response:Response;
  try {response=await fetch(`https://discord.com/api/v10${route}`,{headers:{Authorization:`Bot ${token}`,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(20_000)});}
  catch {throw new Error('Discord 网络请求未完成，保留检查点等待重试');}
  if(!response.ok)throw new Error(`Discord 读取失败 HTTP ${response.status}`);
  try{return await response.json();}catch{throw new Error('Discord 返回无效 JSON');}
}
export async function collectDiscord(src:Source):Promise<{leads:LeadIn[];cursor:string;pages:number;messages:number}>{
  const token=process.env.DISCORD_BOT_TOKEN??'',channel=process.env.DISCORD_CHANNEL_ID??'',guild=process.env.DISCORD_GUILD_ID??'';
  if(!token||!snowflake(channel)||!snowflake(guild))throw new Error('Discord 缺少 Bot Token 或已授权频道/服务器配置');
  if(src.url!==`https://discord.com/channels/${guild}/${channel}`)throw new Error('Discord 信源不属于已授权频道');
  const publishers=src.config?.publishers as Publisher[]|undefined;
  if(!Array.isArray(publishers)||!publishers.length||publishers.some(p=>!snowflake(p.guildId)||!snowflake(p.channelId)||!p.platformId||!p.name))throw new Error('Discord 官方来源映射未登记');
  const prior=src.lastHash?.match(/^discord:(0|\d{17,20})$/)?.[1]??'0';
  if(src.lastHash&&prior==='0'&&src.lastHash!=='discord:0')throw new Error('Discord 检查点格式不正确');
  const info=await read(`/channels/${channel}`,token) as {id?:string;guild_id?:string;type?:number};
  if(info.id!==channel||info.guild_id!==guild||![0,5].includes(info.type??-1))throw new Error('Discord 频道或服务器不匹配');
  const cap=Number(src.config?.maxPages??20);
  if(!Number.isInteger(cap)||cap<1||cap>100)throw new Error('Discord 分页上限配置不正确');
  const collected=new Map<string,Message>();let before='',cursor=prior,pages=0,complete=false;
  while(pages<cap){
    const data=await read(`/channels/${channel}/messages?limit=100${before?`&before=${before}`:''}`,token);
    if(!Array.isArray(data)||data.some(m=>!snowflake(m.id)||m.channel_id!==channel))throw new Error('Discord 消息身份不匹配');
    pages++;
    const items=(data as Message[]).sort((a,b)=>BigInt(a.id)>BigInt(b.id)?-1:BigInt(a.id)<BigInt(b.id)?1:0);
    for(const m of items){if(BigInt(m.id)>BigInt(cursor))cursor=m.id;if(BigInt(m.id)>BigInt(prior))collected.set(m.id,m);}
    if(items.length<100||BigInt(items.at(-1)!.id)<=BigInt(prior)){complete=true;break;}
    const next=items.at(-1)!.id;if(before&&BigInt(next)>=BigInt(before))throw new Error('Discord 分页没有前进，保留检查点');before=next;
  }
  if(!complete)throw new Error('Discord 积压超过分页上限，未完整补回，保留检查点');
  const leads=new Map<string,LeadIn>();
  for(const m of [...collected.values()].sort((a,b)=>BigInt(a.id)<BigInt(b.id)?-1:1)){
    if(m.type!==0||!((m.flags??0)&2)||((m.flags??0)&8))continue;
    const ref=m.message_reference;
    if(!ref||ref.type===1||!snowflake(ref.message_id))throw new Error('Discord 同步公告缺少原始出处，保留检查点');
    const publisher=publishers.find(p=>p.guildId===ref.guild_id&&p.channelId===ref.channel_id);
    if(!publisher)throw new Error(`Discord 来源未登记：${ref.guild_id}/${ref.channel_id}`);
    const text=[m.content,...(m.embeds??[]).flatMap(e=>[e.title,e.description,e.url,...(e.fields??[]).flatMap(f=>[f.name,f.value])]),...(m.attachments??[]).flatMap(a=>[a.filename,a.url])].filter(Boolean).join('\n');
    if(!text.trim())throw new Error('Discord 官方公告正文不可读取，请核对 Message Content Intent');
    if(!isFreebie(text)&&!(m.attachments??[]).length)continue;
    const url=`https://discord.com/channels/${ref.guild_id}/${ref.channel_id}/${ref.message_id}`;
    const raw=JSON.stringify({platformId:publisher.platformId,originalUrl:url,receiverMessageId:m.id,text});
    if(raw.length>20000)throw new Error('Discord 公告正文超过线索上限，保留检查点等待人工处理');
    leads.set(url,{origin:'discord',url,title:`${publisher.name}：${m.content||m.embeds?.[0]?.title||'官方公告'}`.slice(0,300),raw});
  }
  return{leads:[...leads.values()],cursor,pages,messages:collected.size};
}
