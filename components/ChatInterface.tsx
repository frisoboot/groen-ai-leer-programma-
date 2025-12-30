import React, { useState, useRef, useEffect } from 'react';
import { Message, Role, Subject, UserProfile } from '../types';
import { generateResponseStream } from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatInterfaceProps {
  subject: Subject;
  profile: UserProfile;
  onBack: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ subject, profile, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: Role.MODEL,
      text: `Hoi ${profile.name}! Ik ben je ${subject.name} tutor voor ${profile.level.toUpperCase()} ${profile.year}. Waar kan ik je mee helpen?`,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async () => {
    if ((!inputText.trim() && !selectedImage) || isStreaming) return;

    const userMessageText = inputText;
    const currentImage = imagePreview;
    
    // Reset input states immediately
    setInputText('');
    clearImage();
    
    const newMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text: userMessageText,
      timestamp: new Date(),
      imageUrl: currentImage || undefined,
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setIsStreaming(true);

    try {
        let base64Image = undefined;
        let mimeType = undefined;

        if (currentImage) {
            base64Image = currentImage.split(',')[1];
            mimeType = currentImage.split(':')[1].split(';')[0];
        }

        const stream = await generateResponseStream(
            updatedMessages,
            userMessageText || (currentImage ? "Analyseer deze afbeelding." : ""),
            subject,
            profile, // Pass profile here
            base64Image,
            mimeType
        );

        const botMessageId = (Date.now() + 1).toString();
        setMessages(prev => [
            ...prev,
            {
                id: botMessageId,
                role: Role.MODEL,
                text: '',
                timestamp: new Date(),
                isStreaming: true
            }
        ]);

        let fullText = '';
        
        for await (const chunk of stream) {
            fullText += chunk;
            setMessages(prev => 
                prev.map(msg => 
                    msg.id === botMessageId 
                        ? { ...msg, text: fullText } 
                        : msg
                )
            );
        }

        setMessages(prev => 
            prev.map(msg => 
                msg.id === botMessageId 
                    ? { ...msg, isStreaming: false } 
                    : msg
            )
        );

    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: Role.MODEL,
          text: "Sorry, er ging iets mis bij het verbinden met de AI. Probeer het later opnieuw.",
          timestamp: new Date(),
        }
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white md:rounded-2xl md:shadow-xl md:h-[90vh] md:max-w-5xl md:mx-auto md:my-[5vh] overflow-hidden">
      {/* Header */}
      <div className={`${subject.color} p-4 text-white flex items-center justify-between shadow-md z-10`}>
        <div className="flex items-center space-x-3">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>{subject.icon}</span> {subject.name}
            </h2>
            <p className="text-xs text-white/80 opacity-90">Tutor</p>
          </div>
        </div>
        <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium uppercase">
          {profile.level} {profile.year}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-sm ${
                msg.role === Role.USER
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
              }`}
            >
              {msg.imageUrl && (
                 <div className="mb-3">
                    <img src={msg.imageUrl} alt="Uploaded context" className="rounded-lg max-h-60 object-contain bg-black/10" />
                 </div>
              )}
              {msg.role === Role.MODEL ? (
                 <MarkdownRenderer content={msg.text} />
              ) : (
                <p className="whitespace-pre-wrap">{msg.text}</p>
              )}
            </div>
          </div>
        ))}
        {isStreaming && messages[messages.length - 1]?.role === Role.USER && (
             <div className="flex justify-start">
                 <div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-sm border border-gray-100 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                 </div>
             </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        {imagePreview && (
            <div className="flex items-center gap-2 mb-3 bg-gray-50 p-2 rounded-lg border border-gray-200 w-fit">
                <img src={imagePreview} alt="Preview" className="h-12 w-12 object-cover rounded" />
                <span className="text-xs text-gray-500 truncate max-w-[150px]">{selectedImage?.name}</span>
                <button onClick={clearImage} className="text-gray-400 hover:text-red-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        )}
        <div className="flex items-end gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Upload afbeelding"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Typ je vraag..."
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 py-2.5 text-gray-700"
            rows={1}
            style={{ minHeight: '44px' }}
          />
          
          <button
            onClick={handleSendMessage}
            disabled={(!inputText.trim() && !selectedImage) || isStreaming}
            className={`p-2 rounded-xl transition-all ${
              (!inputText.trim() && !selectedImage) || isStreaming
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
            }`}
          >
            <svg className="w-6 h-6 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;