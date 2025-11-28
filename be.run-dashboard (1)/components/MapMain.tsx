import React from 'react';
import { MapPin, Navigation, Compass, Tag } from 'lucide-react';

const MapMain: React.FC = () => {
  return (
    <div className="bg-white rounded-[32px] shadow-soft flex-1 relative overflow-hidden animate-fade-in-up transition-all hover:shadow-lg duration-300 border border-white/50 group h-full min-h-[500px]" style={{ animationDelay: '0.3s' }}>
      
      {/* Map Background Placeholder - Using a pattern to simulate a map surface */}
      <div className="absolute inset-0 bg-[#f0f4f8]">
           {/* Grid Pattern */}
           <div className="w-full h-full opacity-30" style={{ 
               backgroundImage: 'radial-gradient(#a0aec0 1px, transparent 1px)', 
               backgroundSize: '24px 24px' 
           }}></div>
           
           {/* Abstract Map Roads/Shapes */}
           <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
               <path d="M-100,100 Q400,300 600,100 T1200,400" fill="none" stroke="#CBD5E0" strokeWidth="20" />
               <path d="M200,800 Q500,500 800,800 T1400,600" fill="none" stroke="#CBD5E0" strokeWidth="15" />
               <circle cx="600" cy="300" r="100" fill="#E2E8F0" />
           </svg>
      </div>
      
      {/* Decorative Map Interaction Elements */}
      <div className="absolute inset-0">
          {/* Animated Path Line */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-sm">
             <path d="M300,400 Q500,200 700,400" fill="none" stroke="#4318FF" strokeWidth="3" strokeLinecap="round" strokeDasharray="8 8" className="opacity-60 animate-pulse" />
          </svg>

          {/* Marker 1: Tech Hub */}
          <div className="absolute top-1/3 left-1/3 transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform duration-300 cursor-pointer z-20">
              <div className="relative group/marker">
                  <div className="w-14 h-14 bg-accent-yellow rounded-full rounded-bl-none transform -rotate-45 flex items-center justify-center text-white shadow-xl shadow-blue-500/40 animate-float border-4 border-white">
                      <div className="transform rotate-45">
                        <MapPin className="w-6 h-6" />
                      </div>
                  </div>
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-black/20 blur-sm rounded-full"></div>
                  {/* Tooltip */}
                  <div className="absolute bottom-[120%] left-1/2 -translate-x-1/2 mb-2 bg-white px-4 py-2 rounded-xl shadow-soft text-sm font-bold text-soft-black whitespace-nowrap opacity-0 group-hover/marker:opacity-100 transition-all transform translate-y-2 group-hover/marker:translate-y-0 pointer-events-none z-30">
                      Apple Store
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white transform rotate-45"></div>
                  </div>
              </div>
          </div>

          {/* Marker 2: Brand Store */}
          <div className="absolute bottom-1/3 right-1/4 transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform duration-300 cursor-pointer z-10" style={{ animationDelay: '1.5s' }}>
              <div className="relative group/marker">
                   <div className="w-10 h-10 bg-accent-salmon rounded-full flex items-center justify-center text-white shadow-lg shadow-teal-500/40 animate-float-delayed border-2 border-white">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-1 bg-black/20 blur-sm rounded-full"></div>
                   <div className="absolute bottom-[130%] left-1/2 -translate-x-1/2 mb-2 bg-white px-3 py-1.5 rounded-xl shadow-soft text-xs font-bold text-soft-black whitespace-nowrap opacity-0 group-hover/marker:opacity-100 transition-all pointer-events-none z-30">
                      Nike Lab
                  </div>
              </div>
          </div>
          
          {/* User Location Pulse */}
           <div className="absolute top-1/2 right-1/3 transform -translate-x-1/2 -translate-y-1/2 z-10" style={{ animationDelay: '2s' }}>
              <div className="relative flex items-center justify-center">
                  <div className="w-32 h-32 bg-accent-yellow/10 rounded-full animate-ping absolute"></div>
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-accent-yellow shadow-lg border border-gray-100">
                      <Navigation className="w-4 h-4 transform rotate-45" fill="currentColor" />
                  </div>
              </div>
          </div>
      </div>

      {/* Map Controls - Positioned higher on mobile to avoid Nav Bar */}
      <div className="absolute bottom-28 md:bottom-8 right-4 md:right-8 flex flex-col gap-3 z-30 transition-all duration-300">
          <div className="bg-white/90 backdrop-blur-sm p-1.5 rounded-2xl shadow-soft border border-white/50 flex flex-col gap-1">
            <button className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-600 hover:text-accent-yellow hover:bg-blue-50 transition-all active:scale-95">
                <span className="text-xl font-bold">+</span>
            </button>
            <div className="w-full h-[1px] bg-gray-100"></div>
            <button className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-600 hover:text-accent-yellow hover:bg-blue-50 transition-all active:scale-95">
                <span className="text-xl font-bold">-</span>
            </button>
          </div>
          
          <button className="w-12 h-12 bg-soft-black text-white rounded-2xl shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
              <Compass className="w-6 h-6 animate-spin-slow" />
          </button>
      </div>

      {/* Floating Info Card (Mock) */}
      <div className="absolute top-4 left-4 md:top-8 md:left-8 bg-white/90 backdrop-blur-md p-3 md:p-4 rounded-2xl shadow-soft border border-white/50 max-w-[200px] md:max-w-xs animate-slide-in-left z-30">
        <h3 className="font-bold text-soft-black text-xs md:text-sm">Nearby Activity</h3>
        <div className="flex items-center gap-3 mt-2 md:mt-3">
             <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500 flex-shrink-0">
                <Tag className="w-4 h-4 md:w-5 md:h-5" />
             </div>
             <div>
                 <div className="text-xs font-bold text-soft-black">Summer Sale</div>
                 <div className="text-[10px] text-gray-500 leading-tight">5 stores nearby offering discounts</div>
             </div>
        </div>
      </div>
    </div>
  );
};

export default MapMain;