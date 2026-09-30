#!/usr/bin/env bash
# Hermes 定时任务：每小时检查一次。只有"48 小时内截止的新上架"或"采集故障"时才输出 → 才发消息。
cd /Volumes/AI/MyWorkspace/AI_Freebies || exit 0
out="$(./node_modules/.bin/tsx scripts/ym.ts dispatch urgent 2>&1; ./node_modules/.bin/tsx scripts/ym.ts health 2>&1)"
printf "%s" "$out" | grep -v "^npm notice" | sed '/^$/d'
