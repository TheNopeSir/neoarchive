
import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, UserPlus, Terminal, User, AlertCircle, CheckSquare, Square, Send, Globe } from 'lucide-react';
import { UserProfile } from '../types';
import * as db from '../services/storageService';

interface MatrixLoginProps {
  theme: 'dark' | 'light';
  onLogin: (user: UserProfile, remember: boolean) => void;
}

type AuthStep = 'ENTRY' | 'LOGIN' | 'REGISTER' | 'TELEGRAM';

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
  const [username, setUsername] = useState('');
  const [tagline, setTagline] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  
  const telegramWrapperRef = useRef<HTMLDivElement>(null);

  // UI State
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [glitchIntensity, setGlitchIntensity] = useState(0);

  // Glitch effect on entry
  useEffect(() => {
    const interval = setInterval(() => {
        setGlitchIntensity(Math.random());
        setTimeout(() => setGlitchIntensity(0), 100);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Telegram Widget Injection & Callback Setup
  useEffect(() => {
      if (step === 'TELEGRAM' && telegramWrapperRef.current) {
          // Define the global callback function expected by the widget
          window.onTelegramAuth = async (user: TelegramUser) => {
              console.log("Telegram Auth Success:", user);
              setIsLoading(true);
              try {
                  // 1. Determine Identity
                  const neoUsername = user.username || `tg_${user.id}`;
                  const neoEmail = `${user.id}@telegram.neoarchive.com`;
                  
                  // 2. STABLE PASSWORD (User ID based, ignores auth_date hash which changes)
                  const stablePassword = `tg_secure_${user.id}_v2`;

                  // 3. Check if user already exists in local cache (synced from server)
                  const allUsers = db.getFullDatabase().users;
                  const existingUser = allUsers.find(u => 
                      u.email === neoEmail || u.username === neoUsername || u.telegram === user.username
                  );

                  let userProfile: UserProfile;

                  if (existingUser) {
                      console.log("Found existing Telegram user in cache:", existingUser.username);
                      
                      // Use the password stored in DB if available, otherwise fallback to stable
                      const effectivePassword = existingUser.password || stablePassword;
                      
                      // Perform Login
                      try {
                          userProfile = await db.loginUser(existingUser.email, effectivePassword);
                      } catch (loginErr) {
                          console.warn("Login failed with stored password, trying to update...", loginErr);
                          // If login failed (e.g. password mismatch), we might need to force update it
                          // But we can't update without logging in usually. 
                          // However, since we trust the Telegram Widget proof, we can "recover" the account by overwriting.
                          const updatedProfile = { 
                              ...existingUser, 
                              password: stablePassword,
                              avatarUrl: user.photo_url || existingUser.avatarUrl,
                              telegram: user.username
                          };
                          await db.updateUserProfile(updatedProfile);
                          userProfile = updatedProfile;
                      }
                  } else {
                      console.log("Registering new Telegram user...");
                      const displayName = user.username ? `@${user.username}` : `${user.first_name}`;
                      userProfile = await db.registerUser(
                          neoUsername, 
                          stablePassword, 
                          `Telegram Identity: ${displayName}`, 
                          neoEmail, 
                          user.username,
                          user.photo_url
                      );
                  }
                  
                  onLogin(userProfile, true);

              } catch (err: any) {
                  console.error("Telegram Auth Error:", err);
                  setError("LOGIN FAILED: " + (err.message || "Unknown Error"));
                  setIsLoading(false);
              }
          };

          // Inject Script dynamically
          telegramWrapperRef.current.innerHTML = '';
          const script = document.createElement('script');
          script.src = "https://telegram.org/js/telegram-widget.js?22";
          script.async = true;
          script.setAttribute('data-telegram-login', 'TrusterStoryBot');
          script.setAttribute('data-size', 'large'); // Restore Large for better visibility in separate view
          script.setAttribute('data-radius', '10');
          script.setAttribute('data-onauth', 'onTelegramAuth(user)');
          script.setAttribute('data-request-access', 'write');
          
          telegramWrapperRef.current.appendChild(script);
      }
  }, [step]);

  const resetForm = () => {
      setError('');
      setInfoMessage('');
      setPassword('');
      setUsername('');
      setTagline('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation(); // Stop bubbling
      
      if (!email || !password) {
          setError('ВВЕДИТЕ EMAIL И ПАРОЛЬ');
          return;
      }
      setIsLoading(true);
      setError('');
      setInfoMessage('');

      try {
          // Allow login by Username OR Email
          // If input doesn't contain '@', treat as username
          let targetEmail = email;
          if (!email.includes('@')) {
              const allUsers = db.getFullDatabase().users;
              const found = allUsers.find(u => u.username.toLowerCase() === email.toLowerCase());
              if (found) {
                  targetEmail = found.email;
              } else {
                  throw new Error("Пользователь не найден");
              }
          }

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
    
    try {
        await db.registerUser(username, password, tagline || 'Новый пользователь', email);
        setInfoMessage('РЕГИСТРАЦИЯ УСПЕШНА. ВЫПОЛНИТЕ ВХОД.');
        setTimeout(() => {
            setStep('LOGIN');
            setPassword('');
        }, 3000);

    } catch (err: any) {
        setError(err.message || "ОШИБКА РЕГИСТРАЦИИ");
    } finally {
        setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (step === 'ENTRY') {
        return (
            <div className="flex flex-col gap-4 w-full">
                {/* Standard Auth Block */}
                <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => { setStep('LOGIN'); resetForm(); }}
                      className={`py-4 px-2 border-2 font-pixel text-sm md:text-base uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-2 group ${
                          theme === 'dark' ? 'border-dark-primary text-dark-primary hover:bg-dark-primary hover:text-black' : 'border-light-accent text-light-accent hover:bg-light-accent hover:text-white'
                      }`}
                    >
                        <Terminal size={24} className="group-hover:animate-pulse" />
                        <span>ВХОД</span>
                    </button>

                    <button 
                      onClick={() => { setStep('REGISTER'); resetForm(); }}
                      className={`py-4 px-2 border-2 font-pixel text-sm md:text-base uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-2 group ${
                          theme === 'dark' ? 'border-dark-dim text-dark-dim hover:border-white hover:text-white' : 'border-light-dim text-light-dim hover:border-black hover:text-black'
                      }`}
                    >
                        <UserPlus size={24} />
                        <span>РЕГИСТРАЦИЯ</span>
                    </button>
                </div>
                
                {/* Separator */}
                <div className="flex items-center gap-2 opacity-50 my-2">
                    <div className="h-px bg-current flex-1"></div>
                    <span className="text-[10px] font-mono">АЛЬТЕРНАТИВНЫЙ ДОСТУП</span>
                    <div className="h-px bg-current flex-1"></div>
                </div>

                {/* Telegram Auth Block - Separated */}
                <button 
                  onClick={() => { setStep('TELEGRAM'); resetForm(); }}
                  className={`py-4 px-6 border-2 font-pixel text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center justify-between group ${
                      theme === 'dark' ? 'border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-black' : 'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white'
                  }`}
                >
                    <div className="flex flex-col items-start">
                        <span>TELEGRAM LOGIN</span>
                        <span className="text-[8px] font-mono opacity-70 normal-case tracking-normal">Быстрый вход через мессенджер</span>
                    </div>
                    <Send size={24} />
                </button>
            </div>
        )
    }

    if (step === 'TELEGRAM') {
        return (
            <div className="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-right-4">
                 <div className="text-center font-mono text-xs opacity-70 mb-2 border-b border-dashed border-gray-500 pb-2">
                     МОДУЛЬ АВТОРИЗАЦИИ TELEGRAM
                 </div>
                 
                 <div className="text-[10px] font-mono opacity-60 text-center mb-4">
                     Для входа нажмите кнопку ниже и подтвердите действие в Telegram. Пароль не требуется.
                 </div>

                 {/* Widget Container - Centered */}
                 <div className="flex justify-center my-4 min-h-[80px]" ref={telegramWrapperRef}>
                     <RetroLoader text="INIT_WIDGET" />
                 </div>

                 {error && (
                     <div className="flex items-center gap-2 text-red-500 font-bold text-xs font-mono justify-center animate-pulse border border-red-500 p-2 mt-4">
                         <AlertCircle size={16}/> {error}
                     </div>
                 )}
                 
                 <button type="button" onClick={() => { setStep('ENTRY'); resetForm(); }} className="mt-4 text-xs font-mono opacity-50 hover:underline text-center">ОТМЕНА</button>
            </div>
        );
    }

    // Login and Register views
    if (step === 'LOGIN') {
        return (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-right-4">
                 {infoMessage && (
                     <div className="p-3 border border-green-500 bg-green-500/10 text-green-500 text-xs font-mono mb-2">
                         {infoMessage}
                     </div>
                 )}
                 
                 <div className="space-y-1">
                    <label className="text-[10px] font-pixel uppercase opacity-70">EMAIL ИЛИ НИКНЕЙМ</label>
                    <div className="flex items-center gap-2 border-b-2 p-2 border-current focus-within:opacity-100 opacity-70 transition-opacity">
                        <User size={18} />
                        <input 
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            type="text"
                            className="bg-transparent w-full focus:outline-none font-mono text-sm"
                            placeholder="user@example.com или Neo"
                            autoComplete="username"
                            required
                        />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-pixel uppercase opacity-70">ПАРОЛЬ</label>
                    <div className="flex items-center gap-2 border-b-2 p-2 border-current focus-within:opacity-100 opacity-70 transition-opacity">
                        <Lock size={18} />
                        <input 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            type="password"
                            className="bg-transparent w-full focus:outline-none font-mono text-sm"
                            placeholder="******"
                            autoComplete="current-password"
                            required
                        />
                    </div>
                 </div>
                 
                 <div 
                    onClick={() => setRememberMe(!rememberMe)}
                    className="flex items-center gap-2 cursor-pointer opacity-70 hover:opacity-100 transition-opacity select-none"
                 >
                     {rememberMe ? <CheckSquare size={16} /> : <Square size={16} />}
                     <span className="text-[10px] font-mono font-bold uppercase">СОХРАНИТЬ ПАРОЛЬ</span>
                 </div>
                 
                 {error && (
                     <div className="flex items-center gap-2 text-red-500 font-bold text-xs font-mono justify-center animate-pulse border border-red-500 p-2">
                         <AlertCircle size={16}/> {error}
                     </div>
                 )}

                 <button 
                     type="submit"
                     disabled={isLoading}
                     className={`mt-4 py-3 font-bold font-pixel uppercase ${
                         theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'
                     }`}
                 >
                     {isLoading ? 'ПОДКЛЮЧЕНИЕ...' : 'ВОЙТИ В СЕТЬ'}
                 </button>
                 <button type="button" onClick={() => { setStep('ENTRY'); resetForm(); }} className="text-xs font-mono opacity-50 hover:underline">НАЗАД</button>
            </form>
        )
    }

    if (step === 'REGISTER') {
        return (
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-right-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-pixel uppercase opacity-70">EMAIL *</label>
                    <div className="flex items-center gap-2 border-b-2 p-2 border-current focus-within:opacity-100 opacity-70 transition-opacity">
                        <Mail size={18} />
                        <input 
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            type="email"
                            className="bg-transparent w-full focus:outline-none font-mono text-sm"
                            placeholder="user@example.com"
                            autoComplete="email"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-pixel uppercase opacity-70">ПАРОЛЬ (МИН. 6) *</label>
                    <div className="flex items-center gap-2 border-b-2 p-2 border-current focus-within:opacity-100 opacity-70 transition-opacity">
                        <Lock size={18} />
                        <input 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            type="password"
                            className="bg-transparent w-full focus:outline-none font-mono text-sm"
                            placeholder="******"
                            autoComplete="new-password"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-pixel uppercase opacity-70">НИКНЕЙМ *</label>
                    <div className="flex items-center gap-2 border-b-2 p-2 border-current focus-within:opacity-100 opacity-70 transition-opacity">
                        <User size={18} />
                        <input 
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="bg-transparent w-full focus:outline-none font-mono text-sm"
                            placeholder="Neo"
                            autoComplete="username"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-pixel uppercase opacity-70">СТАТУС (TAGLINE)</label>
                    <div className="flex items-center gap-2 border-b-2 p-2 border-current focus-within:opacity-100 opacity-70 transition-opacity">
                        <Terminal size={18} />
                        <input 
                            value={tagline}
                            onChange={e => setTagline(e.target.value)}
                            className="bg-transparent w-full focus:outline-none font-mono text-sm"
                            placeholder="Wake up..."
                        />
                    </div>
                </div>

                {error && <div className="text-red-500 font-bold text-xs font-mono text-center border border-red-500 p-2">{error}</div>}

                <button 
                     type="submit"
                     disabled={isLoading}
                     className={`mt-4 py-3 font-bold font-pixel uppercase ${
                         theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'
                     }`}
                 >
                     {isLoading ? 'СОЗДАНИЕ...' : 'ЗАРЕГИСТРИРОВАТЬСЯ'}
                 </button>
                 <button type="button" onClick={() => { setStep('ENTRY'); resetForm(); }} className="text-xs font-mono opacity-50 hover:underline">НАЗАД</button>
            </form>
        )
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-20">
      <div className={`w-full max-w-md border-2 p-8 rounded-lg shadow-2xl relative transition-all duration-300 ${
        theme === 'dark' 
          ? 'bg-black/90 border-dark-primary shadow-[0_0_30px_rgba(74,222,128,0.2)]' 
          : 'bg-white/95 border-light-accent shadow-xl'
      }`}>
         {/* Header */}
         <div className="flex justify-between items-start mb-8 border-b-2 border-dashed pb-4 border-current opacity-70">
             <div className="flex items-center gap-2">
                 <Terminal size={20} />
                 <span className="font-pixel text-sm">NEO_AUTH</span>
             </div>
             <div className="flex gap-1">
                 <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                 <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse delay-75"></div>
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse delay-150"></div>
             </div>
         </div>

         {/* Title */}
         <div className="mb-8 relative overflow-hidden">
             <h2 className={`text-lg md:text-xl font-pixel font-bold uppercase ${glitchIntensity > 0.5 ? 'translate-x-1 text-red-500' : ''}`}>
                 {step === 'ENTRY' ? 'ИДЕНТИФИКАЦИЯ' : 
                  step === 'LOGIN' ? 'ВХОД В СИСТЕМУ' : 
                  step === 'TELEGRAM' ? 'TELEGRAM LINK' : 'НОВЫЙ ПОЛЬЗОВАТЕЛЬ'}
             </h2>
         </div>

         {renderContent()}
      </div>
    </div>
  );
};

const RetroLoader = ({text}: {text: string}) => (
    <div className="flex flex-col items-center">
        <div className="w-4 h-4 border-2 border-t-transparent border-current rounded-full animate-spin mb-2"></div>
        <span className="text-[9px] font-mono animate-pulse">{text}</span>
    </div>
);

export default MatrixLogin;
