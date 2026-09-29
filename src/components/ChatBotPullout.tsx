import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  RotateCcw,
  CheckCircle2,
  Milestone,
  Target,
  ShieldCheck,
  Award,
  TrendingUp,
  Clock,
  ArrowRight,
  BookOpen,
  ChevronDown,
  Phone,
  Zap,
} from "lucide-react";
import { askCompanion, deriveLearnerRoadmap, CanonicalRoadmapStage } from "../services/intelligence";
import { speakMessage, stopSpeaking } from "../utils/speech";
import { NewHire } from "../types";
import { MANDATORY_TRAINING_MODULES } from "../data/modulesData";

interface ChatBotPulloutProps {
  currentDay: number;
  learnerName?: string;
  buddyName?: string;
  isHindi?: boolean;
  onAlertBuddy?: () => void;
  newHire?: NewHire;
  onOpenFullScreenJourney?: () => void;
}

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
}

export const ChatBotPullout: React.FC<ChatBotPulloutProps> = ({
  currentDay,
  learnerName = "Rahul",
  buddyName = "Vikram",
  isHindi = false,
  onAlertBuddy,
  newHire,
  onOpenFullScreenJourney,
}) => {
  // Pill state: pre-hidden by default (isTucked = true)
  const [isTucked, setIsTucked] = useState<boolean>(true);
  // Drawer state: whether the full sidebar drawer is open
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  // Active drawer tab: "chat"
  const [activeTab, setActiveTab] = useState<"chat">("chat");

  // Journey state inside drawer
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Touch gesture tracking for tactile swipe-to-pull
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current !== null) {
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      if (deltaX < -25) {
        // Swiped left -> pull out!
        setIsTucked(false);
      } else if (deltaX > 25) {
        // Swiped right -> tuck back!
        setIsTucked(true);
      }
      touchStartX.current = null;
    }
  };

  // Chat conversation state
  const firstName = (learnerName || "Rahul").split(" ")[0];
  const buddyFirstName = (buddyName || "Vikram").split(" ")[0];

  const initialGreeting = isHindi
    ? `नमस्ते ${firstName}! 👋 मैं आपका AI फ्लोर साथी हूँ। मुझसे स्टोर के किसी भी काम, रैक लोकेशन, स्कैनर या सुरक्षा के बारे में कुछ भी पूछें!`
    : `Hello ${firstName}! 👋 I am your AI Floor Assistant. Ask me anything about store aisles, scanner fixes, cold rooms, or safety SOPs!`;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-welcome",
      sender: "bot",
      text: initialGreeting,
      timestamp: "Just now",
    },
  ]);

  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [buddyAlerted, setBuddyAlerted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive Journey Roadmap data
  const roadmapData = newHire
    ? deriveLearnerRoadmap(newHire, currentDay)
    : null;

  const currentStageIndex = roadmapData?.currentStageIndex ?? 1;
  const currentStage = roadmapData?.currentStage;
  const stages = roadmapData?.stages ?? [];
  const readinessScore = roadmapData?.readinessScore ?? 78;

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (isDrawerOpen && activeTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isDrawerOpen, activeTab]);

  // Focus input when opening chat tab
  useEffect(() => {
    if (isDrawerOpen && activeTab === "chat") {
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isDrawerOpen, activeTab]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text || isThinking) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsThinking(true);

    try {
      const botReply = await askCompanion(text, currentDay);
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: botReply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMsg]);
      speakMessage(botReply, isHindi);
    } catch (err) {
      const fallback = isHindi
        ? "माफ कीजियेगा, दोबारा पूछें या नीचे दिए गए आम सवालों में से चुनें।"
        : "Sorry, I could not process that. Please try again or tap a quick question.";
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: fallback,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      handleSendMessage(
        isHindi
          ? "आइसल 4 से 8 में सामान ढूंढने में मदद चाहिए।"
          : "I need help finding items in Aisles 4 to 8."
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = isHindi ? "hi-IN" : "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) handleSendMessage(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
      handleSendMessage(
        isHindi
          ? "दूध और दही का कोल्ड रूम कहां है?"
          : "Where is the cold dairy room?"
      );
    }
  };

  const quickQuestions = isHindi
    ? [
        "दूध और दही का कोल्ड रूम कहां है?",
        "आइसल 4 से 8 में सामान कैसे ढूंढें?",
        "स्कैनर बारकोड नहीं पढ़ रहा",
        "सामान का पैकेट फटा हुआ है",
        "भारी सामान टोट में कैसे रखें?",
      ]
    : [
        "Where is the cold dairy room?",
        "How to locate items in Aisles 4-8?",
        "Scanner not reading barcode",
        "Damaged item protocol",
        "Heavy items tote packing order",
      ];

  const handleAlertFloorBuddy = () => {
    setBuddyAlerted(true);
    onAlertBuddy?.();
    const alertMsg: Message = {
      id: `buddy-alert-${Date.now()}`,
      sender: "bot",
      text: isHindi
        ? `🚨 आपके साथी ${buddyFirstName} को नोटिफिकेशन भेज दिया गया है! वो जल्द ही आपकी रैक पर आ रहे हैं।`
        : `🚨 Floor Buddy ${buddyFirstName} has been notified! They are heading to your aisle now.`,
      timestamp: "Just now",
    };
    setMessages((prev) => [...prev, alertMsg]);
  };

  const handlePlayJourneyAudio = () => {
    if (isPlayingAudio) {
      stopSpeaking();
      setIsPlayingAudio(false);
      return;
    }
    const currentTitle = currentStage
      ? isHindi
        ? currentStage.titleHi
        : currentStage.titleEn
      : "सफर";
    const currentMilestone = currentStage
      ? isHindi
        ? currentStage.milestoneHi
        : currentStage.milestoneEn
      : "लक्ष्य";
    const text = isHindi
      ? `10-दिन का जॉब-रेडी सफर। आप अभी डे ${currentDay}, स्टेज ${currentStageIndex + 1}: ${currentTitle} पर हैं। अगला लक्ष्य: ${currentMilestone}। आपकी तत्परता स्कोर ${readinessScore} प्रतिशत है।`
      : `10-Day Job-Ready Journey. You are on Day ${currentDay}, Stage ${currentStageIndex + 1}: ${currentTitle}. Next milestone: ${currentMilestone}. Your readiness score is ${readinessScore} percent.`;

    setIsPlayingAudio(true);
    speakMessage(text, isHindi, () => {
      setIsPlayingAudio(false);
    });
  };

  const getStageIcon = (key: CanonicalRoadmapStage["key"]) => {
    switch (key) {
      case "training":
        return <BookOpen className="w-4 h-4" />;
      case "capability":
        return <Target className="w-4 h-4" />;
      case "productivity":
        return <TrendingUp className="w-4 h-4" />;
      case "independent":
        return <UserCheck className="w-4 h-4" />;
      case "reliability":
        return <ShieldCheck className="w-4 h-4" />;
      case "job_ready":
        return <Award className="w-4 h-4" />;
      default:
        return <Milestone className="w-4 h-4" />;
    }
  };

  return (
    <>
      {/* ========================================================= */}
      {/* APPLE INTELLIGENCE DOCK: DOCKED ON THE RIGHT SIDE          */}
      {/* ========================================================= */}
      {!isDrawerOpen && (
        <div
          id="apple-sidebar-dock"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="fixed right-0 top-[52%] -translate-y-1/2 z-40 select-none transition-all duration-300 ease-out"
        >
          {isTucked ? (
            /* Collapsed/Tucked trigger button with Apple Intelligence iridescent halo */
            <button
              id="sidebar-chat-trigger-btn"
              type="button"
              onClick={() => setIsTucked(false)}
              title={isHindi ? "AI साथी से पूछें (खींचें)" : "Ask AI Companion (Pull)"}
              aria-label="Pull to open AI Assistant"
              className="group flex flex-col items-center justify-center bg-gradient-to-tr from-[#007AFF] via-[#5856D6] to-[#FF2D55] text-white rounded-l-2xl w-7 h-22 shadow-[0_8px_24px_rgba(88,86,214,0.45)] border-y border-l border-white/30 cursor-pointer active:scale-95 transition-all hover:w-8.5 hover:shadow-[0_12px_32px_rgba(88,86,214,0.6)] py-2.5 gap-2"
            >
              <ChevronLeft className="w-4 h-4 text-white stroke-[2.8] animate-pulse group-hover:-translate-x-0.5 transition-transform" />
              <div className="w-5.5 h-5.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-inner">
                <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-spin-slow" />
              </div>
            </button>
          ) : (
            /* Pulled-Out state: Apple Intelligence pill docked on the right */
            <div className="flex items-center gap-1.5 animate-in slide-in-from-right duration-250 bg-white/90 backdrop-blur-2xl p-1.5 rounded-l-full shadow-[0_12px_40px_rgba(0,0,0,0.14)] border-y border-l border-slate-200/80 ring-1 ring-black/5">
              {/* AI Chat Quick Access Target */}
              <button
                id="sidebar-chat-pill-btn"
                type="button"
                onClick={() => {
                  setActiveTab("chat");
                  setIsDrawerOpen(true);
                }}
                title={isHindi ? "AI साथी से पूछें" : "Ask AI Companion"}
                className="group flex items-center gap-2.5 bg-gradient-to-r from-[#007AFF] via-[#5856D6] to-[#AF52DE] text-white rounded-full py-2 px-3.5 cursor-pointer active:scale-95 transition-all shadow-md shadow-indigo-500/25"
              >
                {/* Apple Intelligence Siri Avatar Halo */}
                <div className="w-7 h-7 rounded-full bg-white/20 border border-white/40 shadow-xs flex items-center justify-center shrink-0 backdrop-blur-xs">
                  <Sparkles className="w-4 h-4 text-amber-200" />
                </div>
                <div className="text-left leading-tight pr-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-white tracking-tight whitespace-nowrap">
                      {isHindi ? "AI साथी" : "Ask AI"}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  </div>
                  <span className="text-[10px] font-medium text-white/80 block">
                    {isHindi ? "24/7 सहायता" : "Apple Intelligence"}
                  </span>
                </div>
              </button>

              {/* Tuck back chevron button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTucked(true);
                }}
                title={isHindi ? "छुपाएं (Tuck in)" : "Hide (Tuck in)"}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100/80 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* APPLE MESSAGES DRAWER OVERLAY                              */}
      {/* ========================================================= */}
      {isDrawerOpen && (
        <div
          id="purple-sidebar-overlay"
          className="fixed inset-0 z-50 flex justify-end bg-black/35 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => {
            setIsDrawerOpen(false);
            setIsTucked(true);
          }}
        >
          <div
            id="purple-sidebar-drawer-panel"
            className="w-full max-w-sm sm:max-w-md bg-[#F2F2F7] h-full shadow-[0_25px_60px_rgba(0,0,0,0.25)] flex flex-col animate-in slide-in-from-right duration-250 select-none overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. Translucent Apple Intelligence Header */}
            <div className="p-4 bg-white/80 backdrop-blur-2xl border-b border-slate-200/60 text-slate-900 flex items-center justify-between shrink-0 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                {/* Glowing Apple Intelligence Siri Halo Icon */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#007AFF] via-[#5856D6] via-[#FF2D55] to-amber-400 p-[2px] shadow-md shadow-indigo-500/20 shrink-0">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#5856D6]" />
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-base text-slate-900 tracking-tight flex items-center gap-2">
                    <span>
                      {isHindi ? "फ्लोर AI साथी" : "Floor AI Assistant"}
                    </span>
                    <span className="text-[10px] font-semibold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent px-2 py-0.5 rounded-full border border-purple-200/60 bg-purple-50/50">
                      Apple Intelligence
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-normal">
                    {isHindi
                      ? "स्टोर से संबंधित कोई भी सवाल पूछें"
                      : "24/7 Floor guidance & aisle troubleshooting"}
                  </p>
                </div>
              </div>

              {/* Apple Glass Close Button */}
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  setIsTucked(true);
                }}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-300/80 text-slate-700 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer active:scale-95"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ========================================================= */}
            {/* TAB CONTENT: AI ASSISTANT CHAT                            */}
            {/* ========================================================= */}
            {activeTab === "chat" && (
              <>
                {/* In-Person Buddy Alert Banner - Apple Card Style */}
                <div className="mx-3 mt-3 bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl px-3.5 py-2.5 flex items-center justify-between text-xs shadow-2xs shrink-0">
                  <div className="flex items-center gap-2 text-slate-800 font-medium truncate">
                    <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-[#007AFF]">
                      <UserCheck className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate text-slate-700">
                      {isHindi
                        ? `साथी ${buddyFirstName} पास के आइसल में हैं`
                        : `Floor Buddy ${buddyFirstName} is nearby`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAlertFloorBuddy}
                    disabled={buddyAlerted}
                    className={`text-[11px] font-medium px-3 py-1.5 rounded-full transition-all shrink-0 cursor-pointer shadow-2xs ${
                      buddyAlerted
                        ? "bg-emerald-100 text-emerald-800 font-semibold"
                        : "bg-[#007AFF] hover:bg-[#0066CC] text-white active:scale-95"
                    }`}
                  >
                    {buddyAlerted
                      ? isHindi
                        ? "बुलाया गया ✓"
                        : "Alerted ✓"
                      : isHindi
                      ? "फ्लोर पर बुलाएं"
                      : "Call to Aisle"}
                  </button>
                </div>

                {/* Conversation Messages Container - Apple Messages iMessage Bubbles */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                  {messages.map((msg) => {
                    const isBot = msg.sender === "bot";
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isBot ? "items-start" : "items-end"} space-y-1`}
                      >
                        <div
                          className={`max-w-[85%] px-4 py-3 text-[13px] leading-relaxed shadow-2xs transition-all ${
                            isBot
                              ? "bg-white text-[#1D1D1F] border border-slate-200/70 rounded-[22px] rounded-bl-[6px]"
                              : "bg-gradient-to-br from-[#007AFF] to-[#0066CC] text-white rounded-[22px] rounded-br-[6px] font-normal"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>

                        <div className="flex items-center gap-2 px-1.5 text-[10px] text-slate-400 font-normal">
                          <span>{msg.timestamp}</span>
                          {isBot && (
                            <button
                              type="button"
                              onClick={() => speakMessage(msg.text, isHindi)}
                              className="hover:text-[#007AFF] text-slate-500 transition-colors flex items-center gap-1 cursor-pointer bg-white/60 hover:bg-white px-2 py-0.5 rounded-full border border-slate-200/60"
                              title="Listen to answer"
                            >
                              <Volume2 className="w-3 h-3 text-[#007AFF]" />
                              <span className="font-medium">{isHindi ? "सुनें" : "Play"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Apple Thinking Indicator */}
                  {isThinking && (
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200/70 rounded-[22px] rounded-bl-[6px] px-4 py-3 max-w-[65%] shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-[#007AFF] animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-[#5856D6] animate-bounce delay-100" />
                      <span className="w-2 h-2 rounded-full bg-[#FF2D55] animate-bounce delay-200" />
                      <span className="text-xs text-slate-500 font-normal ml-1">
                        {isHindi ? "सोच रहा हूँ..." : "Apple Intelligence thinking..."}
                      </span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Question Chips - Apple Horizontal Pill Bar */}
                <div className="p-2.5 bg-white/90 backdrop-blur-md border-t border-slate-200/60 shrink-0">
                  <p className="text-[11px] font-medium text-slate-500 px-1 mb-1.5 flex items-center justify-between">
                    <span>{isHindi ? "आम सवाल (टैप करें):" : "Quick Questions:"}</span>
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {quickQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(q)}
                        disabled={isThinking}
                        className="text-[11px] font-medium text-[#1D1D1F] bg-[#F2F2F7] hover:bg-[#E5E5EA] border border-slate-200/80 px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Bar: Apple iMessage Pill Input */}
                <div className="p-3 bg-white/95 backdrop-blur-2xl border-t border-slate-200/70 shrink-0">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex items-center gap-2"
                  >
                    {/* Integrated Pill Input Container */}
                    <div className="flex-1 flex items-center gap-2 bg-[#F2F2F7] border border-slate-200 focus-within:border-[#007AFF] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#007AFF]/20 rounded-full px-3 py-1.5 transition-all shadow-inner">
                      {/* Voice Dictation Button */}
                      <button
                        type="button"
                        onClick={handleVoiceInput}
                        disabled={isThinking}
                        className={`p-1.5 rounded-full transition-all cursor-pointer shrink-0 ${
                          isListening
                            ? "bg-rose-500 text-white animate-pulse"
                            : "text-[#007AFF] hover:bg-slate-200/60"
                        }`}
                        title={isHindi ? "बोलकर पूछें" : "Tap to speak"}
                      >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>

                      {/* Text Field */}
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={
                          isListening
                            ? isHindi
                              ? "सुन रहा हूँ... बोलिए"
                              : "Listening... speak now"
                            : isHindi
                            ? "कोई भी सवाल लिखें..."
                            : "Ask me anything..."
                        }
                        disabled={isThinking || isListening}
                        className="flex-1 bg-transparent text-xs sm:text-sm font-normal text-[#1D1D1F] placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>

                    {/* Apple iMessage Send Button (Rounded Blue Arrow) */}
                    <button
                      type="submit"
                      disabled={isThinking || !inputText.trim()}
                      className="w-8 h-8 rounded-full bg-[#007AFF] hover:bg-[#0066CC] disabled:bg-slate-300 disabled:opacity-40 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95 shadow-xs"
                      title="Send"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
