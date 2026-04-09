-- =============================================
-- eTMF MODULE - PHASE 1: DATABASE INFRASTRUCTURE
-- Based on DIA TMF Reference Model v3.3
-- =============================================

-- 1. Create storage bucket for TMF documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('tmf-documents', 'tmf-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for tmf-documents bucket
CREATE POLICY "Authenticated users can upload TMF documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tmf-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view TMF documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'tmf-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update TMF documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'tmf-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete TMF documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'tmf-documents' AND auth.role() = 'authenticated');

-- 2. TMF ZONES TABLE (11 zones from DIA TMF Reference Model)
CREATE TABLE public.tmf_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_number TEXT NOT NULL UNIQUE,
  zone_name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tmf_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tmf_zones"
ON public.tmf_zones FOR SELECT
USING (auth.role() = 'authenticated');

-- 3. TMF SECTIONS TABLE
CREATE TABLE public.tmf_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id UUID NOT NULL REFERENCES public.tmf_zones(id) ON DELETE CASCADE,
  section_number TEXT NOT NULL,
  section_name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(zone_id, section_number)
);

ALTER TABLE public.tmf_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tmf_sections"
ON public.tmf_sections FOR SELECT
USING (auth.role() = 'authenticated');

-- 4. TMF ARTIFACTS TABLE
CREATE TABLE public.tmf_artifacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.tmf_sections(id) ON DELETE CASCADE,
  artifact_number TEXT NOT NULL,
  artifact_name TEXT NOT NULL,
  description TEXT,
  level TEXT NOT NULL DEFAULT 'trial' CHECK (level IN ('trial', 'country', 'site')),
  is_required BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(section_id, artifact_number)
);

ALTER TABLE public.tmf_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tmf_artifacts"
ON public.tmf_artifacts FOR SELECT
USING (auth.role() = 'authenticated');

-- 5. TMF DOCUMENTS TABLE
CREATE TABLE public.tmf_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artifact_id UUID NOT NULL REFERENCES public.tmf_artifacts(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL,
  site_id UUID REFERENCES public.research_centers(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'superseded', 'obsolete')),
  effective_date DATE,
  expiration_date DATE,
  version INTEGER NOT NULL DEFAULT 1,
  uploaded_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tmf_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tmf_documents"
ON public.tmf_documents FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert tmf_documents"
ON public.tmf_documents FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update tmf_documents"
ON public.tmf_documents FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete tmf_documents"
ON public.tmf_documents FOR DELETE
USING (auth.role() = 'authenticated');

-- 6. TMF DOCUMENT VERSIONS TABLE
CREATE TABLE public.tmf_document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.tmf_documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  changes_description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(document_id, version_number)
);

ALTER TABLE public.tmf_document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tmf_document_versions"
ON public.tmf_document_versions FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert tmf_document_versions"
ON public.tmf_document_versions FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- 7. TMF AUDIT LOG TABLE (append-only for compliance)
CREATE TABLE public.tmf_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.tmf_documents(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('uploaded', 'viewed', 'downloaded', 'approved', 'rejected', 'superseded', 'deleted', 'restored')),
  details JSONB DEFAULT '{}',
  user_id UUID REFERENCES public.profiles(id),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tmf_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tmf_audit_log"
ON public.tmf_audit_log FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert tmf_audit_log"
ON public.tmf_audit_log FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- No UPDATE or DELETE policies for audit log (append-only)

-- 8. INDEXES FOR PERFORMANCE
CREATE INDEX idx_tmf_sections_zone ON public.tmf_sections(zone_id);
CREATE INDEX idx_tmf_artifacts_section ON public.tmf_artifacts(section_id);
CREATE INDEX idx_tmf_documents_artifact ON public.tmf_documents(artifact_id);
CREATE INDEX idx_tmf_documents_project ON public.tmf_documents(project_id);
CREATE INDEX idx_tmf_documents_status ON public.tmf_documents(status);
CREATE INDEX idx_tmf_document_versions_document ON public.tmf_document_versions(document_id);
CREATE INDEX idx_tmf_audit_log_document ON public.tmf_audit_log(document_id);
CREATE INDEX idx_tmf_audit_log_user ON public.tmf_audit_log(user_id);
CREATE INDEX idx_tmf_audit_log_created ON public.tmf_audit_log(created_at DESC);

-- 9. TRIGGERS FOR UPDATED_AT
CREATE TRIGGER update_tmf_zones_updated_at
  BEFORE UPDATE ON public.tmf_zones
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_tmf_sections_updated_at
  BEFORE UPDATE ON public.tmf_sections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_tmf_artifacts_updated_at
  BEFORE UPDATE ON public.tmf_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_tmf_documents_updated_at
  BEFORE UPDATE ON public.tmf_documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- 10. SEED DATA - DIA TMF REFERENCE MODEL v3.3
-- =============================================

-- Insert 11 Zones
INSERT INTO public.tmf_zones (zone_number, zone_name, description, display_order) VALUES
('01', 'Trial Management', 'Documents related to overall trial management, planning, and oversight', 1),
('02', 'Central Trial Documents', 'Core documents applicable to the entire trial including protocol, IB, and consent', 2),
('03', 'Regulatory', 'Regulatory authority submissions, approvals, and correspondence', 3),
('04', 'IRB/IEC', 'Ethics committee documents, approvals, and correspondence', 4),
('05', 'Site Management', 'Site-level documents including agreements, training, and logs', 5),
('06', 'IP and Trial Supplies', 'Investigational product and trial supply documentation', 6),
('07', 'Safety Reporting', 'Safety reports, SAEs, SUSARs, and safety correspondence', 7),
('08', 'Central and Local Labs', 'Laboratory certifications, normal ranges, and results', 8),
('09', 'Statistics', 'Statistical analysis plan, randomization, and analysis documents', 9),
('10', 'Data Management', 'CRF design, database documentation, and data validation', 10),
('11', 'Third Parties', 'Vendor contracts, audits, and third-party documentation', 11);

-- Insert Sections for each Zone
-- Zone 01: Trial Management
INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '01.01', 'Trial Management Plan', 'Overall trial management planning documents', 1
FROM public.tmf_zones z WHERE z.zone_number = '01';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '01.02', 'Trial Team', 'Trial team composition and responsibilities', 2
FROM public.tmf_zones z WHERE z.zone_number = '01';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '01.03', 'Trial Oversight', 'Monitoring and oversight activities', 3
FROM public.tmf_zones z WHERE z.zone_number = '01';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '01.04', 'Progress Tracking', 'Enrollment and progress tracking', 4
FROM public.tmf_zones z WHERE z.zone_number = '01';

-- Zone 02: Central Trial Documents
INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '02.01', 'Protocol', 'Protocol and amendments', 1
FROM public.tmf_zones z WHERE z.zone_number = '02';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '02.02', 'Investigator Brochure', 'IB and updates', 2
FROM public.tmf_zones z WHERE z.zone_number = '02';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '02.03', 'Informed Consent', 'ICF templates and translations', 3
FROM public.tmf_zones z WHERE z.zone_number = '02';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '02.04', 'Other Study Materials', 'Diaries, questionnaires, and other materials', 4
FROM public.tmf_zones z WHERE z.zone_number = '02';

-- Zone 03: Regulatory
INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '03.01', 'Regulatory Submissions', 'Submissions to regulatory authorities', 1
FROM public.tmf_zones z WHERE z.zone_number = '03';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '03.02', 'Regulatory Approvals', 'Approvals and authorizations', 2
FROM public.tmf_zones z WHERE z.zone_number = '03';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '03.03', 'Regulatory Correspondence', 'Correspondence with authorities', 3
FROM public.tmf_zones z WHERE z.zone_number = '03';

-- Zone 04: IRB/IEC
INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '04.01', 'IRB/IEC Submissions', 'Ethics submissions and applications', 1
FROM public.tmf_zones z WHERE z.zone_number = '04';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '04.02', 'IRB/IEC Approvals', 'Ethics approvals and opinions', 2
FROM public.tmf_zones z WHERE z.zone_number = '04';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '04.03', 'IRB/IEC Correspondence', 'Ethics committee correspondence', 3
FROM public.tmf_zones z WHERE z.zone_number = '04';

-- Zone 05: Site Management
INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '05.01', 'Site Selection', 'Site feasibility and selection', 1
FROM public.tmf_zones z WHERE z.zone_number = '05';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '05.02', 'Site Agreements', 'Contracts and agreements', 2
FROM public.tmf_zones z WHERE z.zone_number = '05';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '05.03', 'Site Personnel', 'CVs, licenses, and delegation logs', 3
FROM public.tmf_zones z WHERE z.zone_number = '05';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '05.04', 'Site Training', 'Training records and certificates', 4
FROM public.tmf_zones z WHERE z.zone_number = '05';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '05.05', 'Monitoring', 'Monitoring visit reports and logs', 5
FROM public.tmf_zones z WHERE z.zone_number = '05';

-- Zone 06: IP and Trial Supplies
INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '06.01', 'IP Documentation', 'Manufacturing and quality documentation', 1
FROM public.tmf_zones z WHERE z.zone_number = '06';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '06.02', 'IP Accountability', 'Shipping, receipt, and accountability logs', 2
FROM public.tmf_zones z WHERE z.zone_number = '06';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '06.03', 'Trial Supplies', 'Non-IP trial supplies documentation', 3
FROM public.tmf_zones z WHERE z.zone_number = '06';

-- Zone 07: Safety Reporting
INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '07.01', 'Safety Management Plan', 'Safety reporting procedures', 1
FROM public.tmf_zones z WHERE z.zone_number = '07';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '07.02', 'Individual Safety Reports', 'SAEs and SUSARs', 2
FROM public.tmf_zones z WHERE z.zone_number = '07';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '07.03', 'Aggregate Safety Reports', 'DSURs and periodic reports', 3
FROM public.tmf_zones z WHERE z.zone_number = '07';

-- Zone 08: Central and Local Labs
INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '08.01', 'Central Lab', 'Central laboratory documentation', 1
FROM public.tmf_zones z WHERE z.zone_number = '08';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '08.02', 'Local Labs', 'Local laboratory certifications and ranges', 2
FROM public.tmf_zones z WHERE z.zone_number = '08';

-- Zone 09: Statistics
INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '09.01', 'Statistical Analysis Plan', 'SAP and amendments', 1
FROM public.tmf_zones z WHERE z.zone_number = '09';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '09.02', 'Randomization', 'Randomization documentation', 2
FROM public.tmf_zones z WHERE z.zone_number = '09';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '09.03', 'Analysis Documentation', 'Analysis outputs and reports', 3
FROM public.tmf_zones z WHERE z.zone_number = '09';

-- Zone 10: Data Management
INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '10.01', 'Data Management Plan', 'DMP and data handling procedures', 1
FROM public.tmf_zones z WHERE z.zone_number = '10';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '10.02', 'CRF Documentation', 'CRF design and completion guidelines', 2
FROM public.tmf_zones z WHERE z.zone_number = '10';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '10.03', 'Database Documentation', 'Database design and validation', 3
FROM public.tmf_zones z WHERE z.zone_number = '10';

-- Zone 11: Third Parties
INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '11.01', 'Vendor Selection', 'Vendor qualification and selection', 1
FROM public.tmf_zones z WHERE z.zone_number = '11';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '11.02', 'Vendor Agreements', 'Contracts and agreements', 2
FROM public.tmf_zones z WHERE z.zone_number = '11';

INSERT INTO public.tmf_sections (zone_id, section_number, section_name, description, display_order)
SELECT z.id, '11.03', 'Vendor Oversight', 'Audits and oversight documentation', 3
FROM public.tmf_zones z WHERE z.zone_number = '11';

-- Insert key Artifacts for each Section
-- Zone 01 Artifacts
INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '01.01.01', 'Trial Master File Plan', 'Plan for TMF structure and maintenance', 'trial', true, 1
FROM public.tmf_sections s WHERE s.section_number = '01.01';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '01.01.02', 'Trial Management Plan', 'Overall trial management approach', 'trial', true, 2
FROM public.tmf_sections s WHERE s.section_number = '01.01';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '01.02.01', 'Team Contact List', 'Trial team contact information', 'trial', true, 1
FROM public.tmf_sections s WHERE s.section_number = '01.02';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '01.02.02', 'Organization Chart', 'Trial organization structure', 'trial', false, 2
FROM public.tmf_sections s WHERE s.section_number = '01.02';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '01.03.01', 'Monitoring Plan', 'Monitoring strategy and procedures', 'trial', true, 1
FROM public.tmf_sections s WHERE s.section_number = '01.03';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '01.04.01', 'Enrollment Status Report', 'Enrollment tracking reports', 'trial', false, 1
FROM public.tmf_sections s WHERE s.section_number = '01.04';

-- Zone 02 Artifacts
INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '02.01.01', 'Protocol', 'Final approved protocol', 'trial', true, 1
FROM public.tmf_sections s WHERE s.section_number = '02.01';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '02.01.02', 'Protocol Amendment', 'Protocol amendments', 'trial', false, 2
FROM public.tmf_sections s WHERE s.section_number = '02.01';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '02.01.03', 'Protocol Synopsis', 'Protocol summary', 'trial', false, 3
FROM public.tmf_sections s WHERE s.section_number = '02.01';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '02.02.01', 'Investigator Brochure', 'Current IB version', 'trial', true, 1
FROM public.tmf_sections s WHERE s.section_number = '02.02';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '02.02.02', 'IB Updates', 'IB update notifications', 'trial', false, 2
FROM public.tmf_sections s WHERE s.section_number = '02.02';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '02.03.01', 'Master ICF Template', 'Master informed consent form', 'trial', true, 1
FROM public.tmf_sections s WHERE s.section_number = '02.03';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '02.03.02', 'ICF Translations', 'Translated consent forms', 'country', false, 2
FROM public.tmf_sections s WHERE s.section_number = '02.03';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '02.03.03', 'Site-Specific ICF', 'Site-adapted consent forms', 'site', true, 3
FROM public.tmf_sections s WHERE s.section_number = '02.03';

-- Zone 03 Artifacts
INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '03.01.01', 'Clinical Trial Application', 'CTA/IND submission', 'country', true, 1
FROM public.tmf_sections s WHERE s.section_number = '03.01';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '03.02.01', 'Regulatory Approval', 'CTA/IND approval letter', 'country', true, 1
FROM public.tmf_sections s WHERE s.section_number = '03.02';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '03.03.01', 'Regulatory Correspondence', 'Letters and communications', 'country', false, 1
FROM public.tmf_sections s WHERE s.section_number = '03.03';

-- Zone 04 Artifacts
INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '04.01.01', 'IRB/IEC Application', 'Ethics submission package', 'site', true, 1
FROM public.tmf_sections s WHERE s.section_number = '04.01';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '04.02.01', 'IRB/IEC Approval', 'Ethics approval letter', 'site', true, 1
FROM public.tmf_sections s WHERE s.section_number = '04.02';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '04.02.02', 'Continuing Review Approval', 'Annual renewal approvals', 'site', false, 2
FROM public.tmf_sections s WHERE s.section_number = '04.02';

-- Zone 05 Artifacts
INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '05.01.01', 'Site Feasibility Assessment', 'Site evaluation documentation', 'site', false, 1
FROM public.tmf_sections s WHERE s.section_number = '05.01';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '05.02.01', 'Clinical Trial Agreement', 'Site contract', 'site', true, 1
FROM public.tmf_sections s WHERE s.section_number = '05.02';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '05.02.02', 'Financial Agreement', 'Budget and payment terms', 'site', true, 2
FROM public.tmf_sections s WHERE s.section_number = '05.02';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '05.03.01', 'Investigator CV', 'Principal investigator curriculum vitae', 'site', true, 1
FROM public.tmf_sections s WHERE s.section_number = '05.03';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '05.03.02', 'Medical License', 'PI medical license', 'site', true, 2
FROM public.tmf_sections s WHERE s.section_number = '05.03';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '05.03.03', 'Delegation Log', 'Site delegation of responsibilities', 'site', true, 3
FROM public.tmf_sections s WHERE s.section_number = '05.03';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '05.03.04', 'Staff CVs', 'Study team CVs', 'site', true, 4
FROM public.tmf_sections s WHERE s.section_number = '05.03';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '05.04.01', 'Training Log', 'Site training records', 'site', true, 1
FROM public.tmf_sections s WHERE s.section_number = '05.04';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '05.04.02', 'GCP Certificate', 'GCP training certificates', 'site', true, 2
FROM public.tmf_sections s WHERE s.section_number = '05.04';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '05.05.01', 'Site Initiation Visit Report', 'SIV report', 'site', true, 1
FROM public.tmf_sections s WHERE s.section_number = '05.05';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '05.05.02', 'Monitoring Visit Report', 'Routine monitoring reports', 'site', true, 2
FROM public.tmf_sections s WHERE s.section_number = '05.05';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '05.05.03', 'Close-out Visit Report', 'COV report', 'site', true, 3
FROM public.tmf_sections s WHERE s.section_number = '05.05';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '05.05.04', 'Monitoring Visit Log', 'Log of all monitoring visits', 'site', true, 4
FROM public.tmf_sections s WHERE s.section_number = '05.05';

-- Zone 06 Artifacts
INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '06.01.01', 'Certificate of Analysis', 'IP batch release certificate', 'trial', true, 1
FROM public.tmf_sections s WHERE s.section_number = '06.01';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '06.01.02', 'IP Label', 'IP labeling samples', 'trial', true, 2
FROM public.tmf_sections s WHERE s.section_number = '06.01';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '06.02.01', 'IP Shipping Records', 'Shipment documentation', 'site', true, 1
FROM public.tmf_sections s WHERE s.section_number = '06.02';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '06.02.02', 'IP Accountability Log', 'Drug accountability records', 'site', true, 2
FROM public.tmf_sections s WHERE s.section_number = '06.02';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '06.02.03', 'Temperature Log', 'Storage temperature monitoring', 'site', true, 3
FROM public.tmf_sections s WHERE s.section_number = '06.02';

-- Zone 07 Artifacts
INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '07.01.01', 'Safety Management Plan', 'Safety reporting procedures', 'trial', true, 1
FROM public.tmf_sections s WHERE s.section_number = '07.01';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '07.02.01', 'SAE Reports', 'Serious adverse event reports', 'site', true, 1
FROM public.tmf_sections s WHERE s.section_number = '07.02';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '07.02.02', 'SUSAR Notifications', 'Suspected unexpected serious adverse reactions', 'trial', true, 2
FROM public.tmf_sections s WHERE s.section_number = '07.02';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '07.03.01', 'DSUR', 'Development Safety Update Report', 'trial', true, 1
FROM public.tmf_sections s WHERE s.section_number = '07.03';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '07.03.02', 'Annual Safety Report', 'Yearly safety summary', 'trial', false, 2
FROM public.tmf_sections s WHERE s.section_number = '07.03';

-- Zone 08 Artifacts
INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '08.01.01', 'Central Lab Certification', 'Lab accreditation certificate', 'trial', true, 1
FROM public.tmf_sections s WHERE s.section_number = '08.01';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '08.01.02', 'Central Lab Manual', 'Lab procedures manual', 'trial', true, 2
FROM public.tmf_sections s WHERE s.section_number = '08.01';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '08.02.01', 'Local Lab Certification', 'Site lab accreditation', 'site', false, 1
FROM public.tmf_sections s WHERE s.section_number = '08.02';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '08.02.02', 'Normal Ranges', 'Lab normal reference ranges', 'site', true, 2
FROM public.tmf_sections s WHERE s.section_number = '08.02';

-- Zone 09 Artifacts
INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '09.01.01', 'Statistical Analysis Plan', 'SAP document', 'trial', true, 1
FROM public.tmf_sections s WHERE s.section_number = '09.01';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '09.02.01', 'Randomization List', 'Blinded randomization documentation', 'trial', true, 1
FROM public.tmf_sections s WHERE s.section_number = '09.02';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '09.02.02', 'Randomization Procedure', 'Randomization methodology', 'trial', true, 2
FROM public.tmf_sections s WHERE s.section_number = '09.02';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '09.03.01', 'Interim Analysis Report', 'Interim analysis results', 'trial', false, 1
FROM public.tmf_sections s WHERE s.section_number = '09.03';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '09.03.02', 'Final Analysis Report', 'Final statistical analysis', 'trial', true, 2
FROM public.tmf_sections s WHERE s.section_number = '09.03';

-- Zone 10 Artifacts
INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '10.01.01', 'Data Management Plan', 'DMP document', 'trial', true, 1
FROM public.tmf_sections s WHERE s.section_number = '10.01';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '10.02.01', 'CRF Template', 'Blank CRF', 'trial', true, 1
FROM public.tmf_sections s WHERE s.section_number = '10.02';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '10.02.02', 'CRF Completion Guidelines', 'Instructions for CRF completion', 'trial', true, 2
FROM public.tmf_sections s WHERE s.section_number = '10.02';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '10.03.01', 'Database Specification', 'Database design document', 'trial', true, 1
FROM public.tmf_sections s WHERE s.section_number = '10.03';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '10.03.02', 'Data Validation Plan', 'Edit check specifications', 'trial', true, 2
FROM public.tmf_sections s WHERE s.section_number = '10.03';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '10.03.03', 'Database Lock Documentation', 'Database lock procedures and records', 'trial', true, 3
FROM public.tmf_sections s WHERE s.section_number = '10.03';

-- Zone 11 Artifacts
INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '11.01.01', 'Vendor Qualification', 'Vendor qualification documentation', 'trial', false, 1
FROM public.tmf_sections s WHERE s.section_number = '11.01';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '11.02.01', 'Master Service Agreement', 'Vendor contract', 'trial', true, 1
FROM public.tmf_sections s WHERE s.section_number = '11.02';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '11.02.02', 'Work Order', 'Specific project scope', 'trial', false, 2
FROM public.tmf_sections s WHERE s.section_number = '11.02';

INSERT INTO public.tmf_artifacts (section_id, artifact_number, artifact_name, description, level, is_required, display_order)
SELECT s.id, '11.03.01', 'Vendor Audit Report', 'Audit findings and follow-up', 'trial', false, 1
FROM public.tmf_sections s WHERE s.section_number = '11.03';