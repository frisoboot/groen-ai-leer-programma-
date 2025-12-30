import React, { useState, useEffect } from 'react';
import { Subject, PracticeTurn, QuizFeedback, UserProfile } from '../types';
import { startPracticeSession, submitAnswerAndGetNext, getSuggestedTopics } from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';
import { Content } from '@google/genai';

interface PracticeInterfaceProps {
  subject: Subject;
  profile: UserProfile;
  onBack: () => void;
}

const PracticeInterface: React.FC<PracticeInterfaceProps> = ({ subject, profile, onBack }) => {
  const [setupMode, setSetupMode] = useState(true);
  const [topicInput, setTopicInput] = useState('');
  
  // New state for suggested topics
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  const [loading, setLoading] = useState(false);
  
  const [currentTurn, setCurrentTurn] = useState<PracticeTurn | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [history, setHistory] = useState<Content[]>([]);
  const [sessionScore, setSessionScore] = useState({ correct: 0, total: 0 });
  const [showFeedback, setShowFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch topics on mount
  useEffect(() => {
    if (setupMode) {
        setLoadingTopics(true);
        getSuggestedTopics(subject, profile)
            .then(setSuggestedTopics)
            .finally(() => setLoadingTopics(false));
    }
  }, [subject, profile, setupMode]);

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
      const turn = await startPracticeSession(subject, profile, finalTopics);
      setCurrentTurn(turn);
      setHistory([{ role: 'model', parts: [{ text: JSON.stringify(turn) }] }]);
      setSetupMode(false);
    } catch (e) {
      console.error(e);
      alert("Kon de toets niet starten. Probeer het opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!userAnswer.trim() || !currentTurn) return;

    setIsSubmitting(true);
    try {
      const { turn: nextTurn, updatedHistory } = await submitAnswerAndGetNext(
        subject,
        history,
        userAnswer,
        profile
      );

      if (nextTurn.feedback) {
        setSessionScore(prev => ({
          total: prev.total + 1,
          correct: nextTurn.feedback!.score >= 6 ? prev.correct + 1 : prev.correct
        }));
      }

      setCurrentTurn(nextTurn);
      setHistory(updatedHistory);
      setShowFeedback(true);
      
    } catch (e) {
      console.error(e);
      alert("Er ging iets mis bij het nakijken. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    setUserAnswer('');
    setShowFeedback(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white">
        <div className={`w-16 h-16 border-4 border-t-transparent rounded-full animate-spin ${subject.color.replace('bg-', 'border-')}`}></div>
        <p className="mt-4 text-gray-600 font-medium animate-pulse">Toets wordt voorbereid voor {profile.level} {profile.year}...</p>
      </div>
    );
  }

  // Setup Screen (Topic Selection)
  if (setupMode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl max-w-2xl w-full">
           <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-xl ${subject.color} flex items-center justify-center text-2xl text-white shadow-md`}>
                    {subject.icon}
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Oefentoets Starten</h2>
                    <p className="text-gray-500">Wat wil je vandaag oefenen?</p>
                </div>
           </div>

           {/* Generated Topics Grid */}
           <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Kies onderwerpen</h3>
                {loadingTopics ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 animate-pulse">
                        {[1,2,3,4,5,6].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg"></div>)}
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
                    placeholder="Bijv. 'Examen 2023 tijdvak 1'"
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 placeholder-gray-400"
                />
           </div>

           <div className="flex gap-3 pt-4 border-t border-gray-100">
             <button onClick={onBack} className="flex-1 py-3 text-gray-500 hover:bg-gray-50 rounded-xl transition-colors font-medium">
               Terug
             </button>
             <button 
               onClick={startSession}
               className={`flex-1 py-3 text-white rounded-xl font-bold shadow-md transition-transform active:scale-95 ${subject.color}`}
             >
               Starten ({selectedTopics.length + (topicInput ? 1 : 0)})
             </button>
           </div>
        </div>
      </div>
    );
  }

  // Active Quiz Interface
  return (
    <div className="flex flex-col h-screen bg-gray-50 md:max-w-4xl md:mx-auto">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-3">
            <button onClick={() => { setSetupMode(true); setSelectedTopics([]); setTopicInput(''); }} className="text-gray-500 hover:text-gray-800">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
                <h2 className="font-bold text-gray-800">{subject.name} Toets</h2>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Score: {sessionScore.correct}/{sessionScore.total}</span>
                    <span>•</span>
                    <span className="capitalize">{currentTurn?.nextQuestion.difficulty}</span>
                </div>
            </div>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${subject.color}`}>
            {subject.icon}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        
        {/* Previous Feedback Section */}
        {showFeedback && currentTurn?.feedback && (
            <div className={`rounded-xl border p-6 animate-fade-in ${currentTurn.feedback.score >= 6 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-bold text-lg ${currentTurn.feedback.score >= 6 ? 'text-green-800' : 'text-red-800'}`}>
                        {currentTurn.feedback.score >= 6 ? 'Goed gedaan!' : 'Nog even oefenen'}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${currentTurn.feedback.score >= 6 ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                        Cijfer: {currentTurn.feedback.score}
                    </span>
                </div>
                
                <div className="prose prose-sm max-w-none mb-4 text-gray-800">
                    <MarkdownRenderer content={currentTurn.feedback.explanation} />
                </div>

                <div className="bg-white/60 rounded-lg p-4 border border-black/5">
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-bold mb-1">Modelantwoord</p>
                    <MarkdownRenderer content={currentTurn.feedback.modelAnswer} />
                </div>

                <button 
                    onClick={handleNextQuestion}
                    className={`mt-6 w-full py-3 rounded-xl font-semibold shadow-sm text-white transition-all transform hover:scale-[1.01] active:scale-[0.99] ${subject.color}`}
                >
                    Volgende Vraag &rarr;
                </button>
            </div>
        )}

        {/* Current Question Section */}
        {!showFeedback && currentTurn && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Opgave</span>
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-medium">{currentTurn.nextQuestion.topic}</span>
                </div>
                <div className="p-6 md:p-8">
                    <div className="text-lg md:text-xl text-gray-800 leading-relaxed font-medium">
                        <MarkdownRenderer content={currentTurn.nextQuestion.text} />
                    </div>
                </div>
                
                <div className="p-6 bg-gray-50 border-t border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Jouw antwoord</label>
                    <textarea
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Typ je uitwerking en antwoord hier..."
                        className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 min-h-[150px] p-4 text-base"
                    />
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !userAnswer.trim()}
                            className={`px-6 py-3 rounded-xl font-semibold text-white shadow-md transition-all ${
                                isSubmitting || !userAnswer.trim() 
                                ? 'bg-gray-300 cursor-not-allowed' 
                                : `${subject.color} hover:brightness-110 active:transform active:scale-95`
                            }`}
                        >
                            {isSubmitting ? 'Nakijken...' : 'Controleren'}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default PracticeInterface;