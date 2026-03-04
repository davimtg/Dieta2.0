import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
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
                const { error, data } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            } else {
                // Sign Up
                const { error, data } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                       data: {
                           role: isNutri ? 'nutri' : 'cliente'
                       }
                    }
                });
                
                if (error) throw error;
                
                // If auto-confirm is enabled or session is returned immediately
                if (data.session || data.user) {
                     // Try to ensure profile exists with correct role
                     const uid = data.user?.id;
                     if (uid) {
                        try {
                           // Using upsert to be safe against race conditions with triggers
                           const { error: profileError } = await supabase
                                .from('usuarios_perfil')
                                .upsert({ 
                                    id: uid, 
                                    role: isNutri ? 'nutri' : 'cliente',
                                    email: email 
                                }, { onConflict: 'id' });
                           
                           if (profileError) {
                               console.error("Profile upsert error:", profileError);
                               alert(`ATENÇÃO: Conta criada, mas houve erro ao definir perfil (${profileError.message}). Verifique as permissões RLS no Supabase.`);
                           }
                        } catch (pErr: any) {
                            console.error("Profile creation failed", pErr);
                            alert(`ATENÇÃO: Erro crítico ao criar perfil: ${pErr.message}`);
                        }
                     }
                }
                
                alert('Cadastro realizado com sucesso! Faça login.');
                setIsLogin(true); // Switch to login view automatically
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
                        <div className="flex items-center gap-2 pt-2">
                            <input 
                                type="checkbox" 
                                id="isNutri" 
                                checked={isNutri} 
                                onChange={(e) => setIsNutri(e.target.checked)}
                                className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500 border-gray-300"
                            />
                            <label htmlFor="isNutri" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                                Cadastrar como Nutricionista
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
