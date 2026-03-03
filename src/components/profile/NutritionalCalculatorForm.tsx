import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const calculatorSchema = z.object({
    idade: z.number().min(10, "Idade inválida").max(120),
    sexo: z.enum(['M', 'F']),
    peso: z.number().min(30, "Peso inválido"),
    altura: z.number().min(100, "Altura inválida (cm)"),
    fator_atividade: z.enum(['1.2', '1.375', '1.55', '1.725', '1.9']),
    objetivo: z.enum(['perder', 'manter', 'ganhar']),
    formula: z.enum(['mifflin', 'katch']),
    bf: z.number().min(3, "BF inválido").max(60).optional()
}).superRefine((data, ctx) => {
    if (data.formula === 'katch' && !data.bf) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Insira o % de gordura para usar Katch-McArdle",
            path: ['bf']
        });
    }
});

export type CalculatorInputs = z.infer<typeof calculatorSchema>;

interface Props {
    defaultValues?: Partial<CalculatorInputs>;
    onCalculate: (data: CalculatorInputs) => void;
}

export default function NutritionalCalculatorForm({ defaultValues, onCalculate }: Props) {
    const { register, handleSubmit, watch, formState: { errors } } = useForm<CalculatorInputs>({
        resolver: zodResolver(calculatorSchema),
        defaultValues: {
            idade: 25,
            peso: 70,
            altura: 170,
            sexo: 'M',
            fator_atividade: '1.2',
            objetivo: 'manter',
            formula: 'mifflin',
            ...defaultValues
        }
    });

    const formula = watch('formula');

    return (
        <form onSubmit={handleSubmit(onCalculate)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Idade (anos)</label>
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
                <label className="block text-xs font-semibold text-gray-500 mb-1">Fórmula de Cálculo</label>
                <select {...register('formula')} className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 focus:outline-emerald-500 text-sm">
                    <option value="mifflin">Mifflin-St Jeor</option>
                    <option value="katch">Katch-McArdle</option>
                </select>
            </div>

            {formula === 'katch' && (
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">% Gordura Corporal</label>
                    <input type="number" step="0.1" {...register('bf', { valueAsNumber: true })} className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 focus:outline-emerald-500" />
                    {errors.bf && <span className="text-red-500 text-[10px]">{errors.bf.message}</span>}
                </div>
            )}

            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nível de Atividade Física</label>
                <select {...register('fator_atividade')} className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 focus:outline-emerald-500 text-sm">
                    <option value="1.2">Sedentário</option>
                    <option value="1.375">Levemente Ativo</option>
                    <option value="1.55">Moderadamente Ativo</option>
                    <option value="1.725">Muito Ativo</option>
                    <option value="1.9">Extremamente Ativo</option>
                </select>
            </div>

            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Objetivo</label>
                <select {...register('objetivo')} className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 focus:outline-emerald-500 text-sm">
                    <option value="perder">Perder Peso</option>
                    <option value="manter">Manter Peso</option>
                    <option value="ganhar">Ganhar Peso</option>
                </select>
            </div>

            <button type="submit" className="w-full bg-emerald-500 text-white font-bold py-3 mt-4 rounded-xl hover:bg-emerald-600 transition">
                Calcular Necessidades Nutricionais
            </button>
        </form>
    );
}
