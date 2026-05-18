CREATE POLICY "Users can delete patients for their projects"
ON public.patients
FOR DELETE
TO authenticated
USING (true);