---
name: odoo-role-sop
description: 角色導向作業 SOP。當用戶問「角色 SOP」「role SOP」「教育訓練」「新人訓練」「onboarding」「操作手冊」「who does what」「角色操作」「角色權限」「職位流程」「training guide」「哪個角色做什麼」「新人要學什麼」「操作流程」「SOP」時觸發。提供基於 job_base_groups 的角色操作指南，涵蓋 22 個模組、82 個 E2E 場景。
user-invocable: true
metadata: {"openclaw":{"emoji":"📋"}}
---

# 角色導向作業 SOP | Role-Based SOP Guide

根據 `job_base_groups` 定義的系統角色，從 E2E 場景提取各角色的標準作業程序。涵蓋 **22 個模組、82 個 E2E 場景**。適用於教育訓練和日常操作參考。

## 使用方式

1. 確認查詢的角色（或指定「全部」列出所有角色）
2. 查閱該角色涉及的操作流程、E2E 場景、注意事項
3. 展開特定場景取得詳細操作步驟

## 角色總覽

| 角色 | 系統群組 | 核心職責 | Reference |
|------|---------|---------|-----------|
| 工務(工務主管) | `group_engineer` / `group_engineer_manager` | CAD、聯絡單、完工報告、施工照片、日誌、請購、發包驗收、排程 | `references/sop-engineering.md` |
| 設計(設計主管) | `group_designer` / `group_designer_manager` | CAD 建立/簽核/退回/版本變更、請購設計確認、尺寸設定 | `references/sop-design.md` |
| 採購(採購主管) | `group_buyer` / `group_buyer_manager` | 採購驗收簽核（>= 50K）、請購核准、BOQ | `references/sop-procurement.md` |
| 財務(財務主管) | `group_accounting` / `group_accounting_manager` | 驗收會計審核、營收預測、發包估價、車輛借用結案 | `references/sop-finance.md` |
| 總經理/特助 | `group_general_manager` / `group_special_assistant` | 高階審批、工作包驗收、日誌評分、派工審核、品管核准 | `references/sop-management.md` |
| 全員 | `base.group_user` | 施工日誌（每日必繳）、請購建立、車輛借用、Dashboard | `references/sop-all-staff.md` |
| 人資(HR) | `group_human_resource` | 考勤月報、加班管理、補出勤、補假、薪資處理、休假代理 | `references/sop-hr.md` |
| 廠工(廠長) | `group_factory_worker` / `group_factory_manager` | 派工單建立、驗收、日曆排程 | `references/sop-factory.md` |
| 業務 | `group_sales` / `group_sales_manager` | 報價里程碑、估價、聯絡單業務簽核 | `references/sop-support-roles.md` |
| 系統管理員 | `group_system_admin` | 工作流程設計器、群組管理、分析帳號、緊急處理 | `references/sop-support-roles.md` |

查詢特定角色 → 讀取對應 reference 檔案。查詢「全部角色」→ 依序讀取所有 reference。

## E2E 場景索引

### 核心工作流模組

| 模組 | 場景數 | 涉及角色 |
|------|-------|---------|
| job_working_plan | 8 | 設計、工務、業務、採購、系統管理 |
| job_subcontract_acceptance | 10 | 工務、採購、財務 |
| job_project_forecast | 10 | 財務、工務 |
| job_project_milestone | 4 | 業務、設計、工務 |
| job_project_management | 4 | 工務、財務、全員 |
| job_project_spreadsheet | 6 | 工務、設計 |

### 驗收與採購

| 模組 | 場景數 | 涉及角色 |
|------|-------|---------|
| job_purchase_acceptance | 2 | 收貨人員、採購主管、會計 |
| material_purchase_requisitions | 2 | 全員、設計、採購 |
| job_working_plan_requisition | 3 | 工務、設計、PM、採購、會計 |

### 日誌與照片

| 模組 | 場景數 | 涉及角色 |
|------|-------|---------|
| construction_daily_logs | 2 | 全員、主管 |
| job_working_plan_daily_log | 3 | 全員、主管 |
| job_working_plan_image | 2 | 工務 |
| job_working_plan_completion | 1 | 工務/PM |

### 工作包與 BOQ

| 模組 | 場景數 | 涉及角色 |
|------|-------|---------|
| job_costing_work_package | 1 | 工務、特助、總經理 |
| job_working_plan_boq | 2 | 工務、採購 |

### 廠工派工

| 模組 | 場景數 | 涉及角色 |
|------|-------|---------|
| factory_work_order | 6 | 廠工、廠長、特助 |

### 車輛與出勤

| 模組 | 場景數 | 涉及角色 |
|------|-------|---------|
| fleet_borrow | 5 | 全員、主管、會計 |
| attendance_check_inout | 1 | HR |
| calendar_attendance_makeup | 1 | HR |
| hr_work_overtime | 1 | 全員、主管、GM、HR |
| hr_leave_makeup | 1 | HR |
| hr_vacation_mngmt | 1 | 全員、HR |

### Dashboard 與報表

| 模組 | 場景數 | 涉及角色 |
|------|-------|---------|
| job_project_dashboard | 5 | 全員 |
| job_project_gantt | 2 | 工務/PM |
| dimension_measurement | 1 | 設計、工務 |

### 其他

| 模組 | 場景數 | 涉及角色 |
|------|-------|---------|
| job_base_groups | 2 | 系統管理 |
| job_project_analytic | 1 | 系統管理 |
| purchase_down_payment | 1 | 採購、財務 |
| l10n_tw_hr_payroll | 2 | HR、財務 |

## 教育訓練流程

### 新人到職引導

| 步驟 | 操作 | 說明 |
|------|------|------|
| 1 | 確認新人的角色 | 對應角色總覽表 |
| 2 | 讀取該角色的 SOP reference | 提供操作步驟和注意事項 |
| 3 | 在 Staging 環境搭配 E2E 場景實操 | 讀取對應模組的 `.specs/e2e/` 取得步驟 |
| 4 | 用 E2E 驗證清單確認學習成果 | 每份 E2E 底部都有驗證清單 |

### 日常參考

- 忘記操作流程 → 查對應角色的 SOP reference
- 遇到權限問題 → 查角色對照表的群組設定
- 新功能上線 → 同步更新 E2E 場景和 SOP reference

## 群組定義來源

所有角色群組定義在 `user/job_base_groups/security/job_base_groups_security.xml`，均屬於 `module_category_construction_management` 分類。`group_system_admin` 可在所有流程中繞過 `chk_login` 限制。

## 維護指南

### 新增或更新角色 SOP

1. 在 `odoo-claude-code/universal/skills/odoo-role-sop/references/` 建立或更新對應的 reference 檔案
2. 更新 SKILL.md 的角色總覽和 E2E 場景索引
3. 執行 `openclaw-plugins/scripts/deploy.sh skills` 同步到 `~/.openclaw/`

### E2E 場景檔案位置

場景檔案存放在各模組內：`user/{module}/.specs/e2e/E2E-xxx_*.md`
E2E Runner 腳本：`user/{module}/.specs/e2e/e2e_test_runner.py`
