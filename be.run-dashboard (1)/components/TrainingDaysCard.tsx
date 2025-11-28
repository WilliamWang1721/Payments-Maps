import React from 'react';
import { ChevronDown } from 'lucide-react';

const TrainingDaysCard: React.FC = () => {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  // Mock calendar structure for June
  const calendarData = [
    [null, null, 1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10, 11, 12],
    [13, 14, 15, 16, 17, 18, 19],
    [20, 21, 22, 23, 24, 25, 26],
    [27, 28, 29, 30, null, null, null],
  ];

  const getDayStatusStyle = (day: number | null) => {
    if (!day) return '';
    if (day === 1 || day === 5) return 'bg-accent-yellow text-white font-bold shadow-lg shadow-blue-500/40 scale-110 ring-2 ring-blue-400/20'; // Current/Highlight
    if ([17, 19, 23, 28].includes(day)) return 'border border-gray-600 text-gray-300'; // Scheduled
    if (day < 12 && day !== 1 && day !== 5) return 'text-gray-500'; // Past
    return 'text-white';
  };

  return (
    <div className="bg-dark-card rounded-[32px] p-8 text-white h-full min-h-[320px] flex flex-col transition-all hover:shadow-2xl hover:shadow-blue-900/20 duration-300 relative overflow-hidden">
      {/* Subtle Gradient Overlay */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent-yellow/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      
      <div className="flex justify-between items-center mb-6 animate-fade-in relative z-10" style={{ animationDelay: '0.4s' }}>
        <h2 className="text-lg font-medium">Your Training Days</h2>
        <button className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
          June <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-between relative z-10">
        {/* Days Header */}
        <div className="grid grid-cols-7 mb-4 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          {days.map((d, i) => (
            <div key={i} className="text-center text-xs text-gray-400 font-medium">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="flex flex-col gap-3">
          {calendarData.map((week, wIndex) => (
            <div key={wIndex} className="grid grid-cols-7">
              {week.map((day, dIndex) => (
                <div key={dIndex} className="flex justify-center items-center h-8">
                  {day && (
                    <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all cursor-pointer hover:bg-gray-700/50 animate-scale-in ${getDayStatusStyle(day)}`}
                        style={{ animationDelay: `${0.5 + (wIndex * 0.1) + (dIndex * 0.05)}s` }}
                    >
                      {day}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-6 text-[10px] text-gray-400 animate-fade-in relative z-10" style={{ animationDelay: '0.8s' }}>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full border border-gray-500"></div>
          <span>Current day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-accent-yellow shadow shadow-blue-500/50"></div>
          <span className="text-white">Done</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-gray-600"></div>
          <span>Scheduled</span>
        </div>
      </div>
    </div>
  );
};

export default TrainingDaysCard;