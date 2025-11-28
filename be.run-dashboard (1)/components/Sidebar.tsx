import React from 'react';
import { Map, List, Tag, Plus, Bell, Settings, LogOut } from 'lucide-react';

interface SidebarProps {
  currentView: 'map' | 'list' | 'brand' | 'me' | 'notifications' | 'settings' | 'add';
  onViewChange: (view: 'map' | 'list' | 'brand' | 'me' | 'notifications' | 'settings' | 'add') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  
  const getButtonClass = (viewName: string) => {
    const isActive = currentView === viewName;
    return `p-3 rounded-xl transition-all animate-fade-in-up duration-300 ${
      isActive 
        ? 'bg-blue-50 text-accent-yellow shadow-md shadow-blue-200/50 scale-110 font-medium ring-1 ring-accent-yellow/20' 
        : 'text-gray-400 hover:text-accent-yellow hover:bg-blue-50'
    }`;
  };

  return (
    <div className="hidden md:flex flex-col items-center w-20 h-[95vh] sticky top-4 ml-4 z-50 animate-slide-in-left gap-4">
      
      {/* 1. Independent Logo Section */}
      <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center animate-scale-in cursor-pointer hover:rotate-12 transition-transform duration-300" style={{ animationDelay: '0.1s' }}>
         {/* Replaced default icon with 'web_logo.JPG' image */}
         <img 
            src="web_logo.JPG" 
            alt="web_logo" 
            className="w-full h-full object-contain drop-shadow-lg"
         />
      </div>

      {/* 2. Menu Bar Section (Glassmorphism Pill) */}
      <div className="flex-1 w-full flex flex-col items-center justify-between py-6 bg-white/70 backdrop-blur-xl rounded-[30px] shadow-soft border border-white/50 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        
        <div className="flex flex-col items-center gap-6 w-full">
           {/* Top Nav Items */}
          <nav className="flex flex-col gap-5 w-full items-center">
            <button 
                onClick={() => onViewChange('map')}
                className={getButtonClass('map')} 
                title="Map" 
                style={{ animationDelay: '0.3s' }}
            >
              <Map className="w-5 h-5" strokeWidth={currentView === 'map' ? 2.5 : 2} />
            </button>
            
            <button 
                onClick={() => onViewChange('list')}
                className={getButtonClass('list')} 
                title="List" 
                style={{ animationDelay: '0.4s' }}
            >
              <List className="w-5 h-5" strokeWidth={currentView === 'list' ? 2.5 : 2} />
            </button>
            
            <button 
                onClick={() => onViewChange('brand')}
                className={getButtonClass('brand')} 
                title="Brand" 
                style={{ animationDelay: '0.5s' }}
            >
              <Tag className="w-5 h-5" strokeWidth={currentView === 'brand' ? 2.5 : 2} />
            </button>
          </nav>

          {/* Add Button - Elegant Floating Action */}
          <div className="w-full flex justify-center py-1 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <button 
                  onClick={() => onViewChange('add')}
                  className="relative group w-12 h-12 flex items-center justify-center rounded-full bg-soft-black shadow-lg shadow-blue-900/20 transition-all duration-500 hover:scale-110 hover:shadow-accent-yellow/40 active:scale-95"
              >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-accent-yellow to-accent-purple opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <Plus className="w-5 h-5 text-white relative z-10 transition-transform duration-500 group-hover:rotate-90" />
              </button>
          </div>

          <div className="w-8 h-[1px] bg-gray-200 my-1 animate-fade-in" style={{ animationDelay: '0.7s' }}></div>

          {/* Secondary Nav */}
          <nav className="flex flex-col gap-5 w-full items-center">
               <button 
                  onClick={() => onViewChange('notifications')}
                  className={`${getButtonClass('notifications')} relative`}
                  title="Notifications" 
                  style={{ animationDelay: '0.8s' }}
               >
                  <Bell className="w-5 h-5" strokeWidth={currentView === 'notifications' ? 2.5 : 2} />
                  <span className="absolute top-2 right-3 w-1.5 h-1.5 bg-accent-salmon rounded-full ring-2 ring-white"></span>
              </button>
              <button 
                  onClick={() => onViewChange('settings')}
                  className={getButtonClass('settings')}
                  title="Settings" 
                  style={{ animationDelay: '0.9s' }}
              >
                  <Settings className="w-5 h-5" strokeWidth={currentView === 'settings' ? 2.5 : 2} />
              </button>
          </nav>
        </div>

        {/* Footer: Log Out & Avatar */}
        <div className="flex flex-col items-center gap-4 animate-fade-in-up mb-2" style={{ animationDelay: '1s' }}>
          <button className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Log Out">
              <LogOut className="w-5 h-5" />
          </button>
          
           {/* Me (Avatar) */}
           <div 
              onClick={() => onViewChange('me')}
              className={`relative group cursor-pointer p-0.5 rounded-full border-2 transition-all ${currentView === 'me' ? 'border-accent-yellow scale-110' : 'border-transparent'}`}
           >
               <img 
                  src="https://picsum.photos/100/100?grayscale" 
                  alt="Me" 
                  className="w-10 h-10 rounded-full object-cover shadow-md group-hover:scale-105 transition-transform"
               />
               <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default Sidebar;