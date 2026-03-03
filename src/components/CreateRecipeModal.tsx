import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Search, Plus, Trash2, Camera } from 'lucide-react';
import { useDietData } from '../hooks/useDietData';
import { supabase } from '../lib/supabase';
import CreateFoodModal from './CreateFoodModal';

interface CreateRecipeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CreateRecipeModal({ isOpen, onClose }: CreateRecipeModalProps) {
    const { alimentos, receitas, addReceita } = useDietData();
    const [loading, setLoading] = useState(false);
    const [nome, setNome] = useState('');
    const [preparo, setPreparo] = useState('');
    const [rendimento, setRendimento] = useState('1');
    const [tempo, setTempo] = useState('');
    const [imagemUrl, setImagemUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);

    const [search, setSearch] = useState('');
    const [ingredientes, setIngredientes] = useState<{ item: any, type: 'alimento' | 'receita', quantidade_g: number }[]>([]);

    // Modal de Novo Alimento
    const [isCreateFoodModalOpen, setIsCreateFoodModalOpen] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 5MB.');
            return;
        }

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = `receitas/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('media')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('media')
                .getPublicUrl(filePath);

            setImagemUrl(publicUrl);
        } catch (err) {
            console.error('Erro no upload de imagem:', err);
            alert('Erro ao enviar imagem. Verifique se o bucket "media" está público e configurado devidamente.');
        } finally {
            setIsUploading(false);
        }
    };

    const filteredItems = search ? [
        ...alimentos.map((a: any) => ({ ...a, type: 'alimento' })),
        ...receitas.map((r: any) => ({ ...r, type: 'receita' }))
    ].filter((item: any) =>
        item.nome.toLowerCase().includes(search.toLowerCase())
    ) : [];

    const handleAddIngredient = (item: any, type: 'alimento' | 'receita') => {
        // Receitas default 1 porção, alimentos default porção base
        const pBase = type === 'receita' ? 1 : item.porcao_base_g;
        setIngredientes([...ingredientes, { item, type, quantidade_g: pBase }]);
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

    const handleFoodCreated = (novoAlimento: any) => {
        handleAddIngredient(novoAlimento, 'alimento');
    };

    // Helper p/ calcular macros de receita aninhada
    const getReceitaMacrosPreview = (receita: any): any => {
        let totalK = 0;
        receita.receita_ingredientes?.forEach((ri: any) => {
            if (ri.alimentos) {
                const ratio = ri.quantidade_g / ri.alimentos.porcao_base_g;
                totalK += ri.alimentos.kcal * ratio;
            } else if (ri.receitas) {
                const subK = getReceitaMacrosPreview(ri.receitas);
                totalK += subK * ri.quantidade_g; // g representa porções
            }
        });
        const porcoes = receita.rendimento_porcoes || 1;
        return totalK / porcoes;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (ingredientes.length === 0) {
            alert("Adicione pelo menos um ingrediente.");
            return;
        }

        setLoading(true);
        try {
            await addReceita({
                nome,
                preparo,
                tempo_preparo_min: tempo ? Number(tempo) : null,
                imagem_url: imagemUrl,
                rendimento_porcoes: Number(rendimento),
                ingredientes: ingredientes.map(ing => ({
                    alimento_id: ing.type === 'alimento' ? ing.item.id : undefined,
                    ingrediente_receita_id: ing.type === 'receita' ? ing.item.id : undefined,
                    quantidade_g: ing.quantidade_g
                }))
            });
            onClose();
            // Reset form
            setNome('');
            setPreparo('');
            setRendimento('1');
            setTempo('');
            setImagemUrl('');
            setIngredientes([]);
        } catch (error) {
            console.error(error);
            alert('Erro ao criar receita');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity" />
                <Dialog.Content aria-describedby={undefined} className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[32px] p-6 z-50 animate-in slide-in-from-bottom-full duration-300 h-[90vh] flex flex-col focus:outline-none">

                    <div className="flex justify-between items-center mb-6">
                        <Dialog.Title className="text-xl font-bold text-gray-800">
                            Nova Receita
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
                                <X size={20} />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-6">

                        {/* Informações Básicas */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Nome da Receita</label>
                                <input required type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="Ex: Panqueca de Aveia" />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Foto da Receita (Opcional)</label>

                                {imagemUrl ? (
                                    <div className="relative w-full h-40 rounded-2xl overflow-hidden mb-2 group border border-gray-100">
                                        <img src={imagemUrl} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => setImagemUrl('')}
                                            className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-100 transition-opacity"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : showUrlInput ? (
                                    <div className="space-y-2">
                                        <input
                                            type="url"
                                            value={imagemUrl}
                                            onChange={e => setImagemUrl(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-gray-700 focus:outline-none focus:border-emerald-500"
                                            placeholder="Ex: https://site.com/foto.jpg"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowUrlInput(false)}
                                            className="text-xs text-center w-full text-emerald-600 font-medium hover:text-emerald-700"
                                        >
                                            Voltar para envio de arquivo
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="relative border-2 border-dashed border-emerald-200 rounded-2xl p-6 text-center hover:bg-emerald-50 transition-colors bg-emerald-50/50">
                                            <input
                                                type="file"
                                                accept=".png,.jpg,.jpeg,.webp"
                                                onChange={handleImageUpload}
                                                disabled={isUploading}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                                                title="Clique ou toque para escolher a imagem"
                                            />
                                            <div className="flex flex-col items-center gap-2 text-emerald-700 pointer-events-none">
                                                {isUploading ? (
                                                    <span className="text-sm font-medium">Enviando foto...</span>
                                                ) : (
                                                    <>
                                                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-emerald-500 mb-1 shadow-sm">
                                                            <Camera size={24} />
                                                        </div>
                                                        <span className="text-sm font-semibold">Escolher da Galeria ou Câmera</span>
                                                        <span className="text-xs text-emerald-600/70">PNG, JPG até 5MB</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowUrlInput(true)}
                                            className="w-full text-center text-sm text-emerald-600 font-semibold py-2 hover:bg-emerald-50 rounded-xl transition-colors border border-transparent hover:border-emerald-100"
                                        >
                                            Ou colar o link público de uma imagem
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Rendimento</label>
                                    <input required type="number" min="1" value={rendimento} onChange={e => setRendimento(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-gray-700 focus:outline-none focus:border-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tempo (min)</label>
                                    <input type="number" min="1" value={tempo} onChange={e => setTempo(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-gray-700 focus:outline-none focus:border-emerald-500" />
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
                                            <p className="text-sm font-semibold text-gray-800">{ing.item.nome} {ing.type === 'receita' && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded ml-1">Receita</span>}</p>
                                            <p className="text-xs text-emerald-600">
                                                {ing.type === 'alimento'
                                                    ? Math.round(ing.item.kcal * (ing.quantidade_g / ing.item.porcao_base_g))
                                                    : Math.round(getReceitaMacrosPreview(ing.item) * ing.quantidade_g)
                                                } kcal
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                className="w-16 text-center text-sm font-bold bg-white border border-gray-200 rounded-lg py-1"
                                                value={ing.quantidade_g}
                                                onChange={(e) => handleUpdateAmount(idx, e.target.value)}
                                            />
                                            <span className="text-xs text-gray-500">{ing.type === 'receita' ? 'porção' : 'g'}</span>
                                            <button onClick={() => handleRemoveIngredient(idx)} className="text-red-400 p-1 hover:bg-red-50 rounded-md ml-1"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Busca de Ingredientes */}
                        <div className="pt-4 border-t border-gray-100">
                            <div className="relative mb-3">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar ingrediente para adicionar..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-12 pr-4 text-sm text-gray-700 focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                            {search && (
                                <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-1 bg-gray-50">
                                    {filteredItems.length > 0 ? (
                                        filteredItems.slice(0, 10).map((item: any) => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleAddIngredient(item, item.type)}
                                                className="w-full text-left p-2 hover:bg-emerald-50 rounded-lg flex justify-between items-center text-sm"
                                            >
                                                <span className="font-medium text-gray-700">
                                                    {item.nome}
                                                    {item.type === 'receita' && <span className="text-[10px] ml-2 text-emerald-600 font-bold">Res.</span>}
                                                </span>
                                                <Plus size={16} className="text-emerald-500" />
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center">
                                            <p className="text-gray-500 text-sm mb-3">Alimento não encontrado.</p>
                                            <button
                                                onClick={() => setIsCreateFoodModalOpen(true)}
                                                className="w-full text-center text-sm text-emerald-600 hover:bg-emerald-50 py-2 rounded-xl font-medium transition-colors border border-transparent hover:border-emerald-100"
                                            >
                                                + Cadastrar Alimento
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Preparo */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Modo de Preparo (Opcional)</label>
                            <textarea rows={3} value={preparo} onChange={e => setPreparo(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-gray-700 focus:outline-none focus:border-emerald-500" placeholder="Misture tudo e asse..." />
                        </div>

                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <button
                            onClick={handleSubmit}
                            disabled={loading || isUploading || !nome || ingredientes.length === 0}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Salvando...' : 'Salvar Receita'}
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>

            {/* Stacked Modal para Criar Alimento novo in-flow */}
            <CreateFoodModal
                isOpen={isCreateFoodModalOpen}
                onClose={() => setIsCreateFoodModalOpen(false)}
                initialSearchName={search}
                onSuccess={handleFoodCreated}
            />

        </Dialog.Root>
    );
}
