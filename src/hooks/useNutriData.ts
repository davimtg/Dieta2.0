import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useNutriData() {
    const { session } = useAuth();
    const userId = session?.user?.id;
    const queryClient = useQueryClient();

    // Buscar pacientes vinculados reais
    const { data: clientesReais = [], isLoading: isLoadingClientes } = useQuery({
        queryKey: ['nutri_clientes', userId],
        queryFn: async () => {
            if (!userId) return [];
            const { data, error } = await supabase
                .from('nutri_clientes')
                .select(`
                    id,
                    cliente_id,
                    status,
                    usuarios_perfil:usuarios_perfil!fk_cliente (*)
                `)
                .eq('nutri_id', userId);

            if (error) throw error;
            return data;
        },
        enabled: !!userId
    });

    // Fallback pra teste Dev: Trazer todos os usuários se não houver clientes
    const { data: allUsers = [], isLoading: isLoadingAll } = useQuery({
        queryKey: ['all_users_fallback'],
        queryFn: async () => {
            const { data, error } = await supabase.from('usuarios_perfil').select('*');
            if (error) throw error;
            return data;
        },
        enabled: !!userId
    });

    const clientes = clientesReais.length > 0 ? clientesReais : allUsers.map(u => ({
        id: `fallback-${u.id}`,
        cliente_id: u.id,
        status: 'active',
        usuarios_perfil: u
    }));

    // Buscar planos alimentares criados pelo Nutri
    const { data: planos = [], isLoading: isLoadingPlanos } = useQuery({
        queryKey: ['planos_alimentares', userId],
        queryFn: async () => {
            if (!userId) return [];
            const { data, error } = await supabase
                .from('planos_alimentares')
                .select(`
                    *,
                    plano_alimentar_itens (
                        id,
                        dia_semana,
                        tipo_refeicao,
                        quantidade_g,
                        alimentos (*),
                        receitas (*, receita_ingredientes:receita_ingredientes!receita_id (*, alimentos (*), receitas:receitas!ingrediente_receita_id (*, receita_ingredientes:receita_ingredientes!receita_id (*, alimentos (*)))))
                    )
                `)
                .eq('nutri_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!userId
    });

    // Criar novo plano
    const createPlanoMutation = useMutation({
        mutationFn: async ({ nome, clienteId }: { nome: string, clienteId: string }) => {
            const { data, error } = await supabase
                .from('planos_alimentares')
                .insert({
                    nutri_id: userId,
                    cliente_id: clienteId,
                    nome,
                    ativo: true
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['planos_alimentares', userId] });
        }
    });

    // Adicionar Item ao Plano
    const addPlanoItemMutation = useMutation({
        mutationFn: async (item: {
            plano_id: string,
            dia_semana: number,
            tipo_refeicao: string,
            alimento_id?: string | null,
            receita_id?: string | null,
            quantidade_g: number
        }) => {
            const { data, error } = await supabase
                .from('plano_alimentar_itens')
                .insert(item)
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['planos_alimentares', userId] });
        }
    });

    // Remover Item do Plano
    const deletePlanoItemMutation = useMutation({
        mutationFn: async (itemId: string) => {
            const { error } = await supabase
                .from('plano_alimentar_itens')
                .delete()
                .eq('id', itemId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['planos_alimentares', userId] });
        }
    });

    return {
        clientes,
        planos,
        isLoading: isLoadingClientes || isLoadingPlanos || isLoadingAll,
        createPlano: createPlanoMutation.mutateAsync,
        addPlanoItem: addPlanoItemMutation.mutateAsync,
        deletePlanoItem: deletePlanoItemMutation.mutateAsync
    };
}
