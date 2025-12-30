import React, { useState } from 'react';
import { UserProfile, EducationLevel } from '../types';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [level, setLevel] = useState<EducationLevel | null>(null);
  const [year, setYear] = useState<number | null>(null);

  const handleLevelSelect = (l: EducationLevel) => {
    setLevel(l);
    setYear(null); // Reset year if level changes
    setStep(3);
  };

  const getAvailableYears = (lvl: EducationLevel) => {
    switch (lvl) {
      case 'vmbo-tl': return [1, 2, 3, 4];
      case 'havo': return [1, 2, 3, 4, 5];
      case 'vwo': return [1, 2, 3, 4, 5, 6];
      default: return [];
    }
  };

  const handleFinish = () => {
    if (name && level && year) {
      onComplete({ name, level, year });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 max-w-lg w-full transition-all">
        
        {/* Progress Bar */}
        <div className="flex gap-2 mb-8">
            <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`h-2 flex-1 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
        </div>

        {/* Step 1: Name */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Hoi! 👋 <br/>Hoe heet je?</h1>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jouw naam"
              className="w-full text-xl p-4 border-b-2 border-gray-200 focus:border-blue-600 outline-none bg-transparent mb-8 text-gray-900 placeholder-gray-400"
              autoFocus
            />
            <button 
              onClick={() => setStep(2)}
              disabled={!name.trim()}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Verder
            </button>
          </div>
        )}

        {/* Step 2: Level */}
        {step === 2 && (
          <div className="animate-fade-in">
             <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Welk niveau doe je?</h1>
             <p className="text-gray-500 mb-6">Zo weet ik wat je moet kennen voor je examen.</p>
             
             <div className="space-y-3">
               {(['vmbo-tl', 'havo', 'vwo'] as EducationLevel[]).map((l) => (
                 <button
                    key={l}
                    onClick={() => handleLevelSelect(l)}
                    className="w-full p-5 text-left rounded-xl border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                 >
                    <span className="text-xl font-bold text-gray-800 uppercase group-hover:text-blue-700">{l === 'vmbo-tl' ? 'VMBO-TL / MAVO' : l}</span>
                 </button>
               ))}
             </div>
             <button onClick={() => setStep(1)} className="mt-6 text-gray-400 text-sm hover:text-gray-600">Terug</button>
          </div>
        )}

        {/* Step 3: Year */}
        {step === 3 && level && (
          <div className="animate-fade-in">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">In welk jaar zit je?</h1>
            <p className="text-gray-500 mb-6">Klas {level.toUpperCase()}</p>

            <div className="grid grid-cols-2 gap-3 mb-8">
               {getAvailableYears(level).map((y) => (
                 <button
                    key={y}
                    onClick={() => setYear(y)}
                    className={`p-4 rounded-xl border-2 font-bold text-xl transition-all ${year === y ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 hover:border-blue-300 text-gray-700'}`}
                 >
                    Jaar {y}
                 </button>
               ))}
            </div>

            <button 
              onClick={handleFinish}
              disabled={!year}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 shadow-lg transition-all"
            >
              Starten 🚀
            </button>
            <button onClick={() => setStep(2)} className="mt-6 text-center w-full text-gray-400 text-sm hover:text-gray-600">Terug</button>
          </div>
        )}

      </div>
    </div>
  );
};

export default Onboarding;