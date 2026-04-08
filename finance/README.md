# Finance & Accounting Skills

財務會計工作流程 skills，支援月結、日記帳分錄、帳戶對帳、財報生成、差異分析、SOX 審計。

> 改編自 [odoo-claude-code/plugins/finance](https://github.com/stanleykao72/odoo-claude-code) (openspec branch)，
> 從 Claude Code plugin 格式轉為 OpenClaw skills 格式。

## Skills 一覽

### 知識參考 (Knowledge Skills)

| Skill | 說明 |
|-------|------|
| `journal-entry-prep` | JE 最佳實踐、標準應計類型、支持文件要求、審核流程 |
| `reconciliation` | 對帳方法論 (GL-to-subledger, bank rec, intercompany) |
| `financial-statements` | 損益表/資產負債表/現金流量表格式、GAAP 規範、Flux 分析 |
| `variance-analysis` | 差異分解技術 (price/volume, rate/mix)、重要性門檻、瀑布圖 |
| `close-management` | 月結檢查清單、任務排程與依賴、狀態追蹤 |
| `audit-support` | SOX 404 控制測試方法、樣本選取、缺陷分類 |

### 操作指令 (Command Skills)

| Skill | 說明 |
|-------|------|
| `journal-entry` | 準備日記帳分錄（應計、折舊、預付攤銷、薪資、收入認列） |
| `reconciliation-cmd` | 執行帳戶對帳作業，產生對帳工作底稿 |
| `income-statement` | 產生損益表，含期間比較與差異分析 |
| `variance-analysis-cmd` | 差異/波動分析，分解為驅動因素並產生瀑布圖 |
| `sox-testing` | SOX 合規測試，產生樣本選取與測試工作底稿 |

## 使用方式

將此目錄加入 OpenClaw 的 skills 載入路徑：

```jsonc
// openclaw.json
{
  "skills": {
    "load": {
      "extraDirs": [
        "/home/ubuntu/openclaw-plugins/finance/skills"
      ]
    }
  }
}
```

或在特定 agent 的 workspace `.claude/skills/` 下建立 symlink。

## 免責聲明

這些 skills 協助財務會計工作流程，但**不提供**財務、稅務或審計建議。所有產出應由合格的財務專業人員審核後方可使用。
