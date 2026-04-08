# Obsidian CLI 常用命令速查

> Obsidian v1.12.4 — CLI 透過 IPC 與運行中的 Obsidian 通訊。
> 伺服器以 systemd 服務 `obsidian-headless.service` 運行（headless via Xvfb）。

## 語法規則

- 參數使用 `key=value` 格式（**不用** `--`）
- 值含空格時用引號：`name="My Note"`
- 布林旗標直接寫名稱：`overwrite`、`permanent`、`total`
- 用 `\n` 表示換行、`\t` 表示 tab
- `file` 按名稱解析（如 wikilink），`path` 是精確路徑（含資料夾）

## 檔案操作

### 建立筆記

```bash
obsidian create path="procurement/memories/a1b2c3d4.md" content="---\nid: a1b2c3d4\ncategory: preference\n---\n\n# 標題\n\n內容"
```

覆寫已存在的檔案：

```bash
obsidian create path="procurement/memories/a1b2c3d4.md" content="新內容" overwrite
```

### 讀取筆記

```bash
obsidian read path="procurement/memories/a1b2c3d4.md"
```

### 追加內容

```bash
obsidian append path="procurement/daily/2026-03-11.md" content="- 14:30 — 新事項"
```

### 前置內容

```bash
obsidian prepend path="procurement/daily/2026-03-11.md" content="# 重要事項\n"
```

### 刪除筆記

```bash
# 移到垃圾桶
obsidian delete path="procurement/memories/a1b2c3d4.md"

# 永久刪除
obsidian delete path="procurement/memories/a1b2c3d4.md" permanent
```

### 移動 / 重命名

```bash
obsidian move path="procurement/memories/a1b2c3d4.md" to="procurement/archive/a1b2c3d4.md"
obsidian rename path="procurement/memories/old.md" name="new.md"
```

### 列出檔案

```bash
# 列出資料夾內所有檔案
obsidian files folder="procurement/memories"

# 取得檔案數
obsidian files folder="procurement/memories" total

# 指定副檔名
obsidian files ext=md
```

## 搜尋

### 全文搜尋

```bash
obsidian search query="王主任" path="procurement/memories"
```

### 搜尋（含上下文）

```bash
obsidian search:context query="表格" path="procurement/memories"
```

### 搜尋選項

```bash
# 限制結果數
obsidian search query="報價" path="procurement" limit=5

# 區分大小寫
obsidian search query="ABC" case

# JSON 輸出
obsidian search query="報價" format=json

# 只取結果數
obsidian search query="報價" path="procurement/memories" total
```

## Frontmatter 屬性操作

### 設定屬性

```bash
obsidian property:set path="procurement/memories/a1b2c3d4.md" name="access_count" value="4" type=number
obsidian property:set path="procurement/memories/a1b2c3d4.md" name="last_accessed" value="2026-03-11"
obsidian property:set path="procurement/memories/a1b2c3d4.md" name="tier" value="core"
```

### 讀取屬性

```bash
obsidian property:read path="procurement/memories/a1b2c3d4.md" name="importance"
```

### 刪除屬性

```bash
obsidian property:remove path="procurement/memories/a1b2c3d4.md" name="obsolete_field"
```

### 列出所有屬性

```bash
obsidian properties path="procurement/memories/a1b2c3d4.md"
obsidian properties path="procurement/memories/a1b2c3d4.md" format=json
```

## 標籤操作

### 列出標籤

```bash
obsidian tags counts sort=count
```

### 查看特定標籤

```bash
obsidian tag name="memory" verbose
```

## Daily Note

### 讀取今日筆記

```bash
obsidian daily:read
```

### 追加到今日筆記

```bash
obsidian daily:append content="- 14:30 — 王主任詢問鋼材報價"
```

### 取得今日筆記路徑

```bash
obsidian daily:path
```

## Vault 資訊

```bash
obsidian vault
obsidian vault info=files
obsidian vault info=size
obsidian folders
```

## 輸出格式

大多數命令支援 `format=` 參數：

```bash
obsidian search query="pkm" format=json
obsidian tags format=csv
obsidian properties format=yaml
```

可用格式：`json`、`csv`、`tsv`、`md`、`yaml`、`tree`、`paths`（依命令而異）

## 系統管理

```bash
# 檢查版本
obsidian version

# 重新載入 vault
obsidian reload

# 重啟 Obsidian
obsidian restart
```
