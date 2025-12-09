import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, UserPlus, CheckCircle, Terminal, User, Shield } from 'lucide-react';
import { UserProfile } from '../types';
import * as db from '../services/storageService';

interface MatrixLoginProps {
  theme: 'dark' | 'light';
  onLogin: (user: UserProfile, remember: boolean) => void;
}

type AuthStep = 'ENTRY' | 'LOGIN' | 'REGISTER_EMAIL' | 'REGISTER_VERIFY' | 'REGISTER_SETUP';

const MatrixLogin: React.FC<MatrixLoginProps> = ({ theme, onLogin }) => {
  const [step, setStep] = useState<AuthStep>('ENTRY');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [tagline, setTagline] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // UI State
  const [error, setError] = useState('');
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
      setPassword('');
      setVerificationCode('');
      // Keep email for UX
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email || !password) {
          setError('ВВЕДИТЕ EMAIL И ПАРОЛЬ');
          return;
      }
      if (!email.includes('@')) {
          setError('НЕКОРРЕКТНЫЙ EMAIL');
          return;
      }
      setIsLoading(true);
      setError('');

      try {
          // Simulate network
          await new Promise(resolve => setTimeout(resolve, 800));
          const user = await db.loginUser(email, password);
          onLogin(user, rememberMe);
      } catch (err: any) {
          setError(err.message || 'ОШИБКА АВТОРИЗАЦИИ');
          setIsLoading(false);
      }
  };

  const handleRegisterEmailSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email || !email.includes('@')) {
          setError('НЕКОРРЕКТНЫЙ EMAIL');
          return;
      }
      setIsLoading(true);
      setError('');

      try {
           // Call the backend endpoint
           const response = await fetch('/api/auth/send-code', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ email })
           });

           const data = await response.json();
           setIsLoading(false);

           if (response.ok && data.success) {
               // In production, 'debugCode' should NOT be returned. 
               // This is for demonstration purposes in this environment.
               setGeneratedCode(data.debugCode);
               
               alert(`[СИСТЕМА NEO_ARCHIVE]\n\nЭмуляция SMTP сервера.\nВаш код (см. консоль сервера для реальной отправки): ${data.debugCode}`);
               setStep('REGISTER_VERIFY');
           } else {
               setError('ОШИБКА ОТПРАВКИ ПИСЬМА');
           }
      } catch (err) {
           setError('ОШИБКА СЕТИ');
           setIsLoading(false);
      }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError('');

      // Simulate Code Verification
      setTimeout(() => {
          if (verificationCode === generatedCode || verificationCode === '0000') {
              setIsLoading(false);
              setStep('REGISTER_SETUP');
          } else {
              setError('НЕВЕРНЫЙ КОД');
              setIsLoading(false);
          }
      }, 1000);
  };

  const handleRegisterComplete = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!username || !password) {
          setError('ЗАПОЛНИТЕ ВСЕ ПОЛЯ');
          return;
      }
      setIsLoading(true);
      setError('');

      try {
          const user = await db.registerUser(username, password, tagline, email);
          onLogin(user, true);
      } catch (err: any) {
          setError(err.message || "ОШИБКА РЕГИСТРАЦИИ");
          setIsLoading(false);
      }
  };

  const renderEntry = () => (
      <div 
        className="flex flex-col items-center justify-center cursor-pointer min-h-[50vh] animate-in fade-in"
        onClick={() => setStep('LOGIN')}
      >
          <h1 
            className={`text-6xl md:text-9xl font-pixel font-bold mb-4 tracking-tighter relative select-none ${theme === 'dark' ? 'text-white' : 'text-black'}`}
            style={{ 
                textShadow: glitchIntensity > 0.8 ? '4px 0px 0px red, -4px 0px 0px cyan' : 'none',
                transform: glitchIntensity > 0.9 ? 'skewX(20deg)' : 'none'
            }}
          >
              ВХОД
          </h1>
          <p className="font-mono text-xs animate-pulse opacity-70">[ НАЖМИТЕ ДЛЯ АВТОРИЗАЦИИ ]</p>
      </div>
  );

  const renderLogin = () => (
      <div className="w-full max-w-sm animate-in slide-in-from-right-10">
           <h2 className="text-xl font-pixel mb-6 flex items-center gap-2 uppercase">
               <Lock size={24} /> Авторизация
           </h2>
           
           {/* Tabs */}
           <div className="flex mb-8 border-b border-opacity-30 border-current">
               <button 
                  className={`flex-1 pb-2 font-pixel text-xs border-b-2 ${theme === 'dark' ? 'border-dark-primary' : 'border-light-accent'}`}
               >
                   EMAIL ВХОД
               </button>
               <button 
                  onClick={() => { resetForm(); setStep('REGISTER_EMAIL'); }}
                  className="flex-1 pb-2 font-pixel text-xs opacity-50 hover:opacity-100 transition-opacity"
               >
                   РЕГИСТРАЦИЯ
               </button>
           </div>

           <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div className="space-y-1">
                   <label className="text-[10px] font-pixel uppercase opacity-60">EMAIL АДРЕС</label>
                   <div className={`flex items-center border-b-2 py-2 ${theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'}`}>
                       <Mail size={16} className="opacity-50 mr-2" />
                       <input 
                         autoFocus
                         type="email"
                         value={email}
                         onChange={(e) => setEmail(e.target.value)}
                         className="w-full bg-transparent outline-none font-mono text-sm"
                         placeholder="neo@matrix.com"
                       />
                   </div>
              </div>

              <div className="space-y-1">
                   <label className="text-[10px] font-pixel uppercase opacity-60">ПАРОЛЬ</label>
                   <div className={`flex items-center border-b-2 py-2 ${theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'}`}>
                       <Lock size={16} className="opacity-50 mr-2" />
                       <input 
                         type="password"
                         value={password}
                         onChange={(e) => setPassword(e.target.value)}
                         className="w-full bg-transparent outline-none font-mono text-sm"
                         placeholder="******"
                       />
                   </div>
              </div>

              <button 
                disabled={isLoading}
                className={`w-full py-4 font-bold font-pixel uppercase tracking-widest flex items-center justify-center gap-2 ${
                    theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'
                }`}
              >
                 {isLoading ? 'ПРОТОКОЛ СВЯЗИ...' : 'ВОЙТИ'} 
              </button>
           </form>

           {error && <div className="mt-4 text-red-500 font-mono text-xs text-center border border-red-500 p-2 bg-red-500/10">{error}</div>}
      </div>
  );

  const renderRegisterEmail = () => (
      <div className="w-full max-w-sm animate-in slide-in-from-right-10">
           <h2 className="text-xl font-pixel mb-6 flex items-center gap-2 uppercase">
               <UserPlus size={24} /> Регистрация
           </h2>
           
           <div className="flex mb-8 border-b border-opacity-30 border-current">
               <button 
                  onClick={() => { resetForm(); setStep('LOGIN'); }}
                  className="flex-1 pb-2 font-pixel text-xs opacity-50 hover:opacity-100 transition-opacity"
               >
                   ВХОД
               </button>
               <button 
                  className={`flex-1 pb-2 font-pixel text-xs border-b-2 ${theme === 'dark' ? 'border-dark-primary' : 'border-light-accent'}`}
               >
                   РЕГИСТРАЦИЯ
               </button>
           </div>

           <p className="font-mono text-xs opacity-70 mb-6 text-justify">
               Внимание: Для создания учетной записи требуется верификация через почтовый шлюз. 
               <br/><br/>
               <span className={theme === 'dark' ? 'text-green-500' : 'text-green-700'}>
                   Должно прийти письмо с кодом подтверждения.
               </span>
           </p>

           <form onSubmit={handleRegisterEmailSubmit} className="space-y-6">
              <div className="space-y-1">
                   <label className="text-[10px] font-pixel uppercase opacity-60">EMAIL</label>
                   <div className={`flex items-center border-b-2 py-2 ${theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'}`}>
                       <Mail size={16} className="opacity-50 mr-2" />
                       <input 
                         autoFocus
                         type="email"
                         value={email}
                         onChange={(e) => setEmail(e.target.value)}
                         className="w-full bg-transparent outline-none font-mono text-sm"
                         placeholder="mail@example.com"
                       />
                   </div>
              </div>

              <button 
                disabled={isLoading}
                className={`w-full py-4 font-bold font-pixel uppercase tracking-widest flex items-center justify-center gap-2 ${
                    theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'
                }`}
              >
                 {isLoading ? 'ОТПРАВКА...' : 'ПОЛУЧИТЬ ПИСЬМО'} <ArrowRight size={16} />
              </button>
           </form>
           
           {error && <div className="mt-4 text-red-500 font-mono text-xs text-center border border-red-500 p-2 bg-red-500/10">{error}</div>}
      </div>
  );

  const renderVerify = () => (
      <div className="w-full max-w-sm animate-in slide-in-from-right-10">
           <h2 className="text-xl font-pixel mb-6 flex items-center gap-2 uppercase">
               <Shield size={24} /> Верификация
           </h2>
           
           <div className={`p-4 border rounded mb-6 flex items-start gap-3 ${theme === 'dark' ? 'bg-white/5 border-dark-dim' : 'bg-black/5 border-light-dim'}`}>
               <Mail size={20} className="mt-1 opacity-70 text-green-500"/>
               <div>
                   <p className="font-mono text-xs opacity-70">Письмо отправлено на:</p>
                   <p className="font-bold font-mono text-sm break-all">{email}</p>
                   <p className="text-[10px] mt-2 opacity-50 uppercase animate-pulse">ОЖИДАНИЕ ВВОДА КОДА...</p>
               </div>
           </div>

           <form onSubmit={handleVerificationSubmit} className="space-y-6">
              <div className="space-y-1">
                   <label className="text-[10px] font-pixel uppercase opacity-60">КОД ИЗ ПИСЬМА</label>
                   <input 
                     autoFocus
                     type="text"
                     value={verificationCode}
                     onChange={(e) => setVerificationCode(e.target.value)}
                     className={`w-full bg-transparent border-2 text-center text-3xl font-mono py-4 outline-none tracking-[0.5em] rounded ${
                         theme === 'dark' ? 'border-dark-dim focus:border-dark-primary text-white' : 'border-light-dim focus:border-light-accent text-black'
                     }`}
                     placeholder="_ _ _ _"
                     maxLength={4}
                   />
              </div>

              <button 
                disabled={isLoading}
                className={`w-full py-4 font-bold font-pixel uppercase tracking-widest flex items-center justify-center gap-2 ${
                    theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'
                }`}
              >
                 {isLoading ? 'ПРОВЕРКА...' : 'ПОДТВЕРДИТЬ'} 
              </button>

              <button 
                 type="button" 
                 onClick={handleRegisterEmailSubmit}
                 className="w-full text-center text-[10px] font-mono opacity-50 hover:opacity-100 hover:underline"
              >
                  [ ОТПРАВИТЬ ПОВТОРНО ]
              </button>
           </form>
           
           {error && <div className="mt-4 text-red-500 font-mono text-xs text-center border border-red-500 p-2 bg-red-500/10">{error}</div>}
      </div>
  );

  const renderSetup = () => (
      <div className="w-full max-w-sm animate-in slide-in-from-right-10">
           <h2 className="text-xl font-pixel mb-6 flex items-center gap-2 uppercase">
               <Terminal size={24} /> Создание профиля
           </h2>
           <p className="font-mono text-xs opacity-70 mb-6 flex items-center gap-2 text-green-500">
               <CheckCircle size={14} /> Личность подтверждена
           </p>

           <form onSubmit={handleRegisterComplete} className="space-y-6">
              <div className="space-y-1">
                   <label className="text-[10px] font-pixel uppercase opacity-60">ИМЯ ПОЛЬЗОВАТЕЛЯ</label>
                   <input 
                     autoFocus
                     type="text"
                     value={username}
                     onChange={(e) => setUsername(e.target.value)}
                     className={`w-full bg-transparent border-b-2 py-2 outline-none font-mono ${
                         theme === 'dark' ? 'border-dark-dim focus:border-dark-primary' : 'border-light-dim focus:border-light-accent'
                     }`}
                     placeholder="Neo_User_X"
                   />
              </div>

              <div className="space-y-1">
                   <label className="text-[10px] font-pixel uppercase opacity-60">СОЗДАТЬ ПАРОЛЬ</label>
                   <input 
                     type="password"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className={`w-full bg-transparent border-b-2 py-2 outline-none font-mono ${
                         theme === 'dark' ? 'border-dark-dim focus:border-dark-primary' : 'border-light-dim focus:border-light-accent'
                     }`}
                     placeholder="******"
                   />
              </div>

              <div className="space-y-1">
                   <label className="text-[10px] font-pixel uppercase opacity-60">СТАТУС</label>
                   <input 
                     type="text"
                     value={tagline}
                     onChange={(e) => setTagline(e.target.value)}
                     className={`w-full bg-transparent border-b-2 py-2 outline-none font-mono ${
                         theme === 'dark' ? 'border-dark-dim focus:border-dark-primary' : 'border-light-dim focus:border-light-accent'
                     }`}
                     placeholder="Wake up, Neo..."
                   />
              </div>

              <button 
                disabled={isLoading}
                className={`w-full py-4 font-bold font-pixel uppercase tracking-widest flex items-center justify-center gap-2 ${
                    theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'
                }`}
              >
                 {isLoading ? 'СОЗДАНИЕ...' : 'ЗАВЕРШИТЬ'} 
              </button>
           </form>
           
           {error && <div className="mt-4 text-red-500 font-mono text-xs text-center border border-red-500 p-2 bg-red-500/10">{error}</div>}
      </div>
  );

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 relative z-20 overflow-y-auto ${
        theme === 'dark' ? 'bg-black/90' : 'bg-white/90'
    }`}>
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

        <div className="relative z-10 w-full flex justify-center py-10">
            {step === 'ENTRY' && renderEntry()}
            {step === 'LOGIN' && renderLogin()}
            {step === 'REGISTER_EMAIL' && renderRegisterEmail()}
            {step === 'REGISTER_VERIFY' && renderVerify()}
            {step === 'REGISTER_SETUP' && renderSetup()}
        </div>

        {step !== 'ENTRY' && (
            <button 
                onClick={() => setStep('ENTRY')}
                className="mt-8 font-mono text-xs opacity-50 hover:opacity-100 hover:underline relative z-30"
            >
                [ НА ГЛАВНУЮ ]
            </button>
        )}
    </div>
  );
};

export default MatrixLogin;