export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_decisions: {
        Row: {
          approved_at: string | null
          approved_by_profile_id: string | null
          confidence: number
          created_at: string
          decision_type: string
          id: string
          reasons: Json
          recommendations: Json
          requires_human_review: boolean
          run_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_profile_id?: string | null
          confidence: number
          created_at?: string
          decision_type: string
          id?: string
          reasons?: Json
          recommendations?: Json
          requires_human_review?: boolean
          run_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by_profile_id?: string | null
          confidence?: number
          created_at?: string
          decision_type?: string
          id?: string
          reasons?: Json
          recommendations?: Json
          requires_human_review?: boolean
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_decisions_approved_by_profile_id_fkey"
            columns: ["approved_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_decisions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_messages: {
        Row: {
          created_at: string
          id: string
          payload: Json
          recipient_agent: string
          run_id: string
          sender_agent: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          recipient_agent: string
          run_id: string
          sender_agent: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          recipient_agent?: string
          run_id?: string
          sender_agent?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_name: string
          completed_at: string | null
          correlation_id: string
          created_at: string
          error_message: string | null
          id: string
          input: Json
          output: Json | null
          requested_by_profile_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["agent_run_status"]
        }
        Insert: {
          agent_name: string
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          input?: Json
          output?: Json | null
          requested_by_profile_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["agent_run_status"]
        }
        Update: {
          agent_name?: string
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          input?: Json
          output?: Json | null
          requested_by_profile_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["agent_run_status"]
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_requested_by_profile_id_fkey"
            columns: ["requested_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          enrollment_id: string
          feedback: string | null
          graded_at: string | null
          graded_by_profile_id: string | null
          id: string
          score: number | null
          submitted_at: string | null
        }
        Insert: {
          assignment_id: string
          enrollment_id: string
          feedback?: string | null
          graded_at?: string | null
          graded_by_profile_id?: string | null
          id?: string
          score?: number | null
          submitted_at?: string | null
        }
        Update: {
          assignment_id?: string
          enrollment_id?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by_profile_id?: string | null
          id?: string
          score?: number | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_graded_by_profile_id_fkey"
            columns: ["graded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          created_at: string
          due_at: string | null
          id: string
          maximum_marks: number
          offering_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_at?: string | null
          id?: string
          maximum_marks: number
          offering_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_at?: string | null
          id?: string
          maximum_marks?: number
          offering_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_offering_id_fkey"
            columns: ["offering_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_alerts: {
        Row: {
          created_at: string
          enrollment_id: string
          id: string
          last_attempted_at: string | null
          notification_id: string | null
          observed_percent: number
          provider_message_id: string | null
          recipient_profile_id: string
          resolved_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          threshold_percent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          enrollment_id: string
          id?: string
          last_attempted_at?: string | null
          notification_id?: string | null
          observed_percent: number
          provider_message_id?: string | null
          recipient_profile_id: string
          resolved_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          threshold_percent: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          enrollment_id?: string
          id?: string
          last_attempted_at?: string | null
          notification_id?: string | null
          observed_percent?: number
          provider_message_id?: string | null
          recipient_profile_id?: string
          resolved_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          threshold_percent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_alerts_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_alerts_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_alerts_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          enrollment_id: string
          id: string
          recorded_at: string
          recorded_by_profile_id: string | null
          session_date: string
          status: string
        }
        Insert: {
          enrollment_id: string
          id?: string
          recorded_at?: string
          recorded_by_profile_id?: string | null
          session_date: string
          status: string
        }
        Update: {
          enrollment_id?: string
          id?: string
          recorded_at?: string
          recorded_by_profile_id?: string | null
          session_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_recorded_by_profile_id_fkey"
            columns: ["recorded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_profile_id: string | null
          correlation_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_offerings: {
        Row: {
          academic_year: number
          capacity: number
          course_id: string
          created_at: string
          faculty_id: string | null
          id: string
          section: string
          term: string
          updated_at: string
        }
        Insert: {
          academic_year: number
          capacity: number
          course_id: string
          created_at?: string
          faculty_id?: string | null
          id?: string
          section: string
          term: string
          updated_at?: string
        }
        Update: {
          academic_year?: number
          capacity?: number
          course_id?: string
          created_at?: string
          faculty_id?: string | null
          id?: string
          section?: string
          term?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_offerings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_offerings_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty_members"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          created_at: string
          credit_hours: number
          department_id: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          credit_hours: number
          department_id: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          credit_hours?: number
          department_id?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          enrolled_at: string
          id: string
          offering_id: string
          student_id: string
        }
        Insert: {
          enrolled_at?: string
          id?: string
          offering_id: string
          student_id: string
        }
        Update: {
          enrolled_at?: string
          id?: string
          offering_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_offering_id_fkey"
            columns: ["offering_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          asset_tag: string
          category: string
          created_at: string
          id: string
          installed_at: string | null
          last_serviced_at: string | null
          name: string
          room_id: string
          status: Database["public"]["Enums"]["equipment_status"]
          updated_at: string
        }
        Insert: {
          asset_tag: string
          category: string
          created_at?: string
          id?: string
          installed_at?: string | null
          last_serviced_at?: string | null
          name: string
          room_id: string
          status?: Database["public"]["Enums"]["equipment_status"]
          updated_at?: string
        }
        Update: {
          asset_tag?: string
          category?: string
          created_at?: string
          id?: string
          installed_at?: string | null
          last_serviced_at?: string | null
          name?: string
          room_id?: string
          status?: Database["public"]["Enums"]["equipment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_members: {
        Row: {
          created_at: string
          department_id: string
          designation: string
          employee_number: string
          id: string
          profile_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id: string
          designation: string
          employee_number: string
          id?: string
          profile_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string
          designation?: string
          employee_number?: string
          id?: string
          profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_members_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_marks: {
        Row: {
          assessment_name: string
          enrollment_id: string
          id: string
          marks_obtained: number
          maximum_marks: number
          recorded_at: string
          recorded_by_profile_id: string | null
        }
        Insert: {
          assessment_name: string
          enrollment_id: string
          id?: string
          marks_obtained: number
          maximum_marks: number
          recorded_at?: string
          recorded_by_profile_id?: string | null
        }
        Update: {
          assessment_name?: string
          enrollment_id?: string
          id?: string
          marks_obtained?: number
          maximum_marks?: number
          recorded_at?: string
          recorded_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_marks_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_marks_recorded_by_profile_id_fkey"
            columns: ["recorded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tickets: {
        Row: {
          assigned_to_profile_id: string | null
          created_at: string
          description: string
          equipment_id: string | null
          id: string
          opened_at: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          reported_by_profile_id: string | null
          resolved_at: string | null
          room_id: string
          status: Database["public"]["Enums"]["ticket_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to_profile_id?: string | null
          created_at?: string
          description: string
          equipment_id?: string | null
          id?: string
          opened_at?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          reported_by_profile_id?: string | null
          resolved_at?: string | null
          room_id: string
          status?: Database["public"]["Enums"]["ticket_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to_profile_id?: string | null
          created_at?: string
          description?: string
          equipment_id?: string | null
          id?: string
          opened_at?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          reported_by_profile_id?: string | null
          resolved_at?: string | null
          room_id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tickets_assigned_to_profile_id_fkey"
            columns: ["assigned_to_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_reported_by_profile_id_fkey"
            columns: ["reported_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          channel: string
          created_at: string
          id: string
          read_at: string | null
          recipient_profile_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          subject: string
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_profile_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          subject: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_profile_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by_profile_id: string | null
          campus_role: string
          clerk_user_id: string | null
          created_at: string
          display_name: string
          email: string
          id: string
          membership_status: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by_profile_id?: string | null
          campus_role: string
          clerk_user_id?: string | null
          created_at?: string
          display_name: string
          email: string
          id: string
          membership_status?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by_profile_id?: string | null
          campus_role?: string
          clerk_user_id?: string | null
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          membership_status?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_approved_by_profile_id_fkey"
            columns: ["approved_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          building: string
          capacity: number
          code: string
          created_at: string
          floor: string | null
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["room_kind"]
          name: string
          updated_at: string
        }
        Insert: {
          building: string
          capacity: number
          code: string
          created_at?: string
          floor?: string | null
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["room_kind"]
          name: string
          updated_at?: string
        }
        Update: {
          building?: string
          capacity?: number
          code?: string
          created_at?: string
          floor?: string | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["room_kind"]
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          created_at: string
          created_by_profile_id: string | null
          ends_at: string
          id: string
          offering_id: string
          room_id: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_profile_id?: string | null
          ends_at: string
          id?: string
          offering_id: string
          room_id: string
          starts_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_profile_id?: string | null
          ends_at?: string
          id?: string
          offering_id?: string
          room_id?: string
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_offering_id_fkey"
            columns: ["offering_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      semester_results: {
        Row: {
          academic_year: number
          cgpa: number
          gpa: number
          id: string
          published_at: string | null
          semester: number
          student_id: string
          term: string
        }
        Insert: {
          academic_year: number
          cgpa: number
          gpa: number
          id?: string
          published_at?: string | null
          semester: number
          student_id: string
          term: string
        }
        Update: {
          academic_year?: number
          cgpa?: number
          gpa?: number
          id?: string
          published_at?: string | null
          semester?: number
          student_id?: string
          term?: string
        }
        Relationships: [
          {
            foreignKeyName: "semester_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          admission_year: number
          created_at: string
          department_id: string
          id: string
          profile_id: string | null
          semester: number
          student_number: string
          updated_at: string
        }
        Insert: {
          admission_year: number
          created_at?: string
          department_id: string
          id?: string
          profile_id?: string | null
          semester: number
          student_number: string
          updated_at?: string
        }
        Update: {
          admission_year?: number
          created_at?: string
          department_id?: string
          id?: string
          profile_id?: string | null
          semester?: number
          student_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      agent_run_status:
        | "queued"
        | "running"
        | "completed"
        | "failed"
        | "cancelled"
      equipment_status: "operational" | "degraded" | "offline" | "retired"
      notification_status: "queued" | "sent" | "failed" | "read"
      room_kind: "classroom" | "laboratory"
      ticket_priority: "low" | "medium" | "high" | "critical"
      ticket_status: "open" | "assigned" | "in_progress" | "resolved" | "closed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agent_run_status: [
        "queued",
        "running",
        "completed",
        "failed",
        "cancelled",
      ],
      equipment_status: ["operational", "degraded", "offline", "retired"],
      notification_status: ["queued", "sent", "failed", "read"],
      room_kind: ["classroom", "laboratory"],
      ticket_priority: ["low", "medium", "high", "critical"],
      ticket_status: ["open", "assigned", "in_progress", "resolved", "closed"],
    },
  },
} as const
