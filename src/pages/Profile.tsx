import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useDietData } from '../hooks/useDietData';
import { useBluetoothScale } from '../hooks/useBluetoothScale';
import { LogOut, User as UserIcon, Activity, Flame, Droplets, Bluetooth, Calendar, ArrowRight, Users } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { Link } from 'react-router-dom';

import NutritionalCalculatorForm, { type CalculatorInputs } from '../components/profile/NutritionalCalculatorForm';
import NutritionalCalculatorResults, { type CalculatorResultsProps } from '../components/profile/NutritionalCalculatorResults';

export default function Profile() {
    const { session, supabase } = useAuth();
    const { perfil, updatePerfil } = useDietData();
    const { connectToScale, isConnected, isConnecting } = useBluetoothScale();
    const [showCalc, setShowCalc] = useState(false);

    const { data: templates } = useQuery({
        queryKey: ['my_templates', session?.user?.id],
        queryFn: async () => {
            const { data: relations } = await supabase.from('nutri_clientes').select('nutri_id').eq('cliente_id', session?.user?.id).maybeSingle();
            if (!relations) return [];
            
            const { data } = await supabase.from('dietas_templates')
                .select('*, dietas_template_itens(*)')
                .eq('nutri_id', relations.nutri_id);
            return data || [];
        },
        enabled: !!session?.user?.id
    });

    const applyTemplateMutation = useMutation({
        mutationFn: async (templateItems: any[]) => {
            const today = new Date();
            const dayOfWeek = today.getDay(); 
            const daysUntilNextMonday = (8 - dayOfWeek) % 7 || 7;
            const nextMondayDate = addDays(today, daysUntilNextMonday);
            
            const dayMap: Record<string, number> = { 'segunda': 0, 'terca': 1, 'quarta': 2, 'quinta': 3, 'sexta': 4, 'sabado': 5, 'domingo': 6 };
            
            const toInsert = [];

            for (const item of templateItems) {
                const dayOffset = dayMap[item.dia_semana];
                if (dayOffset === undefined) continue;
                
                const targetDate = addDays(nextMondayDate, dayOffset);
                const dateStr = format(targetDate, 'yyyy-MM-dd');

                let mealId;
                const { data: meals } = await supabase
                    .from('refeicoes_diarias')
                    .select('id')
                    .eq('user_id', session?.user?.id)
                    .eq('data', dateStr)
                    .eq('tipo_refeicao', item.refeicao);

                if (meals && meals.length > 0) {
                    mealId = meals[0].id;
                } else {
                    const { data: newMeal } = await supabase
                        .from('refeicoes_diarias')
                        .insert({ user_id: session?.user?.id, data: dateStr, tipo_refeicao: item.refeicao })
                        .select('id')
                        .single();
                    mealId = newMeal?.id;
                }

                if (mealId) {
                    toInsert.push({
                        refeicao_id: mealId,
                        alimento_id: item.alimento_id,
                        receita_id: item.receita_id,
                        quantidade_g: item.quantidade_g,
                        is_sugestao: true
                    });
                }
            }

            if (toInsert.length > 0) {
                const { error } = await supabase.from('itens_consumidos').insert(toInsert);
                if (error) throw error;
            }
        },
        onSuccess: () => alert('Plano aplicado para a próxima semana! (Segunda a Domingo)')
    });


    // State to hold calculator results
    const [calcResults, setCalcResults] = useState<Omit<CalculatorResultsProps, 'onApply'> | null>(null);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const handleCalculate = (data: CalculatorInputs) => {
        let bmr = 0;

        if (data.formula === 'mifflin') {
            if (data.sexo === 'M') {
                bmr = (10 * data.peso) + (6.25 * data.altura) - (5 * data.idade) + 5;
            } else {
                bmr = (10 * data.peso) + (6.25 * data.altura) - (5 * data.idade) - 161;
            }
        } else if (data.formula === 'katch') {
            const bf = data.bf || 20; // fallback safe
            bmr = 370 + (21.6 * (1 - (bf / 100)) * data.peso);
        }

        const tdee = bmr * Number(data.fator_atividade);

        let metaKcal = Math.round(tdee);
        if (data.objetivo === 'perder') metaKcal -= 500;
        if (data.objetivo === 'ganhar') metaKcal += 500;

        // standard dynamic macro calculation
        const protein = Math.round(data.peso * 2.0); // 2g/kg
        const fat = Math.round(data.peso * 1.0); // 1g/kg
        const proteinKcal = protein * 4;
        const fatKcal = fat * 9;

        let carbsKcal = metaKcal - (proteinKcal + fatKcal);
        let carbs = Math.round(carbsKcal / 4);
        if (carbs < 0) carbs = 0; // Edge case safeguard

        setCalcResults({
            bmr: Math.round(bmr),
            tdee: Math.round(tdee),
            metaKcal,
            carbs,
            protein,
            fat,
            peso: data.peso,
            objetivo: data.objetivo
        });
    };

    const handleApply = async () => {
        if (!calcResults) return;

        const metaAgua = Math.round(calcResults.peso * 35);

        try {
            await updatePerfil({
                meta_kcal: calcResults.metaKcal,
                meta_agua_ml: metaAgua,
                peso_atual: calcResults.peso,
                objetivo: calcResults.objetivo
            });
            alert('Metas atualizadas com sucesso!');
            setCalcResults(null);
            setShowCalc(false);
        } catch (e) {
            console.error(e);
            alert('Erro ao atualizar metas.');
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen pb-32">
            <div className="flex justify-between items-center mb-8 mt-4">
                <h1 className="text-2xl font-bold text-gray-900">Perfil</h1>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition font-semibold"
                >
                    <LogOut size={18} /> Sair
                </button>
            </div>

            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 mb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-emerald-100 p-4 rounded-full text-emerald-600">
                        <UserIcon size={32} />
                    </div>
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-800 break-all">{session?.user?.email}</h2>
                    <div className="flex items-center gap-2">
                         <span className="text-emerald-500 font-semibold text-sm">Plano Gratuito</span>
                         {perfil?.role === 'nutri' && <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">NUTRI</span>}
                    </div>
                </div>
                {perfil?.role === 'nutri' && (
                  <Link to="/nutri" className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition" title="Acessar Portal Nutri"><Users size={24}/></Link>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-100 text-center">
                    <div className="flex justify-center mb-2 text-amber-500"><Flame size={24} /></div>
                    <p className="text-2xl font-bold text-gray-800">{perfil?.meta_kcal || 2000}</p>
                    <p className="text-xs font-semibold text-gray-500">Meta Kcal</p>
                </div>
                <div className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-100 text-center">
                    <div className="flex justify-center mb-2 text-blue-500"><Droplets size={24} /></div>
                    <p className="text-2xl font-bold text-gray-800">{perfil?.meta_agua_ml || 2500}</p>
                    <p className="text-xs font-semibold text-gray-500">Água (ml)</p>
                </div>
            </div>

            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden mb-6">
                <button
                    onClick={() => {
                        setShowCalc(!showCalc);
                        if (showCalc) setCalcResults(null);
                    }}
                    className="w-full p-6 text-left flex justify-between items-center bg-white hover:bg-emerald-50 transition"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600"><Activity size={20} /></div>
                        <span className="font-bold text-gray-800">Calculadora de Macros (TDEE)</span>
                    </div>
                    <span className="text-emerald-500 font-bold">{showCalc ? '-' : '+'}</span>
                </button>

                {showCalc && (
                    <div className="p-6 border-t border-gray-100">
                        <NutritionalCalculatorForm
                            defaultValues={{
                                peso: perfil?.peso_atual || 70,
                                objetivo: (perfil?.objetivo as any) || 'manter'
                            }}
                            onCalculate={handleCalculate}
                        />

                        {calcResults && (
                            <NutritionalCalculatorResults
                                {...calcResults}
                                onApply={handleApply}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Meal Plans Section */}
            <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100 mb-6">
                 <div className="p-6 bg-emerald-50 border-b border-emerald-100 flex items-center gap-3">
                    <div className="bg-emerald-200 text-emerald-700 p-2 rounded-xl"><Calendar size={20} /></div>
                    <span className="font-bold text-gray-800">Meus Planos Alimentares</span>
                </div>
                
                <div className="p-6">
                    {(!templates || templates.length === 0) ? (
                        <p className="text-gray-400 text-center text-sm py-4">Nenhum plano disponível.</p>
                    ) : (
                        <div className="space-y-4">
                            {templates?.map((t: any) => (
                                <div key={t.id} className="border border-gray-100 rounded-2xl p-4 hover:shadow-md transition">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-gray-800">{t.nome}</h4>
                                        <span className="text-[10px] bg-gray-100 px-2 py-1 rounded-full text-gray-500">
                                            {t.dietas_template_itens?.length || 0} itens
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-4">{t.descricao || 'Sem descrição'}</p>
                                    <button 
                                        onClick={() => applyTemplateMutation.mutate(t.dietas_template_itens)}
                                        disabled={applyTemplateMutation.isPending}
                                        className="w-full bg-emerald-500 text-white rounded-xl py-2 font-bold text-sm hover:bg-emerald-600 transition flex items-center justify-center gap-2"
                                    >
                                        {applyTemplateMutation.isPending ? 'Aplicando...' : 'Aplicar à Próxima Semana'} <ArrowRight size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Bluetooth Beta Feature */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                        <Bluetooth size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800">Balança Smart</h3>
                        <p className="text-xs text-gray-500">Sincronização via Web Bluetooth</p>
                    </div>
                </div>
                <button
                    onClick={connectToScale}
                    disabled={isConnecting || isConnected}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-xs transition disabled:opacity-50"
                >
                    {isConnecting ? 'Buscando...' : isConnected ? 'Conectado' : 'Conectar (Beta)'}
                </button>
            </div>
        </div>
    );
}
