import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { format } from 'date-fns';

export function useDietData(date: Date = new Date()) {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const userId = session?.user?.id;
    const formattedDate = format(date, 'yyyy-MM-dd');

    // Fetch Alimentos (Global + User)
    const { data: alimentos = [], isLoading: loadingAlimentos } = useQuery({
        queryKey: ['alimentos', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('alimentos')
                .select('*')
                .or(`user_id.eq.${userId},user_id.is.null,is_verified.eq.true`)
                .order('nome');
            if (error) throw error;
            return data;
        },
        enabled: !!userId,
    });

    // Fetch Receitas
    const { data: receitas = [], isLoading: loadingReceitas } = useQuery({
        queryKey: ['receitas', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('receitas')
                .select(`
          *,
          receita_ingredientes (
            id,
            alimento_id,
            ingrediente_receita_id,
            quantidade_g,
            alimentos (*),
            receitas:ingrediente_receita_id (*, receita_ingredientes (*, alimentos (*)))
          )
        `)
                .eq('user_id', userId);
            if (error) throw error;
            return data;
        },
        enabled: !!userId,
    });

    // Fetch Refeições e Itens Consumidos pro dia específico
    const { data: refeicoes = [], isLoading: loadingRefeicoes } = useQuery({
        queryKey: ['refeicoes', userId, formattedDate],
        queryFn: async () => {
            // Cria refeições padrão se não existirem
            const defaultMeals = ['cafe', 'almoco', 'lanche', 'jantar'];

            const { data: existingMeals, error: fetchError } = await supabase
                .from('refeicoes_diarias')
                .select('*, itens_consumidos(*, alimentos(*), receitas(*, receita_ingredientes(*, alimentos(*), receitas:ingrediente_receita_id(*, receita_ingredientes(*, alimentos(*))))))')
                .eq('user_id', userId)
                .eq('data', formattedDate);

            if (fetchError) throw fetchError;

            const currentMealTypes = existingMeals?.map(m => m.tipo_refeicao) || [];
            const missingMeals = defaultMeals.filter(m => !currentMealTypes.includes(m));

            if (missingMeals.length > 0) {
                const { data: newMeals, error: insertError } = await supabase
                    .from('refeicoes_diarias')
                    .insert(
                        missingMeals.map(tipo => ({
                            user_id: userId,
                            data: formattedDate,
                            tipo_refeicao: tipo
                        }))
                    )
                    .select('*, itens_consumidos(*, alimentos(*), receitas(*, receita_ingredientes(*, alimentos(*), receitas:ingrediente_receita_id(*, receita_ingredientes(*, alimentos(*))))))');

                if (insertError) throw insertError;
                return [...(existingMeals || []), ...(newMeals || [])];
            }

            return existingMeals;
        },
        enabled: !!userId,
    });

    // User Profile Data (Metas)
    const { data: perfil, isLoading: loadingPerfil } = useQuery({
        queryKey: ['perfil', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('usuarios_perfil')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) throw error;
            if (!data) {
                return { meta_kcal: 2000, meta_agua_ml: 2500, peso_atual: 0, objetivo: 'manter' };
            }
            return data;
        },
        enabled: !!userId,
    });

    // Mutations
    const addItemMutation = useMutation({
        mutationFn: async ({ refeicaoId, alimentoId, receitaId, quantidade }: any) => {
            const { data, error } = await supabase
                .from('itens_consumidos')
                .insert({
                    refeicao_id: refeicaoId,
                    alimento_id: alimentoId,
                    receita_id: receitaId,
                    quantidade_g: quantidade
                })
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['refeicoes', userId, formattedDate] });
        }
    });

    const updateItemMutation = useMutation({
        mutationFn: async ({ itemId, quantidade }: any) => {
            const { data, error } = await supabase
                .from('itens_consumidos')
                .update({ quantidade_g: quantidade })
                .eq('id', itemId)
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['refeicoes', userId, formattedDate] });
        }
    });

    const deleteItemMutation = useMutation({
        mutationFn: async (itemId: string) => {
            const { error } = await supabase
                .from('itens_consumidos')
                .delete()
                .eq('id', itemId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['refeicoes', userId, formattedDate] });
        }
    });

    const addAlimentoMutation = useMutation({
        mutationFn: async (novoAlimento: any) => {
            const { data, error } = await supabase
                .from('alimentos')
                .insert({
                    ...novoAlimento,
                    user_id: userId,
                    is_verified: false
                })
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alimentos', userId] });
        }
    });

    const addReceitaMutation = useMutation({
        mutationFn: async (novaReceita: { nome: string; rendimento_porcoes: number; preparo: string; tempo_preparo_min?: number | null; imagem_url?: string; ingredientes: { alimento_id?: string; ingrediente_receita_id?: string; quantidade_g: number }[] }) => {
            // First insert recipe
            const { data: recipeData, error: recipeError } = await supabase
                .from('receitas')
                .insert({
                    nome: novaReceita.nome,
                    rendimento_porcoes: novaReceita.rendimento_porcoes,
                    modo_preparo: novaReceita.preparo,
                    tempo_preparo_min: novaReceita.tempo_preparo_min,
                    imagem_url: novaReceita.imagem_url,
                    user_id: userId,
                })
                .select()
                .single();
            if (recipeError) throw recipeError;

            // Then insert ingredients
            if (novaReceita.ingredientes.length > 0) {
                const ingredientsToInsert = novaReceita.ingredientes.map(ing => ({
                    receita_id: recipeData.id,
                    alimento_id: ing.alimento_id || null,
                    ingrediente_receita_id: ing.ingrediente_receita_id || null,
                    quantidade_g: ing.quantidade_g
                }));

                const { error: ingredientsError } = await supabase
                    .from('receita_ingredientes')
                    .insert(ingredientsToInsert);
                if (ingredientsError) throw ingredientsError;
            }

            return recipeData;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['receitas', userId] });
        }
    });

    const updatePerfilMutation = useMutation({
        mutationFn: async (novoPerfil: any) => {
            const { data, error } = await supabase
                .from('usuarios_perfil')
                .upsert({ id: userId, ...novoPerfil }, { onConflict: 'id' })
                .select()
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['perfil', userId] });
        }
    });

    const updateAlimentoMutation = useMutation({
        mutationFn: async (dados: any) => {
            const { data, error } = await supabase
                .from('alimentos')
                .update(dados)
                .eq('id', dados.id)
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alimentos', userId] });
        }
    });

    const deleteAlimentoMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('alimentos')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alimentos', userId] });
        }
    });

    const updateReceitaMutation = useMutation({
        mutationFn: async ({ id, receita, ingredientes }: { id: string, receita: any, ingredientes: any[] }) => {
            const { error: recError } = await supabase
                .from('receitas')
                .update(receita)
                .eq('id', id);
            if (recError) throw recError;

            // Delete old ingredients
            const { error: delError } = await supabase
                .from('receita_ingredientes')
                .delete()
                .eq('receita_id', id);
            if (delError) throw delError;

            // Insert new ingredients
            const novosIngredientes = ingredientes.map(ing => ({
                receita_id: id,
                ...ing
            }));

            const { error: ingError } = await supabase
                .from('receita_ingredientes')
                .insert(novosIngredientes);

            if (ingError) throw ingError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['receitas'] });
        }
    });

    const deleteReceitaMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('receitas')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['receitas'] });
        }
    });

    return {
        alimentos,
        receitas,
        refeicoes,
        perfil,
        isLoading: loadingAlimentos || loadingReceitas || loadingRefeicoes || loadingPerfil,
        addItem: addItemMutation.mutateAsync,
        updateItem: updateItemMutation.mutateAsync,
        deleteItem: deleteItemMutation.mutateAsync,
        addAlimento: addAlimentoMutation.mutateAsync,
        updateAlimento: updateAlimentoMutation.mutateAsync,
        deleteAlimento: deleteAlimentoMutation.mutateAsync,
        addReceita: addReceitaMutation.mutateAsync,
        updateReceita: updateReceitaMutation.mutateAsync,
        deleteReceita: deleteReceitaMutation.mutateAsync,
        updatePerfil: updatePerfilMutation.mutateAsync,
    };
}
