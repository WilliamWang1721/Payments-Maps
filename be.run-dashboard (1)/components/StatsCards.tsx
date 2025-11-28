import React, { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';

export const StepsCard: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Circumference of circle with r=40 is ~251.2
  const strokeDashoffset = mounted ? 100 : 251.2;

  return (
    <div className="bg-white rounded-[32px] p-6 shadow-soft h-full flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-lg duration-300 border border-gray-100">
       {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl opacity-70"></div>

      <div className="relative z-10 animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <h3 className="font-bold text-lg text-soft-black">Steps for Today</h3>
        <p className="text-gray-400 text-xs mt-1">Keep your body toned</p>
      </div>

      <div className="flex items-center justify-between mt-4">
        <button className="flex items-center gap-2 text-xs font-semibold text-soft-black bg-cream px-3 py-2 rounded-full hover:bg-blue-50 transition-colors animate-fade-in" style={{ animationDelay: '0.5s' }}>
          Change Goal <div className="bg-soft-black text-white p-1 rounded-full"><Pencil className="w-3 h-3" /></div>
        </button>

        <div className="relative w-24 h-24 flex items-center justify-center animate-scale-in" style={{ animationDelay: '0.4s' }}>
            {/* SVG Radial Progress */}
            <svg className="w-full h-full transform -rotate-90">
                <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#F4F7FE"
                    strokeWidth="6"
                    fill="none"
                />
                <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#05CD99" /* Tech Teal */
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray="251.2"
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="drop-shadow-lg shadow-teal-500 transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-[10px] text-gray-400 font-medium">Goal</span>
                <span className="text-xl font-bold text-soft-black">8.500</span>
            </div>
             {/* Floating Badge */}
            <div className="absolute -top-1 right-0 bg-white shadow-md text-[10px] font-bold px-2 py-0.5 rounded-lg text-accent-salmon animate-fade-in-up border border-teal-50" style={{ animationDelay: '1s' }}>
                5.201
            </div>
        </div>
      </div>
    </div>
  );
};

export const WeightLossCard: React.FC = () => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const progressWidth = mounted ? '68%' : '0%';

  return (
    <div className="bg-white rounded-[32px] p-6 shadow-soft h-full flex flex-col justify-between relative transition-all hover:shadow-lg duration-300 border border-gray-100">
       <div className="flex justify-between items-start mb-4 animate-fade-in" style={{ animationDelay: '0.5s' }}>
         <h3 className="font-bold text-lg text-soft-black">Weight Loss Plan</h3>
         <div className="text-right">
            <span className="block text-xl font-bold text-soft-black">68%</span>
            <span className="text-xs text-gray-400">Completed</span>
         </div>
       </div>

       <div className="relative mt-2 mb-2">
            {/* Progress Bar Container */}
            <div className="h-3 w-full bg-cream rounded-full overflow-hidden">
                 <div className="h-full bg-gray-100 w-full"></div>
            </div>
            
            {/* Actual Progress Overlay with Thumb */}
            <div 
                className="absolute top-0 left-0 h-3 bg-soft-black rounded-full flex items-center justify-end transition-all duration-1000 ease-out shadow-lg shadow-blue-900/20"
                style={{ width: progressWidth }}
            >
                <div className="w-1 h-3 bg-white/30 mr-1 rounded-full"></div>
            </div>
            
            {/* Current Weight Tooltip */}
            <div 
                className="absolute -top-10 -translate-x-1/2 bg-soft-black text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-xl shadow-blue-900/30 after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-soft-black transition-all duration-1000 ease-out"
                style={{ left: progressWidth, opacity: mounted ? 1 : 0 }}
            >
                53.2 kg
            </div>
       </div>

       <div className="flex justify-between text-xs font-semibold text-soft-black mt-2 animate-fade-in" style={{ animationDelay: '0.8s' }}>
            <span>58 kg</span>
            <span>50 kg</span>
       </div>
    </div>
  );
};