import React from 'react';
import { Calendar } from 'lucide-react';

const WorkoutResultsCard: React.FC = () => {
  return (
    <div className="bg-white rounded-[32px] p-8 relative overflow-hidden h-full min-h-[320px] transition-all hover:shadow-soft duration-500 border border-gray-100">
      {/* Header */}
      <div className="flex justify-between items-start z-10 relative animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <div>
          <h2 className="text-xl font-bold text-soft-black">Your Workout</h2>
          <h2 className="text-xl font-bold text-soft-black">Results for Today</h2>
        </div>
        <button className="p-2 bg-cream text-accent-yellow rounded-full hover:bg-blue-50 transition-colors hover:rotate-12 transform duration-300">
            <Calendar className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-8 left-8 flex flex-col gap-3 z-10 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-2 bg-accent-yellow rounded-full shadow-sm"></div>
          <span className="text-xs font-medium text-gray-500">Calories intake</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-2 bg-accent-salmon rounded-full shadow-sm"></div>
          <span className="text-xs font-medium text-gray-500">Calories burned</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-2 bg-dark-card rounded-full shadow-sm"></div>
          <span className="text-xs font-medium text-gray-500">Activity time</span>
        </div>
      </div>

      {/* Visualizations (Bubbles) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none">
        
        {/* Navy Bubble (Time) - Float Animation */}
        <div className="absolute top-[30%] left-[35%] z-20 animate-float-delayed">
             <div className="w-24 h-24 bg-dark-card rounded-full flex flex-col items-center justify-center text-white shadow-xl shadow-blue-900/20 animate-scale-in duration-700 hover:scale-110 transition-transform cursor-pointer border border-white/10">
                <span className="text-lg font-bold">2.30</span>
                <span className="text-[10px] text-gray-300">hours</span>
             </div>
        </div>

        {/* Blue Bubble (Intake) - Float Animation */}
        <div className="absolute top-[20%] right-[10%] z-10 animate-float">
            <div className="w-48 h-48 bg-accent-yellow rounded-full flex flex-col items-center justify-center text-white blur-0 shadow-[0_0_40px_rgba(67,24,255,0.4)] opacity-90 animate-scale-in duration-700 delay-100 hover:scale-105 transition-transform">
                <span className="text-2xl font-bold">1.875</span>
                <span className="text-xs font-medium text-blue-100">kcal</span>
            </div>
        </div>

        {/* Teal Bubble (Burned) - Float Animation */}
        <div className="absolute bottom-[20%] left-[40%] z-15 animate-float-slow">
             <div className="w-32 h-32 bg-accent-salmon rounded-full flex flex-col items-center justify-center text-white mix-blend-normal blur-[1px] shadow-[0_0_30px_rgba(5,205,153,0.3)] animate-scale-in duration-700 delay-200 hover:scale-110 transition-transform">
                <span className="text-xl font-bold">850</span>
                <span className="text-xs font-medium text-green-50">kcal</span>
             </div>
        </div>

        {/* Decorative Blurs (Tech Colors) */}
        <div className="absolute top-[25%] right-[15%] w-40 h-40 bg-blue-200/50 rounded-full blur-3xl opacity-50 -z-10 animate-pulse"></div>
        <div className="absolute bottom-[25%] left-[42%] w-28 h-28 bg-teal-200/50 rounded-full blur-3xl opacity-50 -z-10 animate-pulse delay-700"></div>
      </div>
    </div>
  );
};

export default WorkoutResultsCard;