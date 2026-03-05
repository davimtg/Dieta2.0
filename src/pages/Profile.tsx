import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDietData } from '../hooks/useDietData';
import { useBluetoothScale } from '../hooks/useBluetoothScale';
import { LogOut, User as UserIcon, Activity, Flame, Droplets, Bluetooth, Briefcase, ClipboardList, ChevronRight, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

import NutritionalCalculatorForm, { type CalculatorInputs } from '../components/profile/NutritionalCalculatorForm';
import NutritionalCalculatorResults, { type CalculatorResultsProps } from '../components/profile/NutritionalCalculatorResults';
import PlanoPreviewModal from '../components/profile/PlanoPreviewModal';
import { calculateNutritionTargets } from '../lib/nutritionCalculator';

export default function Profile() {
    const { session, supabase } = useAuth();
    const {
        perfil,
        updatePerfil,
        planosCliente,
        applyPlano,
        metasSugeridasPendentes,
        isRespondendoMetaSugerida,
        aceitarMetaSugerida,
        recusarMetaSugerida
    } = useDietData();
    const { connectToScale, isConnected, isConnecting } = useBluetoothScale();
    const [showCalc, setShowCalc] = useState(false);
    const [showPlanos, setShowPlanos] = useState(false);
    const navigate = useNavigate();

    // State to hold calculator results
    const [calcResults, setCalcResults] = useState<Omit<CalculatorResultsProps, 'onApply'> | null>(null);

    // Apply Diet Plan Modal state
    const [applyPlanoData, setApplyPlanoData] = useState<any>(null);
    const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [isApplying, setIsApplying] = useState(false);
    const [previewPlanoData, setPreviewPlanoData] = useState<any>(null);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const handleCalculate = (data: CalculatorInputs) => {
        setCalcResults(calculateNutritionTargets(data));
    };

    const handleApply = async () => {
        if (!calcResults) return;

        const metaAgua = Math.round(calcResults.peso * 35);

        try {
            await updatePerfil({
                meta_kcal: calcResults.metaKcal,
                meta_agua_ml: metaAgua,
                meta_carbo_g: calcResults.carbs,
                meta_prot_g: calcResults.protein,
                meta_gord_g: calcResults.fat,
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
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 break-all">{perfil?.username || session?.user?.email}</h2>
                        <p className="text-emerald-500 font-semibold text-sm capitalize">{perfil?.role === 'nutri' ? 'Nutricionista' : 'Plano Gratuito'}</p>
                    </div>
                </div>
            </div>

            {perfil?.role === 'nutri' && (
                <button
                    onClick={() => navigate('/nutri')}
                    className="w-full bg-emerald-600 text-white rounded-[32px] p-6 shadow-md mb-6 flex items-center justify-between"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 flex rounded-2xl text-white"><Briefcase size={28} /></div>
                        <div className="text-left">
                            <h3 className="font-bold text-lg">Acessar Portal Nutri</h3>
                            <p className="text-emerald-100 text-xs mt-0.5">Gerencie seus pacientes e dietas</p>
                        </div>
                    </div>
                    <ChevronRight size={24} className="text-emerald-200" />
                </button>
            )}

            {perfil?.role !== 'nutri' && metasSugeridasPendentes.length > 0 && (() => {
                const sugestao = metasSugeridasPendentes[0];
                return (
                    <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-[24px] p-4 mb-6">
                        <p className="text-sm font-bold text-gray-800 mb-1">📣 Seu nutricionista sugeriu novas metas</p>
                        <p className="text-xs text-gray-600 mb-4">
                            {sugestao.meta_kcal} kcal (Carbo: {sugestao.carbo_g}g, Prot: {sugestao.prot_g}g, Gord: {sugestao.gord_g}g)
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => aceitarMetaSugerida(sugestao.id)}
                                disabled={isRespondendoMetaSugerida}
                                className="flex-1 bg-emerald-500 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-emerald-600 disabled:opacity-50"
                            >
                                Aceitar
                            </button>
                            <button
                                onClick={() => recusarMetaSugerida(sugestao.id)}
                                disabled={isRespondendoMetaSugerida}
                                className="flex-1 bg-white border border-gray-200 text-gray-700 text-sm font-bold py-2.5 rounded-xl hover:bg-gray-50 disabled:opacity-50"
                            >
                                Recusar
                            </button>
                        </div>
                    </div>
                );
            })()}

            {planosCliente && planosCliente.length > 0 && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[32px] shadow-sm border border-emerald-100 overflow-hidden mb-6">
                    <button
                        onClick={() => setShowPlanos(!showPlanos)}
                        className="w-full p-6 text-left flex justify-between items-center hover:bg-emerald-100/30 transition"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-200/50 p-2 rounded-xl text-emerald-700"><ClipboardList size={20} /></div>
                            <span className="font-bold text-gray-800">Meu Plano Alimentar</span>
                        </div>
                        <ChevronRight size={20} className={`text-emerald-600 transition-transform ${showPlanos ? 'rotate-90' : ''}`} />
                    </button>

                    {showPlanos && (
                        <div className="p-6 border-t border-emerald-100/50 space-y-4">
                            {planosCliente.map((plano: any) => (
                                <div key={plano.id} className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100/60">
                                    <h3 className="font-bold text-gray-800 text-lg mb-1">{plano.nome}</h3>
                                    <p className="text-xs text-gray-500 font-medium mb-4">Prescrito por {plano.nutricionista?.raw_user_meta_data?.username || 'Seu Nutricionista'}</p>

                                    <div className="flex flex-col gap-2 mt-4">
                                        <button
                                            onClick={() => {
                                                setStartDate(format(new Date(), 'yyyy-MM-dd'));
                                                setApplyPlanoData(plano);
                                            }}
                                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition"
                                        >
                                            <Calendar size={18} /> Aplicar à Minha Rotina
                                        </button>
                                        <button
                                            onClick={() => setPreviewPlanoData(plano)}
                                            className="w-full border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition text-sm flex justify-center items-center gap-2"
                                        >
                                            👁️ Ver Detalhes do Plano
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

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

            {/* Apply Diet Modal Overlay */}
            {applyPlanoData && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm slide-in-bottom-auto">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
                        <h3 className="font-bold text-xl text-emerald-800 mb-2">Aplicar {applyPlanoData.nome}</h3>
                        <p className="text-gray-600 text-sm mb-6">Selecione o dia para começar a dieta. As sugestões preencherão o seu Diário pelos próximos 7 dias mantendo os dias da semana corretos.</p>

                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Data de Início</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 font-medium"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setApplyPlanoData(null)}
                                disabled={isApplying}
                                className="flex-1 py-3.5 bg-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    setIsApplying(true);
                                    try {
                                        // Converter YYYY-MM-DD para Date local evitando fuso
                                        const [ano, mes, dia] = startDate.split('-').map(Number);
                                        const start = new Date(ano, mes - 1, dia);

                                        await applyPlano({ plano: applyPlanoData, start_date: start });
                                        alert('Dieta aplicada com Sucesso!');
                                        navigate('/dashboard');
                                    } catch (e) {
                                        console.error(e);
                                        alert('Erro ao aplicar o plano.');
                                    } finally {
                                        setIsApplying(false);
                                        setApplyPlanoData(null);
                                    }
                                }}
                                disabled={isApplying || !startDate}
                                className="flex-1 py-3.5 bg-emerald-500 rounded-xl font-bold text-white hover:bg-emerald-600 disabled:opacity-50 transition"
                            >
                                {isApplying ? 'Aplicando...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Plan Preview Modal */}
            {previewPlanoData && (
                <PlanoPreviewModal
                    isOpen={!!previewPlanoData}
                    onClose={() => setPreviewPlanoData(null)}
                    plano={previewPlanoData}
                    nomeCliente={perfil?.username || session?.user?.email}
                />
            )}

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
