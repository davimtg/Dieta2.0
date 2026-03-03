import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Search, Plus, Trash2, Edit2, Clock, Image as ImageIcon } from 'lucide-react';
import { useDietData } from '../hooks/useDietData';

interface RecipeDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    receita: any | null;
}

export default function RecipeDetailsModal({ isOpen, onClose, receita }: RecipeDetailsModalProps) {
    const { alimentos, updateReceita, deleteReceita } = useDietData();
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Form States
    const [nome, setNome] = useState('');
    const [preparo, setPreparo] = useState('');
    const [rendimento, setRendimento] = useState('1');
    const [tempo, setTempo] = useState('');
    const [imagemUrl, setImagemUrl] = useState('');

    const [search, setSearch] = useState('');
    const [ingredientes, setIngredientes] = useState<{ alimento: any, quantidade_g: number }[]>([]);

    const filteredAlimentos = alimentos.filter((a: any) =>
        a.nome.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        if (receita) {
            setNome(receita.nome);
            setPreparo(receita.preparo || '');
            setRendimento(receita.rendimento_porcoes?.toString() || '1');
            setTempo(receita.tempo_preparo_min?.toString() || '');
            setImagemUrl(receita.imagem_url || '');

            // Mapear ingredientes
            if (receita.receita_ingredientes) {
                const mapped = receita.receita_ingredientes.map((ri: any) => ({
                    alimento: ri.alimentos,
                    quantidade_g: ri.quantidade_g
                }));
                setIngredientes(mapped);
            } else {
                setIngredientes([]);
            }
        }
    }, [receita]);

    if (!receita) return null;

    const handleClose = () => {
        setIsEditing(false);
        onClose();
    };

    const handleAddIngredient = (alimento: any) => {
        setIngredientes([...ingredientes, { alimento, quantidade_g: alimento.porcao_base_g }]);
        setSearch('');
    };

    const handleRemoveIngredient = (index: number) => {
        setIngredientes(ingredientes.filter((_, i) => i !== index));
    };

    const handleUpdateAmount = (index: number, val: string) => {
        const newIngs = [...ingredientes];
        newIngs[index].quantidade_g = Number(val);
        setIngredientes(newIngs);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (ingredientes.length === 0) {
            alert("Adicione pelo menos um ingrediente.");
            return;
        }

        setLoading(true);
        try {
            await updateReceita({
                id: receita.id,
                receita: {
                    nome,
                    preparo,
                    tempo_preparo_min: tempo ? Number(tempo) : null,
                    imagem_url: imagemUrl,
                    rendimento_porcoes: Number(rendimento),
                },
                ingredientes: ingredientes.map(ing => ({
                    alimento_id: ing.alimento.id,
                    quantidade_g: ing.quantidade_g
                }))
            });
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            alert('Erro ao atualizar receita');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm("Certeza que deseja deletar permanentemente esta receita?")) {
            try {
                await deleteReceita(receita.id);
                handleClose();
            } catch (e) {
                alert("Erro ao deletar receita.");
            }
        }
    };

    // Cálculos de macros e calorias
    let totalKcal = 0;
    let totalCarbo = 0;
    let totalProt = 0;
    let totalGord = 0;
    const numRendimento = Number(rendimento) || 1;

    ingredientes.forEach(ing => {
        if (ing.alimento) {
            const ratio = ing.quantidade_g / ing.alimento.porcao_base_g;
            totalKcal += ing.alimento.kcal * ratio;
            totalCarbo += ing.alimento.carbo * ratio;
            totalProt += ing.alimento.prot * ratio;
            totalGord += ing.alimento.gord * ratio;
        }
    });

    const portionKcal = Math.round(totalKcal / numRendimento);
    const portionCarbo = Math.round(totalCarbo / numRendimento);
    const portionProt = Math.round(totalProt / numRendimento);
    const portionGord = Math.round(totalGord / numRendimento);

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity" />
                <Dialog.Content className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[32px] p-0 z-50 animate-in slide-in-from-bottom-full duration-300 h-[90vh] flex flex-col focus:outline-none overflow-hidden">

                    {/* Header Image Area */}
                    <div className="relative h-48 bg-gray-200 flex-shrink-0">
                        {imagemUrl && !isEditing ? (
                            <img src={imagemUrl} alt={nome} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100">
                                <ImageIcon size={48} className="mb-2 opacity-50" />
                                {isEditing ? <span className="text-sm font-semibold">Adicione uma URL abaixo</span> : <span className="text-sm font-semibold">Sem Foto</span>}
                            </div>
                        )}

                        {/* Floating Actions */}
                        <div className="absolute top-4 right-4 flex gap-2">
                            {!isEditing && (
                                <button onClick={() => setIsEditing(true)} className="p-2 rounded-full bg-white/90 backdrop-blur shadow-sm text-emerald-600 hover:bg-white transition">
                                    <Edit2 size={20} />
                                </button>
                            )}
                            {isEditing && (
                                <button onClick={handleDelete} className="p-2 rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 transition">
                                    <Trash2 size={20} />
                                </button>
                            )}
                            <Dialog.Close asChild>
                                <button className="p-2 rounded-full bg-white/90 backdrop-blur shadow-sm text-gray-600 hover:bg-white transition">
                                    <X size={20} />
                                </button>
                            </Dialog.Close>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">

                        {!isEditing ? (
                            // Lendo Receita
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900 mb-2">{nome}</h2>
                                    <div className="flex gap-4 text-sm font-medium text-gray-500 bg-gray-50 p-3 rounded-2xl w-fit">
                                        <span className="flex items-center gap-1.5"><Clock size={16} /> {tempo || '--'} min</span>
                                        <span className="text-gray-300">|</span>
                                        <span>{rendimento} {Number(rendimento) === 1 ? 'porção' : 'porções'}</span>
                                    </div>
                                </div>

                                {/* Macros */}
                                <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 flex items-center justify-between">
                                    <div>
                                        <span className="text-3xl font-bold text-emerald-700">{portionKcal}</span>
                                        <span className="text-sm font-bold text-emerald-600 ml-1 uppercase">Kcal / porção</span>
                                    </div>
                                    <div className="flex gap-4 text-xs font-bold">
                                        <span className="text-blue-600 flex flex-col items-center"><span>C</span> <span className="text-base">{portionCarbo}g</span></span>
                                        <span className="text-emerald-600 flex flex-col items-center"><span>P</span> <span className="text-base">{portionProt}g</span></span>
                                        <span className="text-amber-600 flex flex-col items-center"><span>G</span> <span className="text-base">{portionGord}g</span></span>
                                    </div>
                                </div>

                                {/* Ingredientes List */}
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg mb-3">Ingredientes</h3>
                                    <ul className="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                                        {ingredientes.map((ing, idx) => (
                                            <li key={idx} className="relative flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm ml-6">
                                                <div className="absolute left-0 -ml-6 w-4 h-4 rounded-full border-2 border-emerald-500 bg-white"></div>
                                                <span className="font-semibold text-gray-700">{ing.alimento.nome}</span>
                                                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg text-sm">{ing.quantidade_g}g</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Preparo */}
                                {preparo && (
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-lg mb-3">Modo de Preparo</h3>
                                        <div className="bg-gray-50 p-5 rounded-2xl text-gray-700 whitespace-pre-wrap leading-relaxed">
                                            {preparo}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Editando Receita
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Nome da Receita</label>
                                        <input required type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-emerald-500" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">URL da Foto (Opcional)</label>
                                        <input type="url" value={imagemUrl} onChange={e => setImagemUrl(e.target.value)} placeholder="https://..." className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-emerald-500" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Rendimento</label>
                                            <input required type="number" min="1" value={rendimento} onChange={e => setRendimento(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-emerald-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Tempo (min)</label>
                                            <input type="number" min="1" value={tempo} onChange={e => setTempo(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-emerald-500" />
                                        </div>
                                    </div>
                                </div>

                                {/* Ingredientes Atuais */}
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-3">Ingredientes ({ingredientes.length})</h3>
                                    <div className="space-y-2">
                                        {ingredientes.map((ing, idx) => (
                                            <div key={idx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl">
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-gray-800">{ing.alimento.nome}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        className="w-16 text-center text-sm font-bold bg-white border border-gray-200 rounded-lg py-1"
                                                        value={ing.quantidade_g}
                                                        onChange={(e) => handleUpdateAmount(idx, e.target.value)}
                                                    />
                                                    <span className="text-xs text-gray-500">g</span>
                                                    <button onClick={() => handleRemoveIngredient(idx)} className="text-red-400 p-1 hover:bg-red-50 rounded-md ml-1"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Busca */}
                                <div className="pt-4 border-t border-gray-100">
                                    <div className="relative mb-3">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Buscar ingrediente..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-12 pr-4 text-sm focus:outline-emerald-500"
                                        />
                                    </div>
                                    {search && (
                                        <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-1 bg-gray-50">
                                            {filteredAlimentos.slice(0, 10).map((alimento: any) => (
                                                <button
                                                    key={alimento.id}
                                                    onClick={() => handleAddIngredient(alimento)}
                                                    className="w-full text-left p-2 hover:bg-emerald-50 rounded-lg flex justify-between items-center text-sm"
                                                >
                                                    <span className="font-medium text-gray-700">{alimento.nome}</span>
                                                    <Plus size={16} className="text-emerald-500" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Preparo */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Modo de Preparo</label>
                                    <textarea rows={4} value={preparo} onChange={e => setPreparo(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 focus:outline-emerald-500" />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setIsEditing(false)} className="flex-1 bg-gray-100 text-gray-700 font-bold py-4 rounded-2xl hover:bg-gray-200 transition">
                                        Cancelar
                                    </button>
                                    <button onClick={handleSubmit} disabled={loading || !nome || ingredientes.length === 0} className="flex-1 bg-emerald-500 text-white font-bold py-4 rounded-2xl hover:bg-emerald-600 transition disabled:opacity-50">
                                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
