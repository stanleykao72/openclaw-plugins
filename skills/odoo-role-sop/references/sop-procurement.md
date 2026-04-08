# 採購(採購主管) SOP

## 系統群組

- `job_base_groups.group_buyer`
- `job_base_groups.group_buyer_manager`
- `job_base_groups.group_buyer_assistant`

---

## 操作流程 1：採購驗收簽核（job_purchase_acceptance E2E-001）

### 觸發時機

PO 到貨且入庫單（stock.picking）狀態為 done 後，收貨人員建立驗收單。**金額 >= 50,000 時需要採購主管簽核**。

### 操作步驟（採購主管）

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 收到驗收簽核通知（mail activity） | 通知出現在收件匣，僅金額 >= 50K 才會到此步 |
| 2 | 開啟驗收單，確認明細行的品項和數量 | 核對 PO 和實際到貨 |
| 3 | 點擊「Approve」→ 填寫意見 → 核准 | 意見記錄到 approval_history |
| 4 | 狀態自動推進到 to_accounting | 會計收到通知 |

### 金額路由規則

| 條件 | 路徑 |
|------|------|
| sum_price_subtotal >= 50,000 | received → **to_buyer_mgr** → to_accounting |
| sum_price_subtotal < 50,000 | received → to_accounting（跳過採購主管） |

### 退回操作（E2E-002）

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 點擊「Reject」 | 選擇退回目標狀態 |
| 2 | 填寫退回原因 | 記錄到 approval_history |
| 3 | 狀態退回到指定階段 | 收貨人員收到通知重新處理 |

---

## 操作流程 2：請購核准（material_purchase_requisitions E2E-001）

### 觸發時機

員工提交請購單，經設計師確認後到達核准階段。

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 收到請購核准通知 | 確認請購內容和數量 |
| 2 | 核准請購單 | 狀態推進到 approve |
| 3 | 建立採購單（PO） | 系統自動從請購單轉換 |

---

## 操作流程 3：BOQ 材料管理（job_working_plan_boq E2E-001/002）

### 觸發時機

工務建立 BOQ 後，採購需要管理材料備料和裁切最佳化。

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 查閱 BOQ 清單 | 確認材料規格、數量、顏色 |
| 2 | 執行裁切最佳化（如需要） | 設定材料長度和裁切耗損 |
| 3 | 依 BOQ 建立請購單 | 連結正確的工種群組 |

---

## 操作流程 4：發包估價 PO 配合（job_subcontract_acceptance E2E-006）

### 觸發時機

會計建立發包估價後，採購配合完成 PO 收貨確認。

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 確認發包合約 PO 資訊正確 | 金額、廠商、付款條件 |
| 2 | 配合會計完成 PO 收貨確認 | to_po_delivered 階段 |

---

## 常見問題

| 問題 | 解決方式 |
|------|---------|
| 驗收單沒有到採購主管 | 金額 < 50,000 正常跳過 |
| 看不到驗收單 | 確認在 group_buyer_manager 群組 |
| 退回後狀態異常 | 檢查 wizard 的 get_state_list 過濾邏輯 |
| 發包合約下拉無內容 | 確認合約 state 為 done，且專案+廠商條件正確 |

---

## 詳細 E2E 場景參考

- **acceptance E2E-001**: `user/job_purchase_acceptance/.specs/e2e/E2E-001_acceptance_basic_flow.md`
- **acceptance E2E-002**: `user/job_purchase_acceptance/.specs/e2e/E2E-002_acceptance_reject_postpone.md`
- **requisition E2E-001**: `user/material_purchase_requisitions/.specs/e2e/E2E-001_requisition_create_approve.md`
- **BOQ E2E-001/002**: `user/job_working_plan_boq/.specs/e2e/`
- **subcontract E2E-006**: `user/job_subcontract_acceptance/.specs/e2e/E2E-006_valuation_flow.md`
