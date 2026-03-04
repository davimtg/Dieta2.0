import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BottomNavigation from './components/layout/BottomNavigation';
import Dashboard from './pages/Dashboard';
import Ingredients from './pages/Ingredients';
import Recipes from './pages/Recipes';
import ShoppingList from './pages/ShoppingList';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import NutriPortal from './pages/NutriPortal';
import { useAuth } from './hooks/useAuth';
import { DateProvider } from './contexts/DateContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-emerald-500 font-semibold animate-pulse">Carregando...</p></div>;
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DateProvider>
        <BrowserRouter>
          <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col relative shadow-sm">
            {/* Main Content Area */}
            <div className="flex-1 pb-20 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/ingredients" element={<Ingredients />} />
                <Route path="/recipes" element={<Recipes />} />
                <Route path="/shopping-list" element={<ShoppingList />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/nutri" element={<NutriPortal />} />
              </Routes>
            </div>

            {/* Bottom Navigation */}
            <BottomNavigation />
          </div>
        </BrowserRouter>
      </DateProvider>
    </QueryClientProvider>
  );
}

export default App;
