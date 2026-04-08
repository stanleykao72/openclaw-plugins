---
name: claude_code
description: Dispatch a task to Claude Code CLI with automatic callback. Results are written to ~/.claude/claude-code-results/latest.json and optionally sent to the originating channel.
user-invocable: true
---

# Claude Code Dispatch

Dispatch a task to Claude Code (claude CLI) in the background. When Claude Code finishes, a Stop Hook automatically:
1. Writes results to `~/.claude/claude-code-results/latest.json`
2. Sends a notification to the originating channel (Telegram / Odoo Discuss)
3. Writes `pending-wake.json` for AGI heartbeat pickup

## Usage

When the user invokes `/claude_code`, parse their message and run the dispatch script.

## Instructions

1. Parse the user's request to extract:
   - **prompt**: the task description (required)
   - **name**: a short task identifier (optional, default: auto-generated)
   - **workdir**: working directory (optional, see defaults below)
   - **agent-teams**: whether to enable Agent Teams (optional, flag `--agent-teams`)

2. Determine the working directory:
   - If user explicitly specifies `--workdir`, use that path.
   - If the prompt mentions openclaw or openclaw-plugins, use `/home/ubuntu/openclaw` or `/home/ubuntu/openclaw-plugins` accordingly.
   - Otherwise, default to `/home/ubuntu/odoo_dev/user` (the Odoo custom modules directory).

3. **Determine notification channel and target** based on the message source:
   - If triggered from **Telegram**: `--channel telegram --target 1317612443`
   - If triggered from **Odoo Discuss**: `--channel odoo-discuss --target <channel_id>`
     (Use the `OriginatingTo` or channel ID from the inbound context)
   - If the source is unclear, default to Telegram.

4. Run the dispatch script in the background using the `exec` tool:

```bash
nohup /home/ubuntu/openclaw-plugins/hooks/dispatch-claude-code.sh \
  -p "<prompt>" \
  -n "<name>" \
  --channel "<channel>" \
  --target "<target>" \
  --permission-mode "bypassPermissions" \
  -w "<workdir>" \
  --progress 30 \
  > /tmp/claude-code-dispatch.log 2>&1 &
```

The `--progress 30` flag sends a progress update every 30 seconds showing elapsed time, output size, and latest output snippet. Adjust the interval based on task complexity (use 60 for long tasks, 30 for medium tasks). Set to 0 to disable.

5. Reply to the user confirming the task has been dispatched, including:
   - Task name
   - Working directory
   - How to check results: `cat ~/.claude/claude-code-results/latest.json`

## Examples

User: `/claude_code 修改 hr_leave_makeup 模組的請假邏輯`
→ workdir="/home/ubuntu/odoo_dev/user", name="hr-leave-makeup"
→ From Telegram: `--channel telegram --target 1317612443`

User: `/claude_code --workdir /home/ubuntu/openclaw 升級套件設定`
→ workdir="/home/ubuntu/openclaw", name="openclaw-upgrade"

User: `/claude_code 幫 job_costing_dashboard 加一個新的報表`
→ workdir="/home/ubuntu/odoo_dev/user", name="job-costing-report"

User: `/claude_code 建立一個新的 REST API server --agent-teams`
→ workdir="/home/ubuntu/odoo_dev/user", name="rest-api", agent-teams enabled
