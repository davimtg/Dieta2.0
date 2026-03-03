export interface CalculatorResultsProps {
    bmr: number;
    tdee: number;
    metaKcal: number;
    carbs: number;
    protein: number;
    fat: number;
    peso: number;
    objetivo: 'perder' | 'manter' | 'ganhar';
    onApply: () => void;
}

export default function NutritionalCalculatorResults({
    bmr,
    tdee,
    metaKcal,
    carbs,
    protein,
    fat,
    objetivo,
    onApply
}: CalculatorResultsProps) {
    const labelsObjetivo = {
        perder: 'Déficit calórico para perda de peso',
        manter: 'Manutenção do peso atual',
        ganhar: 'Superávit calórico para ganho de massa'
    };

    return (
        <div className="mt-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Resultados do Cálculo</h3>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col justify-center">
                    <span className="text-xs text-gray-500 font-semibold mb-1">Taxa Metabólica Basal (BMR)</span>
                    <span className="text-xl font-bold text-gray-800">{bmr} kcal/dia</span>
                    <span className="text-[10px] text-gray-400 mt-1">Calorias necessárias em repouso</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col justify-center">
                    <span className="text-xs text-gray-500 font-semibold mb-1">Gasto Energético Total (TDEE)</span>
                    <span className="text-xl font-bold text-gray-800">{tdee} kcal/dia</span>
                    <span className="text-[10px] text-gray-400 mt-1">Considerando atividade física</span>
                </div>
            </div>

            <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 text-center">
                <span className="text-sm font-bold text-emerald-700 block mb-1">Meta Calórica Diária</span>
                <span className="text-4xl font-black text-emerald-600 mb-2 block">{metaKcal} kcal</span>
                <span className="text-xs text-emerald-600/80 font-semibold bg-emerald-100/50 px-3 py-1 rounded-full">{labelsObjetivo[objetivo]}</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-gray-100 p-3 rounded-2xl text-center shadow-sm">
                    <span className="block text-xs font-bold text-blue-500 mb-1">Carboidratos</span>
                    <span className="text-lg font-black text-gray-800 block">{carbs}g</span>
                </div>
                <div className="bg-white border border-gray-100 p-3 rounded-2xl text-center shadow-sm">
                    <span className="block text-xs font-bold text-emerald-500 mb-1">Proteínas</span>
                    <span className="text-lg font-black text-gray-800 block">{protein}g</span>
                </div>
                <div className="bg-white border border-gray-100 p-3 rounded-2xl text-center shadow-sm">
                    <span className="block text-xs font-bold text-amber-500 mb-1">Gorduras</span>
                    <span className="text-lg font-black text-gray-800 block">{fat}g</span>
                </div>
            </div>

            <button
                onClick={onApply}
                className="w-full bg-emerald-600 text-white font-bold py-3 mt-4 rounded-xl hover:bg-emerald-700 transition shadow-md"
            >
                Aplicar como Minhas Metas
            </button>
        </div>
    );
}
