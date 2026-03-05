import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState('');
    const [isNutri, setIsNutri] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            role: isNutri ? 'nutri' : 'cliente',
                            username: `${firstName} ${lastName}`.trim()
                        }
                    }
                });
                if (error) throw error;

                // Forçar a role no perfil se o usuário foi criado
                if (data.user) {
                    await supabase.from('usuarios_perfil').upsert({
                        id: data.user.id,
                        role: isNutri ? 'nutri' : 'cliente',
                        username: `${firstName} ${lastName}`.trim()
                    }, { onConflict: 'id' });
                }
            }
        } catch (err: any) {
            setError(err.message || 'Erro na autenticação');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
            <div className="w-full max-w-sm bg-white p-8 rounded-[32px] shadow-xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-emerald-500 mb-2">meel</h1>
                    <p className="text-gray-500">{isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-500 p-3 rounded-xl mb-6 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    {!isLogin && (
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                                <input
                                    type="text"
                                    required={!isLogin}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    placeholder="João"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sobrenome</label>
                                <input
                                    type="text"
                                    required={!isLogin}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    placeholder="Silva"
                                />
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                        <input
                            type="password"
                            required
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {!isLogin && (
                        <div className="flex items-center gap-2 mt-2">
                            <input
                                type="checkbox"
                                id="isNutri"
                                checked={isNutri}
                                onChange={(e) => setIsNutri(e.target.checked)}
                                className="w-4 h-4 text-emerald-600 bg-gray-50 border-gray-300 rounded focus:ring-emerald-500"
                            />
                            <label htmlFor="isNutri" className="text-sm font-medium text-gray-700">
                                Sou um profissional Nutricionista
                            </label>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition-colors mt-6 disabled:opacity-50"
                    >
                        {loading ? 'Carregando...' : isLogin ? 'Entrar' : 'Cadastrar'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-sm text-gray-500 hover:text-emerald-500 transition-colors"
                    >
                        {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
                    </button>
                </div>
            </div>
        </div>
    );
}
