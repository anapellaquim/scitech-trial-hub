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
      change_control_actions: {
        Row: {
          action_description: string
          change_control_id: string
          created_at: string
          display_order: number
          due_date: string | null
          id: string
          responsible: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action_description: string
          change_control_id: string
          created_at?: string
          display_order?: number
          due_date?: string | null
          id?: string
          responsible?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action_description?: string
          change_control_id?: string
          created_at?: string
          display_order?: number
          due_date?: string | null
          id?: string
          responsible?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_control_actions_change_control_id_fkey"
            columns: ["change_control_id"]
            isOneToOne: false
            referencedRelation: "change_controls"
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
          affected_documents: string | null
          change_code: string
          change_reason: string | null
          change_type: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          impact_areas: string[] | null
          impact_assessment: string | null
          opened_at: string
          project_id: string | null
          requester: string | null
          requires_communication: boolean
          requires_training: boolean
          resolved_at: string | null
          responsible: string | null
          status: string
          updated_at: string
        }
        Insert: {
          affected_documents?: string | null
          change_code: string
          change_reason?: string | null
          change_type?: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          impact_areas?: string[] | null
          impact_assessment?: string | null
          opened_at?: string
          project_id?: string | null
          requester?: string | null
          requires_communication?: boolean
          requires_training?: boolean
          resolved_at?: string | null
          responsible?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          affected_documents?: string | null
          change_code?: string
          change_reason?: string | null
          change_type?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          impact_areas?: string[] | null
          impact_assessment?: string | null
          opened_at?: string
          project_id?: string | null
          requester?: string | null
          requires_communication?: boolean
          requires_training?: boolean
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
      clinical_evaluation_document_versions: {
        Row: {
          author: string | null
          change_summary: string | null
          created_at: string
          document_id: string
          id: string
          issued_at: string | null
          link: string | null
          version: string
        }
        Insert: {
          author?: string | null
          change_summary?: string | null
          created_at?: string
          document_id: string
          id?: string
          issued_at?: string | null
          link?: string | null
          version: string
        }
        Update: {
          author?: string | null
          change_summary?: string | null
          created_at?: string
          document_id?: string
          id?: string
          issued_at?: string | null
          link?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_evaluation_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "clinical_evaluation_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_evaluation_documents: {
        Row: {
          approval_date: string | null
          approver: string | null
          author: string | null
          code: string | null
          created_at: string
          document_type: string
          id: string
          issue_date: string | null
          last_review_date: string | null
          link: string | null
          next_review_date: string | null
          notes: string | null
          project_id: string | null
          review_periodicity_months: number
          status: string
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          approval_date?: string | null
          approver?: string | null
          author?: string | null
          code?: string | null
          created_at?: string
          document_type?: string
          id?: string
          issue_date?: string | null
          last_review_date?: string | null
          link?: string | null
          next_review_date?: string | null
          notes?: string | null
          project_id?: string | null
          review_periodicity_months?: number
          status?: string
          title: string
          updated_at?: string
          version?: string
        }
        Update: {
          approval_date?: string | null
          approver?: string | null
          author?: string | null
          code?: string | null
          created_at?: string
          document_type?: string
          id?: string
          issue_date?: string | null
          last_review_date?: string | null
          link?: string | null
          next_review_date?: string | null
          notes?: string | null
          project_id?: string | null
          review_periodicity_months?: number
          status?: string
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_evaluation_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      committee_letters: {
        Row: {
          committee_id: string | null
          committee_type: string | null
          created_at: string
          created_by: string | null
          id: string
          letter_code: string
          letter_date: string | null
          link: string | null
          notes: string | null
          project_id: string
          recipient: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          committee_id?: string | null
          committee_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          letter_code: string
          letter_date?: string | null
          link?: string | null
          notes?: string | null
          project_id: string
          recipient?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          committee_id?: string | null
          committee_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          letter_code?: string
          letter_date?: string | null
          link?: string | null
          notes?: string | null
          project_id?: string
          recipient?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      committee_types: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
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
      investigational_products: {
        Row: {
          code: string
          correction_invoice: string | null
          created_at: string
          delivery_date: string | null
          description: string | null
          expiration_date: string | null
          id: string
          invoice: string | null
          lot_number: string | null
          note: string | null
          project_id: string | null
          quantity: number | null
          return_info: string | null
          site: string | null
          updated_at: string
          usage: string | null
          usage_date: string | null
        }
        Insert: {
          code: string
          correction_invoice?: string | null
          created_at?: string
          delivery_date?: string | null
          description?: string | null
          expiration_date?: string | null
          id?: string
          invoice?: string | null
          lot_number?: string | null
          note?: string | null
          project_id?: string | null
          quantity?: number | null
          return_info?: string | null
          site?: string | null
          updated_at?: string
          usage?: string | null
          usage_date?: string | null
        }
        Update: {
          code?: string
          correction_invoice?: string | null
          created_at?: string
          delivery_date?: string | null
          description?: string | null
          expiration_date?: string | null
          id?: string
          invoice?: string | null
          lot_number?: string | null
          note?: string | null
          project_id?: string | null
          quantity?: number | null
          return_info?: string | null
          site?: string | null
          updated_at?: string
          usage?: string | null
          usage_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investigational_products_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_supply: {
        Row: {
          created_at: string
          date: string | null
          description: string | null
          expiration_date: string | null
          id: string
          invoice: string | null
          lot_number: string | null
          note: string | null
          operation: string
          quantity: number | null
          site: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          description?: string | null
          expiration_date?: string | null
          id?: string
          invoice?: string | null
          lot_number?: string | null
          note?: string | null
          operation: string
          quantity?: number | null
          site?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          created_at?: string
          date?: string | null
          description?: string | null
          expiration_date?: string | null
          id?: string
          invoice?: string | null
          lot_number?: string | null
          note?: string | null
          operation?: string
          quantity?: number | null
          site?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: []
      }
      monitor_notes: {
        Row: {
          author_id: string | null
          author_name: string | null
          category: string | null
          content: string
          created_at: string
          id: string
          importance: string
          monitoring_visit_id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          content: string
          created_at?: string
          id?: string
          importance?: string
          monitoring_visit_id: string
          project_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          importance?: string
          monitoring_visit_id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitor_notes_monitoring_visit_id_fkey"
            columns: ["monitoring_visit_id"]
            isOneToOne: false
            referencedRelation: "site_monitoring_visits"
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
      pmcf_monthly_checks: {
        Row: {
          checked_at: string
          checked_by: string | null
          created_at: string
          created_by: string | null
          expected_count: number
          fills_count: number
          id: string
          notes: string | null
          project_id: string
          reference_month: string
          status: string
          survey_id: string
          updated_at: string
        }
        Insert: {
          checked_at?: string
          checked_by?: string | null
          created_at?: string
          created_by?: string | null
          expected_count?: number
          fills_count?: number
          id?: string
          notes?: string | null
          project_id: string
          reference_month: string
          status?: string
          survey_id: string
          updated_at?: string
        }
        Update: {
          checked_at?: string
          checked_by?: string | null
          created_at?: string
          created_by?: string | null
          expected_count?: number
          fills_count?: number
          id?: string
          notes?: string | null
          project_id?: string
          reference_month?: string
          status?: string
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pmcf_monthly_checks_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "pmcf_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      pmcf_surveys: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          expected_monthly_fills: number
          form_link: string | null
          id: string
          manual_target: number | null
          project_id: string
          responsible: string | null
          start_date: string | null
          status: string
          survey_code: string
          target_audience: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          expected_monthly_fills?: number
          form_link?: string | null
          id?: string
          manual_target?: number | null
          project_id: string
          responsible?: string | null
          start_date?: string | null
          status?: string
          survey_code: string
          target_audience?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          expected_monthly_fills?: number
          form_link?: string | null
          id?: string
          manual_target?: number | null
          project_id?: string
          responsible?: string | null
          start_date?: string | null
          status?: string
          survey_code?: string
          target_audience?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      project_budget_items: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string
          display_order: number
          id: string
          notes: string | null
          project_id: string
          quantity: number
          total_value: number | null
          unit_value: number
          updated_at: string
          vendor: string | null
          year: number | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description: string
          display_order?: number
          id?: string
          notes?: string | null
          project_id: string
          quantity?: number
          total_value?: number | null
          unit_value?: number
          updated_at?: string
          vendor?: string | null
          year?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          display_order?: number
          id?: string
          notes?: string | null
          project_id?: string
          quantity?: number
          total_value?: number | null
          unit_value?: number
          updated_at?: string
          vendor?: string | null
          year?: number | null
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
      qualification_contract_amendments: {
        Row: {
          amendment_number: string
          contract_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          document_url: string | null
          effective_date: string | null
          financial_impact: number | null
          id: string
          notes: string | null
          qualification_id: string
          requested_date: string | null
          signed_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          amendment_number: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_url?: string | null
          effective_date?: string | null
          financial_impact?: number | null
          id?: string
          notes?: string | null
          qualification_id: string
          requested_date?: string | null
          signed_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          amendment_number?: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_url?: string | null
          effective_date?: string | null
          financial_impact?: number | null
          id?: string
          notes?: string | null
          qualification_id?: string
          requested_date?: string | null
          signed_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      qualification_contract_budget_items: {
        Row: {
          category: string
          contract_id: string
          created_at: string
          created_by: string | null
          description: string
          display_order: number
          id: string
          notes: string | null
          qualification_id: string
          quantity: number
          unit_value: number
          updated_at: string
        }
        Insert: {
          category?: string
          contract_id: string
          created_at?: string
          created_by?: string | null
          description: string
          display_order?: number
          id?: string
          notes?: string | null
          qualification_id: string
          quantity?: number
          unit_value?: number
          updated_at?: string
        }
        Update: {
          category?: string
          contract_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          display_order?: number
          id?: string
          notes?: string | null
          qualification_id?: string
          quantity?: number
          unit_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      qualification_contracts: {
        Row: {
          contract_number: string
          contract_type: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          description: string | null
          document_url: string | null
          end_date: string | null
          id: string
          notes: string | null
          payment_terms: string | null
          qualification_id: string
          signed_date: string | null
          start_date: string | null
          status: string
          title: string
          total_value: number | null
          updated_at: string
          value: number | null
        }
        Insert: {
          contract_number: string
          contract_type?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          qualification_id: string
          signed_date?: string | null
          start_date?: string | null
          status?: string
          title: string
          total_value?: number | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          contract_number?: string
          contract_type?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          qualification_id?: string
          signed_date?: string | null
          start_date?: string | null
          status?: string
          title?: string
          total_value?: number | null
          updated_at?: string
          value?: number | null
        }
        Relationships: []
      }
      qualification_scorecard_criteria: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          max_score: number
          name: string
          project_id: string
          updated_at: string
          weight: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          max_score?: number
          name: string
          project_id: string
          updated_at?: string
          weight?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          max_score?: number
          name?: string
          project_id?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      qualification_scorecard_responses: {
        Row: {
          comment: string | null
          created_at: string
          created_by: string | null
          criterion_id: string
          id: string
          qualification_id: string
          score: number
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          criterion_id: string
          id?: string
          qualification_id: string
          score?: number
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          criterion_id?: string
          id?: string
          qualification_id?: string
          score?: number
          updated_at?: string
        }
        Relationships: []
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
      regulatory_report_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          custom_start_date: string | null
          description: string | null
          end_date: string | null
          first_due_offset_days: number
          id: string
          is_active: boolean
          notes: string | null
          project_id: string
          recurrence: string
          report_type: string
          start_event: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custom_start_date?: string | null
          description?: string | null
          end_date?: string | null
          first_due_offset_days?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          project_id: string
          recurrence?: string
          report_type: string
          start_event?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custom_start_date?: string | null
          description?: string | null
          end_date?: string | null
          first_due_offset_days?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          project_id?: string
          recurrence?: string
          report_type?: string
          start_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_report_schedules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_reports: {
        Row: {
          approval_date: string | null
          code: string | null
          created_at: string
          due_date: string
          id: string
          notes: string | null
          project_id: string | null
          recurrence_end_date: string | null
          recurrence_type: string | null
          report_type: string
          site_id: string | null
          status: Database["public"]["Enums"]["regulatory_status"]
          submission_id: string | null
          submitted_date: string | null
          updated_at: string
        }
        Insert: {
          approval_date?: string | null
          code?: string | null
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          project_id?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          report_type: string
          site_id?: string | null
          status?: Database["public"]["Enums"]["regulatory_status"]
          submission_id?: string | null
          submitted_date?: string | null
          updated_at?: string
        }
        Update: {
          approval_date?: string | null
          code?: string | null
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          project_id?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          report_type?: string
          site_id?: string | null
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
            foreignKeyName: "regulatory_reports_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "research_centers"
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
          approval_date: string | null
          code: string | null
          compliance_response: string | null
          created_at: string
          flow_step_id: string | null
          id: string
          notes: string | null
          planned_date: string | null
          project_id: string | null
          site_id: string | null
          status: Database["public"]["Enums"]["regulatory_status"]
          submission_date: string | null
          submission_type: string
          updated_at: string
        }
        Insert: {
          approval_date?: string | null
          code?: string | null
          compliance_response?: string | null
          created_at?: string
          flow_step_id?: string | null
          id?: string
          notes?: string | null
          planned_date?: string | null
          project_id?: string | null
          site_id?: string | null
          status?: Database["public"]["Enums"]["regulatory_status"]
          submission_date?: string | null
          submission_type: string
          updated_at?: string
        }
        Update: {
          approval_date?: string | null
          code?: string | null
          compliance_response?: string | null
          created_at?: string
          flow_step_id?: string | null
          id?: string
          notes?: string | null
          planned_date?: string | null
          project_id?: string | null
          site_id?: string | null
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
          {
            foreignKeyName: "regulatory_submissions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "research_centers"
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
      risk_indicators: {
        Row: {
          area: string
          created_at: string
          current_value: string | null
          description: string | null
          id: string
          indicator_type: string
          last_measured_at: string | null
          linked_risk_id: string | null
          measurement_frequency: string
          name: string
          project_id: string
          responsible: string | null
          status: string
          target_value: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          area: string
          created_at?: string
          current_value?: string | null
          description?: string | null
          id?: string
          indicator_type: string
          last_measured_at?: string | null
          linked_risk_id?: string | null
          measurement_frequency?: string
          name: string
          project_id: string
          responsible?: string | null
          status?: string
          target_value?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          area?: string
          created_at?: string
          current_value?: string | null
          description?: string | null
          id?: string
          indicator_type?: string
          last_measured_at?: string | null
          linked_risk_id?: string | null
          measurement_frequency?: string
          name?: string
          project_id?: string
          responsible?: string | null
          status?: string
          target_value?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_indicators_linked_risk_id_fkey"
            columns: ["linked_risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_indicators_project_id_fkey"
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
          contingency_plan: string | null
          created_at: string
          description: string
          escalated_at: string | null
          escalation_owner: string | null
          escalation_reason: string | null
          id: string
          identified_at: string
          impact: number
          materialized_at: string | null
          mitigation_plan: string | null
          monitoring_method: string | null
          next_review_date: string | null
          potential_impact: string | null
          probability: number
          project_id: string
          residual_impact: number | null
          residual_probability: number | null
          residual_risk_score: number | null
          responsible: string | null
          review_date: string | null
          review_frequency: string
          risk_code: string
          risk_score: number | null
          status: string
          updated_at: string
        }
        Insert: {
          category?: string
          contingency_plan?: string | null
          created_at?: string
          description: string
          escalated_at?: string | null
          escalation_owner?: string | null
          escalation_reason?: string | null
          id?: string
          identified_at?: string
          impact?: number
          materialized_at?: string | null
          mitigation_plan?: string | null
          monitoring_method?: string | null
          next_review_date?: string | null
          potential_impact?: string | null
          probability?: number
          project_id: string
          residual_impact?: number | null
          residual_probability?: number | null
          residual_risk_score?: number | null
          responsible?: string | null
          review_date?: string | null
          review_frequency?: string
          risk_code: string
          risk_score?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          contingency_plan?: string | null
          created_at?: string
          description?: string
          escalated_at?: string | null
          escalation_owner?: string | null
          escalation_reason?: string | null
          id?: string
          identified_at?: string
          impact?: number
          materialized_at?: string | null
          mitigation_plan?: string | null
          monitoring_method?: string | null
          next_review_date?: string | null
          potential_impact?: string | null
          probability?: number
          project_id?: string
          residual_impact?: number | null
          residual_probability?: number | null
          residual_risk_score?: number | null
          responsible?: string | null
          review_date?: string | null
          review_frequency?: string
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
      site_monitoring_findings: {
        Row: {
          action_required: string | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          id: string
          monitoring_visit_id: string
          resolution_notes: string | null
          resolved_date: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          action_required?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          due_date?: string | null
          id?: string
          monitoring_visit_id: string
          resolution_notes?: string | null
          resolved_date?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          action_required?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          id?: string
          monitoring_visit_id?: string
          resolution_notes?: string | null
          resolved_date?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_monitoring_findings_monitoring_visit_id_fkey"
            columns: ["monitoring_visit_id"]
            isOneToOne: false
            referencedRelation: "site_monitoring_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      site_monitoring_visits: {
        Row: {
          actual_date: string | null
          created_at: string
          created_by: string | null
          follow_up_actions: string | null
          id: string
          monitor_name: string | null
          planned_date: string | null
          project_id: string
          purpose: string | null
          report_date: string | null
          report_link: string | null
          site_id: string | null
          status: string
          summary: string | null
          updated_at: string
          visit_code: string | null
          visit_type: string
        }
        Insert: {
          actual_date?: string | null
          created_at?: string
          created_by?: string | null
          follow_up_actions?: string | null
          id?: string
          monitor_name?: string | null
          planned_date?: string | null
          project_id: string
          purpose?: string | null
          report_date?: string | null
          report_link?: string | null
          site_id?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
          visit_code?: string | null
          visit_type?: string
        }
        Update: {
          actual_date?: string | null
          created_at?: string
          created_by?: string | null
          follow_up_actions?: string | null
          id?: string
          monitor_name?: string | null
          planned_date?: string | null
          project_id?: string
          purpose?: string | null
          report_date?: string | null
          report_link?: string | null
          site_id?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
          visit_code?: string | null
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_monitoring_visits_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
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
          nda_status: string
          next_qualification_date: string | null
          notes: string | null
          project_id: string
          qualification_status: string
          responsible: string | null
          rq_pcl006_status: string
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
          nda_status?: string
          next_qualification_date?: string | null
          notes?: string | null
          project_id: string
          qualification_status?: string
          responsible?: string | null
          rq_pcl006_status?: string
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
          nda_status?: string
          next_qualification_date?: string | null
          notes?: string | null
          project_id?: string
          qualification_status?: string
          responsible?: string | null
          rq_pcl006_status?: string
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
      steering_meetings: {
        Row: {
          agenda: string | null
          attendees: string | null
          created_at: string
          created_by: string | null
          id: string
          location: string | null
          meeting_code: string
          meeting_date: string
          minutes: string | null
          next_meeting_date: string | null
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          agenda?: string | null
          attendees?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          meeting_code: string
          meeting_date: string
          minutes?: string | null
          next_meeting_date?: string | null
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          agenda?: string | null
          attendees?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          meeting_code?: string
          meeting_date?: string
          minutes?: string | null
          next_meeting_date?: string | null
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
          stakeholder_id: string | null
          task_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          role: string
          stakeholder_id?: string | null
          task_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          role?: string
          stakeholder_id?: string | null
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
            foreignKeyName: "task_raci_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: false
            referencedRelation: "communication_stakeholders"
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
          assigned_at: string | null
          certificate_url: string | null
          completed_at: string | null
          created_at: string
          id: string
          status: string
          team_role: string | null
          training_id: string
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          assigned_at?: string | null
          certificate_url?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          team_role?: string | null
          training_id: string
          updated_at?: string
          user_id: string
          user_name: string
        }
        Update: {
          assigned_at?: string | null
          certificate_url?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          team_role?: string | null
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
          duration_hours: number | null
          id: string
          instructor: string | null
          is_required: boolean
          planned_date: string | null
          project_id: string
          status: string
          title: string
          training_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delegate_role?: string | null
          description?: string | null
          due_date?: string | null
          duration_hours?: number | null
          id?: string
          instructor?: string | null
          is_required?: boolean
          planned_date?: string | null
          project_id: string
          status?: string
          title: string
          training_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delegate_role?: string | null
          description?: string | null
          due_date?: string | null
          duration_hours?: number | null
          id?: string
          instructor?: string | null
          is_required?: boolean
          planned_date?: string | null
          project_id?: string
          status?: string
          title?: string
          training_type?: string
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
      user_module_permissions: {
        Row: {
          action: Database["public"]["Enums"]["module_action"]
          granted_at: string
          granted_by: string | null
          id: string
          module: Database["public"]["Enums"]["module_key"]
          project_id: string | null
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["module_action"]
          granted_at?: string
          granted_by?: string | null
          id?: string
          module: Database["public"]["Enums"]["module_key"]
          project_id?: string | null
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["module_action"]
          granted_at?: string
          granted_by?: string | null
          id?: string
          module?: Database["public"]["Enums"]["module_key"]
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_module_permissions_project_id_fkey"
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
      vendor_payments: {
        Row: {
          amount: number
          category: string
          cost_center: string | null
          created_at: string
          created_by: string | null
          description: string | null
          drive_folder_link: string | null
          id: string
          invoice_number: string | null
          paid_at: string | null
          parent_payment_id: string | null
          payment_date: string
          project_id: string | null
          protheus_code: string | null
          recurrence_end_date: string | null
          recurrence_type: string | null
          status: string
          updated_at: string
          value_class: string | null
          vendor_id: string | null
          vendor_name: string
        }
        Insert: {
          amount: number
          category?: string
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          drive_folder_link?: string | null
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          parent_payment_id?: string | null
          payment_date?: string
          project_id?: string | null
          protheus_code?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          status?: string
          updated_at?: string
          value_class?: string | null
          vendor_id?: string | null
          vendor_name: string
        }
        Update: {
          amount?: number
          category?: string
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          drive_folder_link?: string | null
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          parent_payment_id?: string | null
          payment_date?: string
          project_id?: string | null
          protheus_code?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          status?: string
          updated_at?: string
          value_class?: string | null
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
      get_user_module_permissions: {
        Args: { _user_id: string }
        Returns: {
          action: Database["public"]["Enums"]["module_action"]
          module: Database["public"]["Enums"]["module_key"]
          project_id: string
        }[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: {
          project_id: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      has_module_permission: {
        Args: {
          _action: Database["public"]["Enums"]["module_action"]
          _module: Database["public"]["Enums"]["module_key"]
          _project_id?: string
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
      user_has_role_in_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "collaborator"
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
      module_action: "view" | "create"
      module_key:
        | "dashboard"
        | "communications"
        | "projects"
        | "agenda"
        | "tasks"
        | "visits"
        | "site_monitoring"
        | "pmcf_survey"
        | "qualifications"
        | "trainings"
        | "change_control"
        | "risks"
        | "committees"
        | "steering"
        | "regulatory"
        | "payments"
        | "library"
        | "clinical_evaluation"
        | "ip"
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
        | "site_monitoring_overdue"
        | "site_monitoring_today"
        | "site_monitoring_upcoming"
        | "site_monitoring_no_report"
        | "site_finding_critical"
        | "site_finding_overdue"
        | "change_control_pending"
        | "risk_review_overdue"
        | "risk_review_due_soon"
        | "deviation_open"
        | "safety_event_open"
        | "safety_event_serious"
        | "training_overdue"
        | "training_due_soon"
        | "qualification_contract_expiring"
        | "qualification_contract_expired"
        | "pmcf_survey_ending_soon"
        | "pmcf_check_overdue"
        | "steering_meeting_upcoming"
        | "steering_meeting_overdue"
        | "clinical_evaluation_review_due"
        | "committee_letter_pending"
        | "tmf_document_expiring"
        | "tmf_document_expired"
        | "ip_supply_expiring"
        | "ip_supply_expired"
        | "data_query_open"
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
      app_role: ["admin", "collaborator"],
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
      module_action: ["view", "create"],
      module_key: [
        "dashboard",
        "communications",
        "projects",
        "agenda",
        "tasks",
        "visits",
        "site_monitoring",
        "pmcf_survey",
        "qualifications",
        "trainings",
        "change_control",
        "risks",
        "committees",
        "steering",
        "regulatory",
        "payments",
        "library",
        "clinical_evaluation",
        "ip",
      ],
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
        "site_monitoring_overdue",
        "site_monitoring_today",
        "site_monitoring_upcoming",
        "site_monitoring_no_report",
        "site_finding_critical",
        "site_finding_overdue",
        "change_control_pending",
        "risk_review_overdue",
        "risk_review_due_soon",
        "deviation_open",
        "safety_event_open",
        "safety_event_serious",
        "training_overdue",
        "training_due_soon",
        "qualification_contract_expiring",
        "qualification_contract_expired",
        "pmcf_survey_ending_soon",
        "pmcf_check_overdue",
        "steering_meeting_upcoming",
        "steering_meeting_overdue",
        "clinical_evaluation_review_due",
        "committee_letter_pending",
        "tmf_document_expiring",
        "tmf_document_expired",
        "ip_supply_expiring",
        "ip_supply_expired",
        "data_query_open",
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
