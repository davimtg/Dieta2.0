import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Users, FileText, CheckCircle, ChevronRight, Plus } from 'lucide-react';
import { useDietData } from '../hooks/useDietData';
import { useNutriData } from '../hooks/useNutriData';

export default function NutriDashboard() {
    const { perfil, isLoading: loadingPerfil } = useDietData(new Date());
    const navigate = useNavigate();
    const { clientes, planos, createPlano, isLoading } = useNutriData();
    const [selectedTab, setSelectedTab] = useState<'clientes' | 'planos'>('clientes');
    const [isCreatingPlano, setIsCreatingPlano] = useState(false);
    const [novoPlanoNome, setNovoPlanoNome] = useState('');
    const [clienteIdParaPlano, setClienteIdParaPlano] = useState('');

    if (loadingPerfil || isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-emerald-500 font-semibold animate-pulse">Carregando portal...</p></div>;
    }

    if (!perfil) return null;

    if (perfil.role !== 'nutri') {
        return <Navigate to="/dashboard" replace />;
    }

    const handleCreatePlano = async () => {
        if (!novoPlanoNome || !clienteIdParaPlano) return;
        await createPlano({ nome: novoPlanoNome, clienteId: clienteIdParaPlano });
        setIsCreatingPlano(false);
        setNovoPlanoNome('');
        setClienteIdParaPlano('');
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <div className="bg-emerald-600 px-6 pt-10 pb-6 rounded-b-[40px] text-white shadow-md relative">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Users size={28} /> Portal do Nutricionista
                </h1>
                <p className="text-emerald-100 text-sm mt-1 opacity-90">Gestão de clientes e prescrições</p>

                <div className="flex gap-4 mt-8 bg-emerald-700/40 p-1.5 rounded-2xl w-full">
                    <button
                        onClick={() => setSelectedTab('clientes')}
                        className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ${selectedTab === 'clientes' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-100'
                            }`}
                    >
                        Meus Pacientes
                    </button>
                    <button
                        onClick={() => setSelectedTab('planos')}
                        className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ${selectedTab === 'planos' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-100'
                            }`}
                    >
                        Planos Alimentares
                    </button>
                </div>
            </div>

            <div className="px-6 mt-6 space-y-6">
                {selectedTab === 'clientes' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-bold text-gray-800">Seus Pacientes ({clientes.length})</h2>
                        </div>
                        {clientes.length === 0 ? (
                            <div className="bg-white p-8 rounded-3xl text-center shadow-sm border border-gray-100 flex flex-col items-center">
                                <div className="bg-emerald-50 p-4 rounded-full mb-4 text-emerald-500">
                                    <Users size={40} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-2">👥 Nenhum paciente vinculado ainda</h3>
                                <p className="text-sm text-gray-500 mb-6">Compartilhe seu e-mail cadastrado com seus pacientes para que eles possam vincular seus perfis ao seu e você possa prescrever dietas.</p>
                            </div>
                        ) : (
                            clientes.map((vinc: any) => (
                                <button
                                    key={vinc.id}
                                    onClick={() => navigate(`/nutri/paciente/${vinc.cliente_id}`)}
                                    className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 text-left hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors"
                                >
                                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-lg shrink-0">
                                        {((vinc.usuarios_perfil as any)?.username || (vinc.usuarios_perfil as any)?.raw_user_meta_data?.username || 'P')?.[0]?.toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-800">{(vinc.usuarios_perfil as any)?.username || (vinc.usuarios_perfil as any)?.raw_user_meta_data?.username || 'Paciente Sem Nome'}</h3>
                                        <p className="text-xs text-gray-500 font-medium">Meta: {(vinc.usuarios_perfil as any)?.meta_kcal || 0} kcal</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {vinc.status === 'active' ? (
                                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Ativo</span>
                                        ) : (
                                            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Pendente</span>
                                        )}
                                        <ChevronRight size={16} className="text-emerald-400" />
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}

                {selectedTab === 'planos' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-bold text-gray-800">Dietas Prescritas</h2>
                            <button
                                aria-label="Criar nova dieta"
                                onClick={() => setIsCreatingPlano(true)}
                                className="bg-emerald-500 text-white p-2 rounded-full shadow-sm hover:bg-emerald-600 transition"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                        {planos.length === 0 ? (
                            <div className="bg-white p-8 rounded-3xl text-center shadow-sm border border-gray-100 flex flex-col items-center">
                                <div className="bg-emerald-50 p-4 rounded-full mb-4 text-emerald-500">
                                    <FileText size={40} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-2">📝 Nenhuma dieta criada</h3>
                                <p className="text-sm text-gray-500 mb-6">Prescreva planos alimentares personalizados e ajude seus pacientes a atingirem suas metas.</p>
                                <button
                                    onClick={() => setIsCreatingPlano(true)}
                                    className="text-emerald-500 font-bold bg-emerald-50 px-6 py-3 rounded-xl hover:bg-emerald-100 transition"
                                >
                                    Criar Primeira Dieta
                                </button>
                            </div>
                        ) : (
                            planos.map((plano: any) => (
                                <div key={plano.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                    <h3 className="font-bold text-gray-800 text-lg mb-1">{plano.nome}</h3>
                                    {/* Obter o nome do cliente desse plano listando na array de clientes pra cruzar ids */}
                                    <p className="text-xs text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-md font-medium mb-3">
                                        Para: {(clientes.find((c: any) => c.cliente_id === plano.cliente_id)?.usuarios_perfil as any)?.username || (clientes.find((c: any) => c.cliente_id === plano.cliente_id)?.usuarios_perfil as any)?.raw_user_meta_data?.username || 'Cliente Desconhecido'}
                                    </p>
                                    <div className="flex items-center justify-between mt-4">
                                        <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-500" /> {plano.plano_alimentar_itens?.length || 0} Itens</span>
                                        <button
                                            onClick={() => navigate(`/nutri/plano/${plano.id}`)}
                                            className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                                        >
                                            Ver/Editar <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Modal Criar Plano */}
            {isCreatingPlano && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end flex-col p-4 animate-in fade-in pb-8">
                    <div className="bg-white rounded-[32px] p-6 slide-in-bottom-auto w-full max-w-md mx-auto relative overflow-hidden flex flex-col max-h-[90vh]">
                        <h2 className="text-2xl font-extrabold text-gray-800 mb-6">Nova Prescrição</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Paciente</label>
                                <select
                                    value={clienteIdParaPlano}
                                    onChange={(e) => setClienteIdParaPlano(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium appearance-none"
                                >
                                    <option value="">Selecione o paciente...</option>
                                    {clientes.map((c: any) => (
                                        <option key={c.cliente_id} value={c.cliente_id}>{(c.usuarios_perfil as any)?.username || c.usuarios_perfil?.raw_user_meta_data?.username || 'Paciente'}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Nome do Plano</label>
                                <input
                                    type="text"
                                    value={novoPlanoNome}
                                    onChange={(e) => setNovoPlanoNome(e.target.value)}
                                    placeholder="Ex: Bulk Hipertrofia 3000kcal"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setIsCreatingPlano(false)}
                                    className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreatePlano}
                                    disabled={!novoPlanoNome || !clienteIdParaPlano}
                                    className="flex-1 py-3.5 bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold hover:bg-emerald-600 transition"
                                >
                                    Criar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
