import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Check, Users, Calendar, ArrowRight, AlertTriangle } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function NutriPortal() {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const userId = session?.user?.id;
    const [renderError, setRenderError] = useState<string | null>(null);

    // Check Role
    const { data: profile, isLoading: loadingProfile, error: profileError } = useQuery({
        queryKey: ['perfil', userId],
        queryFn: async () => {
            console.log("NutriPortal: Fetching profile for", userId);
            try {
                // Using maybeSingle instead of single to avoid error if no row exists (though likely exists now)
                const { data, error } = await supabase.from('usuarios_perfil').select('*').eq('id', userId).maybeSingle();
                if (error) {
                    console.error("NutriPortal: Profile Error", error);
                    throw error;
                }
                console.log("NutriPortal: Profile Data", data);
                return data;
            } catch (e) {
                console.error("Profile exception", e);
                return null;
            }
        },
        enabled: !!userId
    });

    // Fetch Clients
    const { data: clients, isLoading: loadingClients, error: clientsError } = useQuery({
        queryKey: ['nutri_clientes', userId],
        queryFn: async () => {
             console.log("NutriPortal: Fetching clients");
             try {
                const { data, error } = await supabase
                    .from('nutri_clientes')
                    .select('cliente_id, created_at')
                    .eq('nutri_id', userId);
                
                if (error) {
                    console.error("NutriPortal: Clients Error (table exists?)", error);
                    // Return empty so it doesn't crash
                    return [];
                }
                
                if (!data || data.length === 0) return [];
                
                const clientIds = data.map(d => d.cliente_id);
                console.log("NutriPortal: Client IDs", clientIds);
                
                const { data: clientProfiles, error: profilesError } = await supabase
                    .from('usuarios_perfil')
                    .select('*')
                    .in('id', clientIds);

                if (profilesError) throw profilesError;
                
                return clientProfiles || [];
             } catch (e) {
                 console.error("Clients Fetch Exception", e);
                 return [];
             }
        },
        enabled: !!userId && profile?.role === 'nutri'
    });

    const createTemplateMutation = useMutation({
        mutationFn: async () => {
             // Create a template
             const { data: template, error: tError } = await supabase.from('dietas_templates').insert({
                nutri_id: userId,
                nome: "Plano Hipertrofia - Semana 1",
                descricao: "Foco em proteínas e carboidratos complexos."
             }).select().single();
             
             if (tError) throw tError;

             // Find food
             const { data: foods } = await supabase.from('alimentos').select('id, nome').ilike('nome', '%Ovo%').limit(1);
             let foodId = foods?.[0]?.id;
             if (!foodId) {
                 const { data: anyFood } = await supabase.from('alimentos').select('id').limit(1);
                 foodId = anyFood?.[0]?.id;
             }
             if (!foodId) throw new Error("Sem alimentos no banco para criar plano.");

             // Add items to template
             // Add for 'segunda', 'cafe'
             const days = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
             const items = [];
             
             days.forEach(day => {
                items.push({
                    template_id: template.id,
                    dia_semana: day,
                    refeicao: 'cafe',
                    alimento_id: foodId,
                    quantidade_g: 100
                });
             });

             const { error: iError } = await supabase.from('dietas_template_itens').insert(items);
             if (iError) throw iError;
        },
        onSuccess: () => {
             alert("Template 'Plano Hipertrofia' criado!");
        },
        onError: (err) => {
             alert("Erro ao criar template: " + (err as Error).message);
        }
    });

    if (loadingProfile) return <div className="p-8 text-center text-emerald-600 font-bold">Carregando perfil...</div>;

    if (profileError) return <div className="p-8 text-red-500">Erro ao carregar perfil. Verifique console.</div>;

    // Se perfil existe mas role não é nutri
    if (profile && profile.role !== 'nutri') {
         return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center p-8 text-gray-500">
                <Users size={48} className="mb-4 text-gray-300" />
                <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
                <p>Esta área é exclusiva para nutricionistas.</p>
                <div className="mt-6 p-4 bg-yellow-50 rounded-lg text-sm text-yellow-800 max-w-md text-left overflow-auto">
                    <p className="font-bold mb-2">Seu perfil atual é: <span className="uppercase">{profile.role || 'nulo'}</span></p>
                    <p className="mb-2">Para forçar a mudança, rode no Supabase:</p>
                    <pre className="text-xs font-mono bg-yellow-100 p-2 rounded whitespace-pre-wrap select-all">
{`UPDATE public.usuarios_perfil SET role = 'nutri' WHERE id = '${userId}';`}
                    </pre>
                </div>
            </div>
        );
    }

    // Se não tem perfil nenhum (null) e não está carregando
    if (!profile && !loadingProfile) {
        return <div className="p-8 text-center text-red-500">Perfil não encontrado. Tente sair e entrar novamente.</div>
    }

    try {
        return (
            <div className="bg-white min-h-screen pb-24">
                <div className="bg-emerald-600 p-6 rounded-b-[32px] mb-6 text-white shadow-lg">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                         <div className="bg-emerald-500 p-2 rounded-xl"><Users size={24} /></div>
                         Portal Nutri
                    </h1>
                    <p className="opacity-80 mt-1">Gerencie seus pacientes</p>
                </div>

                <div className="px-6 flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-800">Meus Pacientes</h2>
                    <button 
                        onClick={() => createTemplateMutation.mutate()}
                        disabled={createTemplateMutation.isPending}
                        className="text-xs bg-emerald-600 text-white px-3 py-2 rounded-lg font-bold hover:bg-emerald-700 transition"
                    >
                        {createTemplateMutation.isPending ? 'Criando...' : '+ Template Exemplo'}
                    </button>
                </div>
                
                <div className="px-6">
                    {(isLoadingClients || createTemplateMutation.isPending) && <p className="text-gray-500 italic mb-2">Carregando dados...</p>}
                    
                    {clientsError && (
                         <div className="bg-red-50 p-4 rounded-xl text-red-600 text-sm mb-4 flex items-center gap-2">
                             <AlertTriangle size={16} />
                             Erro ao buscar clientes. Tabela 'nutri_clientes' existe?
                         </div>
                    )}

                    <div className="space-y-3">
                        {clients && Array.isArray(clients) && clients.map((client: any) => (
                            <div key={client?.id || Math.random()} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center shadow-sm">
                                <div>
                                    <p className="font-bold text-gray-800">Paciente #{client?.id ? client.id.slice(0,4) : '???'}</p>
                                    <p className="text-xs text-gray-500 truncate w-32">ID: {client?.id}</p>
                                </div>
                                <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md">Ativo</span>
                            </div>
                        ))}
                        
                        {!isLoadingClients && clients && clients.length === 0 && (
                            <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                <Users className="mx-auto text-gray-300 mb-2" size={32} />
                                <p className="text-gray-500 font-medium">Nenhum paciente vinculado.</p>
                                <p className="text-xs text-gray-400 mt-2 max-w-[200px] mx-auto">
                                    Adicione um vínculo na tabela <code>nutri_clientes</code> para testar.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    } catch (renderErr) {
        console.error("Render Crash", renderErr);
        return <div className="p-8 text-red-500">Erro de renderização: {renderErr instanceof Error ? renderErr.message : 'Erro desconhecido'}</div>
    }
}