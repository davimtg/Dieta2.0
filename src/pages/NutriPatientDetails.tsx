import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, UserRound, Target, Weight, Droplets, Ruler, Calendar, VenusAndMars } from 'lucide-react';
import { useDietData } from '../hooks/useDietData';
import { useNutriData } from '../hooks/useNutriData';

export default function NutriPatientDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { perfil, isLoading: loadingPerfil } = useDietData(new Date());
    const { clientes, isLoading, updateClientePerfil, isUpdatingClientePerfil } = useNutriData();

    const vinculo = useMemo(() => {
        if (!id) return null;
        return clientes.find((cliente: any) => cliente.cliente_id === id) || null;
    }, [clientes, id]);

    const clientePerfil = (vinculo?.usuarios_perfil as any) || {};
    const nomeCliente = clientePerfil?.username || clientePerfil?.raw_user_meta_data?.username || 'Paciente';

    const alturaKey = Object.prototype.hasOwnProperty.call(clientePerfil, 'altura')
        ? 'altura'
        : (Object.prototype.hasOwnProperty.call(clientePerfil, 'altura_cm') ? 'altura_cm' : null);

    const idadeKey = Object.prototype.hasOwnProperty.call(clientePerfil, 'idade') ? 'idade' : null;
    const sexoKey = Object.prototype.hasOwnProperty.call(clientePerfil, 'sexo')
        ? 'sexo'
        : (Object.prototype.hasOwnProperty.call(clientePerfil, 'genero') ? 'genero' : null);

    const [pesoAtual, setPesoAtual] = useState<string>('');
    const [metaKcal, setMetaKcal] = useState<string>('');
    const [metaAguaMl, setMetaAguaMl] = useState<string>('');
    const [objetivo, setObjetivo] = useState<string>('manter');
    const [altura, setAltura] = useState<string>('');
    const [idade, setIdade] = useState<string>('');
    const [sexo, setSexo] = useState<string>('');

    useEffect(() => {
        if (!vinculo) return;

        setPesoAtual(String(clientePerfil?.peso_atual ?? ''));
        setMetaKcal(String(clientePerfil?.meta_kcal ?? ''));
        setMetaAguaMl(String(clientePerfil?.meta_agua_ml ?? ''));
        setObjetivo(String(clientePerfil?.objetivo ?? 'manter'));
        setAltura(String(alturaKey ? (clientePerfil?.[alturaKey] ?? '') : ''));
        setIdade(String(idadeKey ? (clientePerfil?.[idadeKey] ?? '') : ''));
        setSexo(String(sexoKey ? (clientePerfil?.[sexoKey] ?? '') : ''));
    }, [vinculo, clientePerfil, alturaKey, idadeKey, sexoKey]);

    const handleSave = async () => {
        if (!vinculo?.cliente_id) return;

        const updates: any = {
            peso_atual: pesoAtual ? Number(pesoAtual) : null,
            meta_kcal: metaKcal ? Number(metaKcal) : null,
            meta_agua_ml: metaAguaMl ? Number(metaAguaMl) : null,
            objetivo: objetivo || null,
        };

        if (alturaKey) {
            updates[alturaKey] = altura ? Number(altura) : null;
        }

        if (idadeKey) {
            updates[idadeKey] = idade ? Number(idade) : null;
        }

        if (sexoKey) {
            updates[sexoKey] = sexo || null;
        }

        try {
            await updateClientePerfil({ clienteId: vinculo.cliente_id, updates });
            alert('Perfil do paciente atualizado com sucesso.');
        } catch (error: any) {
            console.error(error);
            alert(`Não foi possível atualizar o paciente: ${error?.message || 'erro desconhecido'}`);
        }
    };

    if (loadingPerfil || isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-emerald-500 font-semibold animate-pulse">Carregando paciente...</p></div>;
    }

    if (!perfil) return null;

    if (perfil.role !== 'nutri') {
        return <Navigate to="/dashboard" replace />;
    }

    if (!vinculo) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <button onClick={() => navigate('/nutri')} className="flex items-center gap-2 text-emerald-600 font-semibold mb-6">
                    <ArrowLeft size={18} /> Voltar
                </button>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
                    <p className="text-gray-600 font-medium">Paciente não encontrado ou sem vínculo.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate('/nutri')} className="flex items-center gap-2 text-emerald-600 font-semibold">
                        <ArrowLeft size={18} /> Voltar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isUpdatingClientePerfil}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 disabled:opacity-50"
                    >
                        <Save size={16} /> {isUpdatingClientePerfil ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                        <UserRound size={22} />
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-800 text-lg">{nomeCliente}</h1>
                        <p className="text-xs text-gray-500">ID: {vinculo.cliente_id}</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
                    <h2 className="font-bold text-gray-800">Dados do Paciente</h2>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-600 font-semibold flex items-center gap-1 mb-1"><Weight size={13} /> Peso Atual (kg)</label>
                            <input
                                type="number"
                                value={pesoAtual}
                                onChange={(e) => setPesoAtual(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                min="0"
                                step="0.1"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-gray-600 font-semibold flex items-center gap-1 mb-1"><Target size={13} /> Meta Kcal</label>
                            <input
                                type="number"
                                value={metaKcal}
                                onChange={(e) => setMetaKcal(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                min="0"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-gray-600 font-semibold flex items-center gap-1 mb-1"><Droplets size={13} /> Meta Água (ml)</label>
                            <input
                                type="number"
                                value={metaAguaMl}
                                onChange={(e) => setMetaAguaMl(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                min="0"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-gray-600 font-semibold flex items-center gap-1 mb-1"><Target size={13} /> Objetivo</label>
                            <select
                                value={objetivo}
                                onChange={(e) => setObjetivo(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                            >
                                <option value="perder">Perder</option>
                                <option value="manter">Manter</option>
                                <option value="ganhar">Ganhar</option>
                            </select>
                        </div>

                        {alturaKey && (
                            <div>
                                <label className="text-xs text-gray-600 font-semibold flex items-center gap-1 mb-1"><Ruler size={13} /> Altura (cm)</label>
                                <input
                                    type="number"
                                    value={altura}
                                    onChange={(e) => setAltura(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                    min="0"
                                    step="0.1"
                                />
                            </div>
                        )}

                        {idadeKey && (
                            <div>
                                <label className="text-xs text-gray-600 font-semibold flex items-center gap-1 mb-1"><Calendar size={13} /> Idade</label>
                                <input
                                    type="number"
                                    value={idade}
                                    onChange={(e) => setIdade(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                    min="0"
                                />
                            </div>
                        )}

                        {sexoKey && (
                            <div>
                                <label className="text-xs text-gray-600 font-semibold flex items-center gap-1 mb-1"><VenusAndMars size={13} /> Sexo</label>
                                <select
                                    value={sexo}
                                    onChange={(e) => setSexo(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                >
                                    <option value="">Selecionar</option>
                                    <option value="M">Masculino</option>
                                    <option value="F">Feminino</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {!alturaKey && !idadeKey && !sexoKey && (
                        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                            Campos adicionais como altura/idade/sexo não estão disponíveis na tabela de perfil deste projeto.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
