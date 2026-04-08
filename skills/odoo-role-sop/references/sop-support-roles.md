# 支援角色 SOP（採購、廠工、財務、總經理、特助、助理）

---

## 廠工(廠長) SOP

### 系統群組

- `job_base_groups.group_factory_worker`
- `job_base_groups.group_factory_manager`

### 目前狀態

廠工/廠長在目前的 E2E 場景中尚未有直接的系統操作角色。待未來建立工廠相關流程（如生產排程、品檢等）的 E2E 場景後，此區段將補充完整。

---

## 採購(採購主管) SOP

### 系統群組

- `job_base_groups.group_buyer`
- `job_base_groups.group_buyer_manager`
- `job_base_groups.group_buyer_assistant`

### 操作流程：接收 CAD 完成通知（E2E-002 相關）

採購人員在 CAD 簽核流程中不直接操作，主要角色是**接收完成通知後啟動採購作業**。

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 收到 CAD done 的 mail activity 通知 | 通知出現在收件匣 |
| 2 | 確認圖面版本和規格 | 確認使用最新版本 |
| 3 | 開始備料/採購流程 | 根據圖面需求準備材料 |

### 材料類型與所需圖面

| 材料類型 | 需要的圖面 |
|---------|-----------|
| 擠型 (extrusion) | 模具圖通過審核 |
| 五金 (hardware) | 施工圖已簽認 |
| 管料/扁鐵/其他需圖 | 施工圖已簽 + 下料加工圖通過審核 |
| 樣品 | 樣品圖通過審核 |
| 其他不需圖 | 無需等待圖面 |

---

## 財務(財務主管) SOP

### 系統群組

- `job_base_groups.group_accounting`
- `job_base_groups.group_accounting_manager`
- `job_base_groups.group_accounting_assistant`

### 操作流程 1：會議記錄管理（E2E-004）

#### 特殊權限

即使會議記錄已傳送（sent），`group_accounting` 和 `group_system_admin` 仍可編輯會議記錄文字和待辦事項。

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 開啟已傳送的會議記錄 | 一般使用者此時欄位為唯讀 |
| 2 | 編輯會議記錄文字或待辦事項 | 財務和管理員有特殊編輯權限 |
| 3 | 儲存修改 | 修改立即生效 |

#### 常見問題

| 問題 | 原因 | 解決方式 |
|------|------|---------|
| 其他人反映「改不了」 | sent 狀態下只有財務/管理員可編輯 | 這是設計如此 |
| 想刪除已傳送的記錄 | sent 狀態禁止刪除 | 先取消再重設為草稿 |

### 操作流程 2：專案狀態推進

| 按鈕 | 來源狀態 | 需要的群組 |
|------|---------|-----------|
| 已取得保留款 | done | `group_accounting_assistant` / `group_accounting` / `group_accounting_manager` / `group_system_admin` |
| 保留設定 | contract_state = reservation_setting | `group_accounting` / `group_system_admin` |

---

## 總經理 / 特助 SOP

詳細操作流程請參閱 `references/sop-management.md`，涵蓋：
- 施工日誌評分與討論
- 出工/點工簽核（特助→總經理二層）
- 廠工派工審核與派工
- 發包品管最終核准
- Dashboard 部屬日誌管理

---

## 業務 SOP

### 系統群組

- `job_base_groups.group_sales`
- `job_base_groups.group_sales_manager`

### 操作流程 1：報價里程碑管理（job_project_milestone E2E-001~004）

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 建立報價單，填入客戶/業務/日期 | 序號自動產生 |
| 2 | 新增報價明細行 | 自動計算小計與含稅金額 |
| 3 | 推進狀態流程 | `draft → sent_quotation → sign_quotation → bargain_quotation → done` |
| 4 | 簽約/議價狀態可直接轉銷售訂單 | SO 與報價客戶/明細一致 |
| 5 | 建立版本快照 | done 狀態下建立，格式 YYYY-MM-DD |

### 操作流程 2：聯絡單業務簽核（job_working_plan E2E-003）

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 聯絡單到達 to_sales 狀態 | 收到 mail activity 通知 |
| 2 | 確認商務影響 | 填寫業務意見 |
| 3 | 核准推進 | 狀態推進到 to_assistant |

### 操作流程 3：報價計價（job_project_spreadsheet E2E-004）

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 建立 Valuation | 選擇計價類型 |
| 2 | 新增計價明細行 | total 自動計算 |
| 3 | 儲存 | 與報價里程碑連結 |

### 常見問題

| 問題 | 解決方式 |
|------|---------|
| 轉 SO 後修改報價 | SO 會同步更新 |
| 看不到簽核按鈕 | 確認在 group_sales_manager 群組 |
| 版本快照建立失敗 | 報價單必須在 done 狀態 |

---

## 特助 SOP

### 系統群組

- `job_base_groups.group_special_assistant`

### 操作範圍

特助在以下模組中有 `to_special_assistant` 審批階段：

| 模組 | 模型 | 審批階段 | 職責 |
|------|------|---------|------|
| `job_costing_work_package` | `project.work.package` | `to_special_assistant` | 出工/點工審批 |
| `job_subcontract_acceptance` | `job.subcontract.qc` | `to_special_assistant` | 分包品檢審批 |
| `factory_work_order` | `factory.work.order` | `pending_approval` | 廠工派工審核 |

詳細操作步驟請參閱 `references/sop-management.md`（操作流程 2~4）。

### 與助理的區別

| 角色 | 群組 | 職責範圍 | 模組 |
|------|------|---------|------|
| **特助** | `group_special_assistant` | 工程包/品檢/派工的高階審批 | work_package, subcontract_acceptance, factory_work_order |
| **助理** | `assistant_id`（動態指派） | 聯絡單全階段代理簽核 | job_working_plan（聯絡單） |

---

## 助理 SOP

### 取得方式

聯絡單的助理（`assistant_id`）不是透過固定群組取得，而是**動態指派**：
- `assistant_id` 候選人（`assistant_user_ids`）自動從 `group_buyer_assistant` + `group_sales_manager` 群組計算
- 每筆聯絡單建立時，由建立者從候選人中指定一位 `assistant_id`

注意：`group_assistant` / `group_assistant_manager` 群組存在但**不是**聯絡單 assistant_id 的來源群組。

### 操作流程：聯絡單代理簽核（E2E-003）

#### 特殊能力

被指派為 `assistant_id` 的助理可在聯絡單的**任何 `to_xxx` 階段**代理簽核。

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 確認被指派為該聯絡單的 `assistant_id` | 不是所有聯絡單都會指派助理 |
| 2 | 在任何 `to_xxx` 階段，可代替指定人員簽核 | 助理和指定角色都能操作 |
| 3 | 填寫簽核意見 → 核准或退回 | 意見必填 |

#### 簽核階段明細

| 階段 | 原始負責人 | 助理可否代理 |
|------|-----------|------------|
| to_engineer | eng_id | 可以 |
| to_designer | designer_id | 可以 |
| to_eng_mgr | engineer_mgr_id | 可以 |
| to_sales | sales_id | 可以 |
| to_assistant | assistant_id | 專屬階段 |
| to_user | user_id | 可以 |

#### 常見問題

| 問題 | 原因 | 解決方式 |
|------|------|---------|
| 看不到聯絡單的簽核按鈕 | 不是該聯絡單的 assistant_id | 確認指派狀態 |
| 不確定是否該代理簽核 | 代理是緊急情況用 | 確認原始負責人確實無法處理 |

#### `assistant_id` 候選人

`assistant_id` 的候選人自動從以下群組計算：
- `job_base_groups.group_buyer_assistant`
- `job_base_groups.group_sales_manager`

---

## 系統管理員 SOP

### 系統群組

- `job_base_groups.group_system_admin`

### 操作流程 1：工作流程設計器（job_working_plan E2E-008）

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 開啟 CAD Workflow Template | 確認 template 存在 |
| 2 | 點擊「開啟設計器」 | wizard 載入 canvas_data |
| 3 | 拖曳節點調整佈局 | 座標更新到 canvas_data |
| 4 | 儲存 | 寫回 template 的 ui_layout |

### 操作流程 2：群組管理（job_base_groups E2E-001, E2E-002）

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 驗證 26+ 安全群組繼承關係 | 確認 module_category_construction_management |
| 2 | Working Inbox 管理 | 所有用戶的 mail.activity 導航 |

### 操作流程 3：分析帳號設定（job_project_analytic E2E-001）

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | Job Project 建立時系統自動建立分析計畫 | analytic plan + distribution model |
| 2 | PO/SO 建立時自動帶入 | analytic_distribution 自動填入 |

### 全域繞過權限

`group_system_admin` 可在所有流程中繞過 `chk_login` 限制，用於緊急處理。

---

## 詳細 E2E 場景參考

- **E2E-002**: `user/job_working_plan/.specs/e2e/E2E-002_business_cad_workflow.md`
- **E2E-003**: `user/job_working_plan/.specs/e2e/E2E-003_connection_workflow.md`
- **E2E-004**: `user/job_working_plan/.specs/e2e/E2E-004_meeting_minutes.md`
- **milestone E2E-001~004**: `user/job_project_milestone/.specs/e2e/`
- **spreadsheet E2E-004**: `user/job_project_spreadsheet/.specs/e2e/E2E-004_quotation_valuation.md`
- **base_groups E2E-001~002**: `user/job_base_groups/.specs/e2e/`
- **analytic E2E-001**: `user/job_project_analytic/.specs/e2e/E2E-001_analytic_auto_distribution.md`
- **workflow E2E-008**: `user/job_working_plan/.specs/e2e/E2E-008_workflow_designer.md`
