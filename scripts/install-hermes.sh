#!/usr/bin/env bash
# 把 AI 羊毛牧场技能和定时任务装进 Hermes Agent（复用 Hermes 已有的 Telegram 机器人）。
# 重复运行会覆盖技能文件、重建定时任务。
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p ~/.hermes/skills/ai-yangmao ~/.hermes/scripts
cp "$DIR/integrations/hermes/ai-yangmao/SKILL.md" ~/.hermes/skills/ai-yangmao/SKILL.md
cp "$DIR/integrations/hermes/scripts/"ai-yangmao-*.sh ~/.hermes/scripts/
chmod +x ~/.hermes/scripts/ai-yangmao-*.sh
for name in ai-yangmao-digest ai-yangmao-watch; do
  id="$(hermes cron list 2>/dev/null | grep -E "$name" | grep -oE '[0-9a-f]{8,}' | head -1 || true)"
  [ -n "$id" ] && hermes cron remove "$id" >/dev/null 2>&1 || true
done
hermes cron create '0 9 * * *' --name ai-yangmao-digest --no-agent --script ai-yangmao-digest.sh --deliver telegram
hermes cron create '7 * * * *' --name ai-yangmao-watch --no-agent --script ai-yangmao-watch.sh --deliver telegram
echo "已安装：技能 ~/.hermes/skills/ai-yangmao，定时任务 ai-yangmao-digest（每天 9:00）、ai-yangmao-watch（每小时）"
