-- Idempotent development data for exercising every operational workspace.
insert into public.departments (id, code, name) values
  ('10000000-0000-0000-0000-000000000001', 'CSE', 'Computer Science and Engineering'),
  ('10000000-0000-0000-0000-000000000002', 'ECE', 'Electronics and Communication Engineering')
on conflict (id) do update set code = excluded.code, name = excluded.name;

insert into public.profiles (id, display_name, email, campus_role) values
  ('demo_faculty_ada', 'Dr. Ada Raman', 'ada.raman@demo.aventra.example', 'faculty'),
  ('demo_faculty_grace', 'Prof. Grace Iyer', 'grace.iyer@demo.aventra.example', 'faculty'),
  ('demo_student_arun', 'Arun Kumar', 'arun.kumar@demo.aventra.example', 'student'),
  ('demo_student_maya', 'Maya Patel', 'maya.patel@demo.aventra.example', 'student'),
  ('demo_student_noor', 'Noor Hassan', 'noor.hassan@demo.aventra.example', 'student'),
  ('demo_maintenance_lee', 'Lee Thomas', 'lee.thomas@demo.aventra.example', 'maintenance-staff')
on conflict (id) do update set display_name = excluded.display_name, email = excluded.email, campus_role = excluded.campus_role;

insert into public.students (id, profile_id, department_id, student_number, admission_year, semester) values
  ('20000000-0000-0000-0000-000000000001', 'demo_student_arun', '10000000-0000-0000-0000-000000000001', 'AVT-CSE-2401', 2024, 5),
  ('20000000-0000-0000-0000-000000000002', 'demo_student_maya', '10000000-0000-0000-0000-000000000001', 'AVT-CSE-2402', 2024, 5),
  ('20000000-0000-0000-0000-000000000003', 'demo_student_noor', '10000000-0000-0000-0000-000000000002', 'AVT-ECE-2401', 2024, 5)
on conflict (id) do update set profile_id = excluded.profile_id, department_id = excluded.department_id, semester = excluded.semester;

insert into public.faculty_members (id, profile_id, department_id, employee_number, designation) values
  ('30000000-0000-0000-0000-000000000001', 'demo_faculty_ada', '10000000-0000-0000-0000-000000000001', 'AVT-FAC-101', 'Associate Professor'),
  ('30000000-0000-0000-0000-000000000002', 'demo_faculty_grace', '10000000-0000-0000-0000-000000000002', 'AVT-FAC-102', 'Assistant Professor')
on conflict (id) do update set profile_id = excluded.profile_id, department_id = excluded.department_id, designation = excluded.designation;

insert into public.courses (id, department_id, code, title, credit_hours) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'CS501', 'Applied Artificial Intelligence', 4),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'CS502', 'Distributed Systems', 4),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'EC501', 'Embedded Systems', 3)
on conflict (id) do update set department_id = excluded.department_id, code = excluded.code, title = excluded.title, credit_hours = excluded.credit_hours;

insert into public.course_offerings (id, course_id, faculty_id, academic_year, term, section, capacity) values
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', extract(year from current_date)::int, 'fall', 'A', 40),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', extract(year from current_date)::int, 'fall', 'A', 35),
  ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', extract(year from current_date)::int, 'fall', 'A', 30)
on conflict (id) do update set faculty_id = excluded.faculty_id, academic_year = excluded.academic_year, capacity = excluded.capacity;

insert into public.enrollments (id, student_id, offering_id) values
  ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003'),
  ('60000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

insert into public.rooms (id, code, name, kind, building, floor, capacity, is_active) values
  ('70000000-0000-0000-0000-000000000001', 'A-201', 'Innovation Classroom', 'classroom', 'Academic Block A', '2', 45, true),
  ('70000000-0000-0000-0000-000000000002', 'A-305', 'Systems Studio', 'laboratory', 'Academic Block A', '3', 32, true),
  ('70000000-0000-0000-0000-000000000003', 'B-110', 'Embedded Lab', 'laboratory', 'Engineering Block B', '1', 28, true)
on conflict (id) do update set name = excluded.name, capacity = excluded.capacity, is_active = excluded.is_active;

insert into public.equipment (id, room_id, asset_tag, name, category, status, installed_at, last_serviced_at) values
  ('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'AVT-PROJ-001', 'Laser projector', 'display', 'operational', current_date - 700, current_date - 20),
  ('80000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 'AVT-SRV-001', 'Edge compute server', 'compute', 'degraded', current_date - 400, current_date - 90),
  ('80000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000003', 'AVT-KIT-001', 'Embedded device kit', 'lab-kit', 'operational', current_date - 300, current_date - 15)
on conflict (id) do update set room_id = excluded.room_id, status = excluded.status, last_serviced_at = excluded.last_serviced_at;

insert into public.schedules (id, offering_id, room_id, starts_at, ends_at, created_by_profile_id) values
  ('90000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', current_date + time '09:00', current_date + time '10:30', 'demo_faculty_ada'),
  ('90000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', current_date + time '11:00', current_date + time '12:30', 'demo_faculty_ada'),
  ('90000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000003', current_date + time '14:00', current_date + time '15:30', 'demo_faculty_grace')
on conflict (id) do update set starts_at = excluded.starts_at, ends_at = excluded.ends_at, room_id = excluded.room_id;

insert into public.attendance_records (id, enrollment_id, session_date, status, recorded_by_profile_id) values
  ('a0000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', current_date, 'present', 'demo_faculty_ada'),
  ('a0000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', current_date, 'absent', 'demo_faculty_ada'),
  ('a0000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000003', current_date, 'late', 'demo_faculty_grace'),
  ('a0000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000004', current_date, 'present', 'demo_faculty_ada')
on conflict (id) do update set session_date = excluded.session_date, status = excluded.status;

insert into public.semester_results (id, student_id, academic_year, term, semester, gpa, cgpa, published_at) values
  ('b0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', extract(year from current_date)::int, 'fall', 5, 8.40, 8.21, now()),
  ('b0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', extract(year from current_date)::int, 'fall', 5, 5.60, 6.12, now()),
  ('b0000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', extract(year from current_date)::int, 'fall', 5, 7.75, 7.68, now())
on conflict (id) do update set gpa = excluded.gpa, cgpa = excluded.cgpa, published_at = excluded.published_at;

insert into public.maintenance_tickets (id, equipment_id, room_id, reported_by_profile_id, assigned_to_profile_id, title, description, priority, status, opened_at) values
  ('c0000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 'demo_faculty_ada', 'demo_maintenance_lee', 'Intermittent compute node failure', 'The edge server drops lab workloads under sustained load.', 'critical', 'in_progress', now() - interval '8 hours'),
  ('c0000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'demo_faculty_grace', 'demo_maintenance_lee', 'Projector color calibration', 'Projected colors are visibly inaccurate during presentations.', 'medium', 'assigned', now() - interval '1 day')
on conflict (id) do update set assigned_to_profile_id = excluded.assigned_to_profile_id, priority = excluded.priority, status = excluded.status, opened_at = excluded.opened_at;
