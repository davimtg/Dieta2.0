import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BottomNavigation from './components/layout/BottomNavigation';
import Dashboard from './pages/Dashboard';
import Ingredients from './pages/Ingredients';
import Recipes from './pages/Recipes';
import ShoppingList from './pages/ShoppingList';
import Profile from './pages/Profile';
import NutriDashboard from './pages/NutriDashboard';
import NutriDietOrganizer from './pages/NutriDietOrganizer';
import NutriPatientDetails from './pages/NutriPatientDetails';
import Auth from './pages/Auth';
import WeightHistory from './pages/WeightHistory';
import { useAuth } from './hooks/useAuth';
import { DateProvider } from './contexts/DateContext';
import { Toaster } from 'react-hot-toast';

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
                <Route path="/meu-peso" element={<WeightHistory />} />
                <Route path="/nutri" element={<NutriDashboard />} />
                <Route path="/nutri/paciente/:id" element={<NutriPatientDetails />} />
                <Route path="/nutri/plano/:id" element={<NutriDietOrganizer />} />
              </Routes>
            </div>

            {/* Bottom Navigation */}
            <BottomNavigation />
          </div>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#fff',
                color: '#374151',
                borderRadius: '16px',
                boxShadow: '0 4px 14px -4px rgba(0, 0, 0, 0.1)',
                fontWeight: 600,
                fontSize: '14px',
              },
            }}
          />
        </BrowserRouter>
      </DateProvider>
    </QueryClientProvider>
  );
}

export default App;
