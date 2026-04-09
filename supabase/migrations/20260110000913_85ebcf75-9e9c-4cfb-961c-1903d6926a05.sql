-- =====================================================
-- EDC System Enhancement - Phase 1: Database Schema
-- =====================================================

-- 1. Enhanced CRF Fields with Skip Logic, Edit Checks, and Formulas
ALTER TABLE crf_fields 
ADD COLUMN IF NOT EXISTS skip_logic jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS edit_checks jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS calculated_formula text,
ADD COLUMN IF NOT EXISTS depends_on_field_id uuid REFERENCES crf_fields(id),
ADD COLUMN IF NOT EXISTS coding_dictionary text,
ADD COLUMN IF NOT EXISTS min_value numeric,
ADD COLUMN IF NOT EXISTS max_value numeric;

-- 2. Enhanced CRF Entries with Lock and Verification
ALTER TABLE crf_entries 
ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS locked_by uuid,
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS verified_by uuid,
ADD COLUMN IF NOT EXISTS signed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS signed_by uuid,
ADD COLUMN IF NOT EXISTS signature_meaning text;

-- 3. Enhanced CRF Field Values with SDV
ALTER TABLE crf_field_values 
ADD COLUMN IF NOT EXISTS sdv_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS sdv_verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS sdv_verified_by uuid,
ADD COLUMN IF NOT EXISTS query_status text DEFAULT 'none';

-- 4. Enhanced Audit Log
ALTER TABLE crf_audit_log 
ADD COLUMN IF NOT EXISTS ip_address inet,
ADD COLUMN IF NOT EXISTS user_agent text,
ADD COLUMN IF NOT EXISTS session_id text;

-- 5. Data Queries Table for Discrepancy Management
CREATE TABLE IF NOT EXISTS data_queries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id uuid NOT NULL REFERENCES crf_entries(id) ON DELETE CASCADE,
    field_id uuid REFERENCES crf_fields(id),
    query_type text NOT NULL DEFAULT 'manual',
    status text NOT NULL DEFAULT 'open',
    priority text DEFAULT 'medium',
    query_text text NOT NULL,
    response_text text,
    opened_by uuid,
    opened_at timestamp with time zone DEFAULT now(),
    answered_by uuid,
    answered_at timestamp with time zone,
    closed_by uuid,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add constraint for query_type
ALTER TABLE data_queries 
ADD CONSTRAINT data_queries_query_type_check 
CHECK (query_type IN ('manual', 'edit_check', 'sdv', 'system'));

-- Add constraint for status
ALTER TABLE data_queries 
ADD CONSTRAINT data_queries_status_check 
CHECK (status IN ('open', 'answered', 'closed', 'cancelled'));

-- Add constraint for priority
ALTER TABLE data_queries 
ADD CONSTRAINT data_queries_priority_check 
CHECK (priority IN ('low', 'medium', 'high', 'critical'));

-- 6. Data Query History for audit trail
CREATE TABLE IF NOT EXISTS data_query_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id uuid NOT NULL REFERENCES data_queries(id) ON DELETE CASCADE,
    action text NOT NULL,
    comment text,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now()
);

-- Add constraint for action
ALTER TABLE data_query_history 
ADD CONSTRAINT data_query_history_action_check 
CHECK (action IN ('opened', 'answered', 'closed', 'reopened', 'updated', 'escalated'));

-- 7. Visit CRF Configuration - which CRFs are required for each visit type
CREATE TABLE IF NOT EXISTS visit_crf_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    visit_type_id uuid REFERENCES visit_types(id) ON DELETE CASCADE,
    template_id uuid NOT NULL REFERENCES crf_templates(id) ON DELETE CASCADE,
    display_order integer DEFAULT 0,
    is_required boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(project_id, visit_type_id, template_id)
);

-- 8. Enable RLS on new tables
ALTER TABLE data_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_query_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_crf_config ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for data_queries
CREATE POLICY "Authenticated users can view data_queries"
ON data_queries FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert data_queries"
ON data_queries FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update data_queries"
ON data_queries FOR UPDATE
USING (auth.role() = 'authenticated');

-- 10. RLS Policies for data_query_history
CREATE POLICY "Authenticated users can view data_query_history"
ON data_query_history FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert data_query_history"
ON data_query_history FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- 11. RLS Policies for visit_crf_config
CREATE POLICY "Authenticated users can manage visit_crf_config"
ON visit_crf_config FOR ALL
USING (auth.role() = 'authenticated');

-- 12. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_data_queries_entry_id ON data_queries(entry_id);
CREATE INDEX IF NOT EXISTS idx_data_queries_field_id ON data_queries(field_id);
CREATE INDEX IF NOT EXISTS idx_data_queries_status ON data_queries(status);
CREATE INDEX IF NOT EXISTS idx_data_query_history_query_id ON data_query_history(query_id);
CREATE INDEX IF NOT EXISTS idx_visit_crf_config_project_id ON visit_crf_config(project_id);
CREATE INDEX IF NOT EXISTS idx_crf_entries_participant_id ON crf_entries(participant_id);
CREATE INDEX IF NOT EXISTS idx_crf_entries_template_id ON crf_entries(template_id);
CREATE INDEX IF NOT EXISTS idx_crf_field_values_entry_id ON crf_field_values(entry_id);

-- 13. Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. Triggers for updated_at
DROP TRIGGER IF EXISTS update_data_queries_updated_at ON data_queries;
CREATE TRIGGER update_data_queries_updated_at
BEFORE UPDATE ON data_queries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_visit_crf_config_updated_at ON visit_crf_config;
CREATE TRIGGER update_visit_crf_config_updated_at
BEFORE UPDATE ON visit_crf_config
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();