import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Camera } from 'lucide-react';
import { useDietData } from '../hooks/useDietData';
import { supabase } from '../lib/supabase';

interface CreateFoodModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (alimento: any) => void;
    initialSearchName?: string;
}

export default function CreateFoodModal({ isOpen, onClose, onSuccess, initialSearchName }: CreateFoodModalProps) {
    const { addAlimento } = useDietData();
    const [loading, setLoading] = useState(false);

    // Novas features
    const [vitatUrl, setVitatUrl] = useState('');
    const [isScraping, setIsScraping] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);

    const [formData, setFormData] = useState({
        nome: initialSearchName || '',
        marca: '',
        porcao_base_g: '100',
        kcal: '',
        carbo: '',
        prot: '',
        gord: '',
        imagem_url: '',
        unidade_medida: 'g'
    });

    // Sincroniza o initialSearchName com o input se modificado do pai enquanto o modal estiver aberto
    useEffect(() => {
        if (isOpen && initialSearchName) {
            setFormData(prev => ({ ...prev, nome: initialSearchName }));
        }
    }, [isOpen, initialSearchName]);

    const handleScrapeVitat = async () => {
        if (!vitatUrl) return;
        setIsScraping(true);
        try {
            const { data, error } = await supabase.functions.invoke('scrape-vitat', {
                body: { url: vitatUrl }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            setFormData(prev => ({
                ...prev,
                nome: data.nome || prev.nome,
                marca: data.marca || prev.marca,
                kcal: data.kcal?.toString() || '',
                carbo: data.carbo?.toString() || '',
                prot: data.prot?.toString() || '',
                gord: data.gord?.toString() || '',
                porcao_base_g: data.porcao_base_g?.toString() || '100',
                imagem_url: data.imagem_url || prev.imagem_url,
                unidade_medida: data.unidade_medida || prev.unidade_medida
            }));

            alert('Dados extraídos com sucesso!');
            setVitatUrl('');
        } catch (err: any) {
            console.error(err);
            alert('Falha ao extrair: ' + err.message);
        } finally {
            setIsScraping(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (file.size > 5 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 5MB.');
            return;
        }

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = `alimentos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('media')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('media')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, imagem_url: publicUrl }));
        } catch (err) {
            console.error('Erro no upload de imagem:', err);
            alert('Erro ao enviar imagem. Verifique se o bucket "media" está público e configurado devidamente.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = await addAlimento({
                nome: formData.nome,
                marca: formData.marca,
                porcao_base_g: Number(formData.porcao_base_g),
                kcal: Number(formData.kcal),
                carbo: Number(formData.carbo),
                prot: Number(formData.prot),
                gord: Number(formData.gord),
                imagem_url: formData.imagem_url,
                unidade_medida: formData.unidade_medida
            });
            onClose();
            if (onSuccess && data && data.length > 0) {
                onSuccess(data[0]);
            }
            // Reset form
            setFormData({
                nome: '',
                marca: '',
                porcao_base_g: '100',
                kcal: '',
                carbo: '',
                prot: '',
                gord: '',
                imagem_url: '',
                unidade_medida: 'g'
            });
            setVitatUrl('');
        } catch (error) {
            console.error(error);
            alert('Erro ao cadastrar alimento');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm transition-opacity" />
                <Dialog.Content aria-describedby={undefined} className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[32px] p-6 z-[70] animate-in slide-in-from-bottom-full duration-300 max-h-[90vh] overflow-y-auto focus:outline-none shadow-2xl">

                    <div className="flex justify-between items-center mb-6">
                        <Dialog.Title className="text-xl font-bold text-gray-800">
                            Cadastrar Alimento
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
                                <X size={20} />
                            </button>
                        </Dialog.Close>
                    </div>

                    {/* Auto-preenchimento Vitat / FatSecret */}
                    <div className="bg-emerald-50 p-4 rounded-2xl mb-4 border border-emerald-100">
                        <label className="block text-sm font-semibold text-emerald-800 mb-2">
                            Preenchimento Rápido (Opcional)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="url"
                                value={vitatUrl}
                                onChange={e => setVitatUrl(e.target.value)}
                                placeholder="Link do Vitat ou FatSecret..."
                                className="flex-1 bg-white border border-emerald-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500"
                            />
                            <button
                                type="button"
                                onClick={handleScrapeVitat}
                                disabled={!vitatUrl || isScraping}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-4 rounded-xl text-sm disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                                {isScraping ? 'Buscando...' : 'Extrair'}
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Upload de Imagem */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Foto do Alimento (Opcional)</label>

                            {formData.imagem_url ? (
                                <div className="relative w-full h-32 rounded-2xl overflow-hidden group mb-2 border border-gray-100">
                                    <img src={formData.imagem_url} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, imagem_url: '' }))}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-100 transition-opacity"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : showUrlInput ? (
                                <div className="space-y-2">
                                    <input
                                        type="url"
                                        name="imagem_url"
                                        value={formData.imagem_url}
                                        onChange={e => setFormData(prev => ({ ...prev, imagem_url: e.target.value }))}
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

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do Alimento</label>
                            <input required type="text" name="nome" value={formData.nome} onChange={handleChange} className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="Ex: Arroz Branco Cozido" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Marca (Opcional)</label>
                                <input type="text" name="marca" value={formData.marca} onChange={handleChange} className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="Ex: Tio João" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Porção Base</label>
                                <div className="flex gap-2">
                                    <input required min="1" type="number" name="porcao_base_g" value={formData.porcao_base_g} onChange={handleChange} className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                                    <select name="unidade_medida" value={formData.unidade_medida} onChange={handleChange as any} className="bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-gray-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer">
                                        <option value="g">g</option>
                                        <option value="ml">ml</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Calorias (kcal)</label>
                            <input required type="number" step="0.1" name="kcal" value={formData.kcal} onChange={handleChange} className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[11px] font-semibold text-blue-600 mb-1 text-center">Carboidratos (g)</label>
                                <input required type="number" step="0.1" name="carbo" value={formData.carbo} onChange={handleChange} className="w-full text-center bg-gray-50 border border-gray-100 rounded-2xl py-3 px-2 text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-emerald-600 mb-1 text-center">Proteínas (g)</label>
                                <input required type="number" step="0.1" name="prot" value={formData.prot} onChange={handleChange} className="w-full text-center bg-gray-50 border border-gray-100 rounded-2xl py-3 px-2 text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-amber-500 mb-1 text-center">Gorduras (g)</label>
                                <input required type="number" step="0.1" name="gord" value={formData.gord} onChange={handleChange} className="w-full text-center bg-gray-50 border border-gray-100 rounded-2xl py-3 px-2 text-gray-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || isUploading || isScraping}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl transition-colors disabled:opacity-50 mt-4"
                        >
                            {loading ? 'Salvando...' : 'Salvar Alimento'}
                        </button>
                    </form>

                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

