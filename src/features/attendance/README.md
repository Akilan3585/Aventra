# Attendance

Owns session-based attendance marking for the student directory, the
low-attendance email alerts, and the Google Sheets mirror.

## Model

`attendance_records` is the system of record, keyed on the **student** (not a
class enrollment): one row per `student_id + session_date + session` (unique).
`enrollment_id` remains nullable for history only. Statuses: `present`, `absent`,
`late`, `od`, `permission`, `leave`, `excused`. Present, late, and OD count as
attended; permission, leave, and excused are excluded from the percentage
(`domain/attendance-rules.ts`, `calculateAttendanceRate`). Rows carry `remarks`,
`recorded_by_profile_id`/`recorded_at`, and `updated_by_profile_id`/`updated_at`.
`attendance_alerts` tracks a student's overall attendance (one open alert per student).

## Layers

- `domain/attendance-rules.ts`: statuses, periods, percentage rule, live summary,
  year-of-study (from `students.semester`), class label, academic year (June start).
- `domain/attendance-sheet.ts`: normalized Google Sheet rows (`Attendance`,
  `Students`, `Attendance_Audit`) and the idempotent upsert planner. Section is
  blank because students have no section column.
- `infrastructure/attendance-session.repository.ts`: the roster (every student,
  faculty scoped to students in their assigned classes, optional department and
  year filters) with existing marks for a date/period, and the mirror queries.
- `infrastructure/attendance-sheet-sync.repository.ts`: `attendance_sheet_syncs`
  run tracking.
- `application/attendance-session-actions.ts`: `saveAttendanceSessionAction`.
  Permission, faculty scope, student existence, and the version check are enforced
  on the server; inserts and optimistic updates are audited per record
  (`attendance.created` / `attendance.updated`), then alerts and the sheet mirror run.
- `application/attendance-sheet-sync.service.ts`: mirrors records into the sheet by
  matching column A ids (update in place, append the rest). Runs after each save
  (changed records only), from the manual button, and from the nightly cron.
- `presentation/`: the filters (date, period, department, year), the marking table,
  and the sync status panel.

## Concurrency

The client submits the newest `updated_at` it loaded as `version`. The action
refuses a save when the session changed since, and each update is conditioned on
the row's `updated_at`, so two users cannot silently overwrite each other.
Retries and double submits are idempotent through the unique key.
