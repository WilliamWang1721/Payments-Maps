import React from 'react';
import { Search, SlidersHorizontal, MapPin } from 'lucide-react';

interface HeaderProps {
  currentView: 'map' | 'list' | 'brand' | 'me' | 'notifications' | 'settings';
}

const Header: React.FC<HeaderProps> = ({ currentView }) => {
  const getGreeting = () => {
      switch(currentView) {
          case 'me': return 'Profile';
          case 'notifications': return 'Updates';
          case 'list': return 'Saved Places';
          case 'brand': return 'Brands';
          case 'settings': return 'Settings';
          default: return 'Good Morning!';
      }
  };

  const getSubtext = () => {
      switch(currentView) {
          case 'me': return 'Manage your account.';
          case 'notifications': return 'Latest alerts.';
          case 'list': return 'Your favorite spots.';
          case 'brand': return 'Explore top brands.';
          case 'settings': return 'Customize app.';
          default: return 'Discover local gems.';
      }
  };

  return (
    <div className="flex flex-col gap-4 mb-4 md:mb-6">
      
      {/* Mobile Brand Header (Visible only on mobile) */}
      <div className="md:hidden flex items-center justify-between animate-fade-in-up">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm">
                  <img src="web_logo.JPG" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                  <h1 className="text-xl font-bold text-soft-black leading-none">Be.run</h1>
                  <p className="text-[10px] text-gray-400 font-medium tracking-wide">DASHBOARD</p>
              </div>
          </div>
          {/* Mobile Profile Icon (Shortcut) */}
          <div className="w-8 h-8 rounded-full bg-cream overflow-hidden">
               <img src="https://picsum.photos/100/100?grayscale" alt="User" className="w-full h-full object-cover" />
          </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Greeting Section */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-2xl md:text-3xl font-bold text-soft-black tracking-tight">
             {getGreeting()}
          </h1>
          <p className="text-gray-500 mt-1 text-xs md:text-sm font-medium">
             {getSubtext()}
          </p>
        </div>

        {/* Actions Section: Search, Filter, Location */}
        <div className="flex items-center gap-3 animate-fade-in-up w-full md:w-auto" style={{ animationDelay: '0.2s' }}>
          
          {/* Search Box */}
          <div className="relative group flex-1 md:flex-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-accent-yellow transition-colors" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-white pl-10 pr-4 py-3 rounded-2xl text-sm w-full md:w-64 shadow-soft border border-transparent focus:border-accent-yellow/50 focus:outline-none focus:ring-4 focus:ring-accent-yellow/10 transition-all placeholder:text-gray-400 text-soft-black"
            />
          </div>

          {/* Filter Button */}
          <button className="bg-white p-3 rounded-2xl shadow-soft text-gray-500 hover:text-accent-yellow hover:scale-105 transition-all active:scale-95 border border-transparent hover:border-gray-100 flex-shrink-0">
            <SlidersHorizontal className="w-5 h-5" />
          </button>

          {/* Get Current Location Button - Only visible in Map view and Tablet/Desktop */}
          {currentView === 'map' && (
            <button className="hidden md:flex bg-soft-black text-white px-4 py-3 rounded-2xl text-sm font-medium hover:bg-accent-yellow transition-all hover:scale-105 shadow-lg shadow-blue-900/20 active:scale-95 items-center gap-2 animate-scale-in">
                <MapPin className="w-4 h-4" />
                <span className="hidden lg:inline">Location</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;