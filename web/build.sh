#!/usr/bin/env bash
# 正式网站：把 web/src 拼成 public/index.html（Worker 以静态资源提供；数据运行时从 /api 读取）。
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public
mkdir -p public/vendor
{
  echo '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
  echo '<meta name="description" content="汇总全球可以免费薅的 AI 额度和权益，每条都附官方原文。">'
  cat web/src/head.html
  echo '</head><body>'
  cat web/src/body.html
  echo '<script src="/vendor/echarts.min.js"></script><script src="/app.js"></script></body></html>'
} > public/index.html
cat web/src/data.js web/src/app.js > public/app.js
cp node_modules/echarts/dist/echarts.min.js public/vendor/echarts.min.js
cp web/_headers public/_headers
node --check public/app.js
echo "built public/index.html ($(wc -c < public/index.html) bytes)"
