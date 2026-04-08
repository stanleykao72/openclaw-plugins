# 總經理 / 特助 SOP

## 系統群組

- `job_base_groups.group_general_manager`
- `job_base_groups.group_special_assistant`

---

## 操作流程 1：施工日誌評分與討論（daily_log E2E-003）

### 觸發時機

全員每日施工日誌送出後，主管群收到通知進行評分。

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 收到日誌送出通知 | 在收件匣或 All Daily Logs 查閱 |
| 2 | 開啟已送出的日誌（state=sent_report） | OWL 元件顯示完整內容 |
| 3 | 在 Rating 區段給予 1-5 分評價 | 評分記錄到 construction.daily.log.rating |
| 4 | 在 Discussion 區段留言回饋 | 支援附件上傳 |
| 5 | 查看建立者的回覆 | 支援 parent-child 討論串 |

### 評分標準

| 分數 | 含義 |
|------|------|
| 5 | 優秀 |
| 4 | 良好 |
| 3 | 普通 |
| 2 | 需改善 |
| 1 | 不合格 |

---

## 操作流程 2：出工/點工簽核（job_costing_work_package E2E-001）

### 觸發時機（特助）

工務人員提交工作包到 to_special_assistant 狀態後。

### 操作步驟（特助）

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 收到出工/點工簽核通知 | 檢查工作包明細和計畫數值 |
| 2 | 確認 worker_type、plan_num_workers、plan_hours | 不可為 0 |
| 3 | 點擊「Approve」→ 核准 | 狀態推進到 to_gm |

### 操作步驟（總經理）

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 收到出工/點工簽核通知（from 特助） | 最終核准層 |
| 2 | 點擊「Approve」→ 核准 | 狀態推進到 plan_confirm |

---

## 操作流程 3：廠工派工審核與派工（factory_work_order E2E-002, E2E-003）

### 操作步驟（特助 — 審核與派工）

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 收到派工審核通知 | state = pending_approval |
| 2 | 點擊「Approve」→ 填寫意見 | 狀態推進到 approved |
| 3 | 選擇派工人員、填工作天數/實際開始日 | worker_type 和 count 不可為 0 |
| 4 | 點擊「Confirm Dispatch」 | 狀態 → dispatched，系統自動建立 tasks |

### 操作步驟（特助 — 驗收最終確認）

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 驗收人員 verify pass 後到 pending_final_confirmation | 需施工照片 |
| 2 | 特助點擊「Final Confirm」 | 工單和驗收單都完成 |

---

## 操作流程 4：發包品管最終核准（job_subcontract_acceptance E2E-004）

### 操作步驟（特助）

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 品管單到達 to_special_assistant 狀態 | 工務助理＋品管人員已審核通過 |
| 2 | 審核內容後核准 | 狀態推進到 done |

---

## 操作流程 5：Dashboard 部屬日誌管理（job_project_dashboard E2E-005）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 開啟 Dashboard | 部屬日誌區塊自動顯示 |
| 2 | 查看部屬日誌表格 | 含日期/姓名/送出時間/延遲狀態/評分 |
| 3 | 分頁瀏覽 | next/prev 按鈕 |
| 4 | 點擊記錄開啟詳細頁面 | 可直接評分和留言 |

---

## 常見問題

| 問題 | 解決方式 |
|------|---------|
| 日誌 Rating 區段不可見 | 確認日誌在 sent_report 狀態 |
| 出工/點工簽核按鈕不可見 | 確認帳號在 group_special_assistant 或 group_general_manager |
| 派工 Approve 按鈕不可見 | 確認工單在 pending_approval 且帳號有 group_special_assistant |
| 品管單看不到核准按鈕 | 確認品管單在 to_special_assistant 狀態 |
| Dashboard 部屬日誌區塊不顯示 | 確認帳號為主管角色（有下屬） |

---

## 詳細 E2E 場景參考

- **daily_log E2E-003**: `user/job_working_plan_daily_log/.specs/e2e/E2E-003_daily_log_rating_discussion.md`
- **work_package E2E-001**: `user/job_costing_work_package/.specs/e2e/E2E-001_work_package_approval.md`
- **factory E2E-002**: `user/factory_work_order/.specs/e2e/E2E-002_approval_dispatch_flow.md`
- **factory E2E-003**: `user/factory_work_order/.specs/e2e/E2E-003_acceptance_verification_flow.md`
- **subcontract E2E-004**: `user/job_subcontract_acceptance/.specs/e2e/E2E-004_qc_approval_flow.md`
- **dashboard E2E-005**: `user/job_project_dashboard/.specs/e2e/E2E-005_subordinate_daily_logs.md`
