import React from 'react';
import { Bell, MessageSquare, Tag, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface NotificationItem {
  id: number;
  type: 'message' | 'alert' | 'promo' | 'success';
  title: string;
  description: string;
  time: string;
  isUnread: boolean;
}

const notificationsData: NotificationItem[] = [
  {
    id: 1,
    type: 'message',
    title: 'New Message from Alice',
    description: 'Hey! Are we still meeting at the Nike Lab later today?',
    time: '2 min ago',
    isUnread: true,
  },
  {
    id: 2,
    type: 'promo',
    title: 'New Brand Added',
    description: 'Adidas Originals has just been added to the map near you.',
    time: '1 hour ago',
    isUnread: true,
  },
  {
    id: 3,
    type: 'alert',
    title: 'System Update',
    description: 'Be.run dashboard scheduled maintenance tonight at 02:00 AM.',
    time: '5 hours ago',
    isUnread: false,
  },
  {
    id: 4,
    type: 'success',
    title: 'Goal Reached!',
    description: 'Congratulations! You hit your daily step goal of 8,500.',
    time: '1 day ago',
    isUnread: false,
  },
  {
    id: 5,
    type: 'message',
    title: 'Trainer Jennifer Lubin',
    description: 'Great session yesterday. Remember to stretch!',
    time: '2 days ago',
    isUnread: false,
  },
];

const NotificationsMain: React.FC = () => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="w-5 h-5 text-white" />;
      case 'promo': return <Tag className="w-5 h-5 text-white" />;
      case 'alert': return <AlertCircle className="w-5 h-5 text-white" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-white" />;
      default: return <Bell className="w-5 h-5 text-white" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'message': return 'bg-accent-yellow shadow-blue-500/30';
      case 'promo': return 'bg-accent-purple shadow-purple-500/30';
      case 'alert': return 'bg-orange-400 shadow-orange-500/30';
      case 'success': return 'bg-accent-salmon shadow-teal-500/30';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="bg-white rounded-[32px] shadow-soft flex-1 flex flex-col relative overflow-hidden animate-fade-in-up border border-white/50 h-full min-h-[500px]" style={{ animationDelay: '0.3s' }}>
      
      {/* Header */}
      <div className="p-8 pb-4 flex items-center justify-between border-b border-gray-50 z-10 bg-white sticky top-0">
        <div>
           <h2 className="text-2xl font-bold text-soft-black tracking-tight">Notifications</h2>
           <p className="text-sm text-gray-400 mt-1">You have 2 unread messages</p>
        </div>
        <button className="text-xs font-bold text-accent-yellow hover:text-accent-purple transition-colors bg-blue-50 px-4 py-2 rounded-xl">
            Mark all as read
        </button>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar space-y-8">
        
        {/* Section: New */}
        <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">New</h3>
            <div className="space-y-3">
                {notificationsData.filter(n => n.isUnread).map((item, index) => (
                    <div 
                        key={item.id} 
                        className="group flex items-start gap-4 p-4 rounded-2xl bg-cream border border-transparent hover:border-blue-100 transition-all cursor-pointer relative animate-fade-in-up"
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg ${getColor(item.type)} group-hover:scale-105 transition-transform duration-300`}>
                            {getIcon(item.type)}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h4 className="text-sm font-bold text-soft-black group-hover:text-accent-yellow transition-colors">{item.title}</h4>
                                <span className="text-[10px] text-gray-400 font-medium bg-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {item.time}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.description}</p>
                        </div>
                        <div className="absolute top-1/2 right-4 -translate-y-1/2 w-2 h-2 bg-accent-salmon rounded-full shadow-sm"></div>
                    </div>
                ))}
            </div>
        </div>

         {/* Section: Earlier */}
         <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Earlier</h3>
            <div className="space-y-3">
                {notificationsData.filter(n => !n.isUnread).map((item, index) => (
                    <div 
                        key={item.id} 
                        className="group flex items-start gap-4 p-4 rounded-2xl bg-white border border-gray-100 hover:shadow-soft transition-all cursor-pointer animate-fade-in-up"
                        style={{ animationDelay: `${0.2 + (index * 0.1)}s` }}
                    >
                        <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center shadow-md ${getColor(item.type)} opacity-80 group-hover:opacity-100 transition-opacity`}>
                            {getIcon(item.type)}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h4 className="text-sm font-bold text-gray-700">{item.title}</h4>
                                <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                                    {item.time}
                                </span>
                            </div>
                            <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};

export default NotificationsMain;