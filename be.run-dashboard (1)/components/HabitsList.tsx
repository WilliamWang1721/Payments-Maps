import React from 'react';
import { Plus, MoreHorizontal } from 'lucide-react';
import { Habit } from '../types';

const habits: Habit[] = [
    { id: '1', name: 'Stretching', trainer: 'Alice McCain', completedSessions: 9, totalSessions: 12, icon: '🧘‍♀️', color: 'bg-indigo-50' },
    { id: '2', name: 'Yoga training', trainer: 'Jennifer Lubin', completedSessions: 6, totalSessions: 10, icon: '🤸‍♀️', color: 'bg-teal-50' },
    { id: '3', name: 'Massage', trainer: 'Johnson Cooper', completedSessions: 4, totalSessions: 8, icon: '💆‍♂️', color: 'bg-blue-50' },
    { id: '4', name: 'Ab exercises', trainer: '', completedSessions: 8, totalSessions: 10, icon: '👟', color: 'bg-violet-50' },
];

const HabitsList: React.FC = () => {
  return (
    <div className="bg-white rounded-[32px] p-8 shadow-soft h-full flex flex-col transition-all hover:shadow-lg duration-300 border border-gray-100">
      <div className="flex justify-between items-center mb-6 animate-fade-in" style={{ animationDelay: '0.6s' }}>
        <h3 className="text-lg font-bold text-soft-black">My Habits</h3>
        <button className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-accent-yellow transition-colors">
            Add New 
            <div className="bg-soft-black text-white rounded-full p-1 hover:bg-accent-yellow transition-colors">
                <Plus className="w-3 h-3" />
            </div>
        </button>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
        {habits.map((habit, index) => (
            <div 
                key={habit.id} 
                className="flex items-center justify-between p-3 hover:bg-cream rounded-2xl transition-all group animate-fade-in-up"
                style={{ animationDelay: `${0.7 + (index * 0.1)}s` }}
            >
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl ${habit.color} flex items-center justify-center text-xl shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                        {habit.icon}
                    </div>
                    <div>
                        <h4 className="font-bold text-sm text-soft-black">{habit.name}</h4>
                        {habit.trainer && <p className="text-xs text-gray-400">Trainer: {habit.trainer}</p>}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                        <span className="text-xs text-gray-500">Sessions completed: {habit.completedSessions}/{habit.totalSessions}</span>
                        <div className="flex gap-0.5 mt-1">
                            {[...Array(12)].map((_, i) => (
                                <div 
                                    key={i} 
                                    className={`w-1 h-3 rounded-full transition-colors duration-500 ${i < habit.completedSessions ? 'bg-accent-salmon' : 'bg-gray-200'}`}
                                    style={{ transitionDelay: `${index * 50 + i * 30}ms` }}
                                ></div>
                            ))}
                        </div>
                    </div>
                    <button className="text-gray-400 hover:text-soft-black p-1">
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default HabitsList;