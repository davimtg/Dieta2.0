CREATE POLICY "Usuários podem inserir o próprio perfil" ON public.usuarios_perfil FOR INSERT WITH CHECK (auth.uid() = id);
