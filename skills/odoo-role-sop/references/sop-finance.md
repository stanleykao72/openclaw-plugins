# 財務(財務主管) SOP

## 系統群組

- `job_base_groups.group_accounting`
- `job_base_groups.group_accounting_manager`

---

## 操作流程 1：採購驗收會計審核（job_purchase_acceptance E2E-001）

### 觸發時機

驗收單到達 to_accounting 狀態後，會計進行財務確認。

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 收到驗收會計審核通知 | 確認驗收單金額和付款日期 |
| 2 | 核對明細行的數量和金額 | 負數量（退貨）會在此步更新 qty_received |
| 3 | 點擊「Approve」→ 核准 | 狀態推進到 to_payment |
| 4 | 建立供應商帳單（如需要） | 透過 create_purchase_bill wizard |

### 付款日期計算規則

| 到貨月份 | 到貨日期 | 付款日期 |
|---------|---------|---------|
| 非 12 月 | 1-25 日 | +2 個月的 5 號 |
| 非 12 月 | 25-31 日 | +3 個月的 5 號 |
| 12 月 | 1-25 日 | 隔年 2 月 5 號 |
| 12 月 | 25-31 日 | 隔年 3 月 5 號 |

---

## 操作流程 2：完工報告書（job_working_plan_completion）

### 觸發時機

已簡化為完工報告書產出。財務角色在此模組的操作有限。

### 注意事項

- 系統自動建立的完工單，只有會計或系統管理員可以取消
- `sys_create_datetime` 非空的記錄不可刪除

---

---

## 操作流程 3：現金流預測試算表（job_project_forecast E2E-001~005）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 進入 Cash Flow Forecast > Forecast Spreadsheet | 建立或開啟試算表 |
| 2 | 設定時間區間和區域篩選 | time_period_start/end |
| 3 | 開啟預測矩陣 | 專案×月份×金額 |
| 4 | 編輯預測金額 | 手動輸入或從估值同步 |
| 5 | 發票過帳自動同步 actual 金額 | actual_line 快取表即時更新 |
| 6 | 建立版本快照 | 支援回滾和版本比較 |

---

## 操作流程 4：專案損益分析（job_project_management E2E-003）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 進入 PnL 列表 | 按年月/專案篩選 |
| 2 | 查看營收/成本/利潤 | revenue_subtotal / total_cost_subtotal / profit_subtotal |
| 3 | 展開明細 | 按 pnl_type 分類（SO/PO/subcontract/expense/timesheet） |
| 4 | 查看 Graph/Pivot 視圖 | Pie 圖表和樞紐分析 |

---

## 操作流程 5：車輛借用結案（fleet_borrow E2E-003）

### 觸發時機

車輛歸還後到達 Accounting Review 狀態。

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 收到車輛借用結案通知 | state = accounting_review |
| 2 | 確認里程數和使用記錄 | return_mileage 已填入 |
| 3 | 點擊 Complete → 填寫意見 | 狀態推進到 done |

---

## 操作流程 6：發包驗收估價（job_subcontract_acceptance E2E-006/007）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 進入估價計價列表 | 選擇已完成驗收的項目 |
| 2 | 取得發包明細 → 送 PO 收貨 → 完成 | 三步推進 |
| 3 | 建立供應商帳單 | 可多筆合併建立 |

---

## 操作流程 7：薪資核對（l10n_tw_hr_payroll E2E-001）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 確認薪資結構設定 | TW 特殊計算規則 |
| 2 | 核對薪資單明細 | 比對出勤和加班記錄 |
| 3 | 確認各項保費扣繳 | 健保/勞保/勞退/所得稅 |

---

## 常見問題

| 問題 | 解決方式 |
|------|---------|
| 金額為 0 | 確認 acceptance_detail 的 quantity_done 已填入 |
| 付款日期不對 | 檢查 vendor_shipped_date 是否正確 |
| 帳單建立失敗 | 確認供應商和產品資料完整 |
| 預測 actual 金額未同步 | 確認發票已過帳且 analytic distribution 正確 |
| PnL 金額異常 | 確認 Cron 是否有執行 action_project_pnl |
