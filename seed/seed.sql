-- 由 scripts/gen-seed.ts 生成，勿手改
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('openai', 'OpenAI', 'lab', 'https://openai.com', '["@OpenAI","@OpenAIDevs","@ChatGPT"]', '["@thsottiaux"]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('anthropic', 'Anthropic', 'lab', 'https://www.anthropic.com', '["@AnthropicAI","@claudeai","@ClaudeDevs"]', '["@bcherny","@trq212","@noahzweben"]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('google', 'Google AI（Gemini / AI Studio）', 'lab', 'https://ai.google.dev', '["@GeminiApp","@GoogleAI"]', '["@OfficialLoganK"]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('deepseek', 'DeepSeek', 'lab', 'https://www.deepseek.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('moonshot', 'Kimi 开放平台（月之暗面）', 'lab', 'https://platform.moonshot.cn', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('zhipu', '智谱 Z.ai', 'lab', 'https://bigmodel.cn', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('minimax', 'MiniMax', 'lab', 'https://www.minimaxi.com', '["@MiniMax_AI"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('stepfun', '阶跃星辰', 'lab', 'https://www.stepfun.com', '["@StepFun_ai"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('xai', 'xAI', 'lab', 'https://x.ai', '["@grok"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('mistral', 'Mistral AI', 'lab', 'https://mistral.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('meta', 'Meta Llama', 'lab', 'https://www.llama.com', '["@AIatMeta"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('cohere', 'Cohere', 'lab', 'https://cohere.com', '["@cohere"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('meituan', '美团 LongCat', 'lab', 'https://longcat.chat', '["@Meituan_LongCat"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('baichuan', '百川智能', 'lab', 'https://www.baichuan-ai.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('qwen', '阿里 Qwen（通义千问 App / Qwen Code）', 'lab', 'https://qwen.ai', '["@Alibaba_Qwen"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('doubao', '字节跳动 豆包 Doubao', 'lab', 'https://www.doubao.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('tencent-hy', '腾讯混元 HY（含 WorkBuddy）', 'lab', 'https://hunyuan.tencent.com', '["@TencentHunyuan","@WorkBuddy_AI"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('microsoft-ai', 'Microsoft AI（Copilot）', 'lab', 'https://microsoft.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('xiaomi-mimo', '小米 MiMo', 'lab', 'https://mimo.mi.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('sakana', 'Sakana AI（Fugu）', 'lab', 'https://sakana.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('nex-agi', 'Nex AGI', 'lab', 'https://nex.sii.edu.cn', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('aliyun', '阿里云百炼', 'cloud', 'https://bailian.console.aliyun.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('volc', '火山方舟', 'cloud', 'https://www.volcengine.com/product/ark', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('tencent', '腾讯云', 'cloud', 'https://cloud.tencent.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('baidu', '百度千帆', 'cloud', 'https://cloud.baidu.com', '["@Baidu_Inc"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('huaweicloud', '华为云', 'cloud', 'https://www.huaweicloud.com', '["@HuaweiCloud1"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('aws', 'AWS', 'cloud', 'https://aws.amazon.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('gcloud', 'Google Cloud', 'cloud', 'https://cloud.google.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('azure', 'Microsoft Azure', 'cloud', 'https://azure.microsoft.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('openrouter', 'OpenRouter', 'infra', 'https://openrouter.ai', '["@OpenRouter"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('opencode', 'OpenCode（Zen / Go）', 'infra', 'https://opencode.ai', '["@opencode"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('vercel', 'Vercel AI Gateway', 'infra', 'https://vercel.com/ai-gateway', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('cloudflare', 'Cloudflare Workers AI', 'infra', 'https://developers.cloudflare.com/workers-ai/', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('github', 'GitHub Models', 'infra', 'https://github.com/marketplace/models', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('hf', 'Hugging Face', 'infra', 'https://huggingface.co', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('groq', 'Groq', 'infra', 'https://groq.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('cerebras', 'Cerebras', 'infra', 'https://www.cerebras.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('together', 'Together AI', 'infra', 'https://www.together.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('fireworks', 'Fireworks AI', 'infra', 'https://fireworks.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('sambanova', 'SambaNova', 'infra', 'https://sambanova.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('nvidia', 'NVIDIA NIM', 'infra', 'https://build.nvidia.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('deepinfra', 'DeepInfra', 'infra', 'https://deepinfra.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('siliconflow', '硅基流动', 'infra', 'https://siliconflow.cn', '["@SiliconFlowAI"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('modelscope', '魔搭 ModelScope', 'infra', 'https://modelscope.cn', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('ppio', 'PPIO 派欧云', 'infra', 'https://ppio.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('novita', 'Novita AI', 'infra', 'https://novita.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('qiniu', '七牛云 AI', 'infra', 'https://www.qiniu.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('ucloud', 'UCloud 星图', 'infra', 'https://www.ucloud.cn', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('moark', '模力方舟', 'infra', 'https://ai.gitee.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('cursor', 'Cursor（Anysphere）', 'tool', 'https://cursor.com', '[]', '["@ericzakariasson"]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('windsurf', 'Windsurf', 'tool', 'https://windsurf.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('kiro', 'Kiro', 'tool', 'https://kiro.dev', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('trae', 'Trae', 'tool', 'https://www.trae.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('copilot', 'GitHub Copilot', 'tool', 'https://github.com/features/copilot', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('replit', 'Replit', 'tool', 'https://replit.com', '["@Replit"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('perplexity', 'Perplexity', 'tool', 'https://www.perplexity.ai', '["@perplexity_ai"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('manus', 'Manus', 'tool', 'https://manus.im', '["@ManusAI"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('poe', 'Poe', 'tool', 'https://poe.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('kling', '可灵 AI', 'tool', 'https://klingai.com', '["@Kling_ai"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('jimeng', '即梦', 'tool', 'https://jimeng.jianying.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('hailuo', '海螺 AI（MiniMax）', 'tool', 'https://hailuoai.com', '["@Hailuo_AI"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('vidu', 'Vidu', 'tool', 'https://www.vidu.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('runway', 'Runway', 'tool', 'https://runwayml.com', '["@runwayml"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('pika', 'Pika', 'tool', 'https://pika.art', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('luma', 'Luma AI', 'tool', 'https://lumalabs.ai', '["@LumaLabsAI"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('pixverse', 'PixVerse', 'tool', 'https://pixverse.ai', '["@PixVerse"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('midjourney', 'Midjourney', 'tool', 'https://www.midjourney.com', '["@midjourney"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('ideogram', 'Ideogram', 'tool', 'https://ideogram.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('krea', 'Krea', 'tool', 'https://www.krea.ai', '["@krea_ai"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('higgsfield', 'Higgsfield', 'tool', 'https://higgsfield.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('leonardo', 'Leonardo.Ai', 'tool', 'https://leonardo.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('suno', 'Suno', 'tool', 'https://suno.com', '["@suno"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('elevenlabs', 'ElevenLabs', 'tool', 'https://elevenlabs.io', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('meshy', 'Meshy', 'tool', 'https://www.meshy.ai', '["@MeshyAI"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('tripo', 'Tripo', 'tool', 'https://www.tripo3d.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('genspark', 'Genspark', 'tool', 'https://www.genspark.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('liblibtv', 'LiblibAI（含 LibTV）', 'tool', 'https://www.liblib.art', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('lovable', 'Lovable', 'tool', 'https://lovable.dev', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('niteshift', 'Niteshift', 'tool', 'https://niteshift.dev', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('devin', 'Devin（Cognition）', 'tool', 'https://devin.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('magnific', 'Magnific', 'tool', 'https://magnific.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('seaart', 'SeaArt', 'tool', 'https://www.seaart.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('pollo', 'Pollo AI', 'tool', 'https://pollo.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('gamma', 'Gamma', 'tool', 'https://gamma.app', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('otter', 'Otter.ai', 'tool', 'https://otter.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('n8n', 'n8n', 'tool', 'https://n8n.io', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('typesafe', 'TypeSafe · Jev', 'new', 'https://typesafe.ai', '["@typesafeai"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('ssi', 'Safe Superintelligence（SSI，Ilya Sutskever）', 'new', 'https://ssi.inc', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('worldlabs', 'World Labs（李飞飞）', 'new', 'https://www.worldlabs.ai', '["@theworldlabs"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('ami-labs', 'AMI Labs（Yann LeCun）', 'new', 'https://amilabs.xyz', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('thinking-machines', 'Thinking Machines Lab（Mira Murati）', 'new', 'https://thinkingmachines.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('reflection', 'Reflection AI', 'new', 'https://reflection.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('periodic', 'Periodic Labs', 'new', 'https://periodic.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('physical-intelligence', 'Physical Intelligence', 'new', 'https://www.pi.website', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('nous', 'Nous Research', 'new', 'https://nousresearch.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('prime-intellect', 'Prime Intellect', 'new', 'https://www.primeintellect.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('gmi', 'GMI Cloud', 'infra', 'https://www.gmicloud.ai', '["@gmi_cloud"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('dreamina', 'Dreamina（CapCut 国际版即梦）', 'tool', 'https://dreamina.capcut.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('lovart', 'Lovart', 'tool', 'https://www.lovart.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('adobe-firefly', 'Adobe Firefly', 'tool', 'https://firefly.adobe.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('tapnow', 'TapNow', 'tool', 'https://www.tapnow.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('aihot-resets', NULL, 'aihot', 'https://aihot.news/api/v1/codex-resets', 'lead', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('aihot-items', NULL, 'aihot', 'https://aihot.news/api/v1/items?mode=all&window=7d&limit=100', 'lead', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('hn-search', NULL, 'hn', 'https://hn.algolia.com/api/v1/search_by_date?tags=story', 'lead', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('reddit-localllama', NULL, 'reddit', 'https://www.reddit.com/r/LocalLLaMA/new/.rss', 'lead', '{"relay":"mac"}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('reddit-claudeai', NULL, 'reddit', 'https://www.reddit.com/r/ClaudeAI/new/.rss', 'lead', '{"relay":"mac"}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('reddit-singularity', NULL, 'reddit', 'https://www.reddit.com/r/singularity/new/.rss', 'lead', '{"relay":"mac"}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('google-gemini-pricing', 'google', 'web_list', 'https://ai.google.dev/gemini-api/docs/pricing', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('google-gemini-limits', 'google', 'web_list', 'https://ai.google.dev/gemini-api/docs/rate-limits', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('google-gemini-cli', 'google', 'web_list', 'https://github.com/google-gemini/gemini-cli', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('qwen-code-readme', 'qwen', 'web_list', 'https://github.com/QwenLM/qwen-code', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('aliyun-free-quota', 'aliyun', 'web_list', 'https://help.aliyun.com/zh/model-studio/new-free-quota', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('opencode-zen', 'opencode', 'web_list', 'https://opencode.ai/docs/zen/', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('cloudflare-ai-pricing', 'cloudflare', 'web_list', 'https://developers.cloudflare.com/workers-ai/platform/pricing/', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('vercel-gateway-pricing', 'vercel', 'web_list', 'https://vercel.com/docs/ai-gateway/pricing', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('groq-limits', 'groq', 'web_list', 'https://console.groq.com/docs/rate-limits', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('cerebras-limits', 'cerebras', 'web_list', 'https://inference-docs.cerebras.ai/support/rate-limits', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('hf-inference-pricing', 'hf', 'web_list', 'https://huggingface.co/docs/inference-providers/pricing', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('kiro-pricing', 'kiro', 'web_list', 'https://kiro.dev/pricing/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('moonshot-limits', 'moonshot', 'web_list', 'https://platform.moonshot.cn/docs/pricing/limits', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('zhipu-models', 'zhipu', 'web_list', 'https://docs.bigmodel.cn/cn/guide/start/model-overview', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('deepseek-pricing', 'deepseek', 'web_list', 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('cursor-changelog', 'cursor', 'web_list', 'https://cursor.com/changelog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('openai-news-rss', 'openai', 'rss', 'https://openai.com/news/rss.xml', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('linuxdo-welfare', NULL, 'feed', 'https://linux.do/c/welfare/36.rss', 'lead', '{"origin":"linuxdo","filter":"all"}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('ithome-rss', NULL, 'feed', 'https://www.ithome.com/rss/', 'lead', '{"origin":"ithome","filter":"lead"}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('gmi-blog', 'gmi', 'web_list', 'https://www.gmicloud.ai/en/blog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('gmi-pricing', 'gmi', 'web_list', 'https://www.gmicloud.ai/en/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('anthropic-pricing', 'anthropic', 'web_list', 'https://claude.com/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('anthropic-news', 'anthropic', 'web_list', 'https://www.anthropic.com/news', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('minimax-pricing-cn', 'minimax', 'web_list', 'https://platform.minimax.cn/docs/pricing/overview', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('minimax-pricing-intl', 'minimax', 'web_list', 'https://platform.minimax.io/docs/pricing/overview', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('minimax-blog', 'minimax', 'web_list', 'https://www.minimax.cn/blog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('xai-news', 'xai', 'web_list', 'https://x.ai/news', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('xai-pricing', 'xai', 'web_list', 'https://x.ai/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('mistral-pricing', 'mistral', 'web_list', 'https://mistral.ai/pricing/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('mistral-news-rss', 'mistral', 'rss', 'https://mistral.ai/news/rss', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('cohere-pricing', 'cohere', 'web_list', 'https://cohere.com/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('cohere-blog', 'cohere', 'web_list', 'https://cohere.com/blog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('baidu-home', 'baidu', 'web_list', 'https://cloud.baidu.com', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('baidu-news', 'baidu', 'web_list', 'https://cloud.baidu.com/news', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('huaweicloud-home', 'huaweicloud', 'web_list', 'https://www.huaweicloud.com', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('huaweicloud-news', 'huaweicloud', 'web_list', 'https://www.huaweicloud.com/news', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('aws-free', 'aws', 'web_list', 'https://aws.amazon.com/cn/free/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('aws-free-ai', 'aws', 'web_list', 'https://aws.amazon.com/cn/free/ai/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('aws-credits', 'aws', 'web_list', 'https://aws.amazon.com/cn/awscredits/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('gcloud-free', 'gcloud', 'web_list', 'https://cloud.google.com/free', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('gcloud-blog-rss', 'gcloud', 'rss', 'https://cloudblog.withgoogle.com/rss/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('azure-free', 'azure', 'web_list', 'https://azure.microsoft.com/en-us/pricing/purchase-options/azure-account', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('azure-blog-rss', 'azure', 'rss', 'https://azure.microsoft.com/en-us/blog/feed/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('openrouter-pricing', 'openrouter', 'web_list', 'https://openrouter.ai/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('openrouter-free-router', 'openrouter', 'web_list', 'https://openrouter.ai/openrouter/free', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('github-pricing', 'github', 'web_list', 'https://github.com/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('github-blog', 'github', 'web_list', 'https://github.blog/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('copilot-features', 'copilot', 'web_list', 'https://github.com/features/copilot/plans', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('together-pricing', 'together', 'web_list', 'https://www.together.ai/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('together-blog-rss', 'together', 'rss', 'https://www.together.ai/blog/rss.xml', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('fireworks-pricing', 'fireworks', 'web_list', 'https://fireworks.ai/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('fireworks-blog', 'fireworks', 'web_list', 'https://fireworks.ai/blog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('sambanova-pricing', 'sambanova', 'web_list', 'https://cloud.sambanova.ai/plans', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('sambanova-blog-rss', 'sambanova', 'rss', 'https://sambanova.ai/blog/rss.xml', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('sambanova-news-rss', 'sambanova', 'rss', 'https://sambanova.ai/news/rss.xml', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('deepinfra-pricing', 'deepinfra', 'web_list', 'https://deepinfra.com/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('deepinfra-blog', 'deepinfra', 'web_list', 'https://deepinfra.com/blog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('siliconflow-pricing', 'siliconflow', 'web_list', 'https://www.siliconflow.cn/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('siliconflow-news', 'siliconflow', 'web_list', 'https://www.siliconflow.cn/news', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('siliconflow-referral', 'siliconflow', 'web_list', 'https://www.siliconflow.cn/news/od7wj9rr23p95uhihmhrombp', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('ppio-pricing', 'ppio', 'web_list', 'https://ppio.com/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('ppio-news', 'ppio', 'web_list', 'https://ppio.com/news', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('ppio-model-faq', 'ppio', 'web_list', 'https://ppio.com/docs/model/FAQs', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('windsurf-pricing', 'windsurf', 'web_list', 'https://windsurf.com/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('windsurf-feed', 'windsurf', 'rss', 'https://windsurf.com/feed.xml', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('trae-pricing', 'trae', 'web_list', 'https://www.trae.ai/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('trae-blog', 'trae', 'web_list', 'https://www.trae.ai/blog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('trae-promo', 'trae', 'web_list', 'https://www.trae.ai/promo-code', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('replit-pricing', 'replit', 'web_list', 'https://replit.com/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('replit-blog', 'replit', 'web_list', 'https://replit.com/blog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('manus-pricing', 'manus', 'web_list', 'https://manus.im/en/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('kling-intl-home', 'kling', 'web_list', 'https://kling.ai/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('vidu-pricing', 'vidu', 'web_list', 'https://www.vidu.com/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('vidu-pricing-zh', 'vidu', 'web_list', 'https://www.vidu.com/zh/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('runway-pricing', 'runway', 'web_list', 'https://runway.com/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('runway-changelog', 'runway', 'web_list', 'https://runway.com/changelog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('pika-pricing', 'pika', 'web_list', 'https://pika.art/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('pika-faq', 'pika', 'web_list', 'https://pika.art/faq', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('pika-blog', 'pika', 'web_list', 'https://pika.art/blog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('luma-pricing', 'luma', 'web_list', 'https://lumalabs.ai/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('luma-changelog', 'luma', 'web_list', 'https://lumalabs.ai/changelog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('pixverse-blog-zh', 'pixverse', 'web_list', 'https://pixverse.ai/zh/blog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('pixverse-blog-en', 'pixverse', 'web_list', 'https://pixverse.ai/en/blog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('ideogram-blog', 'ideogram', 'web_list', 'https://ideogram.ai/blog/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('ideogram-pricing', 'ideogram', 'web_list', 'https://ideogram.ai/pricing/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('krea-pricing', 'krea', 'web_list', 'https://www.krea.ai/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('krea-changelog', 'krea', 'web_list', 'https://www.krea.ai/docs/changelog', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('higgsfield-changelog', 'higgsfield', 'web_list', 'https://higgsfield.ai/creator-hub/changelog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('higgsfield-blog-rss', 'higgsfield', 'rss', 'https://higgsfield.ai/blog/rss.xml', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('suno-pricing', 'suno', 'web_list', 'https://suno.com/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('suno-help-free-plan', 'suno', 'web_list', 'https://help.suno.com/en/articles/9601601', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('suno-help-credit-reset', 'suno', 'web_list', 'https://help.suno.com/en/articles/2524993', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('suno-blog', 'suno', 'web_list', 'https://suno.com/blog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('elevenlabs-pricing', 'elevenlabs', 'web_list', 'https://elevenlabs.io/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('elevenlabs-pricing-api', 'elevenlabs', 'web_list', 'https://elevenlabs.io/pricing/api', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('elevenlabs-blog', 'elevenlabs', 'web_list', 'https://elevenlabs.io/blog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('meshy-pricing', 'meshy', 'web_list', 'https://www.meshy.ai/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('meshy-blog', 'meshy', 'web_list', 'https://www.meshy.ai/blog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('tripo-pricing', 'tripo', 'web_list', 'https://www.tripo3d.ai/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('tripo-pricing-zh', 'tripo', 'web_list', 'https://www.tripo3d.ai/zh/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('tripo-blog', 'tripo', 'web_list', 'https://www.tripo3d.ai/blog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('microsoft-ai-blog', 'microsoft-ai', 'web_list', 'https://microsoft.ai/blog/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('sakana-feed', 'sakana', 'rss', 'https://sakana.ai/feed', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('novita-pricing', 'novita', 'web_list', 'https://novita.ai/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('novita-blog', 'novita', 'web_list', 'https://novita.ai/blog/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('qiniu-ai-plan', 'qiniu', 'web_list', 'https://www.qiniu.com/ai/plan', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('qiniu-activity', 'qiniu', 'web_list', 'https://www.qiniu.com/activity', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('qiniu-news', 'qiniu', 'web_list', 'https://www.qiniu.com/news', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('genspark-credits-guide', 'genspark', 'web_list', 'https://www.genspark.ai/helpcenter/credits-guide', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('genspark-membership', 'genspark', 'web_list', 'https://www.genspark.ai/helpcenter/membership-plans', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('genspark-blog', 'genspark', 'web_list', 'https://www.genspark.ai/blog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('lovable-pricing', 'lovable', 'web_list', 'https://lovable.dev/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('lovable-blog-rss', 'lovable', 'rss', 'https://lovable.dev/blog/rss.xml', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('lovable-changelog', 'lovable', 'web_list', 'https://docs.lovable.dev/changelog', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('devin-pricing', 'devin', 'web_list', 'https://devin.ai/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('devin-feed', 'devin', 'rss', 'https://devin.ai/rss.xml', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('magnific-pricing', 'magnific', 'web_list', 'https://www.magnific.com/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('seaart-blog', 'seaart', 'web_list', 'https://www.seaart.ai/blog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('seaart-news', 'seaart', 'web_list', 'https://www.seaart.ai/news', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('pollo-pricing', 'pollo', 'web_list', 'https://pollo.ai/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('pollo-faqs', 'pollo', 'web_list', 'https://pollo.ai/faqs', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('otter-pricing', 'otter', 'web_list', 'https://otter.ai/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('otter-referral', 'otter', 'web_list', 'https://otter.ai/referral-terms', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('n8n-pricing', 'n8n', 'web_list', 'https://n8n.io/pricing/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('n8n-blog-rss', 'n8n', 'rss', 'https://blog.n8n.io/rss/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('ssi-updates', 'ssi', 'web_list', 'https://ssi.inc/updates', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('worldlabs-blog', 'worldlabs', 'web_list', 'https://www.worldlabs.ai/blog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('thinking-machines-news', 'thinking-machines', 'web_list', 'https://thinkingmachines.ai/news/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('thinking-machines-blog', 'thinking-machines', 'web_list', 'https://thinkingmachines.ai/blog/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('reflection-news', 'reflection', 'web_list', 'https://reflection.ai/news', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('nous-blog', 'nous', 'web_list', 'https://nousresearch.com/blog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('nous-releases', 'nous', 'web_list', 'https://nousresearch.com/releases', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('prime-intellect-blog', 'prime-intellect', 'web_list', 'https://www.primeintellect.ai/blog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('stepfun-platform', 'stepfun', 'web_list', 'https://platform.stepfun.com/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('stepfun-step-plan', 'stepfun', 'web_list', 'https://platform.stepfun.com/step-plan', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('meta-llama-api', 'meta', 'web_list', 'https://www.llama.com/products/llama-api/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('meituan-longcat-docs', 'meituan', 'web_list', 'https://longcat.chat/platform/docs/zh/', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('volc-free-quota', 'volc', 'web_list', 'https://www.volcengine.com/docs/82379/1544106', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('volc-activity', 'volc', 'web_list', 'https://www.volcengine.com/activity/ark', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('tencent-free', 'tencent', 'web_list', 'https://cloud.tencent.com/act/free', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('tencent-hy-pricing', 'tencent-hy', 'web_list', 'https://cloud.tencent.com/document/product/1729/97731', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('nvidia-build', 'nvidia', 'web_list', 'https://build.nvidia.com/explore/discover', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('modelscope-api-inference', 'modelscope', 'web_list', 'https://modelscope.cn/docs/model-service/API-Inference/intro', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('perplexity-api-pricing', 'perplexity', 'web_list', 'https://docs.perplexity.ai/getting-started/pricing', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('poe-about', 'poe', 'web_list', 'https://poe.com/about', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('hailuo-home', 'hailuo', 'web_list', 'https://hailuoai.com/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('midjourney-plans', 'midjourney', 'web_list', 'https://docs.midjourney.com/hc/en-us/articles/27870484040333-Comparing-Midjourney-Plans', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('leonardo-api-pricing', 'leonardo', 'web_list', 'https://docs.leonardo.ai/docs/plan-with-the-pricing-calculator', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('leonardo-tokens-help', 'leonardo', 'web_list', 'https://intercom.help/leonardo-ai/en/articles/8044018-what-are-tokens-and-how-do-they-work', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('doubao-seed-blog', 'doubao', 'web_list', 'https://team.doubao.com/zh/blog', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('jimeng-home', 'jimeng', 'web_list', 'https://jimeng.jianying.com/ai-tool/home', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('gamma-pricing', 'gamma', 'web_list', 'https://gamma.app/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('ucloud-modelverse-price', 'ucloud', 'web_list', 'https://astraflow.ucloud.cn/docs/modelverse/price', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('ucloud-activity', 'ucloud', 'web_list', 'https://www.ucloud.cn/site/active/agi.html', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('baichuan-price', 'baichuan', 'web_list', 'https://platform.baichuan-ai.com/docs/price', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('baichuan-home', 'baichuan', 'web_list', 'https://www.baichuan-ai.com/home', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('xiaomi-mimo-home', 'xiaomi-mimo', 'web_list', 'https://mimo.mi.com/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('xiaomi-mimo-platform', 'xiaomi-mimo', 'web_list', 'https://platform.xiaomimimo.com/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('moark-getting-started', 'moark', 'web_list', 'https://ai.gitee.com/docs/getting-started', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('liblibtv-home', 'liblibtv', 'web_list', 'https://www.liblib.tv/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('nex-agi-home', 'nex-agi', 'web_list', 'https://nex.sii.edu.cn', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('niteshift-pricing', 'niteshift', 'web_list', 'https://niteshift.dev/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('typesafe-home', 'typesafe', 'web_list', 'https://typesafe.ai/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('ami-labs-home', 'ami-labs', 'web_list', 'https://amilabs.xyz/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('periodic-home', 'periodic', 'web_list', 'https://periodic.com/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('physical-intelligence-home', 'physical-intelligence', 'web_list', 'https://www.pi.website/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('dreamina-home', 'dreamina', 'web_list', 'https://dreamina.capcut.com/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('dreamina-sept-offer-faq', 'dreamina', 'web_list', 'https://dreamina.capcut.com/resource/dreamina-september-offer-faq-2026', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('lovart-pricing', 'lovart', 'web_list', 'https://www.lovart.ai/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('liblib-home', 'liblibtv', 'web_list', 'https://www.liblib.art/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('adobe-firefly-credits-faq', 'adobe-firefly', 'web_list', 'https://helpx.adobe.com/creative-cloud/apps/generative-ai/generative-credits-faq.html', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('adobe-firefly-plans', 'adobe-firefly', 'web_list', 'https://www.adobe.com/products/firefly/plans.html', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('tapnow-terms', 'tapnow', 'web_list', 'https://www.tapnow.ai/terms-of-service', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('volc-free-inference-quota', 'volc', 'web_list', 'https://www.volcengine.com/docs/ark/free-inference-quota?lang=zh', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('moonshot-api-free-trial', 'moonshot', 'web_list', 'https://www.kimi.com/zh-cn/help/kimi-api/api-free-trial', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('moonshot-promotion', 'moonshot', 'web_list', 'https://platform.kimi.com/docs/pricing/promotion', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('baidu-qianfan-free-notice', 'baidu', 'web_list', 'https://cloud.baidu.com/news/notice_c7a145b9-5c99-4870-939f-e09ba506aab3', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('leonardo-token-usage', 'leonardo', 'web_list', 'https://intercom.help/leonardo-ai/en/articles/8044033-token-usage', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('modelscope-learn-free-models', 'modelscope', 'web_list', 'https://modelscope.cn/learn/2022', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('stepfun-step-plan-docs', 'stepfun', 'web_list', 'https://platform.stepfun.com/docs/zh/step-plan/overview', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('cursor-pricing', 'cursor', 'web_list', 'https://cursor.com/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('qwen-code-auth-docs', 'qwen', 'web_list', 'https://qwenlm.github.io/qwen-code-docs/zh/users/configuration/auth/', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('manus-help-membership', 'manus', 'web_list', 'https://help.manus.im/en/articles/11711111-what-is-the-current-membership-pricing-for-manus', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('manus-help-offers', 'manus', 'web_list', 'https://help.manus.im/en/articles/11813668-are-there-any-discounts-or-special-offers', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('seaart-mall', 'seaart', 'web_list', 'https://www.seaart.ai/mall', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('worldlabs-marble-pricing', 'worldlabs', 'web_list', 'https://marble.worldlabs.ai/pricing', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('adobe-firefly-credits-access', 'adobe-firefly', 'web_list', 'https://helpx.adobe.com/creative-cloud/apps/generative-ai/generative-credits-access-and-use.html', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('thinking-machines-tinker-grants', 'thinking-machines', 'web_list', 'https://thinkingmachines.ai/news/tinker-research-and-teaching-grants/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('thinking-machines-tinker', 'thinking-machines', 'web_list', 'https://thinkingmachines.ai/tinker/', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('nous-portal-plans', 'nous', 'web_list', 'https://portal.nousresearch.com/manage-subscription', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('pixverse-subscribe', 'pixverse', 'web_list', 'https://app.pixverse.ai/subscribe', 'site', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('meituan-longcat-faq', 'meituan', 'web_list', 'https://longcat.chat/platform/docs/zh/faq', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('meituan-longcat-changelog', 'meituan', 'web_list', 'https://longcat.chat/platform/docs/zh/change-log', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config) VALUES ('minimax-token-plan-announcements', 'minimax', 'web_list', 'https://platform.minimax.cn/docs/token-plan/announcements', 'docs', '{}')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
