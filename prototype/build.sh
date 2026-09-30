#!/usr/bin/env bash
# 把 src/ 拼成一个单文件网页。
#   dist/ai-yangmao-muchang.html  发布成 Artifact 用（发布时会自动套上 <!doctype>/<head>/<body>）
#   dist/preview.html             本地浏览器直接打开用（自带完整文档结构）
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
ECHARTS='<script src="https://cdnjs.cloudflare.com/ajax/libs/echarts/5.6.0/echarts.min.js"></script>'

{
  cat src/head.html
  cat src/body.html
  echo "$ECHARTS"
  echo '<script>'
  cat src/data.js src/app.js
  echo '</script>'
} > dist/ai-yangmao-muchang.html

{
  echo '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>'
  cat dist/ai-yangmao-muchang.html
  echo '</body></html>'
} > dist/preview.html

cat src/data.js src/app.js > dist/.bundle.js
node --check dist/.bundle.js && rm dist/.bundle.js
echo "built: $(wc -c < dist/ai-yangmao-muchang.html) bytes"
