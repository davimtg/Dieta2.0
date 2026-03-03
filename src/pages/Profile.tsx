import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDietData } from '../hooks/useDietData';
import { useBluetoothScale } from '../hooks/useBluetoothScale';
import { LogOut, User as UserIcon, Activity, Flame, Droplets, Bluetooth } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const macroSchema = z.object({
    idade: z.number().min(10, "Idade inválida").max(120),
    peso: z.number().min(30, "Peso inválido"),
    altura: z.number().min(100, "Altura inválida (cm)"),
    sexo: z.enum(['M', 'F']),
    fator_atividade: z.enum(['1.2', '1.375', '1.55', '1.725', '1.9']),
    objetivo: z.enum(['perder', 'manter', 'ganhar'])
});

type MacroFormInputs = z.infer<typeof macroSchema>;

export default function Profile() {
    const { session, supabase } = useAuth();
    const { perfil, updatePerfil } = useDietData();
    const { connectToScale, isConnected, isConnecting } = useBluetoothScale();
    const [showCalc, setShowCalc] = useState(false);

    const { register, handleSubmit, formState: { errors }, watch } = useForm<MacroFormInputs>({
        resolver: zodResolver(macroSchema),
        defaultValues: {
            idade: 25,
            peso: perfil?.peso_atual || 70,
            altura: 170,
            sexo: 'M',
            fator_atividade: '1.2',
            objetivo: perfil?.objetivo || 'manter'
        }
    });

    const watchAllFields = watch();

    // Dynamic Preview Calculation
    let tmbPreview = 0;
    if (watchAllFields.sexo === 'M') {
        tmbPreview = 88.362 + (13.397 * (watchAllFields.peso || 0)) + (4.799 * (watchAllFields.altura || 0)) - (5.677 * (watchAllFields.idade || 0));
    } else {
        tmbPreview = 447.593 + (9.247 * (watchAllFields.peso || 0)) + (3.098 * (watchAllFields.altura || 0)) - (4.330 * (watchAllFields.idade || 0));
    }
    const tdeePreview = tmbPreview * Number(watchAllFields.fator_atividade || 1.2);

    let metaKcalPreview = Math.round(tdeePreview || 2000);
    if (watchAllFields.objetivo === 'perder') metaKcalPreview -= 500;
    if (watchAllFields.objetivo === 'ganhar') metaKcalPreview += 500;

    const metaAguaPreview = Math.round((watchAllFields.peso || 0) * 35);
    const metaCarbsPreview = Math.round((metaKcalPreview * 0.45) / 4);
    const metaProtPreview = Math.round((metaKcalPreview * 0.3) / 4);
    const metaFatPreview = Math.round((metaKcalPreview * 0.25) / 9);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const onSubmit = async (data: MacroFormInputs) => {
        try {
            await updatePerfil({
                meta_kcal: metaKcalPreview,
                meta_agua_ml: metaAguaPreview,
                peso_atual: data.peso,
                objetivo: data.objetivo
            });
            alert('Metas atualizadas com sucesso!');
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

            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 mb-6 flex items-center gap-4">
                <div className="bg-emerald-100 p-4 rounded-full text-emerald-600">
                    <UserIcon size={32} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-800 break-all">{session?.user?.email}</h2>
                    <p className="text-emerald-500 font-semibold text-sm">Plano Gratuito</p>
                </div>
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

            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
                <button
                    onClick={() => setShowCalc(!showCalc)}
                    className="w-full p-6 text-left flex justify-between items-center bg-white hover:bg-emerald-50 transition"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600"><Activity size={20} /></div>
                        <span className="font-bold text-gray-800">Calculadora de Macros (TDEE)</span>
                    </div>
                    <span className="text-emerald-500 font-bold">{showCalc ? '-' : '+'}</span>
                </button>

                {showCalc && (
                    <form onSubmit={handleSubmit(onSubmit)} className="p-6 border-t border-gray-100 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Idade</label>
                                <input type="number" {...register('idade', { valueAsNumber: true })} className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 focus:outline-emerald-500" />
                                {errors.idade && <span className="text-red-500 text-[10px]">{errors.idade.message}</span>}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Sexo</label>
                                <select {...register('sexo')} className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 focus:outline-emerald-500">
                                    <option value="M">Masculino</option>
                                    <option value="F">Feminino</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Peso (kg)</label>
                                <input type="number" step="0.1" {...register('peso', { valueAsNumber: true })} className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 focus:outline-emerald-500" />
                                {errors.peso && <span className="text-red-500 text-[10px]">{errors.peso.message}</span>}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Altura (cm)</label>
                                <input type="number" {...register('altura', { valueAsNumber: true })} className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 focus:outline-emerald-500" />
                                {errors.altura && <span className="text-red-500 text-[10px]">{errors.altura.message}</span>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Nível de Atividade Física</label>
                            <select {...register('fator_atividade')} className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 focus:outline-emerald-500 text-sm">
                                <option value="1.2">Sedentário (pouco ou nenhum exercício)</option>
                                <option value="1.375">Levemente Ativo (exercício leve 1-3 dias/sem)</option>
                                <option value="1.55">Moderadamente Ativo (esporte moderado 3-5 dias/sem)</option>
                                <option value="1.725">Muito Ativo (esporte pesado 6-7 dias/sem)</option>
                                <option value="1.9">Extremamente Ativo (esporte pesado + trabalho físico)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Seu Objetivo Principal</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['perder', 'manter', 'ganhar'].map((obj) => (
                                    <label key={obj} className={`text-center py-2 px-1 rounded-xl border cursor-pointer text-xs font-bold transition-all ${watchAllFields.objetivo === obj ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'}`}>
                                        <input type="radio" value={obj} {...register('objetivo')} className="hidden" />
                                        {obj.charAt(0).toUpperCase() + obj.slice(1)}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex flex-col gap-3 mt-4">
                            <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2 border-b border-emerald-100 pb-2">Preview dos Resultados</h4>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-emerald-700">Meta Diária (Kcal)</span>
                                <span className="text-xl font-black text-emerald-600">{metaKcalPreview} kcal</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-100/50">
                                <div className="text-center bg-white/60 p-2 rounded-xl">
                                    <span className="block text-[10px] uppercase font-bold text-blue-500 mb-1">Carb</span>
                                    <span className="font-black text-gray-800 text-sm">{metaCarbsPreview}g</span>
                                </div>
                                <div className="text-center bg-white/60 p-2 rounded-xl">
                                    <span className="block text-[10px] uppercase font-bold text-emerald-500 mb-1">Prot</span>
                                    <span className="font-black text-gray-800 text-sm">{metaProtPreview}g</span>
                                </div>
                                <div className="text-center bg-white/60 p-2 rounded-xl">
                                    <span className="block text-[10px] uppercase font-bold text-amber-500 mb-1">Gord</span>
                                    <span className="font-black text-gray-800 text-sm">{metaFatPreview}g</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-emerald-100/50">
                                <span className="text-sm font-semibold text-emerald-700">Hidratação Mínima</span>
                                <span className="text-lg font-black text-blue-500">{metaAguaPreview} ml</span>
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-emerald-500 text-white font-bold py-3 mt-4 rounded-xl hover:bg-emerald-600 transition">
                            Confirmar Novas Metas
                        </button>
                    </form>
                )}
            </div>

            {/* Bluetooth Beta Feature */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex items-center justify-between mt-6 mb-6">
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
