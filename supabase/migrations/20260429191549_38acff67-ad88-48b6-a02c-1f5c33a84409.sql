-- regulatory_submissions
ALTER TABLE public.regulatory_submissions DROP CONSTRAINT IF EXISTS regulatory_submissions_site_id_fkey;
UPDATE public.regulatory_submissions SET site_id = NULL
  WHERE site_id IS NOT NULL AND site_id NOT IN (SELECT id FROM public.research_centers);
ALTER TABLE public.regulatory_submissions
  ADD CONSTRAINT regulatory_submissions_site_id_fkey
  FOREIGN KEY (site_id) REFERENCES public.research_centers(id) ON DELETE SET NULL;

-- regulatory_reports
ALTER TABLE public.regulatory_reports DROP CONSTRAINT IF EXISTS regulatory_reports_site_id_fkey;
UPDATE public.regulatory_reports SET site_id = NULL
  WHERE site_id IS NOT NULL AND site_id NOT IN (SELECT id FROM public.research_centers);
ALTER TABLE public.regulatory_reports
  ADD CONSTRAINT regulatory_reports_site_id_fkey
  FOREIGN KEY (site_id) REFERENCES public.research_centers(id) ON DELETE SET NULL;