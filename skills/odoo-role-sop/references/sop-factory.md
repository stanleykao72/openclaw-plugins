# 廠工(廠長) SOP

## 系統群組

- `job_base_groups.group_factory_worker` — 廠工
- `job_base_groups.group_factory_manager` — 廠長

---

## 操作流程 1：接收派工（factory_work_order E2E-001）

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 收到派工通知 | 確認 project、施工內容 |
| 2 | 查看派工詳情 | 施工區域、計畫日期、所需人數 |
| 3 | 到場後開始施工 | 記錄實際開始時間 |

---

## 操作流程 2：派工審核（factory_work_order E2E-002）

### 廠長操作

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 收到審核通知 | state = pending_approval |
| 2 | 確認人力、日期、區域 | |
| 3 | Approve / Reject | 核准 → approved |
| 4 | 指派 Workers | Many2many 選擇 |
| 5 | Confirm Dispatch | dispatched，自動建 project.task |

### 工作流

```
draft → pending_approval → approved → dispatched → in_progress → pending_verification → completed
```

---

## 操作流程 3：驗收（factory_work_order E2E-003）

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 導航至 Factory Work Acceptance | Pending Verification |
| 2 | 確認施工內容和照片 | |
| 3 | Verify Pass / Verify Reject | 通過 → pending final confirm |
| 4 | Final Confirm（特助/廠長） | → completed |

---

## 操作流程 4：取消與重設（factory_work_order E2E-006）

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | Cancel | → cancelled（同步取消 Tasks/Acceptance） |
| 2 | Reset to Draft | → draft（可重用） |

---

## 操作流程 5：日曆排程（factory_work_order E2E-005）

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 切換日曆視圖 | 顏色區分狀態 |
| 2 | Draft/Approved 可拖拽 | Dispatched/Completed 唯讀 |

---

## 常見問題

| 問題 | 解決方式 |
|------|---------|
| 看不到 Approve 按鈕 | 確認在 group_factory_manager 或 group_special_assistant |
| 派工後沒建 Task | 確認 Workers 已選擇 |
| 驗收 Verify 不可見 | 工單需在 pending_verification 狀態 |

## 詳細 E2E 場景參考

- `user/factory_work_order/.specs/e2e/E2E-001` ~ `E2E-006`
