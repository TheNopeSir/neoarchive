import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, UserPlus, Terminal, User, AlertCircle, CheckSquare, Square } from 'lucide-react';
import { UserProfile } from '../types';
import * as db from '../services/storageService';

interface MatrixLoginProps {
  theme: 'dark' | 'light';
  onLogin: (user: UserProfile, remember: boolean) => void;
}

type AuthStep = 'ENTRY' | 'LOGIN' | 'REGISTER';

const MatrixLogin: React.FC<MatrixLoginProps> = ({ theme, onLogin }) => {
  const [step, setStep] = useState<AuthStep>('ENTRY');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [tagline, setTagline] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

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

  const resetForm = () => {
      setError('');
      setInfoMessage('');
      setPassword('');
      setUsername('');
      setTagline('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email || !password) {
          setError('ВВЕДИТЕ EMAIL И ПАРОЛЬ');
          return;
      }
      setIsLoading(true);
      setError('');
      setInfoMessage('');

      try {
          const user = await db.loginUser(email, password);
          onLogin(user, rememberMe);
      } catch (err: any) {
          setError(err.message || 'ОШИБКА АВТОРИЗАЦИИ');
      } finally {
          setIsLoading(false);
      }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        
        // Successful registration usually requires email confirmation in Supabase
        setInfoMessage('РЕГИСТРАЦИЯ ПРОШЛА УСПЕШНО! ПРОВЕРЬТЕ ПОЧТУ ДЛЯ ПОДТВЕРЖДЕНИЯ АККАУНТА, ЗАТЕМ ВОЙДИТЕ.');
        setTimeout(() => {
            setStep('LOGIN');
            setPassword('');
        }, 5000);

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
                <button 
                  onClick={() => { setStep('LOGIN'); resetForm(); }}
                  className={`py-4 px-6 border-2 font-pixel text-lg uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center justify-between group ${
                      theme === 'dark' ? 'border-dark-primary text-dark-primary hover:bg-dark-primary hover:text-black' : 'border-light-accent text-light-accent hover:bg-light-accent hover:text-white'
                  }`}
                >
                    <span>ВХОД</span>
                    <Terminal size={24} className="group-hover:animate-pulse" />
                </button>
                <button 
                  onClick={() => { setStep('REGISTER'); resetForm(); }}
                  className={`py-4 px-6 border-2 font-pixel text-lg uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center justify-between group ${
                      theme === 'dark' ? 'border-dark-dim text-dark-dim hover:border-white hover:text-white' : 'border-light-dim text-light-dim hover:border-black hover:text-black'
                  }`}
                >
                    <span>РЕГИСТРАЦИЯ</span>
                    <UserPlus size={24} />
                </button>
            </div>
        )
    }

    if (step === 'LOGIN') {
        return (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-right-4">
                 {infoMessage && (
                     <div className="p-3 border border-green-500 bg-green-500/10 text-green-500 text-xs font-mono mb-2">
                         {infoMessage}
                     </div>
                 )}
                 
                 <div className="space-y-1">
                    <label className="text-[10px] font-pixel uppercase opacity-70">EMAIL</label>
                    <div className="flex items-center gap-2 border-b-2 p-2 border-current focus-within:opacity-100 opacity-70 transition-opacity">
                        <Mail size={18} />
                        <input 
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            type="email"
                            className="bg-transparent w-full focus:outline-none font-mono text-sm"
                            placeholder="user@example.com"
                            autoComplete="username"
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
                  step === 'LOGIN' ? 'ВХОД В СИСТЕМУ' : 'НОВЫЙ ПОЛЬЗОВАТЕЛЬ'}
             </h2>
         </div>

         {renderContent()}
      </div>
    </div>
  );
};

export default MatrixLogin;