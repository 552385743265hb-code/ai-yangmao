-- 由 scripts/gen-seed.ts 生成，勿手改
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('openai', 'OpenAI', 'lab', 'https://openai.com', '["@OpenAI","@OpenAIDevs","@ChatGPT"]', '["@thsottiaux"]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('anthropic', 'Anthropic', 'lab', 'https://www.anthropic.com', '["@AnthropicAI","@claudeai","@ClaudeDevs"]', '["@bcherny","@trq212","@noahzweben"]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('google', 'Google AI（Gemini / AI Studio）', 'lab', 'https://ai.google.dev', '["@GeminiApp","@GoogleAI"]', '["@OfficialLoganK"]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('deepseek', 'DeepSeek', 'lab', 'https://www.deepseek.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('moonshot', 'Kimi 开放平台（月之暗面）', 'lab', 'https://platform.moonshot.cn', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('zhipu', '智谱 Z.ai', 'lab', 'https://bigmodel.cn', '[]', '[]', 'ZCode（gh_035653357d11）')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('minimax', 'MiniMax', 'lab', 'https://www.minimaxi.com', '["@MiniMax_AI"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('stepfun', '阶跃星辰', 'lab', 'https://www.stepfun.com', '["@StepFun_ai"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('xai', 'xAI', 'lab', 'https://x.ai', '["@grok"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('mistral', 'Mistral AI', 'lab', 'https://mistral.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('meta', 'Meta Llama', 'lab', 'https://www.llama.com', '["@AIatMeta"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('cohere', 'Cohere', 'lab', 'https://cohere.com', '["@cohere"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('meituan', '美团 LongCat', 'lab', 'https://longcat.chat', '["@Meituan_LongCat"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('baichuan', '百川智能', 'lab', 'https://www.baichuan-ai.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('qwen', '阿里 Qwen（通义千问 App / Qwen Code）', 'lab', 'https://qwen.ai', '["@Alibaba_Qwen"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('doubao', '字节跳动 豆包 Doubao', 'lab', 'https://www.doubao.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('tencent-hy', '腾讯混元 HY（含 WorkBuddy）', 'lab', 'https://hunyuan.tencent.com', '["@TencentHunyuan"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('microsoft-ai', 'Microsoft AI（Copilot）', 'lab', 'https://microsoft.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('xiaomi-mimo', '小米 MiMo', 'lab', 'https://mimo.mi.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('sakana', 'Sakana AI（Fugu）', 'lab', 'https://sakana.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('nex-agi', 'Nex AGI', 'lab', 'https://nex.sii.edu.cn', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('aliyun', '阿里云百炼', 'cloud', 'https://bailian.console.aliyun.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('volc', '火山方舟', 'cloud', 'https://www.volcengine.com/product/ark', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('tencent', '腾讯云', 'cloud', 'https://cloud.tencent.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('baidu', '百度千帆', 'cloud', 'https://cloud.baidu.com', '["@Baidu_Inc"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('huaweicloud', '华为云', 'cloud', 'https://www.huaweicloud.com', '["@HuaweiCloud1"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('aws', 'AWS', 'cloud', 'https://aws.amazon.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('gcloud', 'Google Cloud', 'cloud', 'https://cloud.google.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('azure', 'Microsoft Azure', 'cloud', 'https://azure.microsoft.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('openrouter', 'OpenRouter', 'infra', 'https://openrouter.ai', '["@OpenRouter"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('opencode', 'OpenCode（Zen / Go）', 'infra', 'https://opencode.ai', '["@opencode"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('vercel', 'Vercel AI Gateway', 'infra', 'https://vercel.com/ai-gateway', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('cloudflare', 'Cloudflare Workers AI', 'infra', 'https://developers.cloudflare.com/workers-ai/', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('github', 'GitHub Models', 'infra', 'https://github.com/marketplace/models', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('hf', 'Hugging Face', 'infra', 'https://huggingface.co', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('groq', 'Groq', 'infra', 'https://groq.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('cerebras', 'Cerebras', 'infra', 'https://www.cerebras.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('together', 'Together AI', 'infra', 'https://www.together.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('fireworks', 'Fireworks AI', 'infra', 'https://fireworks.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('sambanova', 'SambaNova', 'infra', 'https://sambanova.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('nvidia', 'NVIDIA NIM', 'infra', 'https://build.nvidia.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('deepinfra', 'DeepInfra', 'infra', 'https://deepinfra.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('siliconflow', '硅基流动', 'infra', 'https://siliconflow.cn', '["@SiliconFlowAI"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('modelscope', '魔搭 ModelScope', 'infra', 'https://modelscope.cn', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('ppio', 'PPIO 派欧云', 'infra', 'https://ppio.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('novita', 'Novita AI', 'infra', 'https://novita.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('qiniu', '七牛云 AI', 'infra', 'https://www.qiniu.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('ucloud', 'UCloud 星图', 'infra', 'https://www.ucloud.cn', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('moark', '模力方舟', 'infra', 'https://ai.gitee.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('cursor', 'Cursor（Anysphere）', 'tool', 'https://cursor.com', '[]', '["@ericzakariasson"]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('windsurf', 'Windsurf', 'tool', 'https://windsurf.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('kiro', 'Kiro', 'tool', 'https://kiro.dev', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('trae', 'Trae', 'tool', 'https://www.trae.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('copilot', 'GitHub Copilot', 'tool', 'https://github.com/features/copilot', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('replit', 'Replit', 'tool', 'https://replit.com', '["@Replit"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('perplexity', 'Perplexity', 'tool', 'https://www.perplexity.ai', '["@perplexity_ai"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('manus', 'Manus', 'tool', 'https://manus.im', '["@ManusAI"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('poe', 'Poe', 'tool', 'https://poe.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('kling', '可灵 AI', 'tool', 'https://klingai.com', '["@Kling_ai"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('jimeng', '即梦', 'tool', 'https://jimeng.jianying.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('hailuo', '海螺 AI（MiniMax）', 'tool', 'https://hailuoai.com', '["@Hailuo_AI"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('vidu', 'Vidu', 'tool', 'https://www.vidu.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('runway', 'Runway', 'tool', 'https://runwayml.com', '["@runwayml"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('pika', 'Pika', 'tool', 'https://pika.art', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('luma', 'Luma AI', 'tool', 'https://lumalabs.ai', '["@LumaLabsAI"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('pixverse', 'PixVerse', 'tool', 'https://pixverse.ai', '["@PixVerse"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('midjourney', 'Midjourney', 'tool', 'https://www.midjourney.com', '["@midjourney"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('ideogram', 'Ideogram', 'tool', 'https://ideogram.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('krea', 'Krea', 'tool', 'https://www.krea.ai', '["@krea_ai"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('higgsfield', 'Higgsfield', 'tool', 'https://higgsfield.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('leonardo', 'Leonardo.Ai', 'tool', 'https://leonardo.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('suno', 'Suno', 'tool', 'https://suno.com', '["@suno"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('elevenlabs', 'ElevenLabs', 'tool', 'https://elevenlabs.io', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('meshy', 'Meshy', 'tool', 'https://www.meshy.ai', '["@MeshyAI"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('tripo', 'Tripo', 'tool', 'https://www.tripo3d.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('genspark', 'Genspark', 'tool', 'https://www.genspark.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('liblibtv', 'LiblibAI（含 LibTV）', 'tool', 'https://www.liblib.art', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('lovable', 'Lovable', 'tool', 'https://lovable.dev', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('niteshift', 'Niteshift', 'tool', 'https://niteshift.dev', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('devin', 'Devin（Cognition）', 'tool', 'https://devin.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('magnific', 'Magnific', 'tool', 'https://www.magnific.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('seaart', 'SeaArt', 'tool', 'https://www.seaart.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('pollo', 'Pollo AI', 'tool', 'https://pollo.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('gamma', 'Gamma', 'tool', 'https://gamma.app', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('otter', 'Otter.ai', 'tool', 'https://otter.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('n8n', 'n8n', 'tool', 'https://n8n.io', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('typesafe', 'TypeSafe · Jev', 'new', 'https://typesafe.ai', '["@typesafeai"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('ssi', 'Safe Superintelligence（SSI，Ilya Sutskever）', 'new', 'https://ssi.inc', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('worldlabs', 'World Labs（李飞飞）', 'new', 'https://www.worldlabs.ai', '["@theworldlabs"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('ami-labs', 'AMI Labs（Yann LeCun）', 'new', 'https://amilabs.xyz', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('thinking-machines', 'Thinking Machines Lab（Mira Murati）', 'new', 'https://thinkingmachines.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('reflection', 'Reflection AI', 'new', 'https://reflection.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('periodic', 'Periodic Labs', 'new', 'https://periodic.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('physical-intelligence', 'Physical Intelligence', 'new', 'https://www.pi.website', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('nous', 'Nous Research', 'new', 'https://nousresearch.com', '["@NousResearch"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('prime-intellect', 'Prime Intellect', 'new', 'https://www.primeintellect.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('gmi', 'GMI Cloud', 'infra', 'https://www.gmicloud.ai', '["@gmi_cloud"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('dreamina', 'Dreamina（CapCut 国际版即梦）', 'tool', 'https://dreamina.capcut.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('lovart', 'Lovart', 'tool', 'https://www.lovart.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('adobe-firefly', 'Adobe Firefly', 'tool', 'https://firefly.adobe.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('tapnow', 'TapNow', 'tool', 'https://www.tapnow.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('inception', 'Inception', 'lab', 'https://www.inceptionlabs.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('browser-use', 'Browser Use', 'tool', 'https://browser-use.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('hume', 'Hume AI', 'lab', 'https://www.hume.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('free-ai', 'Free.ai', 'tool', 'https://free.ai', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('qwenwork', '千问办公', 'tool', 'https://qwenwork.cn', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('doubao-work', '豆包工作', 'tool', 'https://www.doubao.com/work', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('coze', '扣子', 'tool', 'https://www.coze.cn', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('lingxi', 'WPS 灵犀', 'tool', 'https://www.lingxi.cn', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('workbuddy', 'WorkBuddy', 'tool', 'https://www.workbuddy.cn', '["@WorkBuddy_AI"]', '[]', '腾讯WorkBuddy')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('sensenova', '商汤 SenseNova（日日新）', 'lab', 'https://platform.sensenova.cn', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('qoder', '阿里 Qoder（CN / International）', 'tool', 'https://qoder.cn', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('tokenrhythm', '基元律动 TokenRhythm', 'infra', 'https://tokenrhythm.studio', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('cline', 'Cline', 'tool', 'https://cline.bot', '["@cline"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('oiioii', 'OiiOii（AI 动画创作）', 'tool', 'https://www.oiioii.ai', '["@OiiOii_AI"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('kilo', 'Kilo Code', 'tool', 'https://kilo.ai', '["@kilocode"]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('instinct', 'Instinct（Spear Street Technology）', 'tool', 'https://instinct.com', '[]', '[]', NULL)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO platforms (id, name, type, site, x_handles, staff_handles, wechat) VALUES ('unisound', '云知声 Unisound（Token Hub）', 'lab', 'https://maas.unisound.com/', '["@unisound219649"]', '[]', 'http://weixin.qq.com/r/b3XTywHEo1zcrUWo9yB9')
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, site=excluded.site, x_handles=excluded.x_handles, staff_handles=excluded.staff_handles, wechat=COALESCE(excluded.wechat, platforms.wechat), updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('aihot-resets', NULL, 'aihot', 'https://aihot.news/api/v1/codex-resets', 'lead', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('aihot-items', NULL, 'aihot', 'https://aihot.news/api/v1/items?mode=all&window=7d&limit=100', 'lead', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('hn-search', NULL, 'hn', 'https://hn.algolia.com/api/v1/search_by_date?tags=story', 'lead', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('reddit-localllama', NULL, 'reddit', 'https://www.reddit.com/r/LocalLLaMA/new/.rss', 'lead', '{"relay":"mac"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('reddit-claudeai', NULL, 'reddit', 'https://www.reddit.com/r/ClaudeAI/new/.rss', 'lead', '{"relay":"mac"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('reddit-singularity', NULL, 'reddit', 'https://www.reddit.com/r/singularity/new/.rss', 'lead', '{"relay":"mac"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('google-gemini-pricing', 'google', 'web_list', 'https://ai.google.dev/gemini-api/docs/pricing', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('google-gemini-limits', 'google', 'web_list', 'https://ai.google.dev/gemini-api/docs/rate-limits', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('google-gemini-cli', 'google', 'web_list', 'https://github.com/google-gemini/gemini-cli', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('qwen-code-readme', 'qwen', 'web_list', 'https://github.com/QwenLM/qwen-code', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('aliyun-free-quota', 'aliyun', 'web_list', 'https://help.aliyun.com/zh/model-studio/new-free-quota', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('opencode-zen', 'opencode', 'web_list', 'https://opencode.ai/docs/zen/', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('cloudflare-ai-pricing', 'cloudflare', 'web_list', 'https://developers.cloudflare.com/workers-ai/platform/pricing/', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('vercel-gateway-pricing', 'vercel', 'web_list', 'https://vercel.com/docs/ai-gateway/pricing', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('groq-limits', 'groq', 'web_list', 'https://console.groq.com/docs/rate-limits', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('cerebras-limits', 'cerebras', 'web_list', 'https://inference-docs.cerebras.ai/support/rate-limits', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('hf-inference-pricing', 'hf', 'web_list', 'https://huggingface.co/docs/inference-providers/pricing', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('kiro-pricing', 'kiro', 'web_list', 'https://kiro.dev/pricing/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('moonshot-limits', 'moonshot', 'web_list', 'https://platform.moonshot.cn/docs/pricing/limits', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('zhipu-models', 'zhipu', 'web_list', 'https://docs.bigmodel.cn/cn/guide/start/model-overview', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('deepseek-pricing', 'deepseek', 'web_list', 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('cursor-changelog', 'cursor', 'web_list', 'https://cursor.com/changelog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('openai-news-rss', 'openai', 'rss', 'https://openai.com/news/rss.xml', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('linuxdo-welfare', NULL, 'feed', 'https://linux.do/c/welfare/36.rss', 'lead', '{"origin":"linuxdo","filter":"all"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('ithome-rss', NULL, 'feed', 'https://www.ithome.com/rss/', 'lead', '{"origin":"ithome","filter":"lead"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('gmi-blog', 'gmi', 'web_list', 'https://www.gmicloud.ai/en/blog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('gmi-pricing', 'gmi', 'web_list', 'https://www.gmicloud.ai/en/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('anthropic-pricing', 'anthropic', 'web_list', 'https://claude.com/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('anthropic-news', 'anthropic', 'web_list', 'https://www.anthropic.com/news', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('minimax-pricing-cn', 'minimax', 'web_list', 'https://platform.minimax.cn/docs/pricing/overview', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('minimax-pricing-intl', 'minimax', 'web_list', 'https://platform.minimax.io/docs/pricing/overview', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('minimax-blog', 'minimax', 'web_list', 'https://www.minimax.cn/blog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('xai-news', 'xai', 'web_list', 'https://x.ai/news', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('xai-pricing', 'xai', 'web_list', 'https://x.ai/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('mistral-pricing', 'mistral', 'web_list', 'https://mistral.ai/pricing/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('mistral-news-rss', 'mistral', 'rss', 'https://mistral.ai/news/rss', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('cohere-pricing', 'cohere', 'web_list', 'https://cohere.com/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('cohere-blog', 'cohere', 'web_list', 'https://cohere.com/blog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('baidu-home', 'baidu', 'web_list', 'https://cloud.baidu.com', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('baidu-news', 'baidu', 'web_list', 'https://cloud.baidu.com/news', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('huaweicloud-home', 'huaweicloud', 'web_list', 'https://www.huaweicloud.com', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('huaweicloud-news', 'huaweicloud', 'web_list', 'https://www.huaweicloud.com/news', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('aws-free', 'aws', 'web_list', 'https://aws.amazon.com/cn/free/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('aws-free-ai', 'aws', 'web_list', 'https://aws.amazon.com/cn/free/ai/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('aws-credits', 'aws', 'web_list', 'https://aws.amazon.com/cn/awscredits/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('gcloud-free', 'gcloud', 'web_list', 'https://cloud.google.com/free', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('gcloud-blog-rss', 'gcloud', 'rss', 'https://cloudblog.withgoogle.com/rss/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('azure-free', 'azure', 'web_list', 'https://azure.microsoft.com/en-us/pricing/purchase-options/azure-account', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('azure-blog-rss', 'azure', 'rss', 'https://azure.microsoft.com/en-us/blog/feed/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('openrouter-pricing', 'openrouter', 'web_list', 'https://openrouter.ai/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('openrouter-free-router', 'openrouter', 'web_list', 'https://openrouter.ai/openrouter/free', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('github-pricing', 'github', 'web_list', 'https://github.com/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('github-blog', 'github', 'web_list', 'https://github.blog/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('copilot-features', 'copilot', 'web_list', 'https://github.com/features/copilot/plans', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('together-pricing', 'together', 'web_list', 'https://www.together.ai/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('together-blog-rss', 'together', 'rss', 'https://www.together.ai/blog/rss.xml', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('fireworks-pricing', 'fireworks', 'web_list', 'https://fireworks.ai/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('fireworks-blog', 'fireworks', 'web_list', 'https://fireworks.ai/blog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('sambanova-pricing', 'sambanova', 'web_list', 'https://cloud.sambanova.ai/plans', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('sambanova-blog-rss', 'sambanova', 'rss', 'https://sambanova.ai/blog/rss.xml', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('sambanova-news-rss', 'sambanova', 'rss', 'https://sambanova.ai/news/rss.xml', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('deepinfra-pricing', 'deepinfra', 'web_list', 'https://deepinfra.com/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('deepinfra-blog', 'deepinfra', 'web_list', 'https://deepinfra.com/blog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('siliconflow-pricing', 'siliconflow', 'web_list', 'https://www.siliconflow.cn/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('siliconflow-news', 'siliconflow', 'web_list', 'https://www.siliconflow.cn/news', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('siliconflow-referral', 'siliconflow', 'web_list', 'https://www.siliconflow.cn/news/od7wj9rr23p95uhihmhrombp', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('ppio-pricing', 'ppio', 'web_list', 'https://ppio.com/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('ppio-news', 'ppio', 'web_list', 'https://ppio.com/news', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('ppio-model-faq', 'ppio', 'web_list', 'https://ppio.com/docs/model/FAQs', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('windsurf-pricing', 'windsurf', 'web_list', 'https://windsurf.com/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('windsurf-feed', 'windsurf', 'rss', 'https://windsurf.com/feed.xml', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('trae-pricing', 'trae', 'web_list', 'https://www.trae.ai/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('trae-blog', 'trae', 'web_list', 'https://www.trae.ai/blog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('trae-promo', 'trae', 'web_list', 'https://www.trae.ai/promo-code', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('replit-pricing', 'replit', 'web_list', 'https://replit.com/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('replit-blog', 'replit', 'web_list', 'https://replit.com/blog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('manus-pricing', 'manus', 'web_list', 'https://manus.im/en/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('kling-intl-home', 'kling', 'web_list', 'https://kling.ai/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('vidu-pricing', 'vidu', 'web_list', 'https://www.vidu.com/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('vidu-pricing-zh', 'vidu', 'web_list', 'https://www.vidu.com/zh/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('runway-pricing', 'runway', 'web_list', 'https://runway.com/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('runway-changelog', 'runway', 'web_list', 'https://runway.com/changelog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('pika-pricing', 'pika', 'web_list', 'https://pika.art/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('pika-faq', 'pika', 'web_list', 'https://pika.art/faq', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('pika-blog', 'pika', 'web_list', 'https://pika.art/blog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('luma-pricing', 'luma', 'web_list', 'https://lumalabs.ai/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('luma-changelog', 'luma', 'web_list', 'https://lumalabs.ai/changelog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('pixverse-blog-zh', 'pixverse', 'web_list', 'https://pixverse.ai/zh/blog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('pixverse-blog-en', 'pixverse', 'web_list', 'https://pixverse.ai/en/blog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('ideogram-blog', 'ideogram', 'web_list', 'https://ideogram.ai/blog/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('ideogram-pricing', 'ideogram', 'web_list', 'https://ideogram.ai/pricing/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('krea-pricing', 'krea', 'web_list', 'https://www.krea.ai/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('krea-changelog', 'krea', 'web_list', 'https://www.krea.ai/docs/changelog', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('higgsfield-changelog', 'higgsfield', 'web_list', 'https://higgsfield.ai/creator-hub/changelog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('higgsfield-blog-rss', 'higgsfield', 'rss', 'https://higgsfield.ai/blog/rss.xml', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('suno-pricing', 'suno', 'web_list', 'https://suno.com/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('suno-help-free-plan', 'suno', 'web_list', 'https://help.suno.com/en/articles/9601601', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('suno-help-credit-reset', 'suno', 'web_list', 'https://help.suno.com/en/articles/2524993', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('suno-blog', 'suno', 'web_list', 'https://suno.com/blog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('elevenlabs-pricing', 'elevenlabs', 'web_list', 'https://elevenlabs.io/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('elevenlabs-pricing-api', 'elevenlabs', 'web_list', 'https://elevenlabs.io/pricing/api', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('elevenlabs-blog', 'elevenlabs', 'web_list', 'https://elevenlabs.io/blog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('meshy-pricing', 'meshy', 'web_list', 'https://www.meshy.ai/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('meshy-blog', 'meshy', 'web_list', 'https://www.meshy.ai/blog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('tripo-pricing', 'tripo', 'web_list', 'https://www.tripo3d.ai/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('tripo-pricing-zh', 'tripo', 'web_list', 'https://www.tripo3d.ai/zh/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('tripo-blog', 'tripo', 'web_list', 'https://www.tripo3d.ai/blog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('microsoft-ai-blog', 'microsoft-ai', 'web_list', 'https://microsoft.ai/blog/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('sakana-feed', 'sakana', 'rss', 'https://sakana.ai/feed', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('novita-pricing', 'novita', 'web_list', 'https://novita.ai/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('novita-blog', 'novita', 'web_list', 'https://novita.ai/blog/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('qiniu-ai-plan', 'qiniu', 'web_list', 'https://www.qiniu.com/ai/plan', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('qiniu-activity', 'qiniu', 'web_list', 'https://www.qiniu.com/activity', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('qiniu-news', 'qiniu', 'web_list', 'https://www.qiniu.com/news', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('genspark-credits-guide', 'genspark', 'web_list', 'https://www.genspark.ai/helpcenter/credits-guide', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('genspark-membership', 'genspark', 'web_list', 'https://www.genspark.ai/helpcenter/membership-plans', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('genspark-blog', 'genspark', 'web_list', 'https://www.genspark.ai/blog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('lovable-pricing', 'lovable', 'web_list', 'https://lovable.dev/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('lovable-blog-rss', 'lovable', 'rss', 'https://lovable.dev/blog/rss.xml', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('lovable-changelog', 'lovable', 'web_list', 'https://docs.lovable.dev/changelog', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('devin-pricing', 'devin', 'web_list', 'https://devin.ai/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('devin-feed', 'devin', 'rss', 'https://devin.ai/rss.xml', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('magnific-pricing', 'magnific', 'web_list', 'https://www.magnific.com/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('seaart-blog', 'seaart', 'web_list', 'https://www.seaart.ai/blog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('seaart-news', 'seaart', 'web_list', 'https://www.seaart.ai/news', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('pollo-pricing', 'pollo', 'web_list', 'https://pollo.ai/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('pollo-faqs', 'pollo', 'web_list', 'https://pollo.ai/faqs', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('otter-pricing', 'otter', 'web_list', 'https://otter.ai/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('otter-referral', 'otter', 'web_list', 'https://otter.ai/referral-terms', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('n8n-pricing', 'n8n', 'web_list', 'https://n8n.io/pricing/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('n8n-blog-rss', 'n8n', 'rss', 'https://blog.n8n.io/rss/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('ssi-updates', 'ssi', 'web_list', 'https://ssi.inc/updates', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('worldlabs-blog', 'worldlabs', 'web_list', 'https://www.worldlabs.ai/blog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('thinking-machines-news', 'thinking-machines', 'web_list', 'https://thinkingmachines.ai/news/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('thinking-machines-blog', 'thinking-machines', 'web_list', 'https://thinkingmachines.ai/blog/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('reflection-news', 'reflection', 'web_list', 'https://reflection.ai/news', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('nous-blog', 'nous', 'web_list', 'https://nousresearch.com/blog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('nous-releases', 'nous', 'web_list', 'https://nousresearch.com/releases', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('prime-intellect-blog', 'prime-intellect', 'web_list', 'https://www.primeintellect.ai/blog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('stepfun-platform', 'stepfun', 'web_list', 'https://platform.stepfun.com/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('stepfun-step-plan', 'stepfun', 'web_list', 'https://platform.stepfun.com/step-plan', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('meta-llama-api', 'meta', 'web_list', 'https://www.llama.com/products/llama-api/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('meituan-longcat-docs', 'meituan', 'web_list', 'https://longcat.chat/platform/docs/zh/', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('volc-free-quota', 'volc', 'web_list', 'https://www.volcengine.com/docs/82379/1544106', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('volc-activity', 'volc', 'web_list', 'https://www.volcengine.com/activity/ark', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('tencent-free', 'tencent', 'web_list', 'https://cloud.tencent.com/act/free', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('tencent-hy-pricing', 'tencent-hy', 'web_list', 'https://cloud.tencent.com/document/product/1729/97731', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('nvidia-build', 'nvidia', 'web_list', 'https://build.nvidia.com/explore/discover', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('modelscope-api-inference', 'modelscope', 'web_list', 'https://modelscope.cn/docs/model-service/API-Inference/intro', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('perplexity-api-pricing', 'perplexity', 'web_list', 'https://docs.perplexity.ai/getting-started/pricing', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('poe-about', 'poe', 'web_list', 'https://poe.com/about', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('hailuo-home', 'hailuo', 'web_list', 'https://hailuoai.com/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('midjourney-plans', 'midjourney', 'web_list', 'https://docs.midjourney.com/hc/en-us/articles/27870484040333-Comparing-Midjourney-Plans', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('leonardo-api-pricing', 'leonardo', 'web_list', 'https://docs.leonardo.ai/docs/plan-with-the-pricing-calculator', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('leonardo-tokens-help', 'leonardo', 'web_list', 'https://intercom.help/leonardo-ai/en/articles/8044018-what-are-tokens-and-how-do-they-work', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('doubao-seed-blog', 'doubao', 'web_list', 'https://team.doubao.com/zh/blog', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('jimeng-home', 'jimeng', 'web_list', 'https://jimeng.jianying.com/ai-tool/home', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('gamma-pricing', 'gamma', 'web_list', 'https://gamma.app/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('ucloud-modelverse-price', 'ucloud', 'web_list', 'https://astraflow.ucloud.cn/docs/modelverse/price', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('ucloud-activity', 'ucloud', 'web_list', 'https://www.ucloud.cn/site/active/agi.html', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('baichuan-price', 'baichuan', 'web_list', 'https://platform.baichuan-ai.com/docs/price', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('baichuan-home', 'baichuan', 'web_list', 'https://www.baichuan-ai.com/home', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('xiaomi-mimo-home', 'xiaomi-mimo', 'web_list', 'https://mimo.mi.com/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('xiaomi-mimo-platform', 'xiaomi-mimo', 'web_list', 'https://platform.xiaomimimo.com/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('moark-getting-started', 'moark', 'web_list', 'https://ai.gitee.com/docs/getting-started', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('liblibtv-home', 'liblibtv', 'web_list', 'https://www.liblib.tv/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('nex-agi-home', 'nex-agi', 'web_list', 'https://nex.sii.edu.cn', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('niteshift-pricing', 'niteshift', 'web_list', 'https://niteshift.dev/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('typesafe-home', 'typesafe', 'web_list', 'https://typesafe.ai/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('ami-labs-home', 'ami-labs', 'web_list', 'https://amilabs.xyz/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('periodic-home', 'periodic', 'web_list', 'https://periodic.com/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('physical-intelligence-home', 'physical-intelligence', 'web_list', 'https://www.pi.website/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('dreamina-home', 'dreamina', 'web_list', 'https://dreamina.capcut.com/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('dreamina-sept-offer-faq', 'dreamina', 'web_list', 'https://dreamina.capcut.com/resource/dreamina-september-offer-faq-2026', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('lovart-pricing', 'lovart', 'web_list', 'https://www.lovart.ai/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('liblib-home', 'liblibtv', 'web_list', 'https://www.liblib.art/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('adobe-firefly-credits-faq', 'adobe-firefly', 'web_list', 'https://helpx.adobe.com/creative-cloud/apps/generative-ai/generative-credits-faq.html', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('adobe-firefly-plans', 'adobe-firefly', 'web_list', 'https://www.adobe.com/products/firefly/plans.html', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('tapnow-terms', 'tapnow', 'web_list', 'https://www.tapnow.ai/terms-of-service', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('volc-free-inference-quota', 'volc', 'web_list', 'https://www.volcengine.com/docs/ark/free-inference-quota?lang=zh', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('moonshot-api-free-trial', 'moonshot', 'web_list', 'https://www.kimi.com/zh-cn/help/kimi-api/api-free-trial', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('moonshot-promotion', 'moonshot', 'web_list', 'https://platform.kimi.com/docs/pricing/promotion', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('baidu-qianfan-free-notice', 'baidu', 'web_list', 'https://cloud.baidu.com/news/notice_c7a145b9-5c99-4870-939f-e09ba506aab3', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('leonardo-token-usage', 'leonardo', 'web_list', 'https://intercom.help/leonardo-ai/en/articles/8044033-token-usage', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('modelscope-learn-free-models', 'modelscope', 'web_list', 'https://modelscope.cn/learn/2022', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('stepfun-step-plan-docs', 'stepfun', 'web_list', 'https://platform.stepfun.com/docs/zh/step-plan/overview', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('cursor-pricing', 'cursor', 'web_list', 'https://cursor.com/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('qwen-code-auth-docs', 'qwen', 'web_list', 'https://qwenlm.github.io/qwen-code-docs/zh/users/configuration/auth/', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('manus-help-membership', 'manus', 'web_list', 'https://help.manus.im/en/articles/11711111-what-is-the-current-membership-pricing-for-manus', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('manus-help-offers', 'manus', 'web_list', 'https://help.manus.im/en/articles/11813668-are-there-any-discounts-or-special-offers', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('seaart-mall', 'seaart', 'web_list', 'https://www.seaart.ai/mall', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('worldlabs-marble-pricing', 'worldlabs', 'web_list', 'https://marble.worldlabs.ai/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('adobe-firefly-credits-access', 'adobe-firefly', 'web_list', 'https://helpx.adobe.com/creative-cloud/apps/generative-ai/generative-credits-access-and-use.html', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('thinking-machines-tinker-grants', 'thinking-machines', 'web_list', 'https://thinkingmachines.ai/news/tinker-research-and-teaching-grants/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('thinking-machines-tinker', 'thinking-machines', 'web_list', 'https://thinkingmachines.ai/tinker/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('nous-portal-plans', 'nous', 'web_list', 'https://portal.nousresearch.com/manage-subscription', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('pixverse-subscribe', 'pixverse', 'web_list', 'https://app.pixverse.ai/subscribe', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('meituan-longcat-faq', 'meituan', 'web_list', 'https://longcat.chat/platform/docs/zh/faq', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('meituan-longcat-changelog', 'meituan', 'web_list', 'https://longcat.chat/platform/docs/zh/change-log', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('minimax-token-plan-announcements', 'minimax', 'web_list', 'https://platform.minimax.cn/docs/token-plan/announcements', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('inception-free-plans', 'inception', 'web_list', 'https://www.inceptionlabs.ai/models', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('browser-use-pricing', 'browser-use', 'web_list', 'https://browser-use.com/pricing.md', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('hume-billing', 'hume', 'web_list', 'https://dev.hume.ai/docs/resources/billing', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('free-ai-startup', 'free-ai', 'web_list', 'https://free.ai/startup/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('qwenwork-pricing', 'qwenwork', 'web_list', 'https://qwenwork.cn/pricing', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('qwenwork-launch-benefits', 'qwenwork', 'web_list', 'https://help.aliyun.com/zh/qwenwork/qwenwork-is-live', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('doubao-work-home', 'doubao-work', 'web_list', 'https://www.doubao.com/work', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('coze-free-benefits', 'coze', 'web_list', 'https://docs.coze.cn/guides_20260119_coze_premium_upgraded', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('lingxi-benefits', 'lingxi', 'web_list', 'https://www.lingxi.cn/docs', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('workbuddy-campus', 'workbuddy', 'web_list', 'https://www.workbuddy.cn/events/campus-freshman/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('workbuddy-pricing', 'workbuddy', 'web_list', 'https://www.workbuddy.cn/docs/workbuddy/Pricing', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('kiro-students', 'kiro', 'web_list', 'https://kiro.dev/students/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('community-reset-radar', NULL, 'feed', 'https://resetradar.com/feed.xml', 'lead', '{"origin":"media","filter":"lead","reviewRequired":true}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('community-agentdeals', NULL, 'feed', 'https://agentdeals.dev/feed.xml', 'lead', '{"origin":"media","filter":"lead","reviewRequired":true}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('community-v2ex-deals', NULL, 'feed', 'https://www.v2ex.com/feed/deals.xml', 'lead', '{"origin":"v2ex","filter":"lead","reviewRequired":true}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('community-aifree', NULL, 'web_list', 'https://aifree.dev/offers', 'lead', '{"reviewRequired":true,"manualDiscovery":true,"disabledReason":"已登记白名单；现有采集器尚不支持无平台的网页/JSON目录，保持停用，避免空跑"}', 0)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('community-buildaicurrent', NULL, 'json', 'https://buildaicurrent.com/credits.json', 'lead', '{"reviewRequired":true,"manualDiscovery":true,"disabledReason":"已登记白名单；现有采集器尚不支持无平台的网页/JSON目录，保持停用，避免空跑"}', 0)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('community-aitujian', NULL, 'json', 'https://aitujian.cn/api/deals', 'lead', '{"reviewRequired":true,"manualDiscovery":true,"disabledReason":"已登记白名单；现有采集器尚不支持无平台的网页/JSON目录，保持停用，避免空跑"}', 0)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('sensenova-add-muq87mw1', 'sensenova', 'web_list', 'https://platform.sensenova.cn/docs', 'docs', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('sensenova-add-muq87nb0', 'sensenova', 'web_list', 'https://www.sensenova.cn/token-plan', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('windsurf-add-muq8txob', 'windsurf', 'web_list', 'https://devin.ai/blog', 'official', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('workbuddy-add-mur5td02', 'workbuddy', 'web_list', 'https://www.workbuddy.cn/events/invite/', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('workbuddy-add-mv0k1fy1', 'workbuddy', 'web_list', 'https://www.workbuddy.ai', 'site', '{}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('oiioii-price', 'oiioii', 'web_list', 'https://www.oiioii.ai/price', 'site', '{"regionScope":"同站多语言；未确认独立国内/国际账号体系"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('oiioii-faq', 'oiioii', 'web_list', 'https://www.oiioii.ai/faq', 'docs', '{"regionScope":"同站多语言；未确认独立国内/国际账号体系"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('oiioii-zh-home', 'oiioii', 'web_list', 'https://www.oiioii.ai/zh/', 'site', '{"regionScope":"同站多语言；未确认独立国内/国际账号体系"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('oiioii-changelog', 'oiioii', 'web_list', 'https://www.oiioii.ai/changelog', 'official', '{"regionScope":"同站多语言；未确认独立国内/国际账号体系"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('oiioii-blog', 'oiioii', 'web_list', 'https://www.oiioii.ai/blog', 'official', '{"regionScope":"同站多语言；未确认独立国内/国际账号体系"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('qoder-add-mv0pxicw', 'qoder', 'web_list', 'https://docs.qoder.cn/events/flashoffer', 'docs', '{"addedBy":"admin"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('qoder-add-mv0pxjus', 'qoder', 'web_list', 'https://docs.qoder.com/events/flashoffer', 'docs', '{"addedBy":"admin"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('kilo-add-mv1ihjxl', 'kilo', 'web_list', 'https://x.com/kilocode', 'official', '{"addedBy":"admin"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('meta-add-mv1qmzfc', 'meta', 'web_list', 'https://ai.meta.com/muse/', 'site', '{"addedBy":"admin"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('cursor-add-mv1qmzy6', 'cursor', 'web_list', 'https://cursor.com/help/grok-bot/plans', 'docs', '{"addedBy":"admin"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('xai-add-mv1qn0wb', 'xai', 'web_list', 'https://x.ai/changelog/bot', 'site', '{"addedBy":"admin"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('openai-add-mv1qn1bm', 'openai', 'web_list', 'https://openai.com/index/introducing-dots/', 'site', '{"addedBy":"admin"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('openai-add-mv1qn1ql', 'openai', 'web_list', 'https://help.openai.com/en/articles/20001530-getting-started-with-your-dot', 'docs', '{"addedBy":"admin"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('instinct-add-mv1qn25i', 'instinct', 'web_list', 'https://instinct.com/', 'site', '{"addedBy":"admin"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('instinct-add-mv1qn2jp', 'instinct', 'web_list', 'https://instinct.co/terms', 'site', '{"addedBy":"admin"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('unisound-add-mv1uxjqm', 'unisound', 'web_list', 'https://maas.unisound.com/', 'site', '{"addedBy":"admin"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('unisound-add-mv1uxkcl', 'unisound', 'web_list', 'https://maas.unisound.com/model-hub/u2-flash', 'site', '{"addedBy":"admin"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('unisound-add-mv1uxkqy', 'unisound', 'web_list', 'https://maas.unisound.com/docs/price/overview', 'docs', '{"addedBy":"admin"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('unisound-add-mv1uxl41', 'unisound', 'web_list', 'https://maas.unisound.com/docs/guide/quickstart', 'docs', '{"addedBy":"admin"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('unisound-add-mv1uxlju', 'unisound', 'web_list', 'https://maas.unisound.com/docs/api/text/openai-compatible', 'docs', '{"addedBy":"admin"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('unisound-add-mv1uxly8', 'unisound', 'web_list', 'https://www.unisound.com/', 'site', '{"addedBy":"admin"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
INSERT INTO sources (id, platform_id, kind, url, tier, config, enabled) VALUES ('discord-official-announcements', NULL, 'discord', 'https://discord.com/channels/1558646769938735136/1558646770689384560', 'lead', '{"receiverGuildId":"1558646769938735136","channelId":"1558646770689384560","maxPages":20,"publishers":[{"platformId":"midjourney","name":"Midjourney","guildId":"662267976984297473","channelId":"952771221915840552"}],"addedBy":"admin","officialOriginEvidence":"https://docs.midjourney.com/hc/en-us/articles/32637946450445-Add-Midjourney-to-Your-Discord-Server"}', 1)
  ON CONFLICT(id) DO UPDATE SET platform_id=excluded.platform_id, kind=excluded.kind, url=excluded.url, tier=excluded.tier, config=json_patch(sources.config, excluded.config);
