# 工務(工務主管) SOP

## 系統群組

- `job_base_groups.group_engineer`
- `job_base_groups.group_engineer_manager`
- `job_base_groups.group_engineer_manager_2`
- `job_base_groups.group_engineer_assistant`

## 操作流程 1：聯絡單工程簽核（E2E-003）

### 流程位置

`to_engineer` 階段——聯絡單建立者提交後第一個簽核環節。

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 收到聯絡單簽核通知（mail activity） | 通知出現在收件匣 |
| 2 | 開啟聯絡單，確認工程內容和行項目明細 | 至少要有 1 筆行項目（BR-012） |
| 3 | 點擊「簽核」→ 填寫工程意見 → 核准 | 意見記錄到 `engineer_input`，為正式紀錄 |
| 4 | 狀態自動推進到 `to_designer` | 設計人員收到通知 |

### 簽核權限

| 條件 | 可否操作 |
|------|---------|
| 登入帳號 = 該聯絡單的 `eng_id` | 可以 |
| 登入帳號 = 該聯絡單的 `assistant_id` | 可以（代理） |
| 登入帳號有 `group_system_admin` | 可以（全域繞過） |
| 其他 | 不可以，看不到簽核按鈕 |

### 常見問題

| 問題 | 原因 | 解決方式 |
|------|------|---------|
| 看不到簽核按鈕 | 不是該聯絡單的 eng_id | 確認是正確的指派人員 |
| 簽核時報錯「請輸入簽核意見」 | 意見欄為必填 | 填寫意見後再送出 |
| 不知道自己是否需要簽核 | 未收到通知 | 檢查收件匣的 mail activity |

---

## 操作流程 2：專案任務生成（E2E-007）

### 流程位置

主要操作者——從工作計畫生成標準化的專案任務。

### 前置條件

- 工作計畫 state 必須為 `done`
- 階段範本（`job.project.stage.template`）已建立

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 開啟已完成的工作計畫 | state = done |
| 2 | 點擊「生成任務」按鈕 | 開啟 Generate Tasks Wizard |
| 3 | 確認範本載入，全部預設勾選 | 可取消不需要的項目 |
| 4 | 點擊「生成任務」 | 系統自動建立含父子層級的專案任務 |
| 5 | 回到專案查看任務列表 | 確認任務正確建立 |

### 常見問題

| 問題 | 原因 | 解決方式 |
|------|------|---------|
| 找不到「生成任務」按鈕 | 工作計畫 state ≠ done | 先完成工作計畫 |
| 生成的任務缺少父子關係 | 範本的 parent_id 未設定 | 請管理員檢查範本設定 |
| 不小心重複生成 | 系統允許多次生成 | 手動刪除重複的任務 |

---

## 操作流程 3：專案狀態推進

### 工務可執行的專案狀態操作

| 按鈕 | 來源狀態 | 目標狀態 | 需要的群組 |
|------|---------|---------|-----------|
| 在建工程 | sale_order | in_progress | `group_engineer_assistant` / `group_engineer` / `group_engineer_manager` / `group_engineer_manager_2` / `group_system_admin` |
| 變更成員 | 多種狀態 | — | 工務 + 業務相關群組 |

---

## 操作流程 4：完工報告書產出（completion E2E-001）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 導航至完工報告書列表 | 選擇 in_progress 的 Job Project |
| 2 | 點擊「New」，選擇 Job Project | Customer、Sale Order 自動帶入 |
| 3 | 填入完工說明和日期 | 不能用預設「系統自動產生」 |
| 4 | 選擇施工照片 | 列印前必須選擇 |
| 5 | 點擊「Sent」→「Print」 | 產出 PDF 完工報告書 |

---

## 操作流程 5：施工照片管理（image E2E-001/002）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 導航至施工照片管理 | 點擊「New」 |
| 2 | 填入名稱、位置、工種類型、日期 | working_state 預設 post_work |
| 3 | 選擇 Project 和 Working Plan | job_project_id 自動帶出 |
| 4 | 上傳照片附件 | 支援 JPEG/PNG |
| 5 | 推進狀態 draft → get → sent | sent 需先上傳附件 |

---

## 操作流程 6：請購單建立（requisition E2E-001）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 導航至請購單列表 | 點擊「New」 |
| 2 | 選擇 Project 和 Working Group | job_project_id 自動帶出 |
| 3 | 新增請購明細行 | 選擇產品和數量 |
| 4 | 點擊「Confirm」 | 需要有 job_working_plan_id |

---

## 操作流程 7：工作包管理（work_package E2E-001）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 建立工作包，選擇 Job Project | project_id 自動帶出 |
| 2 | 新增工作包明細行 | 指定 worker_type、計畫人數、計畫工時 |
| 3 | 提交到特助簽核 | worker_type 和 plan 值不可為 0 |

---

## 操作流程 8：專案排程管理（job_project_management E2E-001）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 從 Job Project form 點擊「Schedule」 | 開啟排程列表 |
| 2 | 新增排程，設定 Plan 日期 | sale_handover_plan、entry_date_plan 等 5 組 |
| 3 | 隨專案進行更新 Actual 日期 | Plan/Actual 差異自動追蹤 |
| 4 | 查看里程碑按鈕 | 13 個里程碑 stat button |

---

## 操作流程 9：專案異常管理（job_project_management E2E-002）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 收到異常通知 | mail activity 提醒 |
| 2 | 開啟異常記錄確認內容 | 含異常說明和文件連結 |
| 3 | 點擊「已瞭解」 | activity feedback 自動完成 |

---

## 操作流程 10：Gantt 排程追蹤（job_project_gantt E2E-001）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 切換到 Gantt 視圖 | 任務以甘特圖顯示 |
| 2 | 查看 schedule_status | on_track / behind / ahead |
| 3 | 確認 start_variance_days / end_variance_days | 正值=超前，負值=落後 |

---

## 操作流程 11：尺寸量測（dimension_measurement E2E-001）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 建立量測單 | 填入說明、選擇 CAD 和 Working Plan |
| 2 | 提交到設計師 | draft → pending_designer |
| 3 | 指派量測人員（by 助理） | pending_assistant → assigned |
| 4 | 上傳量測結果 | assigned → pending_collection |
| 5 | 設計師最終確認 | pending_designer_confirm → completed |

### 工作流

```
draft → pending_designer → pending_assistant → assigned → pending_collection → pending_designer_confirm → completed
```

---

## 操作流程 12：Timeline 試算表（job_project_spreadsheet E2E-001）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 從 Working Plan 點擊 Timeline | 開啟試算表 client action |
| 2 | 查看 7 個標準階段 | 丈量→開立請購 |
| 3 | 點擊階段進入 Spreadsheet 編輯 | cell metadata 可編輯 |

---

## 操作流程 13：發包驗收（job_subcontract_acceptance E2E-001~003, E2E-008~010）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 進入發包驗收列表，點擊「新增」 | 選擇工種專案 |
| 2 | 選擇廠商和發包合約 | 合約須為 done 狀態，系統自動帶入工務/採購/會計人員 |
| 3 | 點擊「取得發包明細」 | 明細行自動從合約帶入（含位置、產品、數量） |
| 4 | 勾選明細行的框組/完工狀態 | 支援批次更新（選樓層+位置維度） |
| 5 | 點擊「完工送出」 | 系統自動建立品管單（to_assistant） |

### 批次更新（E2E-003）

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 開啟批次更新 wizard | 選擇樓層和位置維度 |
| 2 | 選擇要更新的狀態（框組/完工） | 批量更新符合條件的明細行 |

### 其他操作

| 操作 | 說明 |
|------|------|
| 匯出報告（E2E-009） | 非 draft 狀態可匯出 XLSX，含公司 logo 和專案資訊 |
| 刪除限制（E2E-008） | 僅 draft 可刪除，其他狀態不可刪除 |

---

## 操作流程 14：廠工派工建立（factory_work_order E2E-001）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 導航至 Factory > Factory Work Orders | 點擊「New」 |
| 2 | 選擇 Project 和 Working Plan | Working Plan 按 Project domain 過濾 |
| 3 | 選擇 Order Type（External/Internal） | 外包或內製 |
| 4 | 填入施工內容、區域、日期、所需人數 | 日期應為未來日期 |
| 5 | 儲存後點擊「Submit for Approval」 | 狀態 draft → pending_approval，通知特助 |

### 日曆排程（E2E-005）

- 日曆視圖顏色區分：外包已派/外包待派/內製已派/內製待派
- Draft/Approved 可拖拽調整排程
- Dispatched/Completed 唯讀

### 取消與重設（E2E-006）

- Draft 可直接取消 → cancelled → 可重設為 draft
- Dispatched 取消會連鎖取消 Task 和 Acceptance Order

---

## 操作流程 15：試算表與設計排程（job_project_spreadsheet E2E-001~003, E2E-005~006）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 從 Working Plan 點擊 Timeline | 開啟試算表 client action |
| 2 | 查看 7 個標準階段 | 丈量→開立請購 |
| 3 | 點擊 cell 進入 Spreadsheet 編輯 | double-click 開啟 Metadata Editor |
| 4 | 開啟 Design Schedule（smart button） | CAD 階層結構、日期編輯、歷史記錄 |
| 5 | 開啟 Dimension Config（smart button） | General/Stair/Door-Window 三種模式 |
| 6 | 查看週報區塊 | 當週/前週切換 |

---

## 詳細 E2E 場景參考

完整操作步驟和驗證清單：
- **E2E-003**: `user/job_working_plan/.specs/e2e/E2E-003_connection_workflow.md`
- **E2E-007**: `user/job_working_plan/.specs/e2e/E2E-007_project_stage_template.md`
- **completion E2E-001**: `user/job_working_plan_completion/.specs/e2e/E2E-001_completion_basic_flow.md`
- **image E2E-001/002**: `user/job_working_plan_image/.specs/e2e/`
- **requisition E2E-001**: `user/job_working_plan_requisition/.specs/e2e/E2E-001_requisition_basic_flow.md`
- **work_package E2E-001**: `user/job_working_plan_work_package/.specs/e2e/E2E-001_work_package_integration.md`
- **schedule E2E-001**: `user/job_project_management/.specs/e2e/E2E-001_schedule_basic_flow.md`
- **exception E2E-002**: `user/job_project_management/.specs/e2e/E2E-002_exception_handling.md`
- **gantt E2E-001**: `user/job_project_gantt/.specs/e2e/`
- **dimension E2E-001**: `user/dimension_measurement/.specs/e2e/`
- **spreadsheet E2E-001~006**: `user/job_project_spreadsheet/.specs/e2e/`
- **subcontract E2E-001~003, E2E-008~010**: `user/job_subcontract_acceptance/.specs/e2e/`
- **factory E2E-001, E2E-005, E2E-006**: `user/factory_work_order/.specs/e2e/`
