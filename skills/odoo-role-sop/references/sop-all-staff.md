# 全員 SOP（每日必做）

## 系統群組

- `base.group_user`（所有登入使用者）

---

## 操作流程 1：施工日誌（每日必繳）

### 觸發時機

每天下班前，所有人員必須繳交施工日誌。逾時繳交會被標記延遲。

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 導航至 My Daily Logs | 預設篩選「我的」日誌 |
| 2 | 點擊「New」 | user/employee/department/manager 自動帶入 |
| 3 | 點擊「Get Data」 | 自動帶入當天工時表、活動計畫、出工記錄 |
| 4 | 確認日誌內容，補充說明 | OWL 元件顯示 Description、Done Tasks、Todo 等區段 |
| 5 | 點擊「Send Report」 | 送出給主管群，需要至少一筆 timesheet |
| 6 | 等待主管評分和回饋 | 可在 Rating/Discussion 區段查看和回覆 |

### 延遲規則

| 項目 | 說明 |
|------|------|
| 截止時間 | 系統設定的 deadline_datetime |
| 延遲判斷 | send_datetime > deadline_datetime → is_delay = True |
| 延遲時數 | delay_hours 自動計算 |

### Stat Buttons（快捷導航）

日誌 form 的 button_box 提供快捷按鈕：

| 按鈕 | 連結到 | 說明 |
|------|--------|------|
| Connection | job.connection | 我的聯絡單（活躍狀態） |
| Working Image | ir.attachment | 施工照片附件 |
| Design CAD | job.design.cad | 我的 CAD 圖面 |
| Meeting Minutes | job.meeting.minutes | 會議紀錄 |
| Completions | job.working.completion | 完工記錄 |
| Valuations | job.project.valuation | 專案估價 |

---

## 操作流程 2：請購建立（material_purchase_requisitions E2E-001）

### 觸發時機

施工現場需要材料時，建立請購單。

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 導航至請購單列表 | Purchase > Requisitions |
| 2 | 點擊「New」 | 選擇 Employee、Department |
| 3 | 選擇 Construction Project | 專案欄位 |
| 4 | 新增請購明細行 | 選擇 Product、填入數量 |
| 5 | 填入 reason 和 date_end | 請購理由和需求日期 |
| 6 | 點擊「Confirm」 | 狀態轉為 designer_confirm，進入設計師審核 |

### 常見錯誤

| 錯誤 | 原因 | 解決 |
|------|------|------|
| 無法確認 | 缺少 designer 或 requisition_responsible | 確認欄位已填 |
| 無法刪除 | 狀態不在 draft/cancel/reject | 先取消再刪除 |

---

## 操作流程 3：施工照片上傳（job_working_plan_image E2E-001）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 導航至施工照片管理 | 選單位置依模組設定 |
| 2 | 點擊「New」 | 填入名稱、位置、工種類型、日期 |
| 3 | 選擇 Project 和 Working Plan | job_project_id 自動帶出 |
| 4 | 上傳照片附件 | 支援圖片格式 |
| 5 | 推進狀態到 sent | 需先上傳附件才能送出 |

---

## 操作流程 4：公務車借用（fleet_borrow E2E-001/002/003）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 導航至車輛借用（預設日曆視圖） | 切換到 list view 新增 |
| 2 | 選擇車輛和專案 | 借用人自動帶入 |
| 3 | 儲存後點擊 Submit | 狀態 → submitted |
| 4 | 等待主管核准 | 核准後 → approved |
| 5 | 歸還時填入 Return Mileage | 不填無法歸還 |
| 6 | 點擊 Return Vehicle | 狀態 → accounting_review |

---

## 操作流程 5：加班申請（hr_work_overtime E2E-001）

### 加班工作流

```
draft → to_manager → to_gm → to_requestor（回填實際時間）→ to_hr → done
```

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 導航至加班列表，點擊 New | |
| 2 | 填入加班日期和計畫時間 | p_overtime_time_from/to |
| 3 | 填入加班原因 | request_reason 必填 |
| 4 | 提交到主管 | draft → to_manager |
| 5 | 主管 → GM → 回填實際 → HR 確認 | 完整 5 關 |

---

## 操作流程 6：請假代理人（hr_vacation_mngmt E2E-001）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 申請請假時選擇 leave_agent | 代理人 |
| 2 | 填寫 handover_desc | 交接說明 |
| 3 | 代理人在請假期間代理簽核 | 自動出現在代理人收件匣 |

---

## 操作流程 7：Dashboard（job_project_dashboard E2E-001）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 進入 Dashboard | 統計卡片（未回報/遲到/請假/車輛借用） |
| 2 | 點擊卡片導航到詳細列表 | |
| 3 | 查看待審核活動 | 按類型分組，即時更新 |
| 4 | 自訂 Quick Actions | 齒輪設定按鈕順序 |
