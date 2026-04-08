# 設計(設計主管) SOP

## 系統群組

- `job_base_groups.group_designer` — 設計人員
- `job_base_groups.group_designer_manager` — 設計主管
- `job_base_groups.group_designer_audit` — 設計審核
- `job_base_groups.group_designer_assistant` — 設計助理

## 操作流程 1：CAD 建立與簽核（E2E-001, E2E-002）

### 流程位置

全流程主導——從建立圖面到推進到 done。

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 進入「設計圖管理」→「新增」 | state = draft |
| 2 | 選擇正確的 subject type | 不同類型階段數不同（2~6 步），選錯會走錯流程 |
| 3 | 填寫專案、工作計畫、CAD 描述 | 專案須為「在建工程」狀態（BR-001-R11） |
| 4 | 逐步簽核推進到 done | 每步填寫簽核意見 |

### 各圖面類型速查

| Subject | 中文 | 階段數 | 特殊要求 |
|---------|------|--------|---------|
| construction | 施工圖 | 6 | 含丈量+簽認，最複雜 |
| business | 營業圖 | 4 | 無丈量 |
| process | 下料加工圖 | 3 | 須指定來源施工圖（source_cad_id） |
| sample | 樣品加工圖 | 3 | — |
| layout_survey | 放樣丈量圖 | 4 | 含丈量 |
| layout_control | 放樣管制圖 | 3 | — |
| sign_construction | 簽認施工圖 | 2 | draft → done |
| 3d_cad | 3D 圖 | 3 | — |
| mold | 模具圖 | 3 | — |
| others | 工班安裝圖 | 3 | — |
| cleanup | 清圖 | 2 | 僅報價階段可用（BR-010） |

### 簽核權限矩陣

| 階段 (state) | 誰可以操作 (`chk_login = True`) |
|-------------|-------------------------------|
| draft | 所有人 |
| processing | 審批清單成員 |
| first | 審批清單成員 |
| size_measure | `group_size_measurement` + 審批清單 |
| to_design_audit | 僅 `designer_audit_id`（設計審核人） |
| sign | 審批清單成員 |
| done | 僅 `designer_audit_id` |

### 常見問題

| 問題 | 原因 | 解決方式 |
|------|------|---------|
| 選錯 subject type | 施工圖 6 步 vs 清圖 2 步，差距大 | 建立前確認圖面類型 |
| 專案狀態不符無法建立 | BR-001-R11 要求 in_progress | 確認專案和工作計畫狀態 |
| 下料加工圖建立失敗 | 未指定 source_cad_id | 先選擇已完成的施工圖作為來源 |
| 清圖無法建立 | 專案不在報價階段 | 清圖僅限 quotation 狀態 |

---

## 操作流程 2：CAD 退回處理（E2E-005）

### 流程位置

接收退回 / 執行退回決策。

### 退回操作

| 情境 | 操作 |
|------|------|
| **被退回** | 收到退回通知 → 查看退回意見 → 從退回目標狀態重新修改推進 |
| **退回別人** | 簽核時選「退回」→ 選擇退回目標狀態 → 填寫退回意見（必填） |

### 退回規則

- 退回目標狀態會根據 CAD 類型自動過濾（SUBJECT_REMOVE_STATE_MAP）
- 三層退回架構：template-driven → config-driven → legacy
- 退回意見和退回目標狀態皆為必填
- 退回後 approval_history 新增 state='reject' 記錄

### 常見問題

| 問題 | 原因 | 解決方式 |
|------|------|---------|
| 退回時找不到目標狀態 | 不同 subject 可退回的狀態不同 | 這是設計如此，由 template 或 config 決定 |
| 退回後不知如何繼續 | 退回到指定狀態後需重新推進 | 從目標狀態重新開始簽核 |

---

## 操作流程 3：版本變更（E2E-006）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 開啟已有版本的 CAD，點擊「版本變更」 | wizard 載入 CAD 資訊（唯讀） |
| 2 | 填寫新版本號（V2, V3...）、變更內容 | 版本號和變更內容都是必填 |
| 3 | 點擊「確認變更」 | 版本歷史記錄到 cad_line_ids，chatter 留訊息 |

### 注意事項

- 版本號為 Char 欄位，公司約定用 V1, V2, V3... 命名
- 可多次執行版本變更，歷史記錄累積
- 填寫時注意「是否為追加合約」欄位

---

## 操作流程 4：流程設計器（E2E-008）

### 存取限制

僅 `group_system_admin` 可操作。設計主管可查看但不可修改。

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 開啟 CAD Workflow Template 記錄 | 確認 template 存在 |
| 2 | 點擊「開啟設計器」 | wizard 載入 canvas_data |
| 3 | 拖曳節點調整佈局 | 座標更新到 canvas_data |
| 4 | 儲存 | 寫回 template 的 ui_layout |

### 注意事項

- workflow.designer 是 TransientModel，不會持久化，必須明確儲存
- 修改 template 前確認沒有進行中的 CAD 使用該 template

---

## 操作流程 5：請購設計確認（job_working_plan_requisition E2E-001, E2E-002）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 收到請購設計確認通知 | state = designer_confirm |
| 2 | 確認請購明細的材料規格和數量 | 核對 BOQ 與圖面 |
| 3 | 設計審核通過 | 狀態推進到 designer_audit |
| 4 | 設計審核人最終確認 | 推進到 pm_confirm 或 approve |

---

## 操作流程 6：尺寸設定（job_project_spreadsheet E2E-005）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 開啟 Working Plan → Dimension Config | smart button |
| 2 | 選擇模式：General / Stair / Door-Window | 三種模式各自獨立設定 |
| 3 | 在矩陣中設定數值 | 按尺寸和類型填寫 |
| 4 | 儲存 → 重新開啟確認持久化 | 設定保存到 DB |

---

## 操作流程 7：設計排程管理（job_project_spreadsheet E2E-003）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 開啟 Design Schedule（smart button） | 顯示 CAD 階層結構 |
| 2 | 點擊日期欄位 | 開啟 JSON Date Editor |
| 3 | 編輯計劃/實際日期 | 支援多種日期類型 |
| 4 | 儲存後查看歷史記錄 | History Panel 記錄變更 |

---

## 操作流程 8：Dashboard Design Schedule Grid（job_project_dashboard E2E-003）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 開啟 Dashboard | Design Schedule Grid 區塊 |
| 2 | 搜尋篩選 Project | Grid 更新顯示 CAD 記錄 |
| 3 | 展開父 CAD 查看子 CAD | 階層結構 |
| 4 | 可選匯出 Excel | 匯出 Design Schedule |

---

## 詳細 E2E 場景參考

- **E2E-001**: `user/job_working_plan/.specs/e2e/E2E-001_construction_cad_workflow.md`
- **E2E-002**: `user/job_working_plan/.specs/e2e/E2E-002_business_cad_workflow.md`
- **E2E-005**: `user/job_working_plan/.specs/e2e/E2E-005_cad_reject_workflow.md`
- **E2E-006**: `user/job_working_plan/.specs/e2e/E2E-006_version_change.md`
- **E2E-008**: `user/job_working_plan/.specs/e2e/E2E-008_workflow_designer.md`
- **requisition E2E-001**: `user/job_working_plan_requisition/.specs/e2e/E2E-001_requisition_basic_flow.md`
- **requisition E2E-002**: `user/job_working_plan_requisition/.specs/e2e/E2E-002_requisition_approval_and_po.md`
- **spreadsheet E2E-003**: `user/job_project_spreadsheet/.specs/e2e/E2E-003_design_schedule.md`
- **spreadsheet E2E-005**: `user/job_project_spreadsheet/.specs/e2e/E2E-005_dimension_config.md`
- **dashboard E2E-003**: `user/job_project_dashboard/.specs/e2e/E2E-003_design_schedule_grid.md`
