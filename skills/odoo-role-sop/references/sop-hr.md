# 人資(HR) SOP

## 系統群組

- `job_base_groups.group_human_resource`
- 額外繼承 `hr.group_hr_user`

---

## 操作流程 1：考勤月報檢查（attendance_check_inout E2E-001）

### 操作步驟

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 導航至考勤月報列表 | 篩選目標月份/年度 |
| 2 | 開啟員工月報記錄 | attendance_year / attendance_month |
| 3 | 展開日報明細 | work_datetime / offwork_datetime |
| 4 | 點擊「Check」 | 自動比對打卡和請假/加班 |
| 5 | 檢查 is_late / is_leave_early | 紅色標記為異常 |
| 6 | 點擊「Check Timeoff」 | 核對請假記錄 |
| 7 | 點擊「Check Overtime」 | 核對加班記錄 |

---

## 操作流程 2：加班管理（hr_work_overtime E2E-001）

### 加班工作流

```
draft → to_manager → to_gm → to_requestor → to_hr → done
```

### HR 操作（to_hr 階段）

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 收到加班 HR 確認通知 | 檢查加班日期和時數 |
| 2 | 核對計畫 vs 實際時數 | p_overtime vs a_overtime |
| 3 | 確認加班限制 | hr.work.overtime.restriction |
| 4 | 點擊「Done」 | 狀態 → done |

---

## 操作流程 3：補出勤管理（calendar_attendance_makeup E2E-001）

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 導航至補出勤列表 | 新增或查閱 |
| 2 | 設定補班日期和時段 | 需為非工作日 |
| 3 | 儲存後自動建立 calendar meeting | 員工行事曆同步 |

---

## 操作流程 4：補假設定（hr_leave_makeup E2E-001）

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 導航至假別設定 | Time Off > Types |
| 2 | 設定 include_makeup_days | 影響請假天數計算 |

---

## 操作流程 5：薪資處理（l10n_tw_hr_payroll E2E-001/002）

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 確認 TW Payroll Configuration | 健保/勞保/勞退費率 |
| 2 | 確認薪資結構規則 | 出勤扣除/加班費 |
| 3 | 產生薪資單批次 | 月初處理上月 |
| 4 | 核對薪資明細 | 比對出勤月報和加班 |

---

## 操作流程 6：休假代理人管理（hr_vacation_mngmt E2E-001）

| 步驟 | 操作 | 注意事項 |
|------|------|---------|
| 1 | 確認 leave_agent 設定 | 請假需指定代理人 |
| 2 | 檢查 handover_desc | 交接說明必填 |
| 3 | 設定提醒天數 | Settings > leave_reminder |

---

## 常見問題

| 問題 | 解決方式 |
|------|---------|
| 日報 check_inout_ids 為空 | 確認員工當天是否打卡 |
| 加班單卡在 to_hr | 確認 HR 帳號在 group_human_resource |
| 請假沒有代理人選項 | 確認 hr.group.agent 設定 |

## 詳細 E2E 場景參考

- `user/attendance_check_inout/.specs/e2e/`
- `user/hr_work_overtime/.specs/e2e/`
- `user/calendar_attendance_makeup/.specs/e2e/`
- `user/hr_leave_makeup/.specs/e2e/`
- `user/l10n_tw_hr_payroll/.specs/e2e/`
- `user/hr_vacation_mngmt/.specs/e2e/`
