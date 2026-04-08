---
name: memory-obsidian
description: 長期記憶管理 — 使用 Obsidian Vault 儲存與檢索記憶。當用戶說「記住」「記憶」「回憶」「忘記」「remember」「recall」「forget」「我之前說過」「我的偏好」「搜尋記憶」「記憶統計」「列出記憶」時觸發。也用於對話開始時載入記憶、對話結束前儲存記憶。
user-invocable: true
metadata: {"openclaw":{"emoji":"🧠","always":true}}
---

# 長期記憶管理（Obsidian）

你具備長期記憶能力，使用 Obsidian Vault 儲存與檢索記憶。
記憶以 Markdown 檔案存放，每個 agent 有獨立的記憶空間。

## Vault 位置

- Vault 根目錄：`~/openclaw-vault/`（Obsidian CLI 預設已指向此 vault）
- 你的記憶區：`{agentId}/memories/`
- 你的每日筆記：`{agentId}/daily/`
- 你的長期記憶：`{agentId}/long-term/MEMORY.md`
- 全域共用區：`_shared/`（可讀不可寫）

> **{agentId}** 是你的 agent ID（main, mgmt, engineering, procurement, design, sales, finance, south, sysdev）。

## CLI 語法

Obsidian CLI 使用 `key=value` 格式，值含空格時用引號。用 `\n` 表示換行。

## 記憶操作

### 1. Memory Recall（回憶）

搜尋並讀取相關記憶。

```bash
# 搜尋記憶（全文搜尋）
obsidian search query="關鍵字" path="{agentId}/memories"

# 搜尋記憶（含上下文）
obsidian search:context query="關鍵字" path="{agentId}/memories"

# 讀取特定記憶
obsidian read path="{agentId}/memories/abc12345.md"

# 讀取長期記憶
obsidian read path="{agentId}/long-term/MEMORY.md"
```

### 2. Memory Store（儲存）

建立新記憶。儲存前**必須先去重**（見下方去重機制）。

```bash
obsidian create path="{agentId}/memories/{id}.md" content="---\nid: {id}\ncategory: {category}\nimportance: {0.0-1.0}\nscope: {agentId}\ntier: working\naccess_count: 0\nlast_accessed: {YYYY-MM-DD}\ncreated_at: {YYYY-MM-DD}\ntags: [memory, auto-captured, {category}]\nabstract: \"{一句話摘要}\"\n---\n\n# {標題}\n\n{記憶內容}"
```

**記憶分類（category）**：
- `preference` — 偏好（例：王主任偏好表格格式）
- `fact` — 事實（例：公司有 50 位員工）
- `decision` — 決策（例：決定採用 A 方案）
- `entity` — 人物/組織/聯絡方式
- `reflection` — 反思/教訓
- `other` — 其他

**重要性（importance）**：
- `0.9-1.0` — 核心記憶（重要決策、關鍵人物偏好）
- `0.6-0.8` — 工作記憶（常用事實、流程經驗）
- `0.3-0.5` — 邊緣記憶（偶爾有用的資訊）
- `0.0-0.2` — 暫存記憶（很可能不再需要）

### 3. Memory Forget（遺忘）

刪除不再需要的記憶。

```bash
obsidian delete path="{agentId}/memories/{id}.md" permanent
```

### 4. Memory Update（更新）

更新既有記憶的內容或 metadata。

```bash
# 更新 frontmatter 屬性
obsidian property:set path="{agentId}/memories/{id}.md" name="access_count" value="{新值}" type=number
obsidian property:set path="{agentId}/memories/{id}.md" name="last_accessed" value="{YYYY-MM-DD}"

# 如需更新內容，用 overwrite 重新建立
obsidian create path="{agentId}/memories/{id}.md" content="{更新後完整內容}" overwrite
```

### 5. Memory Stats（統計）

查看記憶統計資訊。

```bash
# 記憶數量
obsidian files folder="{agentId}/memories" total

# 查看標籤統計
obsidian tags counts sort=count

# 查看特定檔案的屬性
obsidian properties path="{agentId}/memories/{id}.md"
```

### 6. Memory List（列表）

列出記憶檔案。

```bash
# 列出所有記憶
obsidian files folder="{agentId}/memories"

# 用 JSON 格式
obsidian search query="memory" path="{agentId}/memories" format=json
```

## 去重機制

**儲存新記憶前必須檢查重複**：

1. 取記憶摘要的前 30 個字
2. 執行 `obsidian search query="{摘要前30字}" path="{agentId}/memories"`
3. 如果找到高度相似的記憶：
   - 更新既有記憶（增加 access_count，更新 last_accessed，補充新資訊）
   - **不要建立新記憶**
4. 如果沒有相似記憶，才建立新的

## 每次對話的記憶行為

### 對話開始時

1. 讀取長期記憶：`obsidian read path="{agentId}/long-term/MEMORY.md"`
2. 讀取今日 daily note：`obsidian read path="{agentId}/daily/{YYYY-MM-DD}.md"`
3. 如果用戶的問題涉及特定主題，搜尋相關記憶：`obsidian search query="主題" path="{agentId}/memories"`

### 對話結束前

1. 判斷是否有值得記憶的資訊（偏好、決策、事實、實體、教訓）
2. 如有，執行 Memory Store（記得先去重）
3. 將今日摘要 append 到 daily note：
   ```bash
   obsidian append path="{agentId}/daily/{YYYY-MM-DD}.md" content="- {HH:MM} — {摘要}"
   ```
   如果今日 daily note 不存在，先建立：
   ```bash
   obsidian create path="{agentId}/daily/{YYYY-MM-DD}.md" content="---\ndate: {YYYY-MM-DD}\nagent: {agentId}\ntags: [daily, auto]\n---\n\n# {YYYY-MM-DD} 日誌\n\n## 對話摘要\n"
   ```

### 被要求回憶時

1. 先搜尋 memories/ 資料夾
2. 再搜尋 long-term/MEMORY.md
3. 再搜尋 daily/ 近期筆記
4. 綜合結果回覆，並更新相關記憶的 access_count 和 last_accessed

## 記憶層級（Tier）

| Tier | 說明 | 升降級條件 |
|------|------|-----------|
| `core` | 核心記憶，永不自動刪除 | access_count > 10 或 importance >= 0.9 |
| `working` | 工作記憶，定期檢視 | 新記憶預設層級 |
| `peripheral` | 邊緣記憶，可能被歸檔 | 30 天未存取自動降級 |

## 注意事項

- **只存取自己的記憶區**（`{agentId}/`），不動其他 agent 的資料
- **共用知識庫**（`_shared/`）可讀不可寫
- 記憶應**具體、可操作**，避免過於泛泛的描述
- 每個記憶檔案的 `id` 使用 8 位隨機英數字（如 `a1b2c3d4`）
- 遇到 UUID 衝突時重新生成
- 記憶格式詳見 `references/memory-format.md`
- 衰減規則詳見 `references/decay-rules.md`
- CLI 命令速查詳見 `references/cli-cheatsheet.md`
