import React from 'react';
import { Map, List, Tag, Plus, User, Bell, Settings } from 'lucide-react';

interface MobileNavProps {
  currentView: 'map' | 'list' | 'brand' | 'me' | 'notifications' | 'settings' | 'add';
  onViewChange: (view: 'map' | 'list' | 'brand' | 'me' | 'notifications' | 'settings' | 'add') => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ currentView, onViewChange }) => {
  const getButtonClass = (viewName: string) => {
    const isActive = currentView === viewName;
    return `relative flex flex-col items-center justify-center gap-1 w-12 h-full transition-all duration-300 ${
      isActive ? 'text-accent-yellow -translate-y-1' : 'text-gray-400 hover:text-soft-black'
    }`;
  };

  return (
    <div className="md:hidden fixed bottom-6 left-4 right-4 h-18 bg-white/90 backdrop-blur-xl rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/50 z-50 flex items-center justify-between px-6 animate-fade-in-up">
      
      {/* Map */}
      <button className={getButtonClass('map')} onClick={() => onViewChange('map')}>
        <Map className="w-6 h-6" strokeWidth={currentView === 'map' ? 2.5 : 1.5} />
        {currentView === 'map' && <span className="absolute -bottom-2 w-1 h-1 bg-accent-yellow rounded-full"></span>}
      </button>

      {/* List */}
      <button className={getButtonClass('list')} onClick={() => onViewChange('list')}>
        <List className="w-6 h-6" strokeWidth={currentView === 'list' ? 2.5 : 1.5} />
        {currentView === 'list' && <span className="absolute -bottom-2 w-1 h-1 bg-accent-yellow rounded-full"></span>}
      </button>

      {/* Floating Add Button */}
      <div className="relative -top-8">
        <button 
            onClick={() => onViewChange('add')}
            className="group relative w-16 h-16 rounded-full bg-soft-black shadow-xl shadow-blue-900/30 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
        >
           <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-accent-yellow to-accent-purple opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
           <Plus className="w-7 h-7 text-white relative z-10 transition-transform duration-500 group-hover:rotate-90" />
        </button>
      </div>

      {/* Notifications */}
      <button className={getButtonClass('notifications')} onClick={() => onViewChange('notifications')}>
        <div className="relative">
             <Bell className="w-6 h-6" strokeWidth={currentView === 'notifications' ? 2.5 : 1.5} />
             <span className="absolute top-0 right-0 w-2 h-2 bg-accent-salmon rounded-full border-2 border-white"></span>
        </div>
        {currentView === 'notifications' && <span className="absolute -bottom-2 w-1 h-1 bg-accent-yellow rounded-full"></span>}
      </button>

      {/* Profile (Me) */}
      <button className={getButtonClass('me')} onClick={() => onViewChange('me')}>
        <div className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all ${currentView === 'me' ? 'border-accent-yellow p-[1px]' : 'border-transparent'}`}>
             <img src="https://picsum.photos/100/100?grayscale" alt="Me" className="w-full h-full object-cover rounded-full" />
        </div>
      </button>
    </div>
  );
};

export default MobileNav;