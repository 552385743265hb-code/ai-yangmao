#!/usr/bin/env bash
# Hermes 定时任务：每小时检查一次。只有"48 小时内截止的新上架"或"采集故障"时才输出 → 才发消息。
# AI_YANGMAO_DIR：本机项目克隆的根目录，由 scripts/install-hermes.sh 安装时写入；未设置时静默退出。
cd "${AI_YANGMAO_DIR:-/nonexistent}" 2>/dev/null || exit 0
out="$(./node_modules/.bin/tsx scripts/ym.ts dispatch urgent 2>&1; ./node_modules/.bin/tsx scripts/ym.ts health 2>&1)"
printf "%s" "$out" | grep -v "^npm notice" | sed '/^$/d'
