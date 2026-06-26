import React, { useState } from 'react';
import { 
  signInWithGoogle, 
  signInWithUsernameAndPassword, 
  registerWithUsernameAndPassword 
} from '../utils/firebase';
import { Sparkles, User, Lock, AlertTriangle, ArrowRight } from 'lucide-react';

interface AuthViewProps {
  onAuthSuccess: () => void;
}

export default function AuthView({ onAuthSuccess }: AuthViewProps) {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUsernamePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (trimmedUser.length < 3) {
      setError('O nome de usuário deve ter pelo menos 3 caracteres.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (activeTab === 'REGISTER' && password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'LOGIN') {
        await signInWithUsernameAndPassword(trimmedUser, password);
      } else {
        await registerWithUsernameAndPassword(trimmedUser, password);
      }
      onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Usuário ou senha incorretos.');
      } else if (err.code === 'auth/username-already-in-use' || err.code === 'auth/email-already-in-use') {
        setError('Este nome de usuário já está sendo utilizado.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha informada é muito fraca.');
      } else {
        setError('Ocorreu um erro ao realizar a autenticação. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Falha ao conectar com o Google. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-sans flex relative overflow-hidden bg-[#f4f5f7] text-slate-800">
      {/* Decorative background spots */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-teal-400/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-400/10 blur-[120px] pointer-events-none"></div>

      <div className="w-full flex flex-col md:flex-row min-h-screen z-10">
        
        {/* LEFT SIDE: Brand & Welcome Presentation */}
        <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200/40 bg-slate-500/[0.02]">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="p-1.5 bg-teal-600 rounded-lg text-white shadow-md">
                <img src="/faviconimmb.png" alt="Logo" className="w-6 h-6 object-contain filter invert brightness-0" />
              </span>
              <div>
                <span className="font-semibold text-lg tracking-tight block font-display">Johrei Center</span>
                <span className="text-[10px] text-zinc-400 font-mono tracking-wider">ACOMPANHAMENTO ESPIRITUAL</span>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h1 className="text-3xl md:text-4xl font-sans font-bold tracking-tight leading-tight text-slate-900">
                Seu Espaço Exclusivo de Gestão e Fé
              </h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                Agora, cada membro ou responsável possui um ambiente totalmente individualizado e seguro. Seus dados, histórico de acompanhamento, árvore territorial e turmas de cursos estão isolados de forma autônoma na nuvem.
              </p>
            </div>

            {/* Feature lists */}
            <div className="space-y-4 pt-6">
              <div className="flex items-start gap-3 text-xs">
                <div className="p-1 rounded-md bg-teal-500/10 text-teal-600 mt-0.5 font-bold">✓</div>
                <div>
                  <h4 className="font-semibold text-slate-800">Privacidade Absoluta</h4>
                  <p className="text-xxs text-slate-400">Sua base de dados é unicamente sua, criptografada e protegida por regras rígidas de segurança do Firebase.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs">
                <div className="p-1 rounded-md bg-teal-500/10 text-teal-600 mt-0.5 font-bold">✓</div>
                <div>
                  <h4 className="font-semibold text-slate-800">Acesso Simplificado por Usuário</h4>
                  <p className="text-xxs text-slate-400">Use sua conta do Google ou crie um acesso prático utilizando apenas Nome de Usuário e Senha.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs">
                <div className="p-1 rounded-md bg-teal-500/10 text-teal-600 mt-0.5 font-bold">✓</div>
                <div>
                  <h4 className="font-semibold text-slate-800">Sincronização em Tempo Real</h4>
                  <p className="text-xxs text-slate-400">Sincronização instantânea na nuvem com backup automático local.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
            <span>Unidade de Fé e Dedicação</span>
            <span>v2.0 - Autenticação Segura</span>
          </div>
        </div>

        {/* RIGHT SIDE: Auth Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-transparent">
          <div className="max-w-md w-full mx-auto space-y-6">
            
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-sans font-bold tracking-tight text-slate-900">Acesse sua Conta</h2>
              <p className="text-xs mt-1.5 text-slate-500">
                Insira suas credenciais ou conecte-se com sua conta Google para gerenciar sua unidade de membros.
              </p>
            </div>

            {/* Tab switchers */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/40">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('LOGIN');
                  setError('');
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'LOGIN'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('REGISTER');
                  setError('');
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'REGISTER'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-teal-600/85 hover:text-teal-600'
                }`}
              >
                Criar Conta
              </button>
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200/50 flex gap-2.5 items-start text-xs text-red-700 animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">{error}</span>
              </div>
            )}

            {/* Forms */}
            <form onSubmit={handleUsernamePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-zinc-500 font-bold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Nome de Usuário
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: joao_silva"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-teal-500 disabled:opacity-60 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-zinc-500 font-bold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Senha
                </label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-teal-500 disabled:opacity-60 transition-colors"
                />
              </div>

              {activeTab === 'REGISTER' && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-[10px] font-mono uppercase text-zinc-500 font-bold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Confirmar Senha
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Repita sua senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-teal-500 disabled:opacity-60 transition-colors"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    {activeTab === 'LOGIN' ? 'Entrar no Sistema' : 'Cadastrar e Entrar'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center gap-3 py-1">
              <span className="h-px bg-slate-200 flex-1"></span>
              <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider font-bold">Ou acesse com</span>
              <span className="h-px bg-slate-200 flex-1"></span>
            </div>

            {/* Google Authentication Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all bg-white text-slate-700 text-xs font-bold flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.247-3.125C18.29 1.57 15.539 0 12.24 0 5.48 0 0 5.37 0 12s5.48 12 12.24 12c7.06 0 11.758-4.967 11.758-11.966 0-.804-.085-1.42-.19-1.749H12.24z"
                />
              </svg>
              Entrar com Conta do Google
            </button>

            <div className="text-center">
              <span className="text-[10px] text-zinc-400 font-mono leading-relaxed block">
                Seus dados serão criptografados e salvos em segurança.
              </span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
