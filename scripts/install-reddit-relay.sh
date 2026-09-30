#!/usr/bin/env bash
# 在常开的 Mac 上安装 Reddit 中继：launchd 每 6 小时运行一次，开机后也会补跑一次。
# 日志放在 ~/Library/Logs：项目若在外接卷上，launchd 直接写外接卷会被 macOS 隐私保护拦截。
# 卸载：launchctl bootout gui/$(id -u)/com.ai-yangmao.reddit-relay && rm ~/Library/LaunchAgents/com.ai-yangmao.reddit-relay.plist
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE_BIN="$(dirname "$(command -v node)")"
PLIST="$HOME/Library/LaunchAgents/com.ai-yangmao.reddit-relay.plist"
LOG="$HOME/Library/Logs/ai-yangmao-reddit-relay.log"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.ai-yangmao.reddit-relay</string>
  <key>ProgramArguments</key><array><string>/bin/zsh</string><string>-c</string><string>cd '$DIR' &amp;&amp; exec ./node_modules/.bin/tsx pipeline/reddit-relay.ts</string></array>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>$NODE_BIN:/usr/bin:/bin</string></dict>
  <key>StartInterval</key><integer>21600</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict></plist>
PL
launchctl bootout "gui/$(id -u)/com.ai-yangmao.reddit-relay" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "已安装，日志：$LOG"
