#!/usr/bin/env bash
# 正式网站：把 web/src 拼成 public/index.html（Worker 以静态资源提供；数据运行时从 /api 读取）。
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public
ECHARTS='<script src="https://cdnjs.cloudflare.com/ajax/libs/echarts/5.6.0/echarts.min.js"></script>'
{
  echo '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
  echo '<meta name="description" content="汇总全球可以免费薅的 AI 额度和权益，每条都附官方原文。">'
  cat web/src/head.html
  echo '</head><body>'
  cat web/src/body.html
  echo "$ECHARTS"
  echo '<script>'
  cat web/src/data.js web/src/app.js
  echo '</script></body></html>'
} > public/index.html
cp web/_headers public/_headers
cat web/src/data.js web/src/app.js > /tmp/ym-web-check.js && node --check /tmp/ym-web-check.js && rm /tmp/ym-web-check.js
echo "built public/index.html ($(wc -c < public/index.html) bytes)"
