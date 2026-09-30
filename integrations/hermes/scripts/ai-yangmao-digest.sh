#!/usr/bin/env bash
# Hermes 定时任务：每天 09:00（东京时间）发 AI 羊毛牧场日报。没有变化时输出为空 → 不发。
cd /Volumes/AI/MyWorkspace/AI_Freebies && exec ./node_modules/.bin/tsx scripts/ym.ts digest --commit 2>&1 | grep -v "^npm notice"
