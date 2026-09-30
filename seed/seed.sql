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
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('meituan', '美团 LongCat', 'lab', NULL, '["@Meituan_LongCat"]', '[]')
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
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('xiaomi-mimo', '小米 MiMo', 'lab', NULL, '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('sakana', 'Sakana AI（Fugu）', 'lab', 'https://sakana.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('nex-agi', 'Nex AGI', 'lab', NULL, '[]', '[]')
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
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('moark', '模力方舟', 'infra', NULL, '[]', '[]')
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
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('liblibtv', 'LiblibTV', 'tool', NULL, '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('lovable', 'Lovable', 'tool', 'https://lovable.dev', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('niteshift', 'Niteshift', 'tool', NULL, '[]', '[]')
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
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('palantir', 'Palantir（AIP）', 'tool', 'https://www.palantir.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('harvey', 'Harvey', 'tool', 'https://www.harvey.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('pixiebrix', 'PixieBrix', 'tool', 'https://www.pixiebrix.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('n8n', 'n8n', 'tool', 'https://n8n.io', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('typesafe', 'TypeSafe · Jev', 'new', NULL, '["@typesafeai"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('ssi', 'Safe Superintelligence（SSI，Ilya Sutskever）', 'new', 'https://ssi.inc', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('worldlabs', 'World Labs（李飞飞）', 'new', 'https://www.worldlabs.ai', '["@theworldlabs"]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('ami-labs', 'AMI Labs（Yann LeCun）', 'new', NULL, '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('thinking-machines', 'Thinking Machines Lab（Mira Murati）', 'new', 'https://thinkingmachines.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('reflection', 'Reflection AI', 'new', 'https://reflection.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('periodic', 'Periodic Labs', 'new', NULL, '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('physical-intelligence', 'Physical Intelligence', 'new', NULL, '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('nous', 'Nous Research', 'new', 'https://nousresearch.com', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles) VALUES ('prime-intellect', 'Prime Intellect', 'new', 'https://www.primeintellect.ai', '[]', '[]')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO sources (id, platform_id, kind, url, tier) VALUES ('aihot-resets', NULL, 'aihot', 'https://aihot.news/api/v1/codex-resets', 'lead')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier;
INSERT INTO sources (id, platform_id, kind, url, tier) VALUES ('aihot-items', NULL, 'aihot', 'https://aihot.news/api/v1/items?mode=all&window=24h', 'lead')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier;
INSERT INTO sources (id, platform_id, kind, url, tier) VALUES ('hn-search', NULL, 'hn', 'https://hn.algolia.com/api/v1/search_by_date?tags=story', 'lead')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier;
INSERT INTO sources (id, platform_id, kind, url, tier) VALUES ('reddit-localllama', NULL, 'reddit', 'https://www.reddit.com/r/LocalLLaMA/new/.rss', 'lead')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier;
INSERT INTO sources (id, platform_id, kind, url, tier) VALUES ('reddit-claudeai', NULL, 'reddit', 'https://www.reddit.com/r/ClaudeAI/new/.rss', 'lead')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier;
INSERT INTO sources (id, platform_id, kind, url, tier) VALUES ('reddit-singularity', NULL, 'reddit', 'https://www.reddit.com/r/singularity/new/.rss', 'lead')
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier;
