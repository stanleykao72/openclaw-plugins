# Vault 資料夾結構

## 整體架構

```
~/openclaw-vault/                        # Obsidian Vault 根目錄
├── .obsidian/                           # Obsidian 設定（勿修改）
│
├── _shared/                             # 全公司共用知識庫（唯讀）
│   ├── company-sop/                     # 公司制度、SOP
│   ├── templates/                       # 筆記模板
│   └── contacts/                        # 公司通訊錄
│
├── main/                                # Stanley 個人（main agent）
│   ├── memories/                        # 個別記憶檔案
│   ├── daily/                           # 每日記錄（YYYY-MM-DD.md）
│   └── long-term/
│       └── MEMORY.md                    # 策展後長期記憶
│
├── mgmt/                                # 主管群 agent
│   ├── memories/
│   ├── daily/
│   └── long-term/
│       └── MEMORY.md
│
├── engineering/                         # 工務 agent
│   ├── memories/
│   ├── daily/
│   └── long-term/
│       └── MEMORY.md
│
├── procurement/                         # 採購 agent
│   ├── memories/
│   ├── daily/
│   └── long-term/
│       └── MEMORY.md
│
├── design/                              # 設計 agent
│   ├── memories/
│   ├── daily/
│   └── long-term/
│       └── MEMORY.md
│
├── sales/                               # 業務 agent
│   ├── memories/
│   ├── daily/
│   └── long-term/
│       └── MEMORY.md
│
├── finance/                             # 財務 agent
│   ├── memories/
│   ├── daily/
│   └── long-term/
│       └── MEMORY.md
│
├── south/                               # 南區 agent
│   ├── memories/
│   ├── daily/
│   └── long-term/
│       └── MEMORY.md
│
└── sysdev/                              # 系統開發 agent
    ├── memories/
    ├── daily/
    └── long-term/
        └── MEMORY.md
```

## 資料夾用途

| 資料夾 | 用途 | 存取規則 |
|--------|------|---------|
| `_shared/` | 全公司共用知識（SOP、通訊錄、模板） | 所有 agent 可讀，不可寫 |
| `{agentId}/memories/` | 個別記憶檔案（一個記憶一個 .md） | 僅該 agent 可讀寫 |
| `{agentId}/daily/` | 每日對話摘要（YYYY-MM-DD.md） | 僅該 agent 可讀寫 |
| `{agentId}/long-term/` | 策展後的長期記憶 | 僅該 agent 可讀寫 |

## 存取規則

1. 每個 agent **只能讀寫自己的資料夾**（`{agentId}/`）
2. `_shared/` 可讀不可寫
3. 不得存取其他 agent 的資料夾
4. 如需跨 agent 資訊交流，應透過 `_shared/` 或 OpenClaw 的通知機制
