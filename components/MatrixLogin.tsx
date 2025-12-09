
import React, { useState, useEffect } from 'react';
import { Terminal, Lock, Phone, ArrowRight, ShieldCheck, Chrome, Smartphone, KeyRound, UserPlus, Square, CheckSquare, Globe } from 'lucide-react';
import { UserProfile } from '../types';
import * as db from '../services/storageService';

interface MatrixLoginProps {
  theme: 'dark' | 'light';
  onLogin: (user: UserProfile, remember: boolean) => void;
}

type AuthStep = 'ENTRY' | 'METHOD' | 'PHONE_INPUT' | 'OTP_INPUT' | 'SOCIAL_PROCESSING' | 'PASSWORD_INPUT';

const MatrixLogin: React.FC<MatrixLoginProps> = ({ theme, onLogin }) => {
  const [step, setStep] = useState<AuthStep>('ENTRY');
  
  // Phone State
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  
  // Password/Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [tagline, setTagline] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [glitchIntensity, setGlitchIntensity] = useState(0);

  // Glitch effect on entry
  useEffect(() => {
    const interval = setInterval(() => {
        setGlitchIntensity(Math.random());
        setTimeout(() => setGlitchIntensity(0), 100);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handlePhoneSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Simple validation for demo
      if (phone.length < 10) {
          setError('НЕВЕРНЫЙ ФОРМАТ СИГНАЛА');
          return;
      }
      setIsLoading(true);
      setError('');
      // Simulate SMS sending
      setTimeout(() => {
          setIsLoading(false);
          setStep('OTP_INPUT');
      }, 1500);
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      // Simulate verification
      setTimeout(async () => {
          if (otp === '1234' || otp.length === 4) {
              try {
                  const user = await db.registerUser(`User_${phone.slice(-4)}`, '12345', 'В сети');
                  onLogin(user, true);
              } catch (err: any) {
                  // If user exists, login instead
                  try {
                      const existingUser = await db.loginUser(`User_${phone.slice(-4)}`, '12345');
                      onLogin(existingUser, true);
                  } catch (loginErr) {
                      setError("ОШИБКА ДОСТУПА");
                  }
              }
          } else {
              setError('КОД ДОСТУПА ОТКЛОНЕН');
              setIsLoading(false);
          }
      }, 1500);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!username || !password) {
          setError('ВВЕДИТЕ УЧЕТНЫЕ ДАННЫЕ');
          return;
      }
      if (isRegistering && !tagline) {
          setError('УКАЖИТЕ СТАТУС');
          return;
      }

      setIsLoading(true);
      setError('');

      try {
          let user: UserProfile;
          if (isRegistering) {
              user = await db.registerUser(username, password, tagline);
          } else {
              user = await db.loginUser(username, password);
          }
          // Simulate slight delay for effect
          setTimeout(() => {
              onLogin(user, rememberMe);
          }, 800);
      } catch (err: any) {
          setIsLoading(false);
          setError(err.message || 'ОШИБКА АВТОРИЗАЦИИ');
      }
  };

  const handleSocialLogin = async (provider: string) => {
      setStep('SOCIAL_PROCESSING');
      setIsLoading(true);
      setLoadingText(`СВЯЗЬ С ${provider.toUpperCase()}...`);
      
      // Simulation of a window popup or API call
      setTimeout(() => {
          setLoadingText('ОБМЕН КЛЮЧАМИ ШИФРОВАНИЯ...');
      }, 1000);

      setTimeout(async () => {
          setLoadingText('СИНХРОНИЗАЦИЯ ПРОФИЛЯ...');
          const user = await db.loginViaProvider(provider);
          onLogin(user, true); 
      }, 2500);
  };

  const renderEntry = () => (
      <div 
        className="flex flex-col items-center justify-center cursor-pointer min-h-[50vh] animate-in fade-in"
        onClick={() => setStep('METHOD')}
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
          <p className="font-mono text-xs animate-pulse opacity-70">[ НАЖМИТЕ ДЛЯ ИНИЦИАЛИЗАЦИИ ]</p>
      </div>
  );

  const renderMethod = () => (
      <div className="w-full max-w-sm animate-in slide-in-from-bottom-10 space-y-4">
          <h2 className="text-xl font-pixel text-center mb-8 uppercase">Выберите протокол</h2>
          
          <button 
            onClick={() => handleSocialLogin('Google')}
            className={`w-full p-4 border-2 flex items-center justify-center gap-4 transition-all hover:scale-105 group relative overflow-hidden ${
                theme === 'dark' ? 'border-dark-dim hover:border-dark-primary bg-black/50 text-white' : 'border-light-dim hover:border-light-accent bg-white/80 text-black'
            }`}
          >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Chrome size={24} />
              <div className="font-bold font-pixel text-sm uppercase">Войти через Google</div>
          </button>

          <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className={`w-full border-t ${theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'}`}></div></div>
              <div className="relative flex justify-center"><span className={`px-2 text-[10px] font-mono opacity-50 ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>ИЛИ</span></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setStep('PHONE_INPUT')}
                className={`p-4 border-2 flex flex-col items-center gap-2 hover:bg-white/5 transition-colors ${
                    theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'
                }`}
              >
                  <Smartphone size={24} className="opacity-70"/>
                  <span className="font-pixel text-[10px]">ТЕЛЕФОН</span>
              </button>
              <button 
                onClick={() => setStep('PASSWORD_INPUT')}
                className={`p-4 border-2 flex flex-col items-center gap-2 hover:bg-white/5 transition-colors ${
                    theme === 'dark' ? 'border-dark-dim' : 'border-light-dim'
                }`}
              >
                  <KeyRound size={24} className="opacity-70"/>
                  <span className="font-pixel text-[10px]">ПАРОЛЬ</span>
              </button>
          </div>

          <div className="flex justify-center mt-4">
               <button onClick={() => handleSocialLogin('Yandex')} className="flex items-center gap-2 opacity-50 hover:opacity-100 text-xs font-mono">
                   <span className="text-red-500 font-bold">Я</span> Yandex ID
               </button>
          </div>
      </div>
  );

  const renderPhoneInput = () => (
      <div className="w-full max-w-sm animate-in slide-in-from-right-10">
          <h2 className="text-lg font-pixel mb-6 flex items-center gap-2"><Phone size={24}/> ВВЕДИТЕ НОМЕР</h2>
          <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <input 
                autoFocus
                type="tel"
                placeholder="+7 (999) 000-00-00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full bg-transparent border-b-2 text-2xl font-mono py-2 outline-none ${
                    theme === 'dark' ? 'border-dark-primary text-white placeholder-gray-700' : 'border-light-accent text-black placeholder-gray-300'
                }`}
              />
              <button 
                disabled={isLoading}
                className={`w-full py-4 font-bold font-pixel uppercase tracking-widest flex items-center justify-center gap-2 ${
                    theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'
                }`}
              >
                 {isLoading ? 'СОЕДИНЕНИЕ...' : 'ОТПРАВИТЬ КОД'} <ArrowRight size={16}/>
              </button>
          </form>
          {error && <div className="mt-4 text-red-500 font-mono text-xs text-center border border-red-500 p-2">{error}</div>}
      </div>
  );

  const renderOtpInput = () => (
      <div className="w-full max-w-sm animate-in slide-in-from-right-10">
           <h2 className="text-lg font-pixel mb-6 flex items-center gap-2"><ShieldCheck size={24}/> 2FA ЗАЩИТА</h2>
           <p className="font-mono text-xs opacity-60 mb-6">Код подтверждения отправлен на устройство. Введите 4 цифры.</p>
           <form onSubmit={handleOtpSubmit} className="space-y-6">
              <input 
                autoFocus
                type="text"
                maxLength={4}
                placeholder="_ _ _ _"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g,''))}
                className={`w-full bg-transparent border-2 text-center text-4xl font-mono py-4 outline-none tracking-[1em] rounded ${
                    theme === 'dark' ? 'border-dark-dim focus:border-dark-primary text-white' : 'border-light-dim focus:border-light-accent text-black'
                }`}
              />
              <button 
                disabled={isLoading}
                className={`w-full py-4 font-bold font-pixel uppercase tracking-widest flex items-center justify-center gap-2 ${
                    theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'
                }`}
              >
                 {isLoading ? 'ДЕШИФРОВКА...' : 'ПОДТВЕРДИТЬ'} 
              </button>
           </form>
           {error && <div className="mt-4 text-red-500 font-mono text-xs text-center border border-red-500 p-2">{error}</div>}
      </div>
  );

  const renderPasswordInput = () => (
      <div className="w-full max-w-sm animate-in slide-in-from-right-10">
           <h2 className="text-lg font-pixel mb-6 flex items-center gap-2">
               {isRegistering ? <UserPlus size={24} /> : <Lock size={24} />} 
               {isRegistering ? 'ИНИЦИАЛИЗАЦИЯ' : 'АВТОРИЗАЦИЯ'}
           </h2>
           <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="space-y-1">
                   <label className="text-[10px] font-pixel uppercase opacity-60">LOGIN / MAIL</label>
                   <input 
                     autoFocus
                     type="text"
                     value={username}
                     onChange={(e) => setUsername(e.target.value)}
                     className={`w-full bg-transparent border-b-2 text-lg font-mono py-2 outline-none ${
                         theme === 'dark' ? 'border-dark-dim focus:border-dark-primary text-white' : 'border-light-dim focus:border-light-accent text-black'
                     }`}
                   />
              </div>

              {isRegistering && (
                  <div className="space-y-1 animate-in slide-in-from-top-2">
                       <label className="text-[10px] font-pixel uppercase opacity-60">STATUS (TAGLINE)</label>
                       <input 
                         type="text"
                         value={tagline}
                         onChange={(e) => setTagline(e.target.value)}
                         className={`w-full bg-transparent border-b-2 text-lg font-mono py-2 outline-none ${
                             theme === 'dark' ? 'border-dark-dim focus:border-dark-primary text-white' : 'border-light-dim focus:border-light-accent text-black'
                         }`}
                       />
                  </div>
              )}

              <div className="space-y-1">
                   <label className="text-[10px] font-pixel uppercase opacity-60">PASSWORD</label>
                   <input 
                     type="password"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className={`w-full bg-transparent border-b-2 text-lg font-mono py-2 outline-none ${
                         theme === 'dark' ? 'border-dark-dim focus:border-dark-primary text-white' : 'border-light-dim focus:border-light-accent text-black'
                     }`}
                   />
              </div>

              <div 
                  onClick={() => setRememberMe(!rememberMe)}
                  className="flex items-center gap-2 cursor-pointer font-mono text-xs opacity-70 hover:opacity-100"
              >
                  {rememberMe ? <CheckSquare size={16} /> : <Square size={16} />}
                  <span>ЗАПОМНИТЬ МЕНЯ</span>
              </div>

              <button 
                disabled={isLoading}
                className={`w-full py-4 font-bold font-pixel uppercase tracking-widest flex items-center justify-center gap-2 ${
                    theme === 'dark' ? 'bg-dark-primary text-black' : 'bg-light-accent text-white'
                }`}
              >
                 {isLoading ? 'ОБРАБОТКА...' : (isRegistering ? 'РЕГИСТРАЦИЯ' : 'ВОЙТИ В СЕТЬ')} 
              </button>
           </form>

           <div className="mt-6 text-center">
                <button 
                    onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                    className="text-xs font-mono opacity-50 hover:opacity-100 hover:underline"
                >
                    {isRegistering ? '[ УЖЕ ЕСТЬ КЛЮЧ? ВОЙТИ ]' : '[ НЕТ АККАУНТА? СОЗДАТЬ ]'}
                </button>
           </div>

           {error && <div className="mt-4 text-red-500 font-mono text-xs text-center border border-red-500 p-2">{error}</div>}
      </div>
  );

  const renderSocialProcessing = () => (
      <div className="flex flex-col items-center justify-center space-y-4 animate-in fade-in">
          <div className="relative">
             <Globe size={64} className="animate-spin-slow opacity-20" />
             <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-4 h-4 bg-green-500 rounded-full animate-ping"></div>
             </div>
          </div>
          <div className="font-pixel text-lg animate-pulse">{loadingText}</div>
          <div className="w-64 h-2 bg-gray-800 rounded overflow-hidden">
               <div className="h-full bg-green-500 animate-progress"></div>
          </div>
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
            {step === 'METHOD' && renderMethod()}
            {step === 'PHONE_INPUT' && renderPhoneInput()}
            {step === 'OTP_INPUT' && renderOtpInput()}
            {step === 'PASSWORD_INPUT' && renderPasswordInput()}
            {step === 'SOCIAL_PROCESSING' && renderSocialProcessing()}
        </div>

        {step !== 'ENTRY' && step !== 'SOCIAL_PROCESSING' && (
            <button 
                onClick={() => {
                    setError('');
                    if (step === 'OTP_INPUT') setStep('PHONE_INPUT');
                    else if (step === 'PHONE_INPUT' || step === 'PASSWORD_INPUT') setStep('METHOD');
                    else setStep('ENTRY');
                }}
                className="mt-8 font-mono text-xs opacity-50 hover:opacity-100 hover:underline relative z-30"
            >
                [ ПРЕРВАТЬ / НАЗАД ]
            </button>
        )}
    </div>
  );
};

export default MatrixLogin;
