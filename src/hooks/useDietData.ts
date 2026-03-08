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
          receita_ingredientes:receita_ingredientes!receita_id (
            id,
            alimento_id,
            ingrediente_receita_id,
            quantidade_g,
            alimentos (*),
            receitas:receitas!ingrediente_receita_id (*, receita_ingredientes:receita_ingredientes!receita_id (*, alimentos (*)))
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
                .select('*, itens_consumidos(*, alimentos(*), receitas(*, receita_ingredientes:receita_ingredientes!receita_id(*, alimentos(*), receitas:receitas!ingrediente_receita_id(*, receita_ingredientes:receita_ingredientes!receita_id(*, alimentos(*))))))')
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
                            tipo_refeicao: tipo,
                            nome_refeicao: null
                        }))
                    )
                    .select('*, itens_consumidos(*, alimentos(*), receitas(*, receita_ingredientes:receita_ingredientes!receita_id(*, alimentos(*), receitas:receitas!ingrediente_receita_id(*, receita_ingredientes:receita_ingredientes!receita_id(*, alimentos(*))))))');

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

    const { data: planosCliente = [], isLoading: loadingPlanosCliente } = useQuery({
        queryKey: ['planos_cliente', userId],
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
                        nome_refeicao,
                        quantidade_g,
                        alimento_id,
                        receita_id,
                        substituicoes,
                        alimentos (*),
                        receitas (*, receita_ingredientes:receita_ingredientes!receita_id (*, alimentos (*), receitas:receitas!ingrediente_receita_id (*, receita_ingredientes:receita_ingredientes!receita_id (*, alimentos (*))))))
                    ),
                    nutricionista:usuarios_perfil!fk_plano_nutri (*)
                `)
                .eq('cliente_id', userId)
                .eq('ativo', true)
                .eq('status', 'enviado');
            if (error) throw error;
            return data;
        },
        enabled: !!userId
    });

    const { data: metasSugeridasPendentes = [], isLoading: loadingMetasSugeridas } = useQuery({
        queryKey: ['metas_sugeridas_pendentes', userId],
        queryFn: async () => {
            if (!userId) return [];
            const { data, error } = await supabase
                .from('metas_sugeridas')
                .select('*')
                .eq('paciente_id', userId)
                .eq('status', 'pendente')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!userId
    });

    // Mutations
    const addItemMutation = useMutation({
        mutationFn: async ({ refeicaoId, alimentoId, receitaId, quantidade, isSugestao = false }: any) => {
            const { data, error } = await supabase
                .from('itens_consumidos')
                .insert({
                    refeicao_id: refeicaoId,
                    ...(alimentoId ? { alimento_id: alimentoId } : {}),
                    ...(receitaId ? { receita_id: receitaId } : {}),
                    quantidade_g: quantidade,
                    is_sugestao: isSugestao
                })
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['refeicoes', userId, formattedDate] });
        }
    });

    const applyPlanoMutation = useMutation({
        mutationFn: async ({ plano, start_date }: { plano: any, start_date: Date }) => {
            const inserts = [];
            // Adicionar itens do plano na semana do start_date
            for (let i = 0; i < 7; i++) {
                const currentDate = new Date(start_date);
                currentDate.setDate(currentDate.getDate() + i);
                const dia_semana = currentDate.getDay(); // 0 a 6 (Domingo a Sábado)
                const dateStr = format(currentDate, 'yyyy-MM-dd');

                const itensDoDia = plano.plano_alimentar_itens.filter((item: any) => item.dia_semana === dia_semana);

                if (itensDoDia.length > 0) {
                    let { data: refeicoesDia } = await supabase
                        .from('refeicoes_diarias')
                        .select('id, tipo_refeicao, nome_refeicao')
                        .eq('user_id', userId)
                        .eq('data', dateStr);

                    if (!refeicoesDia || refeicoesDia.length === 0) {
                        const defaultMeals = ['cafe', 'almoco', 'lanche', 'jantar'];
                        const { data: newMeals, error: insertErr } = await supabase
                            .from('refeicoes_diarias')
                            .insert(defaultMeals.map(tipo => ({ user_id: userId, data: dateStr, tipo_refeicao: tipo })))
                            .select('id, tipo_refeicao, nome_refeicao');
                        if (insertErr) throw insertErr;
                        refeicoesDia = newMeals || [];
                    }

                    // Identificar todas as refeições únicas do plano para esse dia
                    const refeicoesPlanoMap = new Map();
                    for (const item of itensDoDia) {
                        if (!refeicoesPlanoMap.has(item.tipo_refeicao)) {
                            refeicoesPlanoMap.set(item.tipo_refeicao, item.nome_refeicao);
                        }
                    }

                    // Garantir que todas as refeições do plano existam no banco para esse dia
                    for (const [tipo_refeicao, nome_refeicao] of refeicoesPlanoMap.entries()) {
                        let ref = refeicoesDia.find((r: any) => r.tipo_refeicao === tipo_refeicao);
                        if (!ref) {
                            const { data: newMeal, error: insertErr } = await supabase
                                .from('refeicoes_diarias')
                                .insert({
                                    user_id: userId,
                                    data: dateStr,
                                    tipo_refeicao: tipo_refeicao,
                                    nome_refeicao: (nome_refeicao === tipo_refeicao) ? null : nome_refeicao
                                })
                                .select('id, tipo_refeicao, nome_refeicao')
                                .single();
                            if (insertErr) throw insertErr;
                            refeicoesDia.push(newMeal);
                        } else if (nome_refeicao && nome_refeicao !== tipo_refeicao && ref.nome_refeicao !== nome_refeicao) {
                            // Update nome_refeicao se for diferente e não for apenas o slug
                            await supabase
                                .from('refeicoes_diarias')
                                .update({ nome_refeicao })
                                .eq('id', ref.id);
                            ref.nome_refeicao = nome_refeicao;
                        }
                    }

                    // Preparar inserts para esse dia e essas refeiçoes
                    for (const planoItem of itensDoDia) {
                        const ref = refeicoesDia.find((r: any) => r.tipo_refeicao === planoItem.tipo_refeicao);
                        if (ref) {
                            inserts.push({
                                refeicao_id: ref.id,
                                ...(planoItem.alimento_id ? { alimento_id: planoItem.alimento_id } : {}),
                                ...(planoItem.receita_id ? { receita_id: planoItem.receita_id } : {}),
                                quantidade_g: planoItem.quantidade_g,
                                is_sugestao: true,
                                substituicoes: planoItem.substituicoes ?? []
                            });
                        }
                    }
                }
            }

            if (inserts.length > 0) {
                const { error } = await supabase.from('itens_consumidos').insert(inserts);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['refeicoes', userId] });
        }
    });

    const swapSugestaoMutation = useMutation({
        mutationFn: async ({ itemId, alimentoId, receitaId, quantidade }: { itemId: string, alimentoId?: string, receitaId?: string, quantidade: number }) => {
            const { data, error } = await supabase
                .from('itens_consumidos')
                .update({
                    alimento_id: alimentoId ?? null,
                    receita_id: receitaId ?? null,
                    quantidade_g: quantidade
                })
                .eq('id', itemId)
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

    const updateItemSugestaoMutation = useMutation({
        mutationFn: async ({ itemId, isSugestao }: { itemId: string, isSugestao: boolean }) => {
            const { data, error } = await supabase
                .from('itens_consumidos')
                .update({ is_sugestao: isSugestao })
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
        mutationFn: async (novaReceita: { nome: string; tipo_rendimento: string; rendimento_quantidade: number; rendimento_unidade: string; preparo: string; tempo_preparo_min?: number | null; imagem_url?: string; ingredientes: { alimento_id?: string; ingrediente_receita_id?: string; quantidade_g: number }[] }) => {
            // First insert recipe
            const { data: recipeData, error: recipeError } = await supabase
                .from('receitas')
                .insert({
                    nome: novaReceita.nome,
                    tipo_rendimento: novaReceita.tipo_rendimento,
                    rendimento_quantidade: novaReceita.rendimento_quantidade,
                    rendimento_unidade: novaReceita.rendimento_unidade,
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

    const aceitarMetaSugeridaMutation = useMutation({
        mutationFn: async (sugestaoId: string) => {
            const sugestao = metasSugeridasPendentes.find((meta: any) => meta.id === sugestaoId);
            if (!sugestao) throw new Error('Sugestão não encontrada.');

            const { error: perfilError } = await supabase
                .from('usuarios_perfil')
                .update({
                    meta_kcal: sugestao.meta_kcal,
                    meta_carbo_g: sugestao.carbo_g,
                    meta_prot_g: sugestao.prot_g,
                    meta_gord_g: sugestao.gord_g
                })
                .eq('id', userId);
            if (perfilError) throw perfilError;

            const { error: sugestaoError } = await supabase
                .from('metas_sugeridas')
                .update({ status: 'aceita' })
                .eq('id', sugestaoId)
                .eq('paciente_id', userId);
            if (sugestaoError) throw sugestaoError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['perfil', userId] });
            queryClient.invalidateQueries({ queryKey: ['metas_sugeridas_pendentes', userId] });
        }
    });

    const recusarMetaSugeridaMutation = useMutation({
        mutationFn: async (sugestaoId: string) => {
            const { error } = await supabase
                .from('metas_sugeridas')
                .update({ status: 'recusada' })
                .eq('id', sugestaoId)
                .eq('paciente_id', userId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['metas_sugeridas_pendentes', userId] });
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

    const clearDiaryMutation = useMutation({
        mutationFn: async ({ scope, dateA, dateB }: { scope: 'selected' | 'specific' | 'range' | 'future' | 'all'; dateA?: string; dateB?: string }) => {
            // 1. Buscar os IDs das refeições_diarias do usuário no escopo
            let query = supabase
                .from('refeicoes_diarias')
                .select('id')
                .eq('user_id', userId!);

            if (scope === 'selected' || scope === 'specific') {
                query = query.eq('data', dateA!);
            } else if (scope === 'range') {
                query = query.gte('data', dateA!).lte('data', dateB!);
            } else if (scope === 'future') {
                // Amanhã em diante
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                query = query.gte('data', format(tomorrow, 'yyyy-MM-dd'));
            }
            // scope === 'all': sem filtro de data, apaga tudo do usuário

            const { data: refeicaoRows, error: fetchError } = await query;
            if (fetchError) throw fetchError;

            if (!refeicaoRows || refeicaoRows.length === 0) return;

            const refeicaoIds = refeicaoRows.map((r: any) => r.id);

            // 2. Deletar itens_consumidos ligados a essas refeições
            const { error: deleteError } = await supabase
                .from('itens_consumidos')
                .delete()
                .in('refeicao_id', refeicaoIds);

            if (deleteError) throw deleteError;
        },
        onSuccess: () => {
            // Invalida todas as queries de refeições do usuário
            queryClient.invalidateQueries({ queryKey: ['refeicoes', userId] });
        }
    });

    return {
        alimentos,
        receitas,
        refeicoes,
        perfil,
        planosCliente,
        isLoading: loadingAlimentos || loadingReceitas || loadingRefeicoes || loadingPerfil || loadingPlanosCliente || loadingMetasSugeridas,
        addItem: addItemMutation.mutateAsync,
        applyPlano: applyPlanoMutation.mutateAsync,
        swapSugestao: swapSugestaoMutation.mutateAsync,
        updateItem: updateItemMutation.mutateAsync,
        updateItemSugestao: updateItemSugestaoMutation.mutateAsync,
        deleteItem: deleteItemMutation.mutateAsync,
        addAlimento: addAlimentoMutation.mutateAsync,
        updateAlimento: updateAlimentoMutation.mutateAsync,
        deleteAlimento: deleteAlimentoMutation.mutateAsync,
        addReceita: addReceitaMutation.mutateAsync,
        updateReceita: updateReceitaMutation.mutateAsync,
        deleteReceita: deleteReceitaMutation.mutateAsync,
        updatePerfil: updatePerfilMutation.mutateAsync,
        clearDiary: clearDiaryMutation.mutateAsync,
        metasSugeridasPendentes,
        aceitarMetaSugerida: aceitarMetaSugeridaMutation.mutateAsync,
        recusarMetaSugerida: recusarMetaSugeridaMutation.mutateAsync,
        isRespondendoMetaSugerida: aceitarMetaSugeridaMutation.isPending || recusarMetaSugeridaMutation.isPending,
    };
}
