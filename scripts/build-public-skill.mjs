import {cp,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir='public/ai-yangmao-public';
await cp('integrations/agent/ai-yangmao-public',dir,{recursive:true});
await cp('integrations/agent/install.sh',`${dir}/install.sh`);
const files=['SKILL.md','LICENSE','agents/openai.yaml'];
await writeFile(`${dir}/manifest.sha256`,(await Promise.all(files.map(async file=>`${createHash('sha256').update(await readFile(`${dir}/${file}`)).digest('hex')}  ${file}`))).join('\n')+'\n');
await writeFile('public/llms.txt',`# AI 羊毛牧场\n\n公开 AI 权益、最新日报与条件筛选。\n\n- 接入说明：https://ai-yangmao.com/api/agent\n- Skill：https://ai-yangmao.com/ai-yangmao-public/SKILL.md\n- 远程 MCP：https://ai-yangmao.com/api/mcp\n- 日报：https://ai-yangmao.com/api/agent/daily\n- 官网接入页：https://ai-yangmao.com/#agent\n`);
