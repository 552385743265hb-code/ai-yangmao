#!/usr/bin/env bash
# Hermes 定时任务：每天 09:00（东京时间）发 AI 羊毛牧场日报。没有变化时输出为空 → 不发。
# AI_YANGMAO_DIR：本机项目克隆的根目录，由 scripts/install-hermes.sh 安装时写入。
cd "${AI_YANGMAO_DIR:?请把 AI_YANGMAO_DIR 设为项目根目录}" && exec ./node_modules/.bin/tsx scripts/ym.ts dispatch digest
