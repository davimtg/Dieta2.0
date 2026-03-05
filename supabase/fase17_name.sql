-- Migração Menor: Adicionando Nome a Perfis
ALTER TABLE usuarios_perfil ADD COLUMN IF NOT EXISTS username text;
