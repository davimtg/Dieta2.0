
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Apple, BookOpen, ShoppingCart, User } from 'lucide-react';
import clsx from 'clsx';

export default function BottomNavigation() {
    const links = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Diário' },
        { to: '/ingredients', icon: Apple, label: 'Alimentos' },
        { to: '/recipes', icon: BookOpen, label: 'Receitas' },
        { to: '/shopping-list', icon: ShoppingCart, label: 'Mercado' },
        { to: '/profile', icon: User, label: 'Perfil' },
    ];

    return (
        <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-100 pb-safe pt-2 px-6">
            <ul className="flex justify-between items-center mb-2">
                {links.map(({ to, icon: Icon, label }) => (
                    <li key={to} className="flex-1">
                        <NavLink
                            to={to}
                            className={({ isActive }) =>
                                clsx(
                                    'flex flex-col items-center justify-center space-y-1 w-full p-2 rounded-xl transition-colors',
                                    isActive ? 'text-emerald-500' : 'text-gray-400 hover:text-emerald-400'
                                )
                            }
                        >
                            <Icon size={24} />
                            <span className="text-[10px] font-medium">{label}</span>
                        </NavLink>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
