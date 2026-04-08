# 記憶衰減與分層規則

## 概念

記憶不是永久存在的。透過衰減機制，確保記憶系統保持精簡、相關。
衰減由 HEARTBEAT 定期觸發（建議每週一次）。

## 三層記憶模型

```
┌─────────────────────────────────────────┐
│              CORE（核心）                │  永不自動刪除
│  importance >= 0.9 或 access_count > 10  │
├─────────────────────────────────────────┤
│            WORKING（工作）               │  新記憶預設層級
│  活躍使用中的記憶                        │
├─────────────────────────────────────────┤
│          PERIPHERAL（邊緣）              │  可能被歸檔
│  30 天未存取自動降級至此                  │
└─────────────────────────────────────────┘
         │
         ▼  90 天未存取
┌─────────────────────────────────────────┐
│            ARCHIVE（歸檔）               │
│  移至 {agentId}/archive/                 │
│  仍可手動搜尋，不參與自動回憶             │
└─────────────────────────────────────────┘
```

## 升降級規則

### 升級（Promotion）

| 條件 | 動作 |
|------|------|
| `access_count > 10` 且 tier 為 working | 升級為 `core` |
| `importance >= 0.9` 且 tier 為 working | 升級為 `core` |
| 手動標記 | 可隨時升級到任何層級 |

### 降級（Demotion）

| 條件 | 動作 |
|------|------|
| `last_accessed` 超過 30 天，tier 為 working | 降級為 `peripheral` |
| `last_accessed` 超過 90 天，tier 為 peripheral | 移至 `archive/` |
| `importance < 0.2` 且 tier 為 working | 降級為 `peripheral` |

### 保護

| 條件 | 保護 |
|------|------|
| tier 為 `core` | **永不自動降級或歸檔** |
| 手動策展的記憶（在 long-term/MEMORY.md 中） | 不受衰減影響 |

## HEARTBEAT 維護流程

每週執行一次（建議週日或週一凌晨）：

### Step 1: 掃描記憶

```bash
# 列出所有記憶
obsidian files --path "{agentId}/memories" --vault ~/openclaw-vault
```

### Step 2: 檢查降級

對每個記憶檔案：
1. 讀取 frontmatter 的 `last_accessed` 和 `tier`
2. 如果 `tier: working` 且 `last_accessed` 超過 30 天 → 設為 `tier: peripheral`
3. 如果 `tier: peripheral` 且 `last_accessed` 超過 90 天 → 移至 `archive/`

### Step 3: 檢查升級

對每個記憶檔案：
1. 如果 `tier: working` 且 `access_count > 10` → 設為 `tier: core`
2. 如果 `tier: working` 且 `importance >= 0.9` → 設為 `tier: core`

### Step 4: 萃取到長期記憶

1. 掃描 `daily/` 近 7 天的筆記
2. 萃取重要事項（偏好、決策、教訓、新事實）
3. 更新 `long-term/MEMORY.md`

### Step 5: 統計報告

產出本週記憶統計：
- 新增記憶數
- 升級 / 降級 / 歸檔數
- 各 tier 記憶分布
- 各 category 記憶分布

## 注意事項

- 衰減**不影響** `core` 層級的記憶
- 衰減**不影響** `long-term/MEMORY.md`（策展記憶）
- 歸檔的記憶只是搬移到 `archive/`，仍可手動查詢
- 如果歸檔後的記憶再次被存取，應重新移回 `memories/` 並升級為 `working`
