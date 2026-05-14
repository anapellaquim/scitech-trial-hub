-- Submissions
UPDATE public.regulatory_submissions
SET status = 'approved'
WHERE approval_date IS NOT NULL
  AND status NOT IN ('rejected','revision_required','approved');

UPDATE public.regulatory_submissions
SET status = 'submitted'
WHERE has_requirements = true
  AND requirement_submitted_date IS NOT NULL
  AND approval_date IS NULL
  AND status NOT IN ('rejected','submitted');

UPDATE public.regulatory_submissions
SET status = 'revision_required'
WHERE has_requirements = true
  AND requirement_date IS NOT NULL
  AND requirement_submitted_date IS NULL
  AND approval_date IS NULL
  AND status NOT IN ('rejected','revision_required');

UPDATE public.regulatory_submissions
SET status = 'submitted'
WHERE (has_requirements IS NOT TRUE OR (requirement_date IS NULL AND requirement_submitted_date IS NULL))
  AND submission_date IS NOT NULL
  AND approval_date IS NULL
  AND status = 'pending';

UPDATE public.regulatory_submissions
SET status = 'pending'
WHERE submission_date IS NULL
  AND approval_date IS NULL
  AND (has_requirements IS NOT TRUE OR (requirement_date IS NULL AND requirement_submitted_date IS NULL))
  AND status NOT IN ('rejected','revision_required','pending');

-- Reports
UPDATE public.regulatory_reports
SET status = 'approved'
WHERE approval_date IS NOT NULL
  AND status NOT IN ('rejected','revision_required','approved');

UPDATE public.regulatory_reports
SET status = 'submitted'
WHERE has_requirements = true
  AND requirement_submitted_date IS NOT NULL
  AND approval_date IS NULL
  AND status NOT IN ('rejected','submitted');

UPDATE public.regulatory_reports
SET status = 'revision_required'
WHERE has_requirements = true
  AND requirement_date IS NOT NULL
  AND requirement_submitted_date IS NULL
  AND approval_date IS NULL
  AND status NOT IN ('rejected','revision_required');

UPDATE public.regulatory_reports
SET status = 'submitted'
WHERE (has_requirements IS NOT TRUE OR (requirement_date IS NULL AND requirement_submitted_date IS NULL))
  AND submitted_date IS NOT NULL
  AND approval_date IS NULL
  AND status = 'pending';

UPDATE public.regulatory_reports
SET status = 'pending'
WHERE submitted_date IS NULL
  AND approval_date IS NULL
  AND (has_requirements IS NOT TRUE OR (requirement_date IS NULL AND requirement_submitted_date IS NULL))
  AND status NOT IN ('rejected','revision_required','pending');