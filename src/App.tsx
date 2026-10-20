import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { Dashboard } from './pages/Dashboard';
import { InfluencerStudio } from './pages/InfluencerStudio';
import { PromptLab } from './pages/PromptLab';
import { StoryStudio } from './pages/StoryStudio';
import { PromptDirector } from './pages/PromptDirector';
import { Library } from './pages/Library';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { ProjectModal } from './components/common/ProjectModal';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthorized, loading } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090909] text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-[#DFFF00] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-zinc-400 font-mono tracking-widest uppercase">
          Carregando Hype Creator Studio 2.0...
        </p>
      </div>
    );
  }

  // Route protection: If not authenticated or not the authorized owner, redirect to Login
  if (!isAuthorized) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen bg-[#090909] text-white flex">
      {/* Fixed Left Sidebar */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Studio Viewport (offset by 256px on lg screens) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Header
          onOpenNewProject={() => setIsNewProjectModalOpen(true)}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {React.isValidElement(children)
            ? React.cloneElement(children as React.ReactElement<any>, {
                searchQuery,
                isNewProjectModalOpen,
                setIsNewProjectModalOpen,
              })
            : children}
        </main>
      </div>

      {/* Global New Project Modal */}
      <ProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route
            path="/dashboard"
            element={
              <AppLayout>
                <Dashboard
                  isNewProjectModalOpen={false}
                  setIsNewProjectModalOpen={() => {}}
                />
              </AppLayout>
            }
          />

          {/* Character Studio (with alias for backward compatibility) */}
          <Route
            path="/character-studio"
            element={
              <AppLayout>
                <InfluencerStudio />
              </AppLayout>
            }
          />
          <Route
            path="/influencer-studio"
            element={
              <AppLayout>
                <InfluencerStudio />
              </AppLayout>
            }
          />

          {/* Prompt Lab (with alias for previous image-lab route) */}
          <Route
            path="/prompt-lab"
            element={
              <AppLayout>
                <PromptLab />
              </AppLayout>
            }
          />
          <Route
            path="/image-lab"
            element={
              <AppLayout>
                <PromptLab />
              </AppLayout>
            }
          />

          <Route
            path="/story-studio"
            element={
              <AppLayout>
                <StoryStudio />
              </AppLayout>
            }
          />

          <Route
            path="/prompt-director"
            element={
              <AppLayout>
                <PromptDirector />
              </AppLayout>
            }
          />

          <Route
            path="/library"
            element={
              <AppLayout>
                <Library onOpenNewProject={() => {}} />
              </AppLayout>
            }
          />

          <Route
            path="/settings"
            element={
              <AppLayout>
                <Settings />
              </AppLayout>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
