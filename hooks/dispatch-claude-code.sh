#!/bin/bash
# dispatch-claude-code.sh — 派發任務給 Claude Code，完成後自動回調 OpenClaw
#
# Usage:
#   dispatch-claude-code.sh [OPTIONS] -p "your prompt"
#
# Options:
#   -p, --prompt TEXT        任務提示（必需）
#   -n, --name NAME          任務名稱
#   -g, --group ID           通知目標 ID（向後相容 Telegram group ID）
#   --channel CHANNEL        通知 channel（telegram / odoo-discuss，預設 telegram）
#   --target TARGET          通知目標（Telegram group ID / Discuss channel ID）
#   -w, --workdir DIR        工作目錄（預設 $HOME）
#   --agent-teams            啟用 Agent Teams
#   --teammate-mode MODE     Agent Teams 模式 (auto/in-process/tmux)
#   --permission-mode MODE   權限模式
#   --model MODEL            模型覆蓋
#   --progress SEC           進度回報間隔秒數（預設 30）

set -euo pipefail

RESULT_DIR="$HOME/.claude/claude-code-results"
CLAUDE_BIN="${CLAUDE_CODE_BIN:-$(command -v claude 2>/dev/null || echo "$HOME/.local/bin/claude")}"
OPENCLAW_DIR="$HOME/openclaw"

# Defaults
PROMPT=""
TASK_NAME="adhoc-$(date +%s)"
TELEGRAM_GROUP="1317612443"
NOTIFY_CHANNEL="telegram"
NOTIFY_TARGET=""
WORKDIR="$HOME"
AGENT_TEAMS=""
TEAMMATE_MODE=""
PERMISSION_MODE=""
MODEL=""
PROGRESS_INTERVAL=30

# Parse args
while [[ $# -gt 0 ]]; do
    case "$1" in
        -p|--prompt) PROMPT="$2"; shift 2;;
        -n|--name) TASK_NAME="$2"; shift 2;;
        -g|--group) TELEGRAM_GROUP="$2"; shift 2;;
        --channel) NOTIFY_CHANNEL="$2"; shift 2;;
        --target) NOTIFY_TARGET="$2"; shift 2;;
        -w|--workdir) WORKDIR="$2"; shift 2;;
        --agent-teams) AGENT_TEAMS="1"; shift;;
        --teammate-mode) TEAMMATE_MODE="$2"; shift 2;;
        --permission-mode) PERMISSION_MODE="$2"; shift 2;;
        --model) MODEL="$2"; shift 2;;
        --progress) PROGRESS_INTERVAL="$2"; shift 2;;
        *) echo "Unknown option: $1" >&2; exit 1;;
    esac
done

if [ -z "$PROMPT" ]; then
    echo "Error: --prompt is required" >&2
    exit 1
fi

# Resolve notification target: --target takes precedence, fall back to -g for backward compat
if [ -z "$NOTIFY_TARGET" ]; then
    NOTIFY_TARGET="$TELEGRAM_GROUP"
fi

# ---- 1. 建立任務專屬目錄 ----
TASK_DIR="${RESULT_DIR}/tasks/${TASK_NAME}"
mkdir -p "$TASK_DIR"

META_FILE="${TASK_DIR}/task-meta.json"
TASK_OUTPUT="${TASK_DIR}/task-output.txt"
PROGRESS_LOG="${TASK_DIR}/progress.log"

jq -n \
    --arg name "$TASK_NAME" \
    --arg group "$TELEGRAM_GROUP" \
    --arg channel "$NOTIFY_CHANNEL" \
    --arg target "$NOTIFY_TARGET" \
    --arg prompt "$PROMPT" \
    --arg workdir "$WORKDIR" \
    --arg ts "$(date -Iseconds)" \
    --arg agent_teams "${AGENT_TEAMS:-0}" \
    --arg task_dir "$TASK_DIR" \
    '{task_name: $name, telegram_group: $group, notify_channel: $channel, notify_target: $target, prompt: $prompt, workdir: $workdir, started_at: $ts, agent_teams: ($agent_teams == "1"), status: "running", task_dir: $task_dir}' \
    > "$META_FILE"

# 建立 symlink 指向最新任務（向後相容）
ln -sfn "$TASK_DIR" "${RESULT_DIR}/latest-task"

echo "Task metadata written: $META_FILE"
echo "  Task: $TASK_NAME"
echo "  Dir:  $TASK_DIR"
echo "  Group: ${TELEGRAM_GROUP:-none}"
echo "  Agent Teams: ${AGENT_TEAMS:-no}"
echo "  Progress: ${PROGRESS_INTERVAL}s"

# ---- 2. 清除此任務的舊輸出 ----
> "$TASK_OUTPUT"
> "$PROGRESS_LOG"

# ---- 3. 組裝 Claude Code 命令 ----
CMD=("$CLAUDE_BIN")

if [ -n "$PERMISSION_MODE" ]; then
    CMD+=(--permission-mode "$PERMISSION_MODE")
fi

CMD+=(-p "$PROMPT" --verbose --output-format stream-json)

if [ -n "$TEAMMATE_MODE" ]; then
    CMD+=(--teammate-mode "$TEAMMATE_MODE")
fi

# ---- 4. 設定環境變數 ----
if [ -n "$AGENT_TEAMS" ]; then
    export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
fi

if [ -n "$MODEL" ]; then
    export ANTHROPIC_MODEL="$MODEL"
fi

# Allow launching claude from within an OpenClaw gateway process
unset CLAUDECODE 2>/dev/null || true

# ---- 5. 進度回報背景程序 ----
MONITOR_PID=""

send_notification() {
    local msg="$1"
    local channel="${2:-$NOTIFY_CHANNEL}"
    local target="${3:-$NOTIFY_TARGET}"
    if [ -n "$target" ] && [ -d "$OPENCLAW_DIR" ]; then
        (cd "$OPENCLAW_DIR" && pnpm openclaw message send \
            --channel "$channel" \
            --target "$target" \
            --message "$msg" 2>/dev/null) || true
    fi
}

# Backward-compatible alias
send_telegram() {
    send_notification "$1" "$NOTIFY_CHANNEL" "${2:-$NOTIFY_TARGET}"
}

start_progress_monitor() {
    local interval="$1"
    local task_name="$2"
    local group="$3"
    local output_file="$4"
    local prev_size=0
    local elapsed=0

    while true; do
        sleep "$interval"
        elapsed=$(( elapsed + interval ))

        # 檢查主程序是否還在
        if ! kill -0 "$CLAUDE_PID" 2>/dev/null; then
            break
        fi

        # 取得目前輸出大小
        local cur_size=0
        if [ -f "$output_file" ]; then
            cur_size=$(wc -c < "$output_file" 2>/dev/null || echo 0)
        fi

        local new_bytes=$(( cur_size - prev_size ))
        local elapsed_min=$(( elapsed / 60 ))
        local elapsed_sec=$(( elapsed % 60 ))

        # 沒有新內容就不發通知
        if [ "$new_bytes" -eq 0 ]; then
            echo "[$(date -Iseconds)] elapsed=${elapsed}s size=${cur_size} (no change, skip)" >> "$PROGRESS_LOG"
            continue
        fi

        # 取最後 500 字元作為摘要
        local snippet=""
        if [ -f "$output_file" ] && [ "$cur_size" -gt 0 ]; then
            snippet=$(tail -c 500 "$output_file" 2>/dev/null | tr '\n' ' ' | sed 's/[[:cntrl:]]//g')
        fi

        local msg="[進度] ${task_name} (${elapsed_min}m${elapsed_sec}s)
輸出: ${cur_size} bytes (+${new_bytes})
最新:
${snippet:0:400}"

        send_notification "$msg"

        echo "[$(date -Iseconds)] elapsed=${elapsed}s size=${cur_size} new=${new_bytes}" >> "$PROGRESS_LOG"
        prev_size=$cur_size
    done
}

# ---- 6. 執行 Claude Code ----
echo "Launching Claude Code..."
echo "  Command: ${CMD[*]}"
echo "  Workdir: $WORKDIR"
echo ""

cd "$WORKDIR"

# stream-json 即時輸出：每行是 JSON，用 jq 提取文字內容寫入 task-output.txt
STREAM_RAW="${TASK_DIR}/stream-raw.jsonl"
> "$STREAM_RAW"

"${CMD[@]}" 2>"${TASK_DIR}/stderr.log" | while IFS= read -r line; do
    echo "$line" >> "$STREAM_RAW"
    # 提取有意義的內容
    text=$(echo "$line" | jq -r '
        if .type == "assistant" then
            (.message.content[]? |
                if .type == "text" then .text
                elif .type == "tool_use" then
                    "→ " + .name + (
                        if .name == "Read" or .name == "Glob" or .name == "Grep" then
                            " " + (.input.file_path // .input.pattern // .input.path // "")
                        elif .name == "Bash" then
                            " $ " + ((.input.command // "")[:80])
                        elif .name == "Edit" or .name == "Write" then
                            " " + (.input.file_path // "")
                        elif .name == "Agent" then
                            " " + (.input.description // "")
                        else ""
                        end
                    )
                else empty end
            ) // empty
        elif .type == "result" then
            "\n━━━ 最終結果 ━━━\n" + (.result // empty)
        else empty end
    ' 2>/dev/null || true)
    if [ -n "$text" ]; then
        printf '%s\n' "$text" >> "$TASK_OUTPUT"
    fi
done &
CLAUDE_PID=$!

# 啟動進度監控（如果設定了間隔）
if [ "$PROGRESS_INTERVAL" -gt 0 ] && [ -n "$NOTIFY_TARGET" ]; then
    start_progress_monitor "$PROGRESS_INTERVAL" "$TASK_NAME" "$NOTIFY_TARGET" "$TASK_OUTPUT" &
    MONITOR_PID=$!
    echo "Progress monitor started (PID: $MONITOR_PID, interval: ${PROGRESS_INTERVAL}s)"
fi

# 等待 Claude Code 完成
wait "$CLAUDE_PID" 2>/dev/null
EXIT_CODE=$?

# 停止監控
if [ -n "$MONITOR_PID" ]; then
    kill "$MONITOR_PID" 2>/dev/null || true
    wait "$MONITOR_PID" 2>/dev/null || true
fi

echo ""
echo "Claude Code exited with code: $EXIT_CODE"

# ---- 7. 更新 meta ----
if [ -f "$META_FILE" ]; then
    jq --arg code "$EXIT_CODE" --arg ts "$(date -Iseconds)" \
        '. + {exit_code: ($code | tonumber), completed_at: $ts, status: "done"}' \
        "$META_FILE" > "${META_FILE}.tmp" && mv "${META_FILE}.tmp" "$META_FILE"
fi

# ---- 8. 發送完成通知 ----
# 優先取「最終結果」區塊，否則取最後 1500 字元
OUTPUT=""
if [ -f "$TASK_OUTPUT" ] && [ -s "$TASK_OUTPUT" ]; then
    # 嘗試提取「最終結果」之後的內容
    RESULT_SECTION=$(sed -n '/━━━ 最終結果 ━━━/,$ p' "$TASK_OUTPUT" 2>/dev/null | tail -c 1500)
    if [ -n "$RESULT_SECTION" ]; then
        OUTPUT="$RESULT_SECTION"
    else
        OUTPUT=$(tail -c 1500 "$TASK_OUTPUT")
    fi
fi

ELAPSED=$(( $(date +%s) - $(date -d "$(jq -r '.started_at' "$META_FILE")" +%s 2>/dev/null || echo 0) ))
ELAPSED_MIN=$(( ELAPSED / 60 ))
ELAPSED_SEC=$(( ELAPSED % 60 ))

DONE_MSG="✅ 任務完成: ${TASK_NAME}
⏱ 耗時: ${ELAPSED_MIN}m${ELAPSED_SEC}s

${OUTPUT:0:900}"

send_notification "$DONE_MSG"

echo "Results: ${TASK_DIR}/"
exit $EXIT_CODE
