import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MapMain from './components/MapMain';
import ListMain from './components/ListMain';
import ProfileMain from './components/ProfileMain';
import NotificationsMain from './components/NotificationsMain';
import SettingsMain from './components/SettingsMain';
import MobileNav from './components/MobileNav';
import AddMain from './components/AddMain';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'map' | 'list' | 'brand' | 'me' | 'notifications' | 'settings' | 'add'>('map');

  return (
    <div className="flex min-h-screen bg-cream p-4 md:p-6 lg:p-8 font-sans overflow-hidden relative">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      
      <main className="flex-1 ml-0 md:ml-6 lg:ml-8 max-w-screen-2xl mx-auto flex flex-col h-[93vh]">
        <Header currentView={currentView} />
        
        {/* Main Content Area */}
        <div className="flex-1 w-full h-full pb-20 md:pb-2 relative">
            {currentView === 'map' && <MapMain key="map" />}
            {currentView === 'list' && <ListMain key="list" />}
            {currentView === 'me' && <ProfileMain key="me" />}
            {currentView === 'notifications' && <NotificationsMain key="notifications" />}
            {currentView === 'settings' && <SettingsMain key="settings" />}
            {currentView === 'add' && <AddMain key="add" />}
            
            {/* Placeholder for Brand view if needed later */}
            {currentView === 'brand' && (
               <div className="w-full h-full bg-white rounded-[32px] shadow-soft flex items-center justify-center animate-fade-in-up">
                 <p className="text-gray-400">Brand View Coming Soon</p>
               </div>
            )}
        </div>
      </main>

      {/* Mobile Navigation */}
      <MobileNav currentView={currentView} onViewChange={setCurrentView} />
    </div>
  );
};

export default App;