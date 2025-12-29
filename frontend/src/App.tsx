import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  ArrowRight,
  Play,
  RotateCcw,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import FaultyTerminal from '@/components/FaultyTerminal';

interface QuizData {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

interface QuestionItem {
  id: number;
  source: string;
  quiz: QuizData;
}

interface ApiResponse {
  count: number;
  questions: QuestionItem[];
}

export default function App() {
  const [gameState, setGameState] = useState<'start' | 'loading' | 'playing' | 'finished'>('start');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const fetchQuiz = async () => {
    setGameState('loading');
    try {
      const response = await axios.get<ApiResponse>('/api/quiz');
      setQuestions(response.data.questions);
      setCurrentIndex(0);
      setScore(0);
      setGameState('playing');
      resetQuestionState();
    } catch (error) {
      console.error("Failed to fetch quiz:", error);
      alert("퀴즈를 불러오는데 실패했습니다. 다시 시도해주세요.");
      setGameState('start');
    }
  };

  const resetQuestionState = () => {
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowExplanation(false);
  };

  const handleAnswer = (option: string) => {
    if (selectedAnswer !== null) return; 

    setSelectedAnswer(option);
    const correct = option === questions[currentIndex].quiz.answer;
    setIsCorrect(correct);
    
    if (correct) {
      setScore(prev => prev + 100); 
    }

    setShowExplanation(true);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      resetQuestionState();
    } else {
      setGameState('finished');
    }
  };

  // --- START SCREEN ---
  if (gameState === 'start') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-background font-sans">
        <div className="absolute inset-0 z-0">
          <FaultyTerminal 
            tint="#1e293b" 
            flickerAmount={0.02} 
            glitchAmount={0.05} 
            scanlineIntensity={0.1}
            brightness={0.6}
          />
        </div>
        
        <div className="relative z-10 max-w-lg w-full text-center space-y-10 animate-in fade-in duration-1000">
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 backdrop-blur-md mb-4 shadow-lg">
              <Sparkles className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight drop-shadow-md">
              QuizGen <span className="text-indigo-400">AI</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-md mx-auto keep-all">
              인공지능과 정보 교과 지식을 테스트해보세요.<br/>AI가 생성한 맞춤형 퀴즈가 기다리고 있습니다.
            </p>
          </div>

          <Button 
            onClick={fetchQuiz}
            size="lg"
            className="w-full max-w-xs h-14 text-lg font-semibold bg-white text-slate-900 hover:bg-indigo-50 rounded-full shadow-xl transition-all hover:scale-105"
          >
            <Play className="w-5 h-5 mr-2 fill-current" /> 도전 시작하기
          </Button>
        </div>
      </div>
    );
  }

  // --- LOADING SCREEN ---
  if (gameState === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-50">
          <FaultyTerminal tint="#0f172a" timeScale={1.5} />
        </div>
        <div className="relative z-10 flex flex-col items-center space-y-6">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <p className="text-slate-300 font-medium tracking-wide animate-pulse">문제를 생성하고 있습니다...</p>
        </div>
      </div>
    );
  }

  // --- FINISHED SCREEN ---
  if (gameState === 'finished') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40">
            <FaultyTerminal tint="#020617" />
        </div>
        
        <Card className="relative z-10 w-full max-w-md bg-card/90 backdrop-blur-xl border-border/50 shadow-2xl animate-in zoom-in-95 duration-500">
          <CardContent className="flex flex-col items-center text-center p-8 md:p-10 space-y-8">
            <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mb-2 ring-1 ring-yellow-500/30">
              <Trophy className="w-12 h-12 text-yellow-500" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-foreground">퀴즈 완료!</h2>
              <p className="text-muted-foreground">최종 결과를 확인해보세요</p>
            </div>

            <div className="w-full bg-muted/50 rounded-2xl p-6 border border-border/50">
              <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">최종 점수</div>
              <div className="text-5xl font-black text-indigo-500">{score}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 w-full">
               <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex flex-col items-center">
                 <span className="text-2xl font-bold text-green-500">{Math.round(score / 100)}</span>
                 <span className="text-xs text-green-400/70 font-medium uppercase mt-1">정답</span>
               </div>
               <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex flex-col items-center">
                 <span className="text-2xl font-bold text-red-500">{questions.length - Math.round(score / 100)}</span>
                 <span className="text-xs text-red-400/70 font-medium uppercase mt-1">오답</span>
               </div>
            </div>

            <Button 
              onClick={() => setGameState('start')}
              className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 rounded-xl"
            >
              <RotateCcw className="w-4 h-4 mr-2" /> 다시 도전하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- PLAYING SCREEN ---
  const currentQuestion = questions[currentIndex];
  const progressValue = ((currentIndex) / questions.length) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-foreground font-sans selection:bg-indigo-500/20">
      {/* Background */}
      <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
        <FaultyTerminal tint="#0f172a" brightness={0.5} flickerAmount={0.01} scanlineIntensity={0.05} />
      </div>

      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="container max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <Badge variant="outline" className="h-8 px-3 rounded-full border-border/50 bg-secondary/30 text-secondary-foreground font-mono">
               문제 {currentIndex + 1}/{questions.length}
             </Badge>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">점수</span>
             <span className="text-lg font-bold text-indigo-400 font-mono">{score}</span>
          </div>
        </div>
        {/* Sleek Progress Line */}
        <div className="h-1 w-full bg-secondary/30">
          <div 
            className="h-full bg-indigo-500 transition-all duration-500 ease-out"
            style={{ width: `${progressValue}%` }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 container max-w-3xl mx-auto p-6 flex flex-col justify-center min-h-[calc(100vh-4rem)]">
        
        <div className="flex flex-col gap-8 pb-10">
          {/* Question Section */}
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h2 className="text-2xl md:text-3xl font-semibold leading-relaxed md:leading-relaxed text-foreground/90 keep-all">
              {currentQuestion.quiz.question}
            </h2>
          </div>

          {/* Options Section - Vertical Layout for Comfort */}
          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.quiz.options.map((option, idx) => {
              const isSelected = selectedAnswer === option;
              const isAnswer = currentQuestion.quiz.answer === option;
              const labels = ['A', 'B', 'C', 'D'];
              
              // Styles
              let cardClass = "relative w-full p-4 md:p-5 text-left rounded-xl border-2 transition-all duration-200 flex items-start gap-4 group ";
              
              if (showExplanation) {
                if (isAnswer) {
                  cardClass += "bg-green-500/10 border-green-500/50 hover:bg-green-500/20";
                } else if (isSelected && !isAnswer) {
                  cardClass += "bg-red-500/10 border-red-500/50 opacity-80";
                } else {
                  cardClass += "bg-card/50 border-transparent opacity-40 grayscale";
                }
              } else {
                if (selectedAnswer === null) {
                  cardClass += "bg-card hover:bg-accent/50 hover:border-indigo-500/30 border-border cursor-pointer active:scale-[0.99]";
                } else {
                  cardClass += "bg-card border-border opacity-50"; // Disabled state look
                }
              }

              return (
                <button
                  key={idx}
                  disabled={selectedAnswer !== null}
                  onClick={() => handleAnswer(option)}
                  className={cardClass}
                >
                  <div className={`
                    flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border transition-colors
                    ${showExplanation && isAnswer ? 'bg-green-500 border-green-500 text-white' : 
                      showExplanation && isSelected && !isAnswer ? 'bg-red-500 border-red-500 text-white' :
                      'bg-secondary border-border text-muted-foreground group-hover:border-indigo-500/50 group-hover:text-foreground'}
                  `}>
                    {labels[idx]}
                  </div>
                  <span className={`text-lg font-medium leading-snug pt-0.5 keep-all ${showExplanation && isAnswer ? 'text-green-100' : 'text-foreground/90'}`}>
                    {option}
                  </span>
                  
                  {/* Status Icons */}
                  <div className="ml-auto pl-2 flex items-center">
                    {showExplanation && isAnswer && <CheckCircle2 className="w-6 h-6 text-green-500 animate-in zoom-in" />}
                    {showExplanation && isSelected && !isAnswer && <XCircle className="w-6 h-6 text-red-500 animate-in zoom-in" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation & Next Section */}
          {showExplanation && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-500 space-y-6">
              <div className={`p-6 rounded-2xl border ${isCorrect ? 'bg-green-950/20 border-green-900/50' : 'bg-red-950/20 border-red-900/50'}`}>
                 <div className="flex items-center gap-2 mb-3">
                   <HelpCircle className={`w-5 h-5 ${isCorrect ? 'text-green-500' : 'text-red-500'}`} />
                   <span className={`text-sm font-bold uppercase tracking-wider ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>해설</span>
                 </div>
                 <p className="text-base md:text-lg text-slate-200 leading-relaxed keep-all">
                   {currentQuestion.quiz.explanation}
                 </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button 
                  size="lg" 
                  onClick={handleNext} 
                  className="h-12 px-8 text-base bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-900/20 transition-transform hover:translate-x-1"
                >
                  {currentIndex < questions.length - 1 ? "다음 문제" : "결과 보기"} <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}