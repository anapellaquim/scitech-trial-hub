UPDATE public.regulatory_submissions
SET status = 'submitted'
WHERE has_requirements = true
  AND requirement_submitted_date IS NOT NULL
  AND approval_date IS NULL
  AND status NOT IN ('rejected','submitted');

UPDATE public.regulatory_submissions
SET status = 'revision_required'
WHERE has_requirements = true
  AND requirement_submitted_date IS NULL
  AND approval_date IS NULL
  AND status NOT IN ('rejected','revision_required');

UPDATE public.regulatory_reports
SET status = 'submitted'
WHERE has_requirements = true
  AND requirement_submitted_date IS NOT NULL
  AND approval_date IS NULL
  AND status NOT IN ('rejected','submitted');

UPDATE public.regulatory_reports
SET status = 'revision_required'
WHERE has_requirements = true
  AND requirement_submitted_date IS NULL
  AND approval_date IS NULL
  AND status NOT IN ('rejected','revision_required');