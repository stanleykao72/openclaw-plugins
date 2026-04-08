---
name: odoo-mcp-cli
description: 透過 CLI 呼叫 Odoo MCP 工具。查詢/建立/修改 Odoo 資料、搜尋規格文件、同步任務。當需要存取 Odoo 資料、查詢 Odoo 模型、操作 Odoo 記錄時觸發。
type: skill
slash_command: null
trigger_keywords:
  - Odoo 查詢
  - Odoo 資料
  - Odoo 記錄
  - 搜尋記錄
  - 建立記錄
  - MCP 工具
  - odoo-mcp
allowed-tools: Bash, Read
---

# Odoo MCP CLI 工具

## 概述

使用 `~/bin/odoo-mcp` CLI 呼叫 Odoo MCP Server，取代 MCP protocol 直接操作 Odoo 資料。

## 基本用法（Rust binary: `~/bin/odoo-mcp`）

```bash
# 列出所有可用工具
odoo-mcp list

# 呼叫工具（預設連接 prod）
odoo-mcp call <tool_name> '<json_arguments>'

# 連接 staging 環境
odoo-mcp --env stage call <tool_name> '<json_arguments>'

# 指定使用者身份
odoo-mcp --user stanley call <tool_name> '<json_arguments>'

# 列出已設定的使用者
odoo-mcp list-users

# 從 Odoo 同步所有 mcp_enabled 使用者
odoo-mcp sync-users
```

## 設定

- 預設 config：`~/.config/odoo-mcp/config`（URL + 預設 key）
- Per-user config：`~/.config/odoo-mcp/users/<name>.conf`（只需設定 KEY，URL 繼承自主 config）
- 原始碼：`~/odoo-mcp-cli/`（Rust 專案）

新增使用者：`odoo-mcp sync-users` 自動從 Odoo 拉取，或手動建立 `~/.config/odoo-mcp/users/<name>.conf`：
```bash
ODOO_MCP_KEY_PROD=<user_openapi_token>
ODOO_MCP_KEY_STAGE=<user_openapi_token>
```

---

## 可用工具與範例

### ORM 核心操作

#### list_models — 列出可存取模型

```bash
odoo-mcp call list_models '{}'
```

#### get_model_fields — 取得模型欄位定義

```bash
odoo-mcp call get_model_fields '{"model": "res.partner"}'
# 可選 attributes 參數過濾回傳欄位屬性
odoo-mcp call get_model_fields '{"model": "res.partner", "attributes": ["string", "type", "required"]}'
```

#### search_records — 搜尋記錄

```bash
# 基本搜尋
odoo-mcp call search_records '{"model": "res.partner", "domain": [["is_company", "=", true]], "fields": ["name", "email", "phone"], "limit": 10}'

# 排序 + 分頁
odoo-mcp call search_records '{"model": "project.task", "domain": [["stage_id.name", "=", "In Progress"]], "fields": ["name", "user_ids", "date_deadline"], "limit": 20, "offset": 0, "order": "date_deadline asc"}'
```

#### read_records — 讀取特定 ID 記錄

```bash
odoo-mcp call read_records '{"model": "res.partner", "ids": [1, 2, 3], "fields": ["name", "email"]}'
```

#### count_records — 計算記錄數

```bash
odoo-mcp call count_records '{"model": "sale.order", "domain": [["state", "=", "sale"]]}'
```

#### create_records — 建立記錄

```bash
odoo-mcp call create_records '{"model": "project.task", "values": {"name": "新任務", "project_id": 1}}'
```

#### write_records — 更新記錄

```bash
odoo-mcp call write_records '{"model": "project.task", "ids": [42], "values": {"name": "更新名稱", "date_deadline": "2026-04-01"}}'
```

#### unlink_records — 刪除記錄

```bash
odoo-mcp call unlink_records '{"model": "project.task", "ids": [42]}'
```

#### execute_method — 執行模型方法

```bash
odoo-mcp call execute_method '{"model": "project.task", "method": "action_assign", "ids": [42]}'
```

### 全文搜尋

#### full_text_search — 跨模型文字搜尋

```bash
odoo-mcp call full_text_search '{"query": "設計審查", "models": ["project.task", "helpdesk.ticket"], "limit": 20}'
```

### 規格文件操作

#### search_specs — 搜尋 .specs/ 文件

```bash
odoo-mcp call search_specs '{"query": "CAD", "module": "job_project_gantt", "limit": 10}'
```

#### analyze_delta_specs — 分析規格差異

```bash
odoo-mcp call analyze_delta_specs '{}'
```

#### sync_specs_to_tasks — 規格同步到任務

```bash
odoo-mcp call sync_specs_to_tasks '{"module": "job_project_gantt", "dry_run": true}'
```

#### sync_tasks_to_specs — 任務同步回規格

```bash
odoo-mcp call sync_tasks_to_specs '{"module": "job_project_gantt", "dry_run": true}'
```

### 附件操作

#### list_attachments — 列出附件

```bash
odoo-mcp call list_attachments '{"model": "project.task", "res_id": 42}'
```

#### read_attachment — 讀取附件

```bash
odoo-mcp call read_attachment '{"attachment_id": 123}'
```

#### upload_attachment — 上傳附件

```bash
odoo-mcp call upload_attachment '{"name": "report.pdf", "model": "project.task", "res_id": 42, "data": "<base64_data>", "mimetype": "application/pdf"}'
```

### HTTP 代理

#### call_json_api — 呼叫 Odoo JSON controller

```bash
odoo-mcp call call_json_api '{"url": "/api/v1/my_endpoint", "payload": {"param1": "value"}}'
```

#### call_http_api — 呼叫 Odoo HTTP controller

```bash
odoo-mcp call call_http_api '{"url": "/web/export/csv", "method": "POST", "data": {"field": "value"}}'
```

### Job Project 專案工具（mcp_server_job_project）

#### spreadsheet — 試算表操作

```bash
# 儲存 cell
odoo-mcp call spreadsheet '{"operation": "save_cell", "working_plan_id": 1, "cell_id": "A1", "metadata": {"value": "test"}, "stage_type": "design"}'

# 載入 cells
odoo-mcp call spreadsheet '{"operation": "load_cells", "working_plan_id": 1, "stage_type": "design"}'
```

#### cad_date — CAD 日期管理

```bash
# 取得日期
odoo-mcp call cad_date '{"operation": "get_dates", "cad_id": 1}'

# 更新計畫日期
odoo-mcp call cad_date '{"operation": "update_planned", "cad_id": 1, "field_name": "drawing_v1_start_data", "new_date": "2026-04-01", "reason": "工期調整"}'
```

#### gantt — 甘特圖操作

```bash
# 取得甘特資料
odoo-mcp call gantt '{"operation": "get_data", "project_id": 1}'

# 計算影響範圍
odoo-mcp call gantt '{"operation": "calculate_impact", "task_id": 42, "new_date_deadline": "2026-04-15"}'
```

#### dashboard — 儀表板操作

```bash
odoo-mcp call dashboard '{"operation": "toggle_hide_cad", "cad_id": 1}'
```

### 通訊與工單

#### create_helpdesk_ticket — 建立工單

```bash
odoo-mcp call create_helpdesk_ticket '{"name": "系統問題", "description": "描述...", "team_id": 1}'
```

#### log_conversation — 記錄對話

```bash
odoo-mcp call log_conversation '{"model": "project.task", "res_id": 42, "body": "已完成審查"}'
```

---

## Domain 語法速查

| 運算子 | 範例 |
|--------|------|
| `=`, `!=` | `["state", "=", "draft"]` |
| `>`, `>=`, `<`, `<=` | `["date_deadline", "<", "2026-04-01"]` |
| `like`, `ilike` | `["name", "ilike", "設計"]` |
| `in`, `not in` | `["state", "in", ["draft", "confirmed"]]` |
| `child_of` | `["partner_id", "child_of", 1]` |
| AND (預設) | `[["state", "=", "draft"], ["user_id", "=", 1]]` |
| OR | `["\|", ["state", "=", "draft"], ["state", "=", "sent"]]` |

## 注意事項

- 預設查詢限制 80 筆，最大 500 筆
- 所有操作遵循 Odoo 使用者權限（不會 sudo）
- JSON 參數中字串用雙引號，外層用單引號包裹
- 如果回傳錯誤，檢查 `error` 欄位中的訊息
