import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Clock, Mail, UserCheck } from 'lucide-react';
import { AppUser, UserRole } from '../types';
import { fetchAllAppUsers, updateAppUserApproval } from '../utils/firebase';

interface UserApprovalsViewProps {
  currentUserUid: string;
}

export default function UserApprovalsView({ currentUserUid }: UserApprovalsViewProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await fetchAllAppUsers();
      // Sort users: unapproved first, then approved, then by date desc
      const sorted = [...allUsers].sort((a, b) => {
        if (a.approved !== b.approved) {
          return a.approved ? 1 : -1;
        }
        return new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime();
      });
      setUsers(sorted);
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleApproval = async (uid: string, currentApproved: boolean, role: UserRole) => {
    setActionLoadingId(uid);
    try {
      await updateAppUserApproval(uid, !currentApproved, role);
      await loadUsers();
    } catch (err) {
      console.error("Erro ao atualizar status do usuário:", err);
      alert("Erro ao atualizar status do usuário. Verifique as permissões.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRoleChange = async (uid: string, approved: boolean, newRole: UserRole) => {
    setActionLoadingId(uid);
    try {
      await updateAppUserApproval(uid, approved, newRole);
      await loadUsers();
    } catch (err) {
      console.error("Erro ao atualizar cargo do usuário:", err);
      alert("Erro ao atualizar cargo do usuário.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/60 pb-5">
        <div>
          <h2 className="text-2xl font-sans font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-teal-600" />
            Controle de Acesso
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gerencie os assistentes e ministros que solicitaram acesso a esta unidade compartilhada do Johrei Center.
          </p>
        </div>
        <button
          onClick={loadUsers}
          className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer font-sans"
        >
          <Clock className="w-3.5 h-3.5" />
          Atualizar Lista
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-mono">Buscando solicitações...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/40 space-y-3">
          <div className="p-3 bg-slate-100 rounded-full w-fit mx-auto text-slate-400">
            <UserCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">Nenhuma solicitação</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Todos os usuários estão aprovados ou não há nenhuma conta registrada além da sua.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/50 text-[10px] font-mono uppercase text-slate-400 font-bold">
                  <th className="px-5 py-3">Usuário</th>
                  <th className="px-5 py-3">Solicitado em</th>
                  <th className="px-5 py-3">Nível de Acesso</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {users.map((user) => {
                  const isSelf = user.uid === currentUserUid;
                  const requestFormatted = new Date(user.requestDate).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr 
                      key={user.uid}
                      className={`hover:bg-slate-50/50 transition-colors ${!user.approved ? 'bg-amber-500/[0.02]' : ''}`}
                    >
                      {/* User Info */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                            user.approved 
                              ? 'bg-teal-50 text-teal-700 border border-teal-100' 
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {(user.displayName || user.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block">
                              {user.displayName || user.email.split('@')[0]}
                              {isSelf && <span className="text-xxs font-mono bg-zinc-100 text-zinc-500 px-1 py-0.5 rounded ml-1.5 font-normal">Você</span>}
                            </span>
                            <span className="text-xxs text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" /> {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Request Date */}
                      <td className="px-5 py-4 text-slate-500 font-mono text-xxs">
                        {requestFormatted}
                      </td>

                      {/* Role selection dropdown */}
                      <td className="px-5 py-4">
                        {isSelf ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-teal-100 text-teal-800 text-xxs font-bold uppercase tracking-wider font-mono">
                            {user.role}
                          </span>
                        ) : (
                          <select
                            disabled={actionLoadingId === user.uid}
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.uid, user.approved, e.target.value as UserRole)}
                            className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-teal-500 disabled:opacity-60 transition-colors"
                          >
                            <option value="ASSISTANT">Assistente</option>
                            <option value="AM">Assistente de Ministro (AM)</option>
                            <option value="ADMIN">Administrador (ADMIN)</option>
                          </select>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="px-5 py-4">
                        {user.approved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-teal-100 text-teal-800 font-bold text-xxs uppercase tracking-wider">
                            <CheckCircle className="w-3 h-3 text-teal-600" />
                            Aprovado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-xxs uppercase tracking-wider animate-pulse">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pendente
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        {isSelf ? (
                          <span className="text-xxs text-slate-400 font-mono">Permissão Mestra</span>
                        ) : (
                          <button
                            disabled={actionLoadingId === user.uid}
                            onClick={() => handleToggleApproval(user.uid, user.approved, user.role)}
                            className={`px-3 py-1.5 rounded-lg text-xxs font-bold transition-all uppercase cursor-pointer flex items-center gap-1.5 ml-auto shadow-xs ${
                              user.approved
                                ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-100/50'
                                : 'bg-teal-600 hover:bg-teal-700 text-white'
                            }`}
                          >
                            {actionLoadingId === user.uid ? (
                              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : user.approved ? (
                              <>
                                <XCircle className="w-3.5 h-3.5" />
                                Revogar
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" />
                                Aprovar
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
