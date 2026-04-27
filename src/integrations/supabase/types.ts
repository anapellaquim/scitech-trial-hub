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
      activities: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          phase_id: string
          priority: string | null
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          phase_id: string
          priority?: string | null
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          phase_id?: string
          priority?: string | null
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action: string
          activity_id: string
          changes: Json | null
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          activity_id: string
          changes?: Json | null
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          activity_id?: string
          changes?: Json | null
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      change_control_approvals: {
        Row: {
          approver_name: string
          change_control_id: string
          comments: string | null
          created_at: string
          decision: string
          decision_date: string | null
          id: string
        }
        Insert: {
          approver_name: string
          change_control_id: string
          comments?: string | null
          created_at?: string
          decision?: string
          decision_date?: string | null
          id?: string
        }
        Update: {
          approver_name?: string
          change_control_id?: string
          comments?: string | null
          created_at?: string
          decision?: string
          decision_date?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_control_approvals_change_control_id_fkey"
            columns: ["change_control_id"]
            isOneToOne: false
            referencedRelation: "change_controls"
            referencedColumns: ["id"]
          },
        ]
      }
      change_controls: {
        Row: {
          change_code: string
          change_type: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          impact_assessment: string | null
          opened_at: string
          project_id: string
          resolved_at: string | null
          responsible: string | null
          status: string
          updated_at: string
        }
        Insert: {
          change_code: string
          change_type?: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          impact_assessment?: string | null
          opened_at?: string
          project_id: string
          resolved_at?: string | null
          responsible?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          change_code?: string
          change_type?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          impact_assessment?: string | null
          opened_at?: string
          project_id?: string
          resolved_at?: string | null
          responsible?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_controls_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string
          id: string
          is_global: boolean | null
          items: Json
          name: string
          updated_at: string
          visit_type: Database["public"]["Enums"]["visit_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_global?: boolean | null
          items?: Json
          name: string
          updated_at?: string
          visit_type: Database["public"]["Enums"]["visit_type"]
        }
        Update: {
          created_at?: string
          id?: string
          is_global?: boolean | null
          items?: Json
          name?: string
          updated_at?: string
          visit_type?: Database["public"]["Enums"]["visit_type"]
        }
        Relationships: []
      }
      committee_attendees: {
        Row: {
          committee_id: string
          created_at: string
          id: string
          member_name: string
          present: boolean
        }
        Insert: {
          committee_id: string
          created_at?: string
          id?: string
          member_name: string
          present?: boolean
        }
        Update: {
          committee_id?: string
          created_at?: string
          id?: string
          member_name?: string
          present?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "committee_attendees_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_deliberations: {
        Row: {
          committee_id: string
          content: string
          created_at: string
          id: string
        }
        Insert: {
          committee_id: string
          content: string
          created_at?: string
          id?: string
        }
        Update: {
          committee_id?: string
          content?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "committee_deliberations_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
        ]
      }
      committees: {
        Row: {
          agenda: string | null
          committee_type: string
          created_at: string
          id: string
          meeting_date: string
          meeting_number: number
          next_meeting_date: string | null
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          agenda?: string | null
          committee_type?: string
          created_at?: string
          id?: string
          meeting_date: string
          meeting_number: number
          next_meeting_date?: string | null
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          agenda?: string | null
          committee_type?: string
          created_at?: string
          id?: string
          meeting_date?: string
          meeting_number?: number
          next_meeting_date?: string | null
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "committees_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_occurrences: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          due_date: string
          evidence_url: string | null
          id: string
          notes: string | null
          plan_id: string
          project_id: string
          sent_date: string | null
          status: Database["public"]["Enums"]["communication_occurrence_status"]
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          due_date: string
          evidence_url?: string | null
          id?: string
          notes?: string | null
          plan_id: string
          project_id: string
          sent_date?: string | null
          status?: Database["public"]["Enums"]["communication_occurrence_status"]
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          due_date?: string
          evidence_url?: string | null
          id?: string
          notes?: string | null
          plan_id?: string
          project_id?: string
          sent_date?: string | null
          status?: Database["public"]["Enums"]["communication_occurrence_status"]
          updated_at?: string
        }
        Relationships: []
      }
      communication_plan_recipients: {
        Row: {
          created_at: string
          id: string
          plan_id: string
          role: Database["public"]["Enums"]["communication_recipient_role"]
          stakeholder_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_id: string
          role?: Database["public"]["Enums"]["communication_recipient_role"]
          stakeholder_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_id?: string
          role?: Database["public"]["Enums"]["communication_recipient_role"]
          stakeholder_id?: string
        }
        Relationships: []
      }
      communication_plans: {
        Row: {
          channel: Database["public"]["Enums"]["communication_channel"]
          created_at: string
          created_by: string | null
          description: string | null
          due_day_offset: number
          end_date: string | null
          frequency: Database["public"]["Enums"]["communication_frequency"]
          id: string
          is_active: boolean
          is_mandatory: boolean
          lead_time_days: number
          project_id: string
          purpose: string | null
          responsible_user_id: string | null
          sender_stakeholder_id: string | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_day_offset?: number
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["communication_frequency"]
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          lead_time_days?: number
          project_id: string
          purpose?: string | null
          responsible_user_id?: string | null
          sender_stakeholder_id?: string | null
          start_date?: string
          title: string
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_day_offset?: number
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["communication_frequency"]
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          lead_time_days?: number
          project_id?: string
          purpose?: string | null
          responsible_user_id?: string | null
          sender_stakeholder_id?: string | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      communication_stakeholders: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          organization: string | null
          project_id: string
          stakeholder_type: Database["public"]["Enums"]["stakeholder_type"]
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          organization?: string | null
          project_id: string
          stakeholder_type?: Database["public"]["Enums"]["stakeholder_type"]
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization?: string | null
          project_id?: string
          stakeholder_type?: Database["public"]["Enums"]["stakeholder_type"]
          updated_at?: string
        }
        Relationships: []
      }
      crf_audit_log: {
        Row: {
          action: string
          created_at: string
          entry_id: string
          field_id: string | null
          id: string
          ip_address: unknown
          new_value: string | null
          old_value: string | null
          reason: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entry_id: string
          field_id?: string | null
          id?: string
          ip_address?: unknown
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entry_id?: string
          field_id?: string | null
          id?: string
          ip_address?: unknown
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crf_audit_log_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "crf_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crf_audit_log_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "crf_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      crf_entries: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          is_locked: boolean | null
          is_verified: boolean | null
          locked_at: string | null
          locked_by: string | null
          participant_id: string
          signature_meaning: string | null
          signed_at: string | null
          signed_by: string | null
          started_at: string
          status: string
          template_id: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          visit_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_locked?: boolean | null
          is_verified?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          participant_id: string
          signature_meaning?: string | null
          signed_at?: string | null
          signed_by?: string | null
          started_at?: string
          status?: string
          template_id: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          visit_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_locked?: boolean | null
          is_verified?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          participant_id?: string
          signature_meaning?: string | null
          signed_at?: string | null
          signed_by?: string | null
          started_at?: string
          status?: string
          template_id?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crf_entries_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crf_entries_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "crf_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crf_entries_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      crf_field_values: {
        Row: {
          created_at: string
          created_by: string | null
          entry_id: string
          field_id: string
          id: string
          query_status: string | null
          sdv_status: string | null
          sdv_verified_at: string | null
          sdv_verified_by: string | null
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entry_id: string
          field_id: string
          id?: string
          query_status?: string | null
          sdv_status?: string | null
          sdv_verified_at?: string | null
          sdv_verified_by?: string | null
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entry_id?: string
          field_id?: string
          id?: string
          query_status?: string | null
          sdv_status?: string | null
          sdv_verified_at?: string | null
          sdv_verified_by?: string | null
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crf_field_values_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "crf_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crf_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "crf_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      crf_fields: {
        Row: {
          calculated_formula: string | null
          coding_dictionary: string | null
          created_at: string
          depends_on_field_id: string | null
          display_order: number
          edit_checks: Json | null
          field_label: string
          field_name: string
          field_type: string
          help_text: string | null
          id: string
          is_required: boolean
          max_value: number | null
          min_value: number | null
          options: Json | null
          section_id: string
          skip_logic: Json | null
          updated_at: string
          validation_rules: Json | null
        }
        Insert: {
          calculated_formula?: string | null
          coding_dictionary?: string | null
          created_at?: string
          depends_on_field_id?: string | null
          display_order?: number
          edit_checks?: Json | null
          field_label: string
          field_name: string
          field_type?: string
          help_text?: string | null
          id?: string
          is_required?: boolean
          max_value?: number | null
          min_value?: number | null
          options?: Json | null
          section_id: string
          skip_logic?: Json | null
          updated_at?: string
          validation_rules?: Json | null
        }
        Update: {
          calculated_formula?: string | null
          coding_dictionary?: string | null
          created_at?: string
          depends_on_field_id?: string | null
          display_order?: number
          edit_checks?: Json | null
          field_label?: string
          field_name?: string
          field_type?: string
          help_text?: string | null
          id?: string
          is_required?: boolean
          max_value?: number | null
          min_value?: number | null
          options?: Json | null
          section_id?: string
          skip_logic?: Json | null
          updated_at?: string
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "crf_fields_depends_on_field_id_fkey"
            columns: ["depends_on_field_id"]
            isOneToOne: false
            referencedRelation: "crf_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crf_fields_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "crf_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      crf_sections: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crf_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "crf_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      crf_templates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          project_id: string | null
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          project_id?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          project_id?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "crf_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      data_queries: {
        Row: {
          answered_at: string | null
          answered_by: string | null
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          entry_id: string
          field_id: string | null
          id: string
          opened_at: string | null
          opened_by: string | null
          priority: string | null
          query_text: string
          query_type: string
          response_text: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          answered_at?: string | null
          answered_by?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          entry_id: string
          field_id?: string | null
          id?: string
          opened_at?: string | null
          opened_by?: string | null
          priority?: string | null
          query_text: string
          query_type?: string
          response_text?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          answered_at?: string | null
          answered_by?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          entry_id?: string
          field_id?: string | null
          id?: string
          opened_at?: string | null
          opened_by?: string | null
          priority?: string | null
          query_text?: string
          query_type?: string
          response_text?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_queries_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "crf_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_queries_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "crf_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      data_query_history: {
        Row: {
          action: string
          comment: string | null
          created_at: string | null
          id: string
          query_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          comment?: string | null
          created_at?: string | null
          id?: string
          query_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          query_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_query_history_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "data_queries"
            referencedColumns: ["id"]
          },
        ]
      }
      database_locks: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          lock_scope: string
          lock_type: string
          locked_at: string
          locked_by: string
          project_id: string
          reason: string
          scope_id: string | null
          unlocked_at: string | null
          unlocked_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          lock_scope: string
          lock_type: string
          locked_at?: string
          locked_by: string
          project_id: string
          reason: string
          scope_id?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          lock_scope?: string
          lock_type?: string
          locked_at?: string
          locked_by?: string
          project_id?: string
          reason?: string
          scope_id?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "database_locks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          category: string
          content: string | null
          created_at: string
          created_by: string | null
          current_version: number
          description: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          current_version?: number
          description?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          current_version?: number
          description?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_versions: {
        Row: {
          changes_description: string | null
          content: string | null
          created_at: string
          created_by: string | null
          file_name: string | null
          file_url: string | null
          id: string
          template_id: string
          version_number: number
        }
        Insert: {
          changes_description?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          template_id: string
          version_number: number
        }
        Update: {
          changes_description?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          template_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      electronic_signatures: {
        Row: {
          authenticated_at: string
          authentication_method: string | null
          created_at: string
          document_hash: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          meaning: string
          signature_image: string | null
          signature_type: string
          signer_id: string
          signer_name: string
          signer_role: string
          user_agent: string | null
        }
        Insert: {
          authenticated_at?: string
          authentication_method?: string | null
          created_at?: string
          document_hash?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          meaning: string
          signature_image?: string | null
          signature_type: string
          signer_id: string
          signer_name: string
          signer_role: string
          user_agent?: string | null
        }
        Update: {
          authenticated_at?: string
          authentication_method?: string | null
          created_at?: string
          document_hash?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          meaning?: string
          signature_image?: string | null
          signature_type?: string
          signer_id?: string
          signer_name?: string
          signer_role?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      finding_history: {
        Row: {
          action: string
          created_at: string
          field_changed: string | null
          finding_id: string
          id: string
          new_value: string | null
          notes: string | null
          old_value: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          field_changed?: string | null
          finding_id: string
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          field_changed?: string | null
          finding_id?: string
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finding_history_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "visit_findings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          dismissed: boolean
          dismissed_at: string | null
          entity_id: string | null
          entity_type: string | null
          expires_at: string | null
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          project_id: string | null
          read_at: string | null
          severity: Database["public"]["Enums"]["notification_severity"]
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dismissed?: boolean
          dismissed_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          project_id?: string | null
          read_at?: string | null
          severity?: Database["public"]["Enums"]["notification_severity"]
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dismissed?: boolean
          dismissed_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          project_id?: string | null
          read_at?: string | null
          severity?: Database["public"]["Enums"]["notification_severity"]
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          created_at: string
          email: string | null
          enrolled_at: string
          id: string
          name: string
          notes: string | null
          participant_code: string
          phone: string | null
          project_id: string
          research_center: string | null
          status: string
          status_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          enrolled_at?: string
          id?: string
          name: string
          notes?: string | null
          participant_code: string
          phone?: string | null
          project_id: string
          research_center?: string | null
          status?: string
          status_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          enrolled_at?: string
          id?: string
          name?: string
          notes?: string | null
          participant_code?: string
          phone?: string | null
          project_id?: string
          research_center?: string | null
          status?: string
          status_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_configs: {
        Row: {
          created_at: string
          currency: string
          id: string
          project_id: string
          receipts_folder_link: string | null
          total_visits: number
          updated_at: string
          value_per_visit: number
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          project_id: string
          receipts_folder_link?: string | null
          total_visits?: number
          updated_at?: string
          value_per_visit?: number
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          project_id?: string
          receipts_folder_link?: string | null
          total_visits?: number
          updated_at?: string
          value_per_visit?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_configs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          participant_id: string
          payment_date: string
          project_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          participant_id: string
          payment_date?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          participant_id?: string
          payment_date?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      phases: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          phase_order: number
          project_id: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          phase_order: number
          project_id: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          phase_order?: number
          project_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          phases: Json
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phases?: Json
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phases?: Json
          updated_at?: string
        }
        Relationships: []
      }
      project_yearly_budgets: {
        Row: {
          created_at: string
          id: string
          planned_amount: number
          project_id: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          planned_amount?: number
          project_id: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          planned_amount?: number
          project_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_yearly_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          asana_project_url: string | null
          budget: number | null
          cost_center: string | null
          created_at: string
          created_by: string | null
          current_enrollment: number | null
          description: string | null
          end_date: string | null
          id: string
          phase: string | null
          principal_investigator: string | null
          protocol_number: string | null
          sponsor: string | null
          start_date: string | null
          status: string
          target_enrollment: number | null
          therapeutic_area: string | null
          title: string
          updated_at: string
          value_class: string | null
        }
        Insert: {
          asana_project_url?: string | null
          budget?: number | null
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          current_enrollment?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          phase?: string | null
          principal_investigator?: string | null
          protocol_number?: string | null
          sponsor?: string | null
          start_date?: string | null
          status?: string
          target_enrollment?: number | null
          therapeutic_area?: string | null
          title: string
          updated_at?: string
          value_class?: string | null
        }
        Update: {
          asana_project_url?: string | null
          budget?: number | null
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          current_enrollment?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          phase?: string | null
          principal_investigator?: string | null
          protocol_number?: string | null
          sponsor?: string | null
          start_date?: string | null
          status?: string
          target_enrollment?: number | null
          therapeutic_area?: string | null
          title?: string
          updated_at?: string
          value_class?: string | null
        }
        Relationships: []
      }
      protocol_deviations: {
        Row: {
          category: string | null
          corrective_action: string | null
          created_at: string | null
          created_by: string | null
          description: string
          deviation_date: string
          deviation_type: string
          discovered_date: string | null
          id: string
          impact_assessment: string | null
          participant_id: string | null
          preventive_action: string | null
          project_id: string
          research_center: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          corrective_action?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          deviation_date: string
          deviation_type: string
          discovered_date?: string | null
          id?: string
          impact_assessment?: string | null
          participant_id?: string | null
          preventive_action?: string | null
          project_id: string
          research_center?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          corrective_action?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          deviation_date?: string
          deviation_type?: string
          discovered_date?: string | null
          id?: string
          impact_assessment?: string | null
          participant_id?: string | null
          preventive_action?: string | null
          project_id?: string
          research_center?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_deviations_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_deviations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_flow_steps: {
        Row: {
          created_at: string
          deadline_days: number | null
          id: string
          project_id: string | null
          step_name: string
          step_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadline_days?: number | null
          id?: string
          project_id?: string | null
          step_name: string
          step_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadline_days?: number | null
          id?: string
          project_id?: string | null
          step_name?: string
          step_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_flow_steps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_reports: {
        Row: {
          created_at: string
          due_date: string
          id: string
          notes: string | null
          project_id: string | null
          recurrence_end_date: string | null
          recurrence_type: string | null
          report_type: string
          status: Database["public"]["Enums"]["regulatory_status"]
          submission_id: string | null
          submitted_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          project_id?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          report_type: string
          status?: Database["public"]["Enums"]["regulatory_status"]
          submission_id?: string | null
          submitted_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          project_id?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          report_type?: string
          status?: Database["public"]["Enums"]["regulatory_status"]
          submission_id?: string | null
          submitted_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulatory_reports_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "regulatory_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_submissions: {
        Row: {
          created_at: string
          flow_step_id: string | null
          id: string
          notes: string | null
          planned_date: string | null
          project_id: string | null
          status: Database["public"]["Enums"]["regulatory_status"]
          submission_date: string | null
          submission_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          flow_step_id?: string | null
          id?: string
          notes?: string | null
          planned_date?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["regulatory_status"]
          submission_date?: string | null
          submission_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          flow_step_id?: string | null
          id?: string
          notes?: string | null
          planned_date?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["regulatory_status"]
          submission_date?: string | null
          submission_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_submissions_flow_step_id_fkey"
            columns: ["flow_step_id"]
            isOneToOne: false
            referencedRelation: "regulatory_flow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulatory_submissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      research_centers: {
        Row: {
          code: string
          coordinator_email: string | null
          coordinator_name: string | null
          coordinator_phone: string | null
          created_at: string
          id: string
          name: string | null
          notes: string | null
          pi_email: string | null
          pi_name: string | null
          pi_phone: string | null
          project_id: string
          recruitment_status: string | null
          target_enrollment: number | null
          updated_at: string
        }
        Insert: {
          code: string
          coordinator_email?: string | null
          coordinator_name?: string | null
          coordinator_phone?: string | null
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          pi_email?: string | null
          pi_name?: string | null
          pi_phone?: string | null
          project_id: string
          recruitment_status?: string | null
          target_enrollment?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          coordinator_email?: string | null
          coordinator_name?: string | null
          coordinator_phone?: string | null
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          pi_email?: string | null
          pi_name?: string | null
          pi_phone?: string | null
          project_id?: string
          recruitment_status?: string | null
          target_enrollment?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_centers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      risks: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          identified_at: string
          impact: number
          mitigation_plan: string | null
          probability: number
          project_id: string
          responsible: string | null
          review_date: string | null
          risk_code: string
          risk_score: number | null
          status: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          id?: string
          identified_at?: string
          impact?: number
          mitigation_plan?: string | null
          probability?: number
          project_id: string
          responsible?: string | null
          review_date?: string | null
          risk_code: string
          risk_score?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          identified_at?: string
          impact?: number
          mitigation_plan?: string | null
          probability?: number
          project_id?: string
          responsible?: string | null
          review_date?: string | null
          risk_code?: string
          risk_score?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_events: {
        Row: {
          causality: string | null
          created_at: string | null
          created_by: string | null
          description: string
          event_type: string
          id: string
          onset_date: string | null
          outcome: string | null
          participant_id: string | null
          project_id: string
          reported_at: string | null
          reported_to_irb: boolean | null
          reported_to_sponsor: boolean | null
          research_center: string | null
          resolution_date: string | null
          severity: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          causality?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          event_type: string
          id?: string
          onset_date?: string | null
          outcome?: string | null
          participant_id?: string | null
          project_id: string
          reported_at?: string | null
          reported_to_irb?: boolean | null
          reported_to_sponsor?: boolean | null
          research_center?: string | null
          resolution_date?: string | null
          severity?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          causality?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          event_type?: string
          id?: string
          onset_date?: string | null
          outcome?: string | null
          participant_id?: string | null
          project_id?: string
          reported_at?: string | null
          reported_to_irb?: boolean | null
          reported_to_sponsor?: boolean | null
          research_center?: string | null
          resolution_date?: string | null
          severity?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_events_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_vendor_qualifications: {
        Row: {
          contract_status: string
          created_at: string
          documents_url: string | null
          feasibility_date: string | null
          id: string
          name: string
          next_qualification_date: string | null
          notes: string | null
          project_id: string
          qualification_status: string
          responsible: string | null
          score: number | null
          updated_at: string
          vendor_type: string
        }
        Insert: {
          contract_status?: string
          created_at?: string
          documents_url?: string | null
          feasibility_date?: string | null
          id?: string
          name: string
          next_qualification_date?: string | null
          notes?: string | null
          project_id: string
          qualification_status?: string
          responsible?: string | null
          score?: number | null
          updated_at?: string
          vendor_type?: string
        }
        Update: {
          contract_status?: string
          created_at?: string
          documents_url?: string | null
          feasibility_date?: string | null
          id?: string
          name?: string
          next_qualification_date?: string | null
          notes?: string | null
          project_id?: string
          qualification_status?: string
          responsible?: string | null
          score?: number | null
          updated_at?: string
          vendor_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_vendor_qualifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      steering_decisions: {
        Row: {
          created_at: string
          deadline: string | null
          decision_code: string
          decision_date: string
          description: string
          id: string
          impacted_area: string | null
          meeting_origin: string | null
          observations: string | null
          project_id: string
          responsible: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          decision_code: string
          decision_date?: string
          description: string
          id?: string
          impacted_area?: string | null
          meeting_origin?: string | null
          observations?: string | null
          project_id: string
          responsible?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          decision_code?: string
          decision_date?: string
          description?: string
          id?: string
          impacted_area?: string | null
          meeting_origin?: string | null
          observations?: string | null
          project_id?: string
          responsible?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "steering_decisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_forms: {
        Row: {
          created_at: string
          form_name: string
          id: string
          project_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          form_name: string
          id?: string
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          form_name?: string
          id?: string
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_forms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sites: {
        Row: {
          address: string | null
          city: string | null
          coordinator_email: string | null
          coordinator_name: string | null
          coordinator_phone: string | null
          country: string | null
          created_at: string
          id: string
          name: string
          pi_email: string | null
          pi_name: string | null
          pi_phone: string | null
          project_id: string | null
          site_code: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          coordinator_email?: string | null
          coordinator_name?: string | null
          coordinator_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name: string
          pi_email?: string | null
          pi_name?: string | null
          pi_phone?: string | null
          project_id?: string | null
          site_code: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          coordinator_email?: string | null
          coordinator_name?: string | null
          coordinator_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          pi_email?: string | null
          pi_name?: string | null
          pi_phone?: string | null
          project_id?: string | null
          site_code?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["priority_level"]
          project_id: string | null
          site_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          project_id?: string | null
          site_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          project_id?: string | null
          site_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_tasks_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      study_visit_schedule: {
        Row: {
          actual_date: string | null
          created_at: string
          created_by: string | null
          id: string
          observations: string | null
          planned_date: string | null
          project_id: string
          site_name: string
          status: string
          updated_at: string
          visit_number: number
          window_end: string | null
          window_start: string | null
        }
        Insert: {
          actual_date?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          observations?: string | null
          planned_date?: string | null
          project_id: string
          site_name: string
          status?: string
          updated_at?: string
          visit_number: number
          window_end?: string | null
          window_start?: string | null
        }
        Update: {
          actual_date?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          observations?: string | null
          planned_date?: string | null
          project_id?: string
          site_name?: string
          status?: string
          updated_at?: string
          visit_number?: number
          window_end?: string | null
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_visit_schedule_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_visits: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          project_id: string | null
          report_notes: string | null
          research_center_id: string | null
          responsible_id: string | null
          scheduled_date: string
          scheduled_time: string | null
          signature_data: string | null
          signed_at: string | null
          signed_by: string | null
          site_id: string | null
          status: string
          updated_at: string
          visit_number: number | null
          visit_type: Database["public"]["Enums"]["visit_type"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          report_notes?: string | null
          research_center_id?: string | null
          responsible_id?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          signature_data?: string | null
          signed_at?: string | null
          signed_by?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
          visit_number?: number | null
          visit_type: Database["public"]["Enums"]["visit_type"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          report_notes?: string | null
          research_center_id?: string | null
          responsible_id?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          signature_data?: string | null
          signed_at?: string | null
          signed_by?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
          visit_number?: number | null
          visit_type?: Database["public"]["Enums"]["visit_type"]
        }
        Relationships: [
          {
            foreignKeyName: "study_visits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_visits_research_center_id_fkey"
            columns: ["research_center_id"]
            isOneToOne: false
            referencedRelation: "research_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_visits_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      system_audit_log: {
        Row: {
          action: string
          changed_fields: string[] | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          module: string
          new_data: Json | null
          old_data: Json | null
          reason: string | null
          session_id: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          module: string
          new_data?: Json | null
          old_data?: Json | null
          reason?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          module?: string
          new_data?: Json | null
          old_data?: Json | null
          reason?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string | null
          dependency_type: string | null
          depends_on_task_id: string
          id: string
          lag_days: number | null
          task_id: string
        }
        Insert: {
          created_at?: string | null
          dependency_type?: string | null
          depends_on_task_id: string
          id?: string
          lag_days?: number | null
          task_id: string
        }
        Update: {
          created_at?: string | null
          dependency_type?: string | null
          depends_on_task_id?: string
          id?: string
          lag_days?: number | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_raci: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          role: string
          task_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          role: string
          task_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          role?: string
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_raci_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_raci_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_raci_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_subtasks: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          item_order: number
          task_id: string
          title: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          item_order?: number
          task_id: string
          title: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          item_order?: number
          task_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          default_tasks: Json
          description: string | null
          id: string
          is_global: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          default_tasks?: Json
          description?: string | null
          id?: string
          is_global?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          default_tasks?: Json
          description?: string | null
          id?: string
          is_global?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          actual_end_date: string | null
          actual_start_date: string | null
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          end_date: string | null
          id: string
          planned_end_date: string | null
          planned_start_date: string | null
          priority: string | null
          progress_percentage: number | null
          project_id: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          end_date?: string | null
          id?: string
          planned_end_date?: string | null
          planned_start_date?: string | null
          priority?: string | null
          progress_percentage?: number | null
          project_id?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          end_date?: string | null
          id?: string
          planned_end_date?: string | null
          planned_start_date?: string | null
          priority?: string | null
          progress_percentage?: number | null
          project_id?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tmf_artifacts: {
        Row: {
          artifact_name: string
          artifact_number: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_required: boolean
          level: string
          section_id: string
          updated_at: string
        }
        Insert: {
          artifact_name: string
          artifact_number: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_required?: boolean
          level?: string
          section_id: string
          updated_at?: string
        }
        Update: {
          artifact_name?: string
          artifact_number?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_required?: boolean
          level?: string
          section_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tmf_artifacts_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "tmf_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      tmf_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          document_id: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          document_id: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          document_id?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tmf_audit_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "tmf_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmf_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tmf_document_versions: {
        Row: {
          changes_description: string | null
          created_at: string
          created_by: string | null
          document_id: string
          file_name: string
          file_size: number
          file_url: string
          id: string
          version_number: number
        }
        Insert: {
          changes_description?: string | null
          created_at?: string
          created_by?: string | null
          document_id: string
          file_name: string
          file_size?: number
          file_url: string
          id?: string
          version_number: number
        }
        Update: {
          changes_description?: string | null
          created_at?: string
          created_by?: string | null
          document_id?: string
          file_name?: string
          file_size?: number
          file_url?: string
          id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "tmf_document_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmf_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "tmf_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      tmf_documents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          artifact_id: string
          created_at: string
          effective_date: string | null
          expiration_date: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          notes: string | null
          project_id: string
          rejection_reason: string | null
          site_id: string | null
          status: string
          updated_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          artifact_id: string
          created_at?: string
          effective_date?: string | null
          expiration_date?: string | null
          file_name: string
          file_size?: number
          file_type: string
          file_url: string
          id?: string
          notes?: string | null
          project_id: string
          rejection_reason?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          artifact_id?: string
          created_at?: string
          effective_date?: string | null
          expiration_date?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          notes?: string | null
          project_id?: string
          rejection_reason?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "tmf_documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmf_documents_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "tmf_artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmf_documents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "research_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmf_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tmf_sections: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          section_name: string
          section_number: string
          updated_at: string
          zone_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          section_name: string
          section_number: string
          updated_at?: string
          zone_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          section_name?: string
          section_number?: string
          updated_at?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tmf_sections_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "tmf_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      tmf_zones: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          updated_at: string
          zone_name: string
          zone_number: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          updated_at?: string
          zone_name: string
          zone_number: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          updated_at?: string
          zone_name?: string
          zone_number?: string
        }
        Relationships: []
      }
      training_records: {
        Row: {
          certificate_url: string | null
          completed_at: string | null
          created_at: string
          id: string
          status: string
          training_id: string
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          certificate_url?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          training_id: string
          updated_at?: string
          user_id: string
          user_name: string
        }
        Update: {
          certificate_url?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          training_id?: string
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_records_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          created_at: string
          delegate_role: string | null
          description: string | null
          due_date: string | null
          id: string
          is_required: boolean
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delegate_role?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_required?: boolean
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delegate_role?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_required?: boolean
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          access_type: string
          created_at: string
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          notes: string | null
          project_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          access_type?: string
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          access_type?: string
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_site_access: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          notes: string | null
          project_id: string | null
          site_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          site_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          site_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_site_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_site_access_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "research_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_payments: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          drive_folder_link: string | null
          id: string
          invoice_number: string | null
          paid_at: string | null
          parent_payment_id: string | null
          payment_date: string
          project_id: string
          recurrence_end_date: string | null
          recurrence_type: string | null
          status: string
          updated_at: string
          vendor_id: string | null
          vendor_name: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          drive_folder_link?: string | null
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          parent_payment_id?: string | null
          payment_date?: string
          project_id: string
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string | null
          vendor_name: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          drive_folder_link?: string | null
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          parent_payment_id?: string | null
          payment_date?: string
          project_id?: string
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_payments_parent_payment_id_fkey"
            columns: ["parent_payment_id"]
            isOneToOne: false
            referencedRelation: "vendor_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_checklist_items: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          is_required: boolean | null
          item_order: number
          item_text: string
          notes: string | null
          updated_at: string
          visit_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_required?: boolean | null
          item_order?: number
          item_text: string
          notes?: string | null
          updated_at?: string
          visit_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_required?: boolean | null
          item_order?: number
          item_text?: string
          notes?: string | null
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_checklist_items_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "study_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_crf_config: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_required: boolean | null
          project_id: string
          template_id: string
          updated_at: string | null
          visit_type_id: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_required?: boolean | null
          project_id: string
          template_id: string
          updated_at?: string | null
          visit_type_id?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_required?: boolean | null
          project_id?: string
          template_id?: string
          updated_at?: string | null
          visit_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_crf_config_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_crf_config_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "crf_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_crf_config_visit_type_id_fkey"
            columns: ["visit_type_id"]
            isOneToOne: false
            referencedRelation: "visit_types"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_findings: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          finding_type: string | null
          form_name: string | null
          id: string
          is_remote: boolean
          participant_code: string | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          responsible_name: string | null
          severity: string
          status: string
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          due_date?: string | null
          finding_type?: string | null
          form_name?: string | null
          id?: string
          is_remote?: boolean
          participant_code?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          responsible_name?: string | null
          severity?: string
          status?: string
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          finding_type?: string | null
          form_name?: string | null
          id?: string
          is_remote?: boolean
          participant_code?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          responsible_name?: string | null
          severity?: string
          status?: string
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_findings_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "study_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_types: {
        Row: {
          created_at: string
          days_from_enrollment: number | null
          id: string
          name: string
          project_id: string
          updated_at: string
          value: number
          visit_number: number
          window_days: number | null
        }
        Insert: {
          created_at?: string
          days_from_enrollment?: number | null
          id?: string
          name: string
          project_id: string
          updated_at?: string
          value?: number
          visit_number: number
          window_days?: number | null
        }
        Update: {
          created_at?: string
          days_from_enrollment?: number | null
          id?: string
          name?: string
          project_id?: string
          updated_at?: string
          value?: number
          visit_number?: number
          window_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_types_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          participant_id: string
          payment_amount: number | null
          payment_status: string
          project_id: string
          scheduled_date: string | null
          status: string
          updated_at: string
          visit_number: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          participant_id: string
          payment_amount?: number | null
          payment_status?: string
          project_id: string
          scheduled_date?: string | null
          status?: string
          updated_at?: string
          visit_number: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          participant_id?: string
          payment_amount?: number | null
          payment_status?: string
          project_id?: string
          scheduled_date?: string | null
          status?: string
          updated_at?: string
          visit_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "visits_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_design_crf: { Args: { _user_id: string }; Returns: boolean }
      can_enter_data: { Args: { _user_id: string }; Returns: boolean }
      can_export_data: { Args: { _user_id: string }; Returns: boolean }
      can_lock_data: { Args: { _user_id: string }; Returns: boolean }
      can_manage_queries: { Args: { _user_id: string }; Returns: boolean }
      can_perform_sdv: { Args: { _user_id: string }; Returns: boolean }
      can_respond_queries: { Args: { _user_id: string }; Returns: boolean }
      can_sign_forms: { Args: { _user_id: string }; Returns: boolean }
      can_view_audit: { Args: { _user_id: string }; Returns: boolean }
      generate_communication_occurrences: {
        Args: { _plan_id: string }
        Returns: number
      }
      get_current_user_info: {
        Args: never
        Returns: {
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_module_from_table: { Args: { table_name: string }; Returns: string }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: {
          project_id: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_in_project: {
        Args: {
          _project_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_site_access: {
        Args: { _site_id: string; _user_id: string }
        Returns: boolean
      }
      is_oversight_role: { Args: { _user_id: string }; Returns: boolean }
      is_site_role: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "project_manager"
        | "monitor"
        | "data_manager"
        | "regulatory"
        | "quality"
        | "finance"
        | "viewer"
        | "site_coordinator"
        | "investigator"
        | "cra_monitor"
        | "data_lead"
        | "study_builder"
        | "medical_monitor"
        | "statistician"
        | "auditor"
      communication_channel:
        | "email"
        | "etmf"
        | "portal"
        | "meeting"
        | "letter"
        | "phone"
        | "system"
        | "other"
      communication_frequency:
        | "once"
        | "weekly"
        | "biweekly"
        | "monthly"
        | "quarterly"
        | "semiannual"
        | "annual"
        | "on_event"
      communication_occurrence_status:
        | "scheduled"
        | "sent"
        | "overdue"
        | "acknowledged"
        | "skipped"
      communication_recipient_role: "to" | "cc" | "bcc" | "informed"
      notification_severity: "info" | "warning" | "critical"
      notification_type:
        | "task_overdue"
        | "task_due_today"
        | "task_due_soon"
        | "visit_overdue"
        | "visit_today"
        | "visit_upcoming"
        | "visit_no_report"
        | "finding_critical"
        | "finding_overdue"
        | "finding_aging"
        | "regulatory_pending"
        | "regulatory_due_soon"
        | "payment_overdue"
        | "payment_due_soon"
        | "document_pending"
        | "document_missing"
        | "participant_status"
        | "general"
        | "communication_due_soon"
        | "communication_today"
        | "communication_overdue"
      priority_level: "low" | "medium" | "high" | "critical"
      regulatory_status:
        | "pending"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
        | "revision_required"
      stakeholder_type:
        | "sponsor"
        | "ethics_committee"
        | "regulatory_authority"
        | "research_center"
        | "vendor"
        | "dsmb"
        | "steering_committee"
        | "investigator"
        | "internal_team"
        | "other"
      task_status: "backlog" | "in_progress" | "waiting" | "completed"
      visit_type: "SQV" | "SIV" | "IMV" | "COV"
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
      app_role: [
        "admin",
        "project_manager",
        "monitor",
        "data_manager",
        "regulatory",
        "quality",
        "finance",
        "viewer",
        "site_coordinator",
        "investigator",
        "cra_monitor",
        "data_lead",
        "study_builder",
        "medical_monitor",
        "statistician",
        "auditor",
      ],
      communication_channel: [
        "email",
        "etmf",
        "portal",
        "meeting",
        "letter",
        "phone",
        "system",
        "other",
      ],
      communication_frequency: [
        "once",
        "weekly",
        "biweekly",
        "monthly",
        "quarterly",
        "semiannual",
        "annual",
        "on_event",
      ],
      communication_occurrence_status: [
        "scheduled",
        "sent",
        "overdue",
        "acknowledged",
        "skipped",
      ],
      communication_recipient_role: ["to", "cc", "bcc", "informed"],
      notification_severity: ["info", "warning", "critical"],
      notification_type: [
        "task_overdue",
        "task_due_today",
        "task_due_soon",
        "visit_overdue",
        "visit_today",
        "visit_upcoming",
        "visit_no_report",
        "finding_critical",
        "finding_overdue",
        "finding_aging",
        "regulatory_pending",
        "regulatory_due_soon",
        "payment_overdue",
        "payment_due_soon",
        "document_pending",
        "document_missing",
        "participant_status",
        "general",
        "communication_due_soon",
        "communication_today",
        "communication_overdue",
      ],
      priority_level: ["low", "medium", "high", "critical"],
      regulatory_status: [
        "pending",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "revision_required",
      ],
      stakeholder_type: [
        "sponsor",
        "ethics_committee",
        "regulatory_authority",
        "research_center",
        "vendor",
        "dsmb",
        "steering_committee",
        "investigator",
        "internal_team",
        "other",
      ],
      task_status: ["backlog", "in_progress", "waiting", "completed"],
      visit_type: ["SQV", "SIV", "IMV", "COV"],
    },
  },
} as const
