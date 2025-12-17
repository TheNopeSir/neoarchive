
import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, UserPlus, User, AlertCircle, CheckSquare, Square, Send, ArrowRight, Wand2, Eye, EyeOff, Terminal } from 'lucide-react';
import { UserProfile } from '../types';
import * as db from '../services/storageService';

interface MatrixLoginProps {
  theme: 'dark' | 'light';
  onLogin: (user: UserProfile, remember: boolean) => void;
}

type AuthStep = 'ENTRY' | 'LOGIN' | 'REGISTER' | 'TELEGRAM' | 'RECOVERY';

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}

declare global {
    interface Window {
        onTelegramAuth: (user: TelegramUser) => void;
    }
}

const MatrixLogin: React.FC<MatrixLoginProps> = ({ theme, onLogin }) => {
  const [step, setStep] = useState<AuthStep>('ENTRY');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [tagline, setTagline] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  
  const telegramWrapperRef = useRef<HTMLDivElement>(null);

  // UI State
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [showRecoverOption, setShowRecoverOption] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check for Email Verification Success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') {
        setInfoMessage("ПОЧТА ПОДТВЕРЖДЕНА");
        setStep('LOGIN');
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    }
  }, []);

  // Telegram Setup
  useEffect(() => {
      if (step === 'TELEGRAM' && telegramWrapperRef.current) {
          window.onTelegramAuth = async (user: TelegramUser) => {
              setIsLoading(true);
              try {
                  const userProfile = await db.loginViaTelegram(user);
                  onLogin(userProfile, true);
              } catch (err: any) {
                  setError("LOGIN FAILED: " + (err.message || "Server Error"));
                  setIsLoading(false);
              }
          };

          telegramWrapperRef.current.innerHTML = '';
          const script = document.createElement('script');
          script.src = "https://telegram.org/js/telegram-widget.js?22";
          script.async = true;
          script.setAttribute('data-telegram-login', 'TrusterStoryBot');
          script.setAttribute('data-size', 'large');
          script.setAttribute('data-radius', '10');
          script.setAttribute('data-onauth', 'onTelegramAuth(user)');
          script.setAttribute('data-request-access', 'write');
          telegramWrapperRef.current.appendChild(script);
      }
  }, [step]);

  const resetForm = () => {
      setError('');
      setInfoMessage('');
      setShowRecoverOption(false);
      setPassword('');
      setUsername('');
      setTagline('');
      setShowPassword(false);
  };

  const generateSecurePassword = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
      let pass = "";
      for(let i=0; i<16; i++) {
          pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setPassword(pass);
      setShowPassword(true);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!email || !password) {
          setError('ВВЕДИТЕ EMAIL И ПАРОЛЬ');
          return;
      }
      setIsLoading(true);
      setError('');
      setInfoMessage('');

      try {
          let targetEmail = email;
          const user = await db.loginUser(targetEmail, password);
          onLogin(user, rememberMe);
      } catch (err: any) {
          setError(err.message || 'ОШИБКА АВТОРИЗАЦИИ');
          setIsLoading(false);
      }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!email || !password || !username) {
        setError('ЗАПОЛНИТЕ ОБЯЗАТЕЛЬНЫЕ ПОЛЯ');
        return;
    }
    if (password.length < 6) {
        setError('ПАРОЛЬ ДОЛЖЕН БЫТЬ НЕ МЕНЕЕ 6 СИМВОЛОВ');
        return;
    }

    setIsLoading(true);
    setError('');
    setShowRecoverOption(false);
    
    try {
        await db.registerUser(username, password, tagline || 'Новый пользователь', email);
        setInfoMessage('ПИСЬМО ОТПРАВЛЕНО');
        setStep('LOGIN');
        setPassword('');

    } catch (err: any) {
        setError(err.message || "ОШИБКА РЕГИСТРАЦИИ");
        if (err.message && (err.message.includes('уже существует') || err.message.includes('заняты'))) {
            setShowRecoverOption(true);
            setInfoMessage("Email занят");
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email || !email.includes('@')) {
          setError('ВВЕДИТЕ КОРРЕКТНЫЙ EMAIL');
          return;
      }
      setIsLoading(true);
      setError('');
      
      try {
          const res = await db.recoverPassword(email);
          setInfoMessage(res.message || "Инструкции отправлены на email");
          setTimeout(() => setStep('LOGIN'), 4000);
      } catch (err: any) {
          setError("ОШИБКА: " + (err.message || "Сервис недоступен"));
      } finally {
          setIsLoading(false);
      }
  };

  const renderContent = () => {
    if (step === 'ENTRY') {
        return (
            <div className="flex flex-col gap-4 w-full">
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => { setStep('LOGIN'); resetForm(); }} className="py-6 border font-pixel text-sm uppercase tracking-widest hover:bg-white hover:text-black transition-colors flex flex-col items-center gap-2 border-white/20 text-white/80">
                        <Terminal size={24} /><span>ВХОД</span>
                    </button>
                    <button onClick={() => { setStep('REGISTER'); resetForm(); }} className="py-6 border font-pixel text-sm uppercase tracking-widest hover:bg-white hover:text-black transition-colors flex flex-col items-center gap-2 border-white/20 text-white/80">
                        <UserPlus size={24} /><span>РЕГ</span>
                    </button>
                </div>
                
                <button onClick={() => { setStep('TELEGRAM'); resetForm(); }} className="py-4 border font-pixel text-xs uppercase tracking-widest hover:bg-[#0088cc] hover:text-white hover:border-[#0088cc] transition-colors flex items-center justify-center gap-2 border-white/20 text-white/60">
                    <Send size={16} /> TELEGRAM LOGIN
                </button>
            </div>
        )
    }

    if (step === 'TELEGRAM') {
        return (
            <div className="flex flex-col gap-4 w-full">
                 <div className="flex justify-center my-4 min-h-[80px]" ref={telegramWrapperRef}>
                     {isLoading ? <div className="animate-pulse text-xs font-mono text-white/50">CONNECTING...</div> : <div className="animate-pulse text-xs font-mono text-white/50">WIDGET LOADING...</div>}
                 </div>
                 {error && <div className="text-red-500 text-xs font-mono text-center">{error}</div>}
                 <button type="button" onClick={() => { setStep('ENTRY'); resetForm(); }} className="text-xs font-mono opacity-50 hover:underline text-center text-white">ОТМЕНА</button>
            </div>
        );
    }

    if (step === 'RECOVERY') {
         return (
            <form onSubmit={handleRecoverySubmit} className="flex flex-col gap-4 w-full">
                 <div className="space-y-2">
                    <div className="flex items-center gap-2 border-b p-3 border-white/20">
                        <Mail size={16} className="text-white/50" />
                        <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="bg-transparent w-full focus:outline-none font-mono text-sm text-white placeholder-white/30" placeholder="email@domain.com" required />
                    </div>
                 </div>
                 {infoMessage && <div className="text-green-500 text-xs font-mono text-center">{infoMessage}</div>}
                 {error && <div className="text-red-500 text-xs font-mono text-center">{error}</div>}
                 <button type="submit" disabled={isLoading} className="mt-2 py-3 font-bold font-pixel uppercase bg-white text-black hover:bg-gray-200">{isLoading ? '...' : 'СБРОСИТЬ'}</button>
                 <button type="button" onClick={() => { setStep('LOGIN'); }} className="text-xs font-mono opacity-50 hover:underline text-center text-white">НАЗАД</button>
            </form>
         );
    }

    if (step === 'LOGIN') {
        return (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4 w-full">
                 {infoMessage && <div className="text-green-500 text-xs font-mono text-center mb-2">{infoMessage}</div>}
                 <div className="space-y-2">
                    <div className="flex items-center gap-2 border-b p-3 border-white/20">
                        <User size={16} className="text-white/50" /><input value={email} onChange={e => setEmail(e.target.value)} type="text" className="bg-transparent w-full focus:outline-none font-mono text-sm text-white placeholder-white/30" placeholder="email / login" required />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <div className="flex items-center gap-2 border-b p-3 border-white/20">
                        <Lock size={16} className="text-white/50" />
                        <input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? "text" : "password"} className="bg-transparent w-full focus:outline-none font-mono text-sm text-white placeholder-white/30" placeholder="******" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="opacity-50 hover:opacity-100 focus:outline-none text-white">
                            {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                        </button>
                    </div>
                 </div>
                 <div className="flex justify-between items-center px-1">
                     <div onClick={() => setRememberMe(!rememberMe)} className="flex items-center gap-2 cursor-pointer opacity-70 hover:opacity-100 transition-opacity select-none text-white">
                         {rememberMe ? <CheckSquare size={14} /> : <Square size={14} />}<span className="text-[10px] font-mono uppercase">СОХРАНИТЬ</span>
                     </div>
                     <button type="button" onClick={() => { setStep('RECOVERY'); resetForm(); }} className="text-[10px] font-mono opacity-50 hover:opacity-100 underline text-white">ЗАБЫЛИ?</button>
                 </div>
                 {error && <div className="flex items-center gap-2 text-red-500 text-xs font-mono justify-center"><AlertCircle size={14}/> {error}</div>}
                 <button type="submit" disabled={isLoading} className="mt-2 py-3 font-bold font-pixel uppercase bg-white text-black hover:bg-gray-200">{isLoading ? '...' : 'ВОЙТИ'}</button>
                 <button type="button" onClick={() => { setStep('ENTRY'); resetForm(); }} className="text-xs font-mono opacity-50 hover:underline text-center text-white">НАЗАД</button>
            </form>
        )
    }

    if (step === 'REGISTER') {
        return (
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4 w-full">
                <div className="flex items-center gap-2 border-b p-2 border-white/20"><Mail size={16} className="text-white/50"/><input value={email} onChange={e => setEmail(e.target.value)} type="email" className="bg-transparent w-full focus:outline-none font-mono text-sm text-white placeholder-white/30" placeholder="EMAIL" required /></div>
                
                <div className="flex items-center gap-2 border-b p-2 border-white/20">
                    <Lock size={16} className="text-white/50" />
                    <input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? "text" : "password"} className="bg-transparent w-full focus:outline-none font-mono text-sm text-white placeholder-white/30" placeholder="ПАРОЛЬ" required />
                    <button type="button" onClick={generateSecurePassword} className="opacity-50 hover:opacity-100 text-white">
                            <Wand2 size={14} />
                    </button>
                </div>

                <div className="flex items-center gap-2 border-b p-2 border-white/20"><User size={16} className="text-white/50"/><input value={username} onChange={e => setUsername(e.target.value)} className="bg-transparent w-full focus:outline-none font-mono text-sm text-white placeholder-white/30" placeholder="LOGIN" required /></div>
                <div className="flex items-center gap-2 border-b p-2 border-white/20"><Terminal size={16} className="text-white/50"/><input value={tagline} onChange={e => setTagline(e.target.value)} className="bg-transparent w-full focus:outline-none font-mono text-sm text-white placeholder-white/30" placeholder="СТАТУС" /></div>
                
                {infoMessage && <div className="text-green-500 text-xs font-mono text-center">{infoMessage}</div>}
                
                {showRecoverOption && (
                    <button type="button" onClick={() => setStep('RECOVERY')} className="w-full py-2 bg-yellow-500/20 text-yellow-500 border border-yellow-500 font-pixel text-xs font-bold hover:bg-yellow-500 hover:text-black">
                        ВОССТАНОВИТЬ
                    </button>
                )}

                {error && <div className="text-red-500 text-xs font-mono text-center">{error}</div>}

                <button type="submit" disabled={isLoading} className="mt-2 py-3 font-bold font-pixel uppercase bg-white text-black hover:bg-gray-200">{isLoading ? '...' : 'СОЗДАТЬ'}</button>
                <button type="button" onClick={() => { setStep('ENTRY'); resetForm(); }} className="text-xs font-mono opacity-50 hover:underline text-center text-white">НАЗАД</button>
            </form>
        )
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm p-8 rounded-xl border border-white/10 bg-black">
         {renderContent()}
      </div>
    </div>
  );
};

const RetroLoader = ({text}: {text: string}) => (
    <div className="flex flex-col items-center gap-2 opacity-50">
        <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
    </div>
);

export default MatrixLogin;
