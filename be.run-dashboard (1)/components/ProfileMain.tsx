import React from 'react';
import { Edit3, Heart, Star, Bookmark, Clock, CheckCircle, Loader, MapPin, ChevronRight } from 'lucide-react';

const ProfileMain: React.FC = () => {
  return (
    <div className="bg-white rounded-[32px] shadow-soft flex-1 flex flex-col relative overflow-hidden animate-fade-in-up border border-white/50 h-full min-h-[500px] overflow-y-auto custom-scrollbar" style={{ animationDelay: '0.3s' }}>
      
      {/* 1. Banner Section */}
      <div className="h-48 w-full bg-gradient-to-r from-accent-yellow to-accent-purple relative">
         <div className="absolute inset-0 bg-pattern opacity-10"></div>
         <div className="absolute -bottom-16 left-8 sm:left-12 flex items-end">
            <div className="relative">
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
                    <img src="https://picsum.photos/200/200?grayscale" alt="Profile" className="w-full h-full object-cover" />
                </div>
                <button className="absolute bottom-2 right-2 bg-cream p-2 rounded-full shadow-md hover:bg-white transition-colors text-soft-black">
                    <Edit3 className="w-4 h-4" />
                </button>
            </div>
            <div className="mb-4 ml-6 hidden sm:block">
                <h1 className="text-2xl font-bold text-soft-black">Amanda Rose</h1>
                <p className="text-gray-500 text-sm font-medium">Local Guide</p>
            </div>
         </div>
      </div>

      {/* 2. Main Content Container */}
      <div className="mt-20 px-8 sm:px-12 pb-12 flex flex-col gap-8">
        
        {/* Mobile Name (Visible only on small screens) */}
        <div className="sm:hidden">
            <h1 className="text-2xl font-bold text-soft-black">Amanda Rose</h1>
            <p className="text-gray-500 text-sm font-medium">Local Guide</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 bg-cream rounded-2xl p-6 shadow-sm border border-white">
            <div className="text-center border-r border-gray-200 last:border-0">
                <div className="text-2xl font-bold text-soft-black">42</div>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Added</div>
            </div>
            <div className="text-center border-r border-gray-200 last:border-0">
                <div className="text-2xl font-bold text-soft-black">128</div>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Reviews</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold text-soft-black">15</div>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Collections</div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Col: My Collections (Saved Places) */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-soft-black">My Collections</h3>
                    <button className="text-xs font-bold text-accent-yellow hover:text-accent-purple transition-colors bg-blue-50 px-3 py-1.5 rounded-lg">Create New</button>
                </div>
                
                <div className="flex flex-col gap-4">
                     {/* Favorites */}
                    <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-4 group">
                        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 group-hover:scale-105 transition-transform">
                            <Heart className="w-6 h-6 fill-current" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-soft-black">Favorites</h4>
                            <p className="text-xs text-gray-400">12 places • Private</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-accent-yellow" />
                    </div>

                    {/* Want to Go */}
                    <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-4 group">
                        <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-green-500 group-hover:scale-105 transition-transform">
                            <Bookmark className="w-6 h-6 fill-current" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-soft-black">Want to Go</h4>
                            <p className="text-xs text-gray-400">28 places • Public</p>
                        </div>
                         <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-accent-yellow" />
                    </div>

                    {/* Starred */}
                    <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-4 group">
                        <div className="w-14 h-14 rounded-2xl bg-yellow-50 flex items-center justify-center text-yellow-500 group-hover:scale-105 transition-transform">
                            <Star className="w-6 h-6 fill-current" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-soft-black">Starred Places</h4>
                            <p className="text-xs text-gray-400">5 places • Private</p>
                        </div>
                         <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-accent-yellow" />
                    </div>
                </div>

            </div>

            {/* Right Col: Browsing History & Contributions */}
             <div className="flex flex-col gap-8">
                
                {/* Browsing History */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                         <h3 className="text-lg font-bold text-soft-black">Browsing History</h3>
                         <button className="text-xs text-gray-400 hover:text-accent-yellow">View All</button>
                    </div>
                    
                    <div className="bg-white border border-gray-100 rounded-3xl p-2 shadow-sm">
                        {[
                            { name: 'Nike Lab', area: 'Palo Alto', time: '2h ago' },
                            { name: 'Blue Bottle', area: 'Downtown', time: '5h ago' },
                            { name: 'Tech Museum', area: 'San Jose', time: '1d ago' }
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 hover:bg-cream rounded-2xl transition-colors cursor-pointer group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-accent-yellow group-hover:text-white transition-colors">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-soft-black">{item.name}</h4>
                                        <p className="text-xs text-gray-400">{item.area}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] text-gray-300 font-medium">{item.time}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* My Contributions (Additions) */}
                <div className="flex flex-col gap-4">
                     <h3 className="text-lg font-bold text-soft-black">My Additions</h3>
                     
                     <div className="flex flex-col gap-3">
                         {/* Approved Item */}
                         <div className="bg-cream rounded-2xl p-4 flex items-center justify-between border border-white shadow-sm">
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
                                     <MapPin className="w-5 h-5" />
                                 </div>
                                 <div>
                                     <h4 className="text-sm font-bold text-soft-black">Central Park Yoga</h4>
                                     <div className="flex items-center gap-1 text-xs text-green-600 font-bold mt-0.5">
                                         <CheckCircle className="w-3 h-3" /> Approved
                                     </div>
                                 </div>
                             </div>
                             <div className="text-xs text-gray-400">May 28</div>
                         </div>

                         {/* Pending Item */}
                         <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm opacity-80">
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500">
                                     <MapPin className="w-5 h-5" />
                                 </div>
                                 <div>
                                     <h4 className="text-sm font-bold text-soft-black">Urban Garden</h4>
                                     <div className="flex items-center gap-1 text-xs text-orange-500 font-bold mt-0.5">
                                         <Loader className="w-3 h-3 animate-spin" /> Pending
                                     </div>
                                 </div>
                             </div>
                             <div className="text-xs text-gray-400">Yesterday</div>
                         </div>
                     </div>
                </div>

             </div>

        </div>

      </div>
    </div>
  );
};

export default ProfileMain;