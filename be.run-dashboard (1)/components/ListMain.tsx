import React from 'react';
import { MapPin, Calendar, Navigation, MoreHorizontal, ArrowRight, Tag } from 'lucide-react';

interface ListItem {
  id: number;
  name: string;
  address: string;
  distance: string;
  dateAdded: string;
  category: string;
  categoryColor: string;
  tags: string[];
}

const mockData: ListItem[] = [
  { 
    id: 1, 
    name: 'Apple Store', 
    address: '123 Tech Blvd, San Francisco, CA', 
    distance: '0.8 km', 
    dateAdded: 'June 12, 2024', 
    category: 'Retail', 
    categoryColor: 'bg-accent-yellow',
    tags: ['Tech', 'Gadgets', 'Support']
  },
  { 
    id: 2, 
    name: 'Nike Lab', 
    address: '450 Innovation Way, Palo Alto, CA', 
    distance: '1.2 km', 
    dateAdded: 'June 10, 2024', 
    category: 'Brand', 
    categoryColor: 'bg-accent-salmon',
    tags: ['Sportswear', 'Shoes', 'Limited Edition']
  },
  { 
    id: 3, 
    name: 'Blue Bottle Coffee', 
    address: '89 Main St, San Francisco, CA', 
    distance: '0.3 km', 
    dateAdded: 'June 14, 2024', 
    category: 'Cafe', 
    categoryColor: 'bg-blue-400',
    tags: ['Coffee', 'Pastries', 'Workspace']
  },
  { 
    id: 4, 
    name: 'Central Park Yoga', 
    address: 'Park Avenue, Entrance 4', 
    distance: '2.5 km', 
    dateAdded: 'May 28, 2024', 
    category: 'Health', 
    categoryColor: 'bg-accent-purple',
    tags: ['Yoga', 'Wellness', 'Outdoor']
  },
  { 
    id: 5, 
    name: 'Tech Museum', 
    address: '201 S Market St, San Jose, CA', 
    distance: '12.0 km', 
    dateAdded: 'May 15, 2024', 
    category: 'Culture', 
    categoryColor: 'bg-indigo-500',
    tags: ['Museum', 'Interactive', 'Science']
  },
  { 
    id: 6, 
    name: 'Whole Foods Market', 
    address: '3000 Telegraph Ave, Berkeley, CA', 
    distance: '5.6 km', 
    dateAdded: 'June 01, 2024', 
    category: 'Grocery', 
    categoryColor: 'bg-green-500',
    tags: ['Organic', 'Groceries', 'Fresh']
  },
];

const ListMain: React.FC = () => {
  return (
    <div className="bg-white rounded-[32px] shadow-soft flex-1 flex flex-col relative overflow-hidden animate-fade-in-up border border-white/50 h-full min-h-[500px]" style={{ animationDelay: '0.3s' }}>
      
      {/* List Header */}
      <div className="p-8 pb-4 flex items-center justify-between z-10 bg-white sticky top-0 border-b border-gray-50">
        <div>
           <h2 className="text-2xl font-bold text-soft-black tracking-tight">Saved Places</h2>
           <p className="text-sm text-gray-400 mt-1">6 locations saved this month</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-gray-400 bg-cream px-3 py-1.5 rounded-full">
            <span>Sort by:</span>
            <span className="text-soft-black cursor-pointer hover:text-accent-yellow">Date Added</span>
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-8 pt-2 custom-scrollbar space-y-4">
        {mockData.map((item, index) => (
          <div 
            key={item.id} 
            className="group relative bg-white border border-gray-100 rounded-3xl p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 transition-all duration-300 hover:shadow-soft hover:border-blue-100 hover:translate-x-1 animate-fade-in-up"
            style={{ animationDelay: `${0.1 * index}s` }}
          >
            {/* Left: Icon & Info */}
            <div className="flex items-start gap-5 flex-1">
              {/* Category Icon */}
              <div className={`w-14 h-14 rounded-2xl ${item.categoryColor} flex-shrink-0 flex items-center justify-center text-white shadow-lg shadow-blue-900/10 group-hover:scale-105 transition-transform duration-300`}>
                <span className="font-bold text-lg">{item.name.charAt(0)}</span>
              </div>
              
              <div className="flex flex-col gap-1 w-full">
                <h3 className="font-bold text-lg text-soft-black group-hover:text-accent-yellow transition-colors">{item.name}</h3>
                
                <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{item.address}</span>
                </div>

                {/* Tags Section */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {item.tags.map((tag, i) => (
                    <span 
                      key={i} 
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-cream text-gray-500 border border-transparent hover:border-accent-yellow/30 hover:text-accent-yellow transition-colors cursor-default"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Meta Data & Actions */}
            <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 md:gap-6 min-w-fit mt-2 md:mt-0">
              
              {/* Distance & Date */}
              <div className="flex flex-col items-start md:items-end">
                <div className="flex items-center gap-1.5 text-accent-yellow font-bold text-sm bg-blue-50 px-2.5 py-1 rounded-lg whitespace-nowrap">
                    <Navigation className="w-3.5 h-3.5 fill-current" />
                    {item.distance}
                </div>
                <div className="flex items-center gap-1.5 text-gray-400 text-[10px] mt-1.5 font-medium whitespace-nowrap">
                  <Calendar className="w-3 h-3" />
                  {item.dateAdded}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                 <button className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-soft-black hover:text-white hover:border-transparent transition-all active:scale-95 group/btn">
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                 </button>
                 <button className="p-2 text-gray-300 hover:text-soft-black transition-colors rounded-full hover:bg-gray-50">
                    <MoreHorizontal className="w-5 h-5" />
                 </button>
              </div>
            </div>
            
          </div>
        ))}
        
        {/* Empty Space at bottom for scrolling comfort */}
        <div className="h-10"></div>
      </div>
    </div>
  );
};

export default ListMain;