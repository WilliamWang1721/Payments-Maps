import React, { useState } from 'react';
import { ChevronDown, ChevronRight, MapPin, CreditCard, Smartphone, Check, X, HelpCircle, Plus, Trash2, ArrowLeft, CheckCircle, Settings } from 'lucide-react';

type SchemeID = 'visa' | 'mastercard' | 'amex' | 'unionpay' | 'jcb' | 'discover';
type TapMethod = 'card' | 'apple' | 'google' | 'hce';
type TapState = 'yes' | 'no' | 'unknown';

const SCHEMES: { id: SchemeID; label: string; color: string }[] = [
  { id: 'visa', label: 'Visa', color: 'bg-[#1A1F71]' },
  { id: 'mastercard', label: 'MasterCard', color: 'bg-[#EB001B]' },
  { id: 'amex', label: 'Amex', color: 'bg-[#2E77BB]' },
  { id: 'unionpay', label: 'UnionPay', color: 'bg-[#00537F]' },
  { id: 'jcb', label: 'JCB', color: 'bg-[#1F2F5D]' },
  { id: 'discover', label: 'Discover', color: 'bg-[#F97316]' },
];

const AddMain: React.FC = () => {
  const [step, setStep] = useState(1);
  const [isBillDetailsOpen, setIsBillDetailsOpen] = useState(false);

  // --- Form State ---
  const [formData, setFormData] = useState({
    // Step 1
    name: '',
    address: '',
    latLng: '',
    billName: '',
    mcc: '',
    // Step 2
    model: 'Term-X1',
    acquirer: 'Bank-A',
    dcc: false,
    edc: true,
    schemes: ['visa', 'mastercard', 'unionpay'] as SchemeID[],
    tapSupport: {
      card: 'yes',
      apple: 'yes',
      google: 'yes',
      hce: 'unknown',
    } as Record<TapMethod, TapState>,
    cvm: {
      noPin: ['visa', 'mastercard'],
      pin: ['unionpay'],
      signature: [],
    } as Record<string, SchemeID[]>,
    // Step 3
    fees: {
      visa: { enabled: true, type: 'percent', value: '1.5' },
      mastercard: { enabled: true, type: 'percent', value: '1.5' },
      unionpay: { enabled: true, type: 'fixed', value: '0.5' },
    } as Record<string, { enabled: boolean; type: 'percent' | 'fixed'; value: string }>,
    // Step 4
    notes: '',
    links: [] as string[],
  });

  const [activeCvmTab, setActiveCvmTab] = useState<'noPin' | 'pin' | 'signature'>('noPin');

  // --- Handlers ---
  const nextStep = () => setStep((p) => Math.min(p + 1, 4));
  const prevStep = () => setStep((p) => Math.max(p - 1, 1));

  const toggleScheme = (id: SchemeID) => {
    setFormData((prev) => {
      const exists = prev.schemes.includes(id);
      return {
        ...prev,
        schemes: exists ? prev.schemes.filter((s) => s !== id) : [...prev.schemes, id],
      };
    });
  };

  const cycleTapState = (method: TapMethod) => {
    const states: TapState[] = ['yes', 'no', 'unknown'];
    setFormData((prev) => {
      const currentIdx = states.indexOf(prev.tapSupport[method]);
      const nextState = states[(currentIdx + 1) % 3];
      return {
        ...prev,
        tapSupport: { ...prev.tapSupport, [method]: nextState },
      };
    });
  };

  const toggleCvmScheme = (schemeId: SchemeID) => {
    setFormData((prev) => {
      const list = prev.cvm[activeCvmTab] || [];
      const exists = list.includes(schemeId);
      const newList = exists ? list.filter((s) => s !== schemeId) : [...list, schemeId];
      return {
        ...prev,
        cvm: { ...prev.cvm, [activeCvmTab]: newList },
      };
    });
  };

  const updateFee = (schemeId: string, field: string, value: any) => {
    setFormData(prev => ({
        ...prev,
        fees: {
            ...prev.fees,
            [schemeId]: {
                ...(prev.fees[schemeId] || { enabled: false, type: 'percent', value: '' }),
                [field]: value
            }
        }
    }))
  };

  // --- Renderers ---
  const renderStepIndicator = () => (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2, 3, 4].map((s) => (
        <div
          key={s}
          className={`h-2 rounded-full transition-all duration-300 ${
            s === step ? 'w-8 bg-accent-yellow' : s < step ? 'w-8 bg-accent-salmon' : 'w-2 bg-gray-200'
          }`}
        />
      ))}
      <div className="ml-auto text-sm font-bold text-gray-400">Step {step}/4</div>
    </div>
  );

  // --- STEP 1: Location ---
  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Merchant Name</label>
          <input
            type="text"
            className="w-full bg-cream rounded-xl px-4 py-3 text-soft-black font-medium focus:outline-none focus:ring-2 focus:ring-accent-yellow/20 transition-all"
            placeholder="e.g. Starbucks Coffee"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
          <div className="relative">
            <input
              type="text"
              className="w-full bg-cream rounded-xl px-4 py-3 text-soft-black font-medium focus:outline-none focus:ring-2 focus:ring-accent-yellow/20 transition-all pr-12"
              placeholder="Search address..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
          {formData.address && (
            <div className="mt-2 flex items-center gap-2 text-xs text-accent-salmon font-bold bg-green-50 p-2 rounded-lg w-fit">
              <CheckCircle className="w-3 h-3" /> Auto-filled: 34.0522° N, 118.2437° W
            </div>
          )}
        </div>

        <button className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 font-bold hover:border-accent-yellow hover:text-accent-yellow transition-all flex items-center justify-center gap-2">
          <MapPin className="w-4 h-4" />
          Adjust on Map
        </button>
      </div>

      {/* Accordion */}
      <div className="border border-gray-100 rounded-2xl overflow-hidden">
        <button
          onClick={() => setIsBillDetailsOpen(!isBillDetailsOpen)}
          className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
        >
          <span className="font-bold text-sm text-soft-black">More Bill Details</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isBillDetailsOpen ? 'rotate-180' : ''}`} />
        </button>
        {isBillDetailsOpen && (
          <div className="p-4 bg-cream space-y-3 border-t border-gray-100">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Trans Name</label>
              <input
                type="text"
                className="w-full bg-white rounded-lg px-3 py-2 text-sm"
                placeholder="STARBUCKS #1024"
                value={formData.billName}
                onChange={(e) => setFormData({ ...formData, billName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">MCC Category</label>
              <input
                type="text"
                className="w-full bg-white rounded-lg px-3 py-2 text-sm"
                placeholder="5411 - Grocery Stores"
                value={formData.mcc}
                onChange={(e) => setFormData({ ...formData, mcc: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // --- STEP 2: Capabilities ---
  const renderStep2 = () => (
    <div className="space-y-8 animate-fade-in-up">
      {/* Hardware */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Model</label>
          <select
            className="w-full bg-cream rounded-xl px-3 py-3 text-sm font-medium text-soft-black focus:outline-none"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
          >
            <option value="Term-X1">Pax A920</option>
            <option value="Term-X2">Verifone T650</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Acquirer</label>
          <select
            className="w-full bg-cream rounded-xl px-3 py-3 text-sm font-medium text-soft-black focus:outline-none"
            value={formData.acquirer}
            onChange={(e) => setFormData({ ...formData, acquirer: e.target.value })}
          >
            <option value="Bank-A">Chase Paymentech</option>
            <option value="Bank-B">Stripe</option>
            <option value="Bank-C">Adyen</option>
          </select>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex gap-4">
        {['dcc', 'edc'].map((key) => (
          <div
            key={key}
            onClick={() => setFormData({ ...formData, [key]: !formData[key as 'dcc' | 'edc'] })}
            className={`flex-1 p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
              formData[key as 'dcc' | 'edc'] ? 'border-accent-yellow bg-blue-50' : 'border-gray-100 bg-white'
            }`}
          >
            <span className="font-bold text-sm text-soft-black uppercase">{key}</span>
            <div className={`w-4 h-4 rounded-full border ${formData[key as 'dcc' | 'edc'] ? 'bg-accent-yellow border-accent-yellow' : 'border-gray-300'}`}></div>
          </div>
        ))}
      </div>

      {/* Schemes - Redesigned Card Toggles */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Supported Schemes</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SCHEMES.map((scheme) => {
            const isSelected = formData.schemes.includes(scheme.id);
            return (
              <button
                key={scheme.id}
                onClick={() => toggleScheme(scheme.id)}
                className={`
                  relative overflow-hidden h-14 rounded-2xl border transition-all duration-300 flex items-center justify-between px-4 group
                  ${isSelected 
                    ? `${scheme.color} border-transparent shadow-lg scale-[1.02]` 
                    : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:shadow-sm'
                  }
                `}
              >
                {/* Background Decor for selected */}
                {isSelected && (
                   <div className="absolute -right-4 -bottom-6 w-20 h-20 bg-white opacity-10 rounded-full blur-xl"></div>
                )}
                
                <span className={`font-bold text-sm tracking-wide ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                    {scheme.label}
                </span>

                <div className={`
                    w-6 h-6 rounded-full flex items-center justify-center transition-all
                    ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-transparent'}
                `}>
                    <Check className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tap & Pay */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tap & Pay Support</label>
        <div className="grid grid-cols-4 gap-2">
          {(['card', 'apple', 'google', 'hce'] as TapMethod[]).map((method) => {
            const state = formData.tapSupport[method];
            let icon = <HelpCircle className="w-4 h-4" />;
            let color = 'bg-gray-100 text-gray-400';
            if (state === 'yes') {
              icon = <Check className="w-4 h-4" />;
              color = 'bg-green-100 text-green-600 ring-1 ring-green-200';
            } else if (state === 'no') {
              icon = <X className="w-4 h-4" />;
              color = 'bg-red-50 text-red-400';
            }

            return (
              <div
                key={method}
                onClick={() => cycleTapState(method)}
                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl cursor-pointer transition-all hover:scale-105 active:scale-95 ${color}`}
              >
                {method === 'card' && <CreditCard className="w-5 h-5" />}
                {method === 'apple' && <div className="text-lg font-bold"></div>}
                {method === 'google' && <span className="font-bold text-sm">G</span>}
                {method === 'hce' && <Smartphone className="w-5 h-5" />}
                <div className="mt-1">{icon}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CVM Rules */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">CVM Rules</label>
        <div className="bg-cream rounded-2xl p-1 flex gap-1">
          {(['noPin', 'pin', 'signature'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveCvmTab(tab)}
              className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                activeCvmTab === tab ? 'bg-white shadow-sm text-soft-black' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab === 'noPin' ? 'No PIN' : tab}
            </button>
          ))}
        </div>
        
        <div className="mt-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
             <p className="text-[10px] text-gray-400 mb-3">Select schemes that support <span className="font-bold text-soft-black uppercase">{activeCvmTab === 'noPin' ? 'No PIN / Limit' : activeCvmTab}</span>:</p>
             <div className="flex flex-wrap gap-3">
                 {formData.schemes.length === 0 && <span className="text-xs text-gray-300 italic">No schemes selected above.</span>}
                 {formData.schemes.map(schemeId => {
                     const scheme = SCHEMES.find(s => s.id === schemeId);
                     const isActive = formData.cvm[activeCvmTab].includes(schemeId);
                     return (
                         <button
                            key={schemeId}
                            onClick={() => toggleCvmScheme(schemeId)}
                            className={`w-10 h-8 rounded flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                                isActive 
                                ? `${scheme?.color} text-white shadow-md scale-105` 
                                : 'bg-gray-100 text-gray-400 grayscale opacity-50'
                            }`}
                         >
                             {scheme?.label.slice(0,1)}
                         </button>
                     )
                 })}
             </div>
        </div>
      </div>
    </div>
  );

  // --- STEP 3: Fees ---
  const renderStep3 = () => (
    <div className="space-y-4 animate-fade-in-up">
      <p className="text-sm text-gray-500 mb-4">Configure fees for selected schemes.</p>
      {formData.schemes.map((schemeId) => {
        const scheme = SCHEMES.find((s) => s.id === schemeId);
        const config = formData.fees[schemeId] || { enabled: false, type: 'percent', value: '' };

        return (
          <div key={schemeId} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white ${scheme?.color}`}>
                    {scheme?.label.slice(0,1)}
                </div>
                <span className="font-bold text-soft-black">{scheme?.label}</span>
              </div>
              
              {/* Switch */}
              <div 
                 onClick={() => updateFee(schemeId, 'enabled', !config.enabled)}
                 className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${config.enabled ? 'bg-accent-yellow' : 'bg-gray-200'}`}
              >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${config.enabled ? 'left-5' : 'left-1'}`}></div>
              </div>
            </div>

            {config.enabled && (
                <div className="flex items-center gap-3 animate-fade-in">
                    <div className="bg-cream rounded-lg p-1 flex">
                        <button 
                            onClick={() => updateFee(schemeId, 'type', 'percent')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${config.type === 'percent' ? 'bg-white shadow-sm text-soft-black' : 'text-gray-400'}`}
                        >%</button>
                        <button 
                            onClick={() => updateFee(schemeId, 'type', 'fixed')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${config.type === 'fixed' ? 'bg-white shadow-sm text-soft-black' : 'text-gray-400'}`}
                        >$</button>
                    </div>
                    
                    <input 
                        type="number"
                        className="flex-1 bg-cream rounded-lg px-3 py-2 text-sm font-bold text-soft-black focus:ring-1 focus:ring-accent-yellow/50 outline-none"
                        placeholder="0.00"
                        value={config.value}
                        onChange={(e) => updateFee(schemeId, 'value', e.target.value)}
                    />
                </div>
            )}
            
            {config.enabled && config.value && (
                <p className="text-[10px] text-gray-400 mt-2 text-right">
                    {config.type === 'percent' 
                        ? `Charges ${config.value}% per transaction` 
                        : `Charges $${config.value} flat fee per transaction`}
                </p>
            )}
          </div>
        );
      })}
    </div>
  );

  // --- STEP 4: Review ---
  const renderStep4 = () => (
    <div className="space-y-6 animate-fade-in-up">
        <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Internal Notes</label>
            <textarea 
                className="w-full bg-cream rounded-xl p-4 text-sm text-soft-black focus:ring-2 focus:ring-accent-yellow/20 outline-none h-32 resize-none"
                placeholder="Access codes, contact info, or special instructions..."
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
        </div>

        <div>
             <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Custom Links</label>
             <div className="space-y-2">
                 {formData.links.map((link, i) => (
                     <div key={i} className="flex gap-2">
                         <input className="flex-1 bg-cream rounded-lg px-3 py-2 text-xs text-gray-600" value={link} readOnly />
                         <button 
                            onClick={() => setFormData({...formData, links: formData.links.filter((_, idx) => idx !== i)})}
                            className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                         >
                             <Trash2 className="w-4 h-4" />
                         </button>
                     </div>
                 ))}
                 <button 
                    onClick={() => {
                        const url = prompt("Enter URL");
                        if(url) setFormData({...formData, links: [...formData.links, url]})
                    }}
                    className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-xs font-bold text-gray-400 hover:border-accent-yellow hover:text-accent-yellow transition-all"
                 >
                     + Add Link
                 </button>
             </div>
        </div>
    </div>
  );

  return (
    <div className="bg-white rounded-[32px] shadow-soft flex-1 flex flex-col relative overflow-hidden animate-fade-in-up border border-white/50 h-full min-h-[500px]">
      
      {/* Header */}
      <div className="p-8 pb-4 border-b border-gray-50 z-10 bg-white sticky top-0">
        <h2 className="text-2xl font-bold text-soft-black tracking-tight">Add Location</h2>
        <p className="text-sm text-gray-400 mt-1">Register a new merchant point</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {renderStepIndicator()}
        
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        
        <div className="h-20"></div> {/* Spacer */}
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t border-gray-50 bg-white absolute bottom-0 w-full flex justify-between items-center">
         {step > 1 ? (
             <button 
                onClick={prevStep}
                className="px-6 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-colors flex items-center gap-2"
             >
                 <ArrowLeft className="w-4 h-4" /> Back
             </button>
         ) : <div></div>}

         <button 
            onClick={step === 4 ? () => alert("Submitted!") : nextStep}
            className="px-8 py-3 rounded-2xl font-bold text-white bg-soft-black hover:bg-accent-yellow shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
         >
             {step === 4 ? 'Submit' : 'Next'} <ChevronRight className="w-4 h-4" />
         </button>
      </div>
    </div>
  );
};

export default AddMain;