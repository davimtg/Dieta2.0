CREATE POLICY "Usuários deletam próprios alimentos" ON public.alimentos FOR DELETE USING (auth.uid() = user_id);
