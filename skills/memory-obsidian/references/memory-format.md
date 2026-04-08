# 記憶筆記格式規範

## 檔案命名

- 路徑：`{agentId}/memories/{id}.md`
- `{id}`：8 位隨機英數字（如 `a1b2c3d4`）
- 範例：`procurement/memories/f7e3a9b1.md`

## Frontmatter 欄位

```yaml
---
id: a1b2c3d4                          # 8 位隨機英數字 ID
category: preference                   # 記憶分類（見下方）
importance: 0.8                        # 重要性 0.0-1.0
scope: procurement                     # 所屬 agent ID
tier: working                          # 記憶層級：core / working / peripheral
access_count: 3                        # 被存取次數
last_accessed: 2026-03-11             # 最近一次存取日期
created_at: 2026-03-11                # 建立日期
tags: [memory, auto-captured, preference]  # 標籤
abstract: "王主任偏好表格式比較"        # 一句話摘要（< 50 字）
---
```

## 記憶分類（category）

| 分類 | 說明 | 範例 |
|------|------|------|
| `preference` | 人物偏好、習慣 | 王主任偏好表格比較 |
| `fact` | 事實、數據 | 公司有 50 位員工 |
| `decision` | 決策記錄 | 決定採用供應商 A |
| `entity` | 人物、組織、聯絡方式 | 供應商 B 聯絡人：陳先生 0912-xxx |
| `reflection` | 反思、教訓 | 報價單未附交期被退回 |
| `other` | 不屬於以上分類 | — |

## 重要性等級（importance）

| 範圍 | 等級 | 說明 |
|------|------|------|
| 0.9-1.0 | 核心 | 重要決策、關鍵人物偏好、不可遺忘 |
| 0.6-0.8 | 重要 | 常用事實、流程經驗、業務知識 |
| 0.3-0.5 | 一般 | 偶爾有用的資訊 |
| 0.0-0.2 | 暫存 | 很可能不再需要的資訊 |

## 記憶層級（tier）

| Tier | 說明 | 保留策略 |
|------|------|---------|
| `core` | 核心記憶 | 永不自動刪除或降級 |
| `working` | 工作記憶 | 新記憶預設層級，30 天未存取降為 peripheral |
| `peripheral` | 邊緣記憶 | 90 天未存取移至 archive/ |

## 完整範例

```markdown
---
id: f7e3a9b1
category: preference
importance: 0.8
scope: procurement
tier: working
access_count: 3
last_accessed: 2026-03-11
created_at: 2026-03-04
tags: [memory, auto-captured, preference]
abstract: "王主任偏好表格式比較"
---

# 王主任偏好表格式比較

王主任在比較供應商報價時，偏好使用表格呈現，不喜歡純文字列表。
已在三次對話中確認此偏好。

## 相關觀察

- 2026-03-04：第一次提到，比較鋼材報價時要求改成表格
- 2026-03-07：再次確認，電子零件比價也要求表格
- 2026-03-11：主動要求「照上次表格方式列出」
```

## Daily Note 格式

```markdown
---
date: 2026-03-11
agent: procurement
tags: [daily, auto]
---

# 2026-03-11 採購助理日誌

## 對話摘要

- 14:30 — 王主任詢問鋼材報價，回覆了三家供應商比價表
- 16:00 — 收到新請購單 PR-2026-0342，已通知採購主管審核

## 待追蹤

- [ ] PR-2026-0342 等待採購主管核准
- [ ] 鋼材供應商 B 報價本週五到期

## 學到的

- 王主任偏好表格式比較，不喜歡純文字列表
```

## Long-term MEMORY.md 格式

```markdown
---
agent: procurement
last_updated: 2026-03-11
tags: [memory, curated]
---

# 採購助理 — 長期記憶

## 人物偏好

- **王主任**：偏好表格比較、重視交期甚於價格
- **李經理**：喜歡簡短摘要、會追問細節

## 供應商筆記

- **供應商 A（大成鋼鐵）**：品質穩定、交期準、價格偏高 5%
- **供應商 B（宏遠金屬）**：價格最優、但交期偶爾延遲

## 流程經驗

- 請購單超過 50 萬需額外經主管群核准
- 每月最後一週採購系統會進行月結，避免此時送單

## 教訓

- 2026-02-15：報價單未附交期被退回，之後一律附上
```
