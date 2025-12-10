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

      // Create a controller to timeout the request if server hangs
      const controller = new AbortController();
      // Increased timeout to 30 seconds for slow SMTP
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
           const response = await fetch('/api/auth/send-code', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ email }),
               signal: controller.signal
           });
           
           clearTimeout(timeoutId);

           if (response.status === 405) throw new Error('ERR_METHOD_NOT_ALLOWED (405)');
           if (response.status === 404) throw new Error('ERR_API_NOT_FOUND (404)');

           const text = await response.text();
           let data;
           try {
               data = JSON.parse(text);
           } catch {
               console.error("Non-JSON response:", text.substring(0, 100));
               throw new Error('SERVER ERROR: INVALID RESPONSE');
           }

           if (!response.ok) {
               throw new Error(data.error || `SERVER ERROR (${response.status})`);
           }

           if (data.success) {
               setGeneratedCode(data.debugCode);
               alert(`[СИСТЕМА NEO_ARCHIVE]\n\nКод: ${data.debugCode} (DEBUG MODE)\nОтправлено на ${email}`);
               setStep('REGISTER_VERIFY');
           } else {
               setError(data.error || 'ОШИБКА ОТПРАВКИ');
           }

      } catch (err: any) {
           clearTimeout(timeoutId);
           console.error("Registration error:", err);
           if (err.name === 'AbortError') {
               setError('TIMEOUT: СЕРВЕР ДОЛГО НЕ ОТВЕЧАЕТ');
           } else {
               setError(err.message || 'ОШИБКА ПОДКЛЮЧЕНИЯ');
           }
      } finally {
           setIsLoading(false);
      }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode !== generatedCode) {
        setError('НЕВЕРНЫЙ КОД');
        return;
    }
    setStep('REGISTER_SETUP');
    setError('');
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !tagline) {
        setError('ЗАПОЛНИТЕ ВСЕ ПОЛЯ');
        return;
    }
    setIsLoading(true);
    
    try {
        const user = await db.registerUser(username, password, tagline, email);
        alert(`РЕГИСТРАЦИЯ УСПЕШНА.\n\nВАШИ ДАННЫЕ ОТПРАВЛЕНЫ НА ${email}`);
        onLogin(user, rememberMe);
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
                  onClick={() => setStep('LOGIN')}
                  className={`py-4 px-6 border-2 font-pixel text-lg uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center justify-between group ${
                      theme === 'dark' ? 'border-dark-primary text-dark-primary hover:bg-dark-primary hover:text-black' : 'border-light-accent text-light-accent hover:bg-light-accent hover:text-white'
                  }`}
                >
                    <span>ВХОД</span>
                    <Terminal size={24} className="group-hover:animate-pulse" />
                </button>
                <button 
                  onClick={() => setStep('REGISTER_EMAIL')}
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
                        />
                    </div>
                 </div>
                 
                 {error && <div className="text-red-500 font-bold text-xs font-mono text-center animate-pulse">{error}</div>}

                 <button 
                     disabled={isLoading}
                     className={`mt-4 py-3 font-bold font-pixel uppercase ${
                         theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'
                     }`}
                 >
                     {isLoading ? '...' : 'ВОЙТИ В СЕТЬ'}
                 </button>
                 <button type="button" onClick={() => { setStep('ENTRY'); resetForm(); }} className="text-xs font-mono opacity-50 hover:underline">НАЗАД</button>
            </form>
        )
    }

    if (step === 'REGISTER_EMAIL') {
         return (
             <form onSubmit={handleRegisterEmailSubmit} className="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-right-4">
                 <div className="text-xs font-mono opacity-70 mb-2">
                     Внимание: Для создания учетной записи требуется верификация через почтовый шлюз.
                     <br/><br/>
                     <span className={theme === 'dark' ? 'text-green-500' : 'text-green-700'}>
                         Должно прийти письмо с кодом подтверждения.
                     </span>
                 </div>
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
                        />
                    </div>
                 </div>

                 {error && <div className="text-red-500 font-bold text-xs font-mono text-center border border-red-500 p-2">{error}</div>}

                 <button 
                     disabled={isLoading}
                     className={`mt-4 py-3 font-bold font-pixel uppercase flex items-center justify-center gap-2 ${
                         theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'
                     }`}
                 >
                     {isLoading ? 'ОТПРАВКА...' : <>ПОЛУЧИТЬ ПИСЬМО <ArrowRight size={16} /></>}
                 </button>
                 <button type="button" onClick={() => { setStep('ENTRY'); resetForm(); }} className="text-xs font-mono opacity-50 hover:underline">НА ГЛАВНУЮ</button>
             </form>
         )
    }

    if (step === 'REGISTER_VERIFY') {
        return (
            <form onSubmit={handleVerificationSubmit} className="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-right-4">
                <div className="text-center mb-4">
                    <Shield size={32} className={`mx-auto mb-2 ${theme === 'dark' ? 'text-dark-primary' : 'text-light-accent'}`} />
                    <p className="text-xs font-mono">Введите код из письма, отправленного на <br/><b>{email}</b></p>
                </div>

                <div className="flex justify-center">
                    <input 
                        value={verificationCode}
                        onChange={e => setVerificationCode(e.target.value.slice(0, 4))}
                        className={`text-center text-3xl font-pixel tracking-[10px] w-48 bg-transparent border-b-4 focus:outline-none ${
                            theme === 'dark' ? 'border-dark-primary text-white' : 'border-light-accent text-black'
                        }`}
                        placeholder="____"
                        maxLength={4}
                    />
                </div>

                {error && <div className="text-red-500 font-bold text-xs font-mono text-center mt-2">{error}</div>}

                <button 
                     disabled={verificationCode.length < 4}
                     className={`mt-4 py-3 font-bold font-pixel uppercase ${
                         verificationCode.length === 4 
                         ? (theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white')
                         : 'bg-gray-500 cursor-not-allowed opacity-50'
                     }`}
                 >
                     ПОДТВЕРДИТЬ
                 </button>
                 <button type="button" onClick={() => setStep('REGISTER_EMAIL')} className="text-xs font-mono opacity-50 hover:underline">ИЗМЕНИТЬ EMAIL</button>
            </form>
        )
    }

    if (step === 'REGISTER_SETUP') {
        return (
            <form onSubmit={handleSetupSubmit} className="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-right-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-pixel uppercase opacity-70">НИКНЕЙМ</label>
                    <div className="flex items-center gap-2 border-b-2 p-2 border-current">
                        <User size={18} />
                        <input 
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="bg-transparent w-full focus:outline-none font-mono text-sm"
                            placeholder="Neo"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-pixel uppercase opacity-70">ПАРОЛЬ</label>
                    <div className="flex items-center gap-2 border-b-2 p-2 border-current">
                        <Lock size={18} />
                        <input 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            type="password"
                            className="bg-transparent w-full focus:outline-none font-mono text-sm"
                            placeholder="******"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-pixel uppercase opacity-70">СТАТУС (TAGLINE)</label>
                    <div className="flex items-center gap-2 border-b-2 p-2 border-current">
                        <Terminal size={18} />
                        <input 
                            value={tagline}
                            onChange={e => setTagline(e.target.value)}
                            className="bg-transparent w-full focus:outline-none font-mono text-sm"
                            placeholder="Wake up..."
                        />
                    </div>
                </div>

                {error && <div className="text-red-500 font-bold text-xs font-mono text-center">{error}</div>}

                <button 
                     disabled={isLoading}
                     className={`mt-4 py-3 font-bold font-pixel uppercase ${
                         theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'
                     }`}
                 >
                     {isLoading ? 'СОЗДАНИЕ...' : 'ЗАВЕРШИТЬ'}
                 </button>
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
                 <span className="font-pixel text-sm">NEO_AUTH v2.4</span>
             </div>
             <div className="flex gap-1">
                 <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                 <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse delay-75"></div>
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse delay-150"></div>
             </div>
         </div>

         {/* Title */}
         <div className="mb-8 relative overflow-hidden">
             <h2 className={`text-3xl font-pixel font-bold uppercase ${glitchIntensity > 0.5 ? 'translate-x-1 text-red-500' : ''}`}>
                 {step === 'ENTRY' ? 'ИДЕНТИФИКАЦИЯ' : 
                  step === 'LOGIN' ? 'АВТОРИЗАЦИЯ' : 'РЕГИСТРАЦИЯ'}
             </h2>
             {glitchIntensity > 0.8 && (
                 <div className="absolute top-0 left-0 text-3xl font-pixel font-bold uppercase text-blue-500 opacity-50 -translate-x-1">
                     SYSTEM FAILURE
                 </div>
             )}
         </div>

         {renderContent()}

         {/* Footer */}
         <div className="mt-8 text-center opacity-40 font-mono text-[10px]">
             SECURE CONNECTION ESTABLISHED<br/>
             ENCRYPTION: AES-256
         </div>
      </div>
    </div>
  );
};

export default MatrixLogin;