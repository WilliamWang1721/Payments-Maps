import React, { useState } from 'react';
import { Moon, Globe, Bell, Shield, Smartphone, ChevronRight, LogOut, HelpCircle, Eye, Key, Mail, Hash, Map as MapIcon, Sliders } from 'lucide-react';

const SettingsMain: React.FC = () => {
  const [radius, setRadius] = useState(5);

  const IconWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-soft-black group-hover:scale-105 transition-transform duration-300">
      {children}
    </div>
  );

  return (
    <div className="bg-white rounded-[32px] shadow-soft flex-1 flex flex-col relative overflow-hidden animate-fade-in-up border border-white/50 h-full min-h-[500px]" style={{ animationDelay: '0.3s' }}>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        
        {/* Section: User Profile Card */}
        <div className="bg-cream rounded-[24px] p-6 mb-8 flex items-center gap-5 border border-white shadow-sm animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-md flex-shrink-0">
                 <img src="https://picsum.photos/200/200?grayscale" alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
                 <h2 className="text-xl font-bold text-soft-black truncate">Amanda Rose</h2>
                 <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Hash className="w-3 h-3" />
                        <span>ID: <span className="font-mono text-soft-black">883421</span></span>
                    </div>
                    <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">amanda.rose@example.com</span>
                    </div>
                 </div>
            </div>
            <button className="hidden sm:block text-xs font-bold bg-white px-4 py-2 rounded-xl shadow-sm text-soft-black hover:bg-gray-50 transition-colors">
                Edit
            </button>
        </div>

        {/* Grid Layout for Settings Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Left Column */}
            <div className="flex flex-col gap-8">
                
                {/* Section: Account & Security */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 ml-2">Account & Security</h3>
                    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-soft flex flex-col gap-6">
                        
                        {/* Row: 2FA */}
                        <div className="flex items-center justify-between group cursor-pointer">
                            <div className="flex items-center gap-4">
                                <IconWrapper>
                                    <Smartphone className="w-5 h-5" />
                                </IconWrapper>
                                <div>
                                    <h4 className="text-sm font-bold text-soft-black">Two-Factor Auth</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">Enabled via SMS</p>
                                </div>
                            </div>
                            <div className="w-12 h-6 bg-soft-black rounded-full relative transition-colors duration-300">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300"></div>
                            </div>
                        </div>

                        <div className="h-[1px] w-full bg-cream"></div>

                        {/* Row: Passkeys (New) */}
                        <div className="flex items-center justify-between group cursor-pointer">
                            <div className="flex items-center gap-4">
                                <IconWrapper>
                                    <Key className="w-5 h-5" />
                                </IconWrapper>
                                <div>
                                    <h4 className="text-sm font-bold text-soft-black">Passkeys</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">Manage biometric keys</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-soft-black transition-colors" />
                        </div>

                        <div className="h-[1px] w-full bg-cream"></div>

                        {/* Row: Privacy */}
                        <div className="flex items-center justify-between group cursor-pointer">
                            <div className="flex items-center gap-4">
                                <IconWrapper>
                                    <Eye className="w-5 h-5" />
                                </IconWrapper>
                                <div>
                                    <h4 className="text-sm font-bold text-soft-black">Profile Visibility</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">Visible to Friends Only</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-soft-black transition-colors" />
                        </div>
                    </div>
                </div>

                {/* Section: App Preferences */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 ml-2">App Preferences</h3>
                    <div className="bg-cream rounded-3xl p-6 border border-white shadow-sm flex flex-col gap-6">
                        
                        {/* Row: Dark Mode */}
                        <div className="flex items-center justify-between group cursor-pointer">
                            <div className="flex items-center gap-4">
                                <IconWrapper>
                                    <Moon className="w-5 h-5" />
                                </IconWrapper>
                                <div>
                                    <h4 className="text-sm font-bold text-soft-black">Dark Mode</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">Switch interface theme</p>
                                </div>
                            </div>
                            <div className="w-12 h-6 bg-gray-200 rounded-full relative transition-colors duration-300 group-hover:bg-gray-300">
                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300"></div>
                            </div>
                        </div>

                        <div className="h-[1px] w-full bg-gray-200/50"></div>

                        {/* Row: Language */}
                        <div className="flex items-center justify-between group cursor-pointer">
                            <div className="flex items-center gap-4">
                                <IconWrapper>
                                    <Globe className="w-5 h-5" />
                                </IconWrapper>
                                <div>
                                    <h4 className="text-sm font-bold text-soft-black">Language</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">English (US)</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-soft-black transition-colors" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-8">

                {/* Section: Map Configuration (New) */}
                <div>
                     <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 ml-2">Map Settings</h3>
                     <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-soft flex flex-col gap-6">
                        
                         {/* Row: Search Radius */}
                         <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-4">
                                <IconWrapper>
                                    <MapIcon className="w-5 h-5" />
                                </IconWrapper>
                                <div>
                                    <h4 className="text-sm font-bold text-soft-black">Search Radius</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">Default area for new searches</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 pl-14">
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="50" 
                                    value={radius}
                                    onChange={(e) => setRadius(parseInt(e.target.value))}
                                    className="flex-1 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-soft-black"
                                />
                                <span className="text-xs font-bold text-soft-black w-12 text-right">{radius} km</span>
                            </div>
                         </div>

                         <div className="h-[1px] w-full bg-cream"></div>

                         {/* Row: Show POI Labels */}
                         <div className="flex items-center justify-between group cursor-pointer">
                            <div className="flex items-center gap-4">
                                <IconWrapper>
                                    <Sliders className="w-5 h-5" />
                                </IconWrapper>
                                <div>
                                    <h4 className="text-sm font-bold text-soft-black">Detailed Labels</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">Show POI names on map zoom</p>
                                </div>
                            </div>
                            <div className="w-12 h-6 bg-soft-black rounded-full relative transition-colors duration-300">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300"></div>
                            </div>
                        </div>
                     </div>
                </div>

                 {/* Section: Notifications (New) */}
                 <div>
                     <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 ml-2">Notifications</h3>
                     <div className="bg-cream rounded-3xl p-6 border border-white shadow-sm flex flex-col gap-6">
                         
                        {/* Row: Push Notifications */}
                        <div className="flex items-center justify-between group cursor-pointer">
                            <div className="flex items-center gap-4">
                                <IconWrapper>
                                    <Bell className="w-5 h-5" />
                                </IconWrapper>
                                <div>
                                    <h4 className="text-sm font-bold text-soft-black">Push Alerts</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">Nearby offers & friends</p>
                                </div>
                            </div>
                            <div className="w-12 h-6 bg-soft-black rounded-full relative transition-colors duration-300">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300"></div>
                            </div>
                        </div>

                        <div className="h-[1px] w-full bg-gray-200/50"></div>

                         {/* Row: Email Digest */}
                         <div className="flex items-center justify-between group cursor-pointer">
                            <div className="flex items-center gap-4">
                                <IconWrapper>
                                    <Mail className="w-5 h-5" />
                                </IconWrapper>
                                <div>
                                    <h4 className="text-sm font-bold text-soft-black">Email Digest</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">Weekly activity summary</p>
                                </div>
                            </div>
                            <div className="w-12 h-6 bg-gray-200 rounded-full relative transition-colors duration-300 group-hover:bg-gray-300">
                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300"></div>
                            </div>
                        </div>

                     </div>
                </div>
                
                 {/* Section: Danger Zone */}
                 <div className="bg-white border border-red-50 rounded-3xl p-2 shadow-sm">
                     <div className="flex items-center justify-between group cursor-pointer hover:bg-red-50 rounded-2xl p-4 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-transparent border border-gray-200 flex items-center justify-center text-red-400 group-hover:border-red-400 group-hover:text-red-500 transition-colors">
                                <LogOut className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-red-500">Delete Account</h4>
                                <p className="text-xs text-red-300 mt-0.5">Permanent action</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-red-200 group-hover:text-red-500" />
                    </div>
                 </div>

            </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsMain;