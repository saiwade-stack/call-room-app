import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import TodaysRoom from './pages/TodaysRoom';
import CallBrief from './pages/CallBrief';
import Pipeline from './pages/Pipeline';
import Settings from './pages/Settings';
import Agent from './pages/Agent';
import SalesRoomEditor from './pages/SalesRoomEditor';
import SalesRoomView from './pages/SalesRoomView';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (<div className="fixed inset-0 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div></div>);
  }
  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    else if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }
  return (
    <Routes>
      <Route path="/" element={<TodaysRoom />} />
      <Route path="/brief/:id" element={<CallBrief />} />
      <Route path="/pipeline" element={<Pipeline />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/agent" element={<Agent />} />
      <Route path="/sales-room/new" element={<SalesRoomEditor />} />
      <Route path="/sales-room/:id" element={<SalesRoomEditor />} />
      <Route path="/room/:slug" element={<SalesRoomView />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}
export default App