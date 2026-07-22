
CREATE POLICY "modul-images owner read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'modul-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "modul-images owner insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'modul-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "modul-images owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'modul-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "modul-images admin read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'modul-images' AND private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "modul-images service role" ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'modul-images') WITH CHECK (bucket_id = 'modul-images');
