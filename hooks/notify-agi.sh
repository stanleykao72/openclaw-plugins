#!/bin/bash
# Claude Code Stop Hook: 任務完成後通知 OpenClaw AGI
# 觸發時機: Stop (生成停止) + SessionEnd (會話結束)

set -uo pipefail

RESULT_DIR="$HOME/.claude/claude-code-results"
LOG="${RESULT_DIR}/hook.log"
OPENCLAW_DIR="$HOME/openclaw"

mkdir -p "$RESULT_DIR"

log() { echo "[$(date -Iseconds)] $*" >> "$LOG"; }

log "=== Hook fired ==="

# ---- 讀 stdin ----
INPUT=""
if [ -t 0 ]; then
    log "stdin is tty, skip"
elif [ -e /dev/stdin ]; then
    INPUT=$(timeout 2 cat /dev/stdin 2>/dev/null || true)
fi

SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"' 2>/dev/null || echo "unknown")
CWD=$(echo "$INPUT" | jq -r '.cwd // ""' 2>/dev/null || echo "")
EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // "unknown"' 2>/dev/null || echo "unknown")

log "session=$SESSION_ID cwd=$CWD event=$EVENT"

# ---- 防重複：30 秒內重複觸發視為同一任務 ----
LOCK_FILE="${RESULT_DIR}/.hook-lock"
LOCK_AGE_LIMIT=30

if [ -f "$LOCK_FILE" ]; then
    LOCK_TIME=$(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo 0)
    NOW=$(date +%s)
    AGE=$(( NOW - LOCK_TIME ))
    if [ "$AGE" -lt "$LOCK_AGE_LIMIT" ]; then
        log "Duplicate hook within ${AGE}s, skipping"
        exit 0
    fi
fi
touch "$LOCK_FILE"

# ---- 找到最新任務目錄 ----
LATEST_TASK_DIR="${RESULT_DIR}/latest-task"
TASK_NAME="unknown"
TELEGRAM_GROUP=""
OUTPUT=""

if [ -L "$LATEST_TASK_DIR" ] && [ -d "$LATEST_TASK_DIR" ]; then
    META_FILE="${LATEST_TASK_DIR}/task-meta.json"
    TASK_OUTPUT="${LATEST_TASK_DIR}/task-output.txt"

    if [ -f "$META_FILE" ]; then
        TASK_NAME=$(jq -r '.task_name // "unknown"' "$META_FILE" 2>/dev/null || echo "unknown")
        TELEGRAM_GROUP=$(jq -r '.telegram_group // ""' "$META_FILE" 2>/dev/null || echo "")
        TASK_STATUS=$(jq -r '.status // ""' "$META_FILE" 2>/dev/null || echo "")
        log "Meta: task=$TASK_NAME group=$TELEGRAM_GROUP status=$TASK_STATUS"

        # dispatch 任務還在跑 → 由 dispatch 腳本自行通知，hook 跳過
        if [ "$TASK_STATUS" = "running" ]; then
            log "Task still running (managed by dispatch), skipping hook notification"
            exit 0
        fi

        # 已完成的 dispatch 任務不應被 hook 重發通知
        if [ "$TASK_STATUS" = "done" ]; then
            COMPLETED_AT=$(jq -r '.completed_at // ""' "$META_FILE" 2>/dev/null || echo "")
            if [ -n "$COMPLETED_AT" ]; then
                log "Task already completed at $COMPLETED_AT (managed by dispatch), skipping hook notification"
                exit 0
            fi
        fi
    fi

    sleep 1

    if [ -f "$TASK_OUTPUT" ] && [ -s "$TASK_OUTPUT" ]; then
        OUTPUT=$(tail -c 4000 "$TASK_OUTPUT")
        log "Output from ${TASK_OUTPUT} (${#OUTPUT} chars)"
    fi
else
    # 向後相容：舊的單一檔案模式
    META_FILE="${RESULT_DIR}/task-meta.json"
    TASK_OUTPUT="${RESULT_DIR}/task-output.txt"

    if [ -f "$META_FILE" ]; then
        TASK_NAME=$(jq -r '.task_name // "unknown"' "$META_FILE" 2>/dev/null || echo "unknown")
        TELEGRAM_GROUP=$(jq -r '.telegram_group // ""' "$META_FILE" 2>/dev/null || echo "")
    fi

    sleep 1

    if [ -f "$TASK_OUTPUT" ] && [ -s "$TASK_OUTPUT" ]; then
        OUTPUT=$(tail -c 4000 "$TASK_OUTPUT")
    fi
fi

# Fallback: /tmp
if [ -z "$OUTPUT" ] && [ -f "/tmp/claude-code-output.txt" ] && [ -s "/tmp/claude-code-output.txt" ]; then
    OUTPUT=$(tail -c 4000 /tmp/claude-code-output.txt)
    log "Output from /tmp fallback (${#OUTPUT} chars)"
fi

# Fallback: 工作目錄
if [ -z "$OUTPUT" ] && [ -n "$CWD" ] && [ -d "$CWD" ]; then
    FILES=$(ls -1t "$CWD" 2>/dev/null | head -20 | tr '\n' ', ')
    OUTPUT="Working dir: ${CWD}\nFiles: ${FILES}"
    log "Output from dir listing"
fi

# ---- 寫入結果 JSON ----
LATEST_JSON="${RESULT_DIR}/latest.json"
jq -n \
    --arg sid "$SESSION_ID" \
    --arg ts "$(date -Iseconds)" \
    --arg cwd "$CWD" \
    --arg event "$EVENT" \
    --arg output "$OUTPUT" \
    --arg task "$TASK_NAME" \
    --arg group "$TELEGRAM_GROUP" \
    '{session_id: $sid, timestamp: $ts, cwd: $cwd, event: $event, output: $output, task_name: $task, telegram_group: $group, status: "done"}' \
    > "$LATEST_JSON" 2>/dev/null

log "Wrote latest.json"

# ---- 發 Telegram 通知（dispatch 腳本已自帶完成通知，這裡作為備援）----
if [ -n "$TELEGRAM_GROUP" ] && [ -d "$OPENCLAW_DIR" ]; then
    # 優先取最終結果區塊
    SUMMARY=""
    if echo "$OUTPUT" | grep -q '━━━ 最終結果 ━━━'; then
        SUMMARY=$(echo "$OUTPUT" | sed -n '/━━━ 最終結果 ━━━/,$ p' | tail -c 1000)
    fi
    if [ -z "$SUMMARY" ]; then
        SUMMARY=$(echo "$OUTPUT" | tail -c 1000)
    fi
    MSG="📋 任務完成: ${TASK_NAME}

${SUMMARY:0:900}"

    (cd "$OPENCLAW_DIR" && pnpm openclaw message send \
        --channel telegram \
        --target "$TELEGRAM_GROUP" \
        --message "$MSG" 2>/dev/null) && log "Sent Telegram message to $TELEGRAM_GROUP" || log "Telegram send failed"
fi

# ---- 寫入 wake 標記 ----
WAKE_FILE="${RESULT_DIR}/pending-wake.json"
jq -n \
    --arg task "$TASK_NAME" \
    --arg group "$TELEGRAM_GROUP" \
    --arg ts "$(date -Iseconds)" \
    --arg summary "$(echo "$OUTPUT" | head -c 500 | tr '\n' ' ')" \
    '{task_name: $task, telegram_group: $group, timestamp: $ts, summary: $summary, processed: false}' \
    > "$WAKE_FILE" 2>/dev/null

log "Wrote pending-wake.json"
log "=== Hook completed ==="
exit 0
