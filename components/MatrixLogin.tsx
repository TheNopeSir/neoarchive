
import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, UserPlus, Terminal, User, AlertCircle, CheckSquare, Square, Send, ArrowRight, Wand2, Eye, EyeOff } from 'lucide-react';
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
        setInfoMessage("ПОЧТА ПОДТВЕРЖДЕНА. ВЫПОЛНИТЕ ВХОД.");
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
        setInfoMessage('ПИСЬМО ОТПРАВЛЕНО. ПОДТВЕРДИТЕ EMAIL.');
        setStep('LOGIN');
        setPassword('');

    } catch (err: any) {
        setError(err.message || "ОШИБКА РЕГИСТРАЦИИ");
        if (err.message && (err.message.includes('уже существует') || err.message.includes('заняты'))) {
            setShowRecoverOption(true);
            setInfoMessage("Email занят. Попробуйте восстановить пароль.");
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
          setError("ОШИБКА ОТПРАВКИ: " + (err.message || "Сервис недоступен"));
      } finally {
          setIsLoading(false);
      }
  };

  const renderContent = () => {
    if (step === 'ENTRY') {
        return (
            <div className="flex flex-col gap-6 w-full">
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => { setStep('LOGIN'); resetForm(); }} className={`py-6 px-2 border-2 font-pixel text-sm md:text-base uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-3 group bg-black/50 backdrop-blur-md ${theme === 'dark' ? 'border-dark-primary text-dark-primary hover:bg-dark-primary hover:text-black' : 'border-light-accent text-light-accent hover:bg-light-accent hover:text-white'}`}>
                        <Terminal size={28} className="group-hover:animate-pulse" /><span>ВХОД</span>
                    </button>
                    <button onClick={() => { setStep('REGISTER'); resetForm(); }} className={`py-6 px-2 border-2 font-pixel text-sm md:text-base uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-3 group bg-black/50 backdrop-blur-md ${theme === 'dark' ? 'border-dark-dim text-dark-dim hover:border-white hover:text-white' : 'border-light-dim text-light-dim hover:border-black hover:text-black'}`}>
                        <UserPlus size={28} /><span>РЕГИСТРАЦИЯ</span>
                    </button>
                </div>
                <div className="flex items-center gap-4 opacity-70 my-2">
                    <div className="h-px bg-current flex-1"></div><span className="text-xs font-mono font-bold">АЛЬТЕРНАТИВНЫЙ ДОСТУП</span><div className="h-px bg-current flex-1"></div>
                </div>
                <button onClick={() => { setStep('TELEGRAM'); resetForm(); }} className={`py-5 px-6 border-2 font-pixel text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center justify-between group bg-black/50 backdrop-blur-md ${theme === 'dark' ? 'border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-black' : 'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white'}`}>
                    <div className="flex flex-col items-start"><span>TELEGRAM LOGIN</span><span className="text-[9px] font-mono opacity-80 normal-case tracking-normal mt-1">Быстрый вход через мессенджер</span></div><Send size={24} />
                </button>
            </div>
        )
    }

    if (step === 'TELEGRAM') {
        return (
            <div className="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-right-4">
                 <div className="text-center font-mono text-xs opacity-70 mb-2 border-b border-dashed border-gray-500 pb-2">МОДУЛЬ АВТОРИЗАЦИИ TELEGRAM</div>
                 {isLoading ? (
                     <div className="flex justify-center my-4 min-h-[80px]"><RetroLoader text="CONNECTING..." /></div>
                 ) : (
                     <div className="flex justify-center my-4 min-h-[80px]" ref={telegramWrapperRef}><RetroLoader text="INIT_WIDGET" /></div>
                 )}
                 {error && <div className="text-red-500 font-bold text-xs font-mono border border-red-500 p-2 mt-4">{error}</div>}
                 <button type="button" onClick={() => { setStep('ENTRY'); resetForm(); }} className="mt-4 text-xs font-mono opacity-50 hover:underline text-center">ОТМЕНА</button>
            </div>
        );
    }

    if (step === 'RECOVERY') {
         return (
            <form onSubmit={handleRecoverySubmit} className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-right-4">
                 <div className="text-center font-mono text-xs opacity-70 mb-2">ВОССТАНОВЛЕНИЕ ДОСТУПА</div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-pixel uppercase opacity-70">EMAIL</label>
                    <div className="flex items-center gap-2 border-b-2 p-3 border-current bg-black/30">
                        <Mail size={18} />
                        <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="bg-transparent w-full focus:outline-none font-mono text-sm" placeholder="user@example.com" required />
                    </div>
                 </div>
                 {infoMessage && <div className="text-green-500 text-xs font-mono p-2 border border-green-500 bg-green-900/20">{infoMessage}</div>}
                 {error && <div className="text-red-500 font-bold text-xs font-mono border border-red-500 p-2 bg-red-900/20">{error}</div>}
                 <button type="submit" disabled={isLoading} className={`mt-4 py-4 font-bold font-pixel uppercase ${theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'}`}>{isLoading ? 'ОТПРАВКА...' : 'ВОССТАНОВИТЬ'}</button>
                 <button type="button" onClick={() => { setStep('LOGIN'); }} className="text-xs font-mono opacity-50 hover:underline text-center">НАЗАД</button>
            </form>
         );
    }

    if (step === 'LOGIN') {
        return (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-right-4">
                 {infoMessage && <div className="p-3 border border-green-500 bg-green-500/10 text-green-500 text-xs font-mono mb-2">{infoMessage}</div>}
                 <div className="space-y-2">
                    <label className="text-[10px] font-pixel uppercase opacity-70">EMAIL ИЛИ НИКНЕЙМ</label>
                    <div className="flex items-center gap-2 border-b-2 p-3 border-current bg-black/30 opacity-80 focus-within:opacity-100 transition-opacity">
                        <User size={18} /><input value={email} onChange={e => setEmail(e.target.value)} type="text" className="bg-transparent w-full focus:outline-none font-mono text-sm" placeholder="user@example.com" required />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-pixel uppercase opacity-70">ПАРОЛЬ</label>
                    <div className="flex items-center gap-2 border-b-2 p-3 border-current bg-black/30 opacity-80 focus-within:opacity-100 transition-opacity">
                        <Lock size={18} />
                        <input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? "text" : "password"} className="bg-transparent w-full focus:outline-none font-mono text-sm" placeholder="******" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="opacity-50 hover:opacity-100 focus:outline-none">
                            {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                        </button>
                    </div>
                 </div>
                 <div className="flex justify-between items-center px-1">
                     <div onClick={() => setRememberMe(!rememberMe)} className="flex items-center gap-2 cursor-pointer opacity-70 hover:opacity-100 transition-opacity select-none">
                         {rememberMe ? <CheckSquare size={16} /> : <Square size={16} />}<span className="text-[10px] font-mono font-bold uppercase">СОХРАНИТЬ</span>
                     </div>
                     <button type="button" onClick={() => { setStep('RECOVERY'); resetForm(); }} className="text-[10px] font-mono opacity-50 hover:opacity-100 underline">ЗАБЫЛИ ПАРОЛЬ?</button>
                 </div>
                 {error && <div className="flex items-center gap-2 text-red-500 font-bold text-xs font-mono justify-center animate-pulse border border-red-500 p-2 bg-red-900/20"><AlertCircle size={16}/> {error}</div>}
                 <button type="submit" disabled={isLoading} className={`mt-4 py-4 font-bold font-pixel uppercase ${theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'}`}>{isLoading ? 'ПОДКЛЮЧЕНИЕ...' : 'ВОЙТИ В СЕТЬ'}</button>
                 <button type="button" onClick={() => { setStep('ENTRY'); resetForm(); }} className="text-xs font-mono opacity-50 hover:underline text-center">НАЗАД</button>
            </form>
        )
    }

    if (step === 'REGISTER') {
        return (
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-right-4">
                <div className="space-y-1"><label className="text-[10px] font-pixel uppercase opacity-70">EMAIL *</label><div className="flex items-center gap-2 border-b-2 p-2 border-current bg-black/30"><Mail size={18} /><input value={email} onChange={e => setEmail(e.target.value)} type="email" className="bg-transparent w-full focus:outline-none font-mono text-sm" required /></div></div>
                
                <div className="space-y-1">
                    <label className="text-[10px] font-pixel uppercase opacity-70">ПАРОЛЬ (МИН. 6) *</label>
                    <div className="flex items-center gap-2 border-b-2 p-2 border-current bg-black/30">
                        <Lock size={18} />
                        <input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? "text" : "password"} className="bg-transparent w-full focus:outline-none font-mono text-sm" required />
                        <button type="button" onClick={generateSecurePassword} title="Сгенерировать безопасный пароль" className="opacity-50 hover:opacity-100 focus:outline-none hover:text-green-500">
                             <Wand2 size={16} />
                        </button>
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="opacity-50 hover:opacity-100 focus:outline-none">
                            {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                        </button>
                    </div>
                </div>

                <div className="space-y-1"><label className="text-[10px] font-pixel uppercase opacity-70">НИКНЕЙМ *</label><div className="flex items-center gap-2 border-b-2 p-2 border-current bg-black/30"><User size={18} /><input value={username} onChange={e => setUsername(e.target.value)} className="bg-transparent w-full focus:outline-none font-mono text-sm" required /></div></div>
                <div className="space-y-1"><label className="text-[10px] font-pixel uppercase opacity-70">СТАТУС (TAGLINE)</label><div className="flex items-center gap-2 border-b-2 p-2 border-current bg-black/30"><Terminal size={18} /><input value={tagline} onChange={e => setTagline(e.target.value)} className="bg-transparent w-full focus:outline-none font-mono text-sm" /></div></div>
                
                {infoMessage && <button type="button" onClick={() => setStep('RECOVERY')} className="text-yellow-500 text-xs font-mono border border-yellow-500 p-2 text-center hover:bg-yellow-500/10 block w-full mb-2">{infoMessage}</button>}
                
                {/* Specific option to recover if email exists */}
                {showRecoverOption && (
                    <button type="button" onClick={() => setStep('RECOVERY')} className="w-full py-2 bg-yellow-500/20 text-yellow-500 border border-yellow-500 font-pixel text-xs font-bold animate-pulse hover:bg-yellow-500 hover:text-black">
                        ВОССТАНОВИТЬ ПАРОЛЬ ДЛЯ {email}
                    </button>
                )}

                {error && <div className="text-red-500 font-bold text-xs font-mono text-center border border-red-500 p-2 bg-red-900/20">{error}</div>}

                <button type="submit" disabled={isLoading} className={`mt-4 py-3 font-bold font-pixel uppercase ${theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'}`}>{isLoading ? 'ОТПРАВКА...' : 'ЗАРЕГИСТРИРОВАТЬСЯ'}</button>
                <button type="button" onClick={() => { setStep('ENTRY'); resetForm(); }} className="text-xs font-mono opacity-50 hover:underline text-center">НАЗАД</button>
            </form>
        )
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-20">
      <div className={`w-full max-w-md border-2 p-8 rounded-lg shadow-2xl relative transition-all duration-300 backdrop-blur-md ${theme === 'dark' ? 'bg-black/95 border-dark-primary shadow-[0_0_50px_rgba(74,222,128,0.2)]' : 'bg-white/95 border-light-accent shadow-xl'}`}>
         <div className="flex justify-between items-start mb-8 border-b-2 border-dashed pb-4 border-current opacity-70">
             <div className="flex items-center gap-2"><Terminal size={20} /><span className="font-pixel text-sm">NEO_AUTH</span></div>
             <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div><div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse delay-75"></div><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse delay-150"></div></div>
         </div>
         <div className="mb-8 relative overflow-hidden">
             <h2 className="text-lg md:text-xl font-pixel font-bold uppercase tracking-wide text-center">{step === 'ENTRY' ? 'ИДЕНТИФИКАЦИЯ' : step === 'LOGIN' ? 'ВХОД В СИСТЕМУ' : step === 'RECOVERY' ? 'СБРОС КЛЮЧЕЙ' : 'НОВЫЙ ПОЛЬЗОВАТЕЛЬ'}</h2>
         </div>
         {renderContent()}
      </div>
    </div>
  );
};

const RetroLoader = ({text}: {text: string}) => (
    <div className="flex flex-col items-center"><div className="w-4 h-4 border-2 border-t-transparent border-current rounded-full animate-spin mb-2"></div><span className="text-[9px] font-mono animate-pulse">{text}</span></div>
);

export default MatrixLogin;
