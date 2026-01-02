import React, { useState, useEffect } from 'react';
import { Subject, FlashcardSet, UserProfile } from '../types';
import { generateFlashcards, getSuggestedTopics } from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';

interface FlashcardInterfaceProps {
  subject: Subject;
  profile: UserProfile;
  onBack: () => void;
  onHome: () => void;
}

const FlashcardInterface: React.FC<FlashcardInterfaceProps> = ({ subject, profile, onBack, onHome }) => {
  const [topicInput, setTopicInput] = useState('');
  
  // New state for suggested topics
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  const [loading, setLoading] = useState(false);
  const [cardSet, setCardSet] = useState<FlashcardSet | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [setupMode, setSetupMode] = useState(true);

  // Fetch topics on mount or when returning to setup, but only if empty
  useEffect(() => {
    if (setupMode && suggestedTopics.length === 0) {
        setLoadingTopics(true);
        getSuggestedTopics(subject, profile)
            .then(setSuggestedTopics)
            .finally(() => setLoadingTopics(false));
    }
  }, [subject, profile, setupMode, suggestedTopics.length]);

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => 
        prev.includes(topic) 
            ? prev.filter(t => t !== topic) 
            : [...prev, topic]
    );
  };

  const startSession = async () => {
    setLoading(true);
    
    // Combine selected topics and custom input
    const finalTopics = [
        ...selectedTopics, 
        topicInput.trim()
    ].filter(Boolean).join(', ');

    try {
      const result = await generateFlashcards(subject, profile, finalTopics);
      setCardSet(result);
      setSetupMode(false);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (e) {
      console.error(e);
      alert("Kon geen kaarten genereren. Probeer het opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (cardSet && currentIndex < cardSet.cards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white">
        <div className={`w-16 h-16 border-4 border-t-transparent rounded-full animate-spin ${subject.color.replace('bg-', 'border-')}`}></div>
        <p className="mt-4 text-gray-600 font-medium animate-pulse">Kaarten worden gemaakt voor {profile.level} {profile.year}...</p>
      </div>
    );
  }

  // Initial Setup Screen
  if (setupMode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 overflow-y-auto relative">
        {/* Global Top-Left Back Button */}
        <div className="absolute top-4 left-4 z-20">
            <button 
                onClick={onBack}
                className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-md border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-all hover:scale-105 active:scale-95"
                title="Terug"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </button>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl max-w-2xl w-full my-8">
           <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-xl ${subject.color} flex items-center justify-center text-2xl text-white shadow-md`}>
                    {subject.icon}
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Flashcards Genereren</h2>
                    <p className="text-gray-500">Waar wil je mee oefenen?</p>
                </div>
           </div>

           {/* Generated Topics Grid */}
           <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Kies onderwerpen</h3>
                {loadingTopics ? (
                    <div className="py-6 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mb-3 ${subject.color.replace('bg-', 'border-')}`}></div>
                        <p className="text-sm text-gray-500 font-medium animate-pulse">Examenonderwerpen ophalen...</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full px-4 mt-4 opacity-30 pointer-events-none">
                            {[1,2,3,4].map(i => <div key={i} className="h-10 bg-gray-300 rounded-lg"></div>)}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                        {suggestedTopics.map((topic) => (
                            <button
                                key={topic}
                                onClick={() => toggleTopic(topic)}
                                className={`text-sm py-2 px-3 rounded-lg border-2 font-medium transition-all truncate text-left ${
                                    selectedTopics.includes(topic) 
                                    ? `border-blue-500 bg-blue-50 text-blue-700` 
                                    : 'border-gray-100 text-gray-600 hover:border-blue-200 hover:bg-gray-50'
                                }`}
                                title={topic}
                            >
                                {topic}
                            </button>
                        ))}
                    </div>
                )}
           </div>
           
           <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">Of typ zelf een onderwerp</h3>
                <input 
                    type="text" 
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="Bijv. 'Koude Oorlog', 'Zuren en Basen'..."
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 placeholder-gray-400"
                />
           </div>

           <div className="flex gap-3 pt-4 border-t border-gray-100">
             <button 
               onClick={startSession}
               className={`flex-1 py-4 text-white rounded-xl font-bold shadow-md transition-transform active:scale-95 ${subject.color}`}
             >
               Starten ({selectedTopics.length + (topicInput ? 1 : 0)})
             </button>
           </div>
        </div>
      </div>
    );
  }

  // Active Flashcard Screen
  const currentCard = cardSet?.cards[currentIndex];

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm flex justify-between items-center z-10 shrink-0">
        <button 
            onClick={() => { setSetupMode(true); setSelectedTopics([]); setTopicInput(''); }} 
            className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
            title="Stoppen en terug"
        >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <div className="text-center">
            <h2 className="font-bold text-gray-800 line-clamp-1 max-w-[200px]">{cardSet?.topic}</h2>
            <p className="text-xs text-gray-500">{currentIndex + 1} / {cardSet?.cards.length}</p>
        </div>
        
        <button 
            onClick={onHome}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            title="Naar Home"
        >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        </button>
      </div>

      <div className="flex-1 p-4 md:p-8 flex flex-col items-center justify-start md:justify-center overflow-y-auto">
        <div className="w-full max-w-2xl flex flex-col items-center">
            
            {/* Simple Card Container - No 3D Transforms */}
            <div 
                onClick={() => setIsFlipped(!isFlipped)}
                className={`
                    w-full min-h-[300px] md:min-h-[400px] rounded-3xl shadow-xl cursor-pointer
                    transition-all duration-300 ease-in-out transform hover:scale-[1.01] active:scale-[0.99]
                    flex flex-col items-center justify-center p-8 text-center border-b-8 border-black/10
                    ${isFlipped ? `${subject.color} text-white` : 'bg-white text-gray-800'}
                `}
            >
                {/* Content Area - Scrollable if text is too long */}
                <div className="w-full max-h-[50vh] overflow-y-auto scrollbar-hide flex flex-col items-center justify-center">
                    {!isFlipped ? (
                        <>
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6 bg-gray-100 text-gray-500">
                                {currentCard?.category}
                            </span>
                            <div className="text-2xl md:text-4xl font-bold leading-tight w-full flex flex-col items-center">
                                <MarkdownRenderer content={currentCard?.front || ''} />
                            </div>
                            <p className="mt-8 text-sm text-gray-400 font-medium animate-pulse">
                                Klik om antwoord te zien
                            </p>
                        </>
                    ) : (
                        <>
                           <div className="text-xl md:text-3xl font-medium leading-relaxed w-full flex flex-col items-center">
                                <MarkdownRenderer content={currentCard?.back || ''} />
                            </div>
                            <p className="mt-8 text-sm text-white/50 font-medium">
                                Klik om terug te draaien
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center gap-6 mt-8">
                <button 
                    onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                    disabled={currentIndex === 0}
                    className={`p-4 rounded-full bg-white shadow-lg text-gray-600 transition-all ${currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95 hover:text-blue-600'}`}
                >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>

                <div className="text-sm font-medium text-gray-400">
                    {currentIndex + 1} / {cardSet?.cards.length}
                </div>

                <button 
                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                    disabled={!cardSet || currentIndex === cardSet.cards.length - 1}
                    className={`p-4 rounded-full bg-white shadow-lg text-gray-600 transition-all ${!cardSet || currentIndex === cardSet.cards.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95 hover:text-green-600'}`}
                >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default FlashcardInterface;