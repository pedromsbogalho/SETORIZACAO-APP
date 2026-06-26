import React, { useState, useMemo, useEffect } from 'react';
import { Person } from '../types';
import { Sparkles, Bot, Send, X, ChevronUp, ChevronDown, CheckCircle, AlertTriangle, Undo2, CornerDownLeft, Info } from 'lucide-react';

interface AIBulkEditorProps {
  people: Person[];
  onUpdatePeople: (newPeople: Person[]) => void;
  activeTab: string;
  isDark: boolean;
}

export default function AIBulkEditor({ people, onUpdatePeople, activeTab, isDark }: AIBulkEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResponse, setSuccessResponse] = useState<{
    explanation: string;
    updatedCount: number;
    affectedNames: string[];
  } | null>(null);

  // Snapshot of the previous state for undo support
  const [previousPeopleSnapshot, setPreviousPeopleSnapshot] = useState<Person[] | null>(null);

  // Map active tabs to human-friendly Portuguese labels
  const tabLabel = useMemo(() => {
    switch (activeTab) {
      case 'courses': return 'Controle de Cursos';
      case 'people': return 'Membros';
      case 'frequenters': return 'Frequentadores';
      case 'journey': return 'Jornada Espiritual';
      case 'families': return 'Famílias';
      default: return 'Geral';
    }
  }, [activeTab]);

  // Provide high-context suggestions based on current tab
  const suggestions = useMemo(() => {
    switch (activeTab) {
      case 'courses':
        return [
          { label: 'Outorgados pós-2024: Aula 1 e 2 concluída', text: 'Marque a Aula 1 e a Aula 2 como Concluído para todos os membros que foram outorgados em 2025 ou que tenham ano de outorga maior ou igual a 2025' },
          { label: 'Setor Sul: Aula 1 em andamento', text: 'Mude a Aula 1 para Em andamento para todos do setor SUL' }
        ];
      case 'people':
        return [
          { label: 'Bairro Centro para Setor Norte', text: 'Atualize o setor para CENTRO-NORTE para todas as pessoas que moram no Centro' },
          { label: 'Setor Leste: AM para Prof Dani', text: 'Altere o AM para PROF DANI para todas as pessoas do setor LESTE' }
        ];
      case 'frequenters':
        return [
          { label: 'Setor Sul para Iniciação', text: 'Altere a etapa da jornada de todos os frequentadores do setor SUL para Curso de Iniciação' },
          { label: 'Frequentadores ativos', text: 'Mude o status atual de todos os frequentadores sem setor para ATIVO' }
        ];
      case 'journey':
        return [
          { label: 'Completar Pós-Outorga', text: 'Altere a etapa da jornada para Conclui Pós-Outorga para todos que concluíram as 5 aulas pós-outorga' },
          { label: 'Mudar para Curso Pós-Outorga', text: 'Mude a etapa da jornada para Curso Pós-Outorga para quem tem Ohikari e é do setor LESTE' }
        ];
      default:
        return [
          { label: 'Corrigir nomes sem sobrenome', text: 'Capitalize todos os nomes dos membros que estejam totalmente em caixa baixa' },
          { label: 'Adicionar observação em lote', text: 'Altere o setor de SÃO SEBASTIÃO para LESTE para todos que residem lá' }
        ];
    }
  }, [activeTab]);

  // Handle quick trigger of suggestions
  const handleSelectSuggestion = (text: string) => {
    setPrompt(text);
  };

  // Submit bulk edit command to our secure server-side API endpoint
  const handleExecuteAI = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setSuccessResponse(null);

    try {
      const response = await fetch('/api/ai/bulk-edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          people,
          viewContext: activeTab
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Erro de rede (${response.status})`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.explanation || "Não consegui processar essa edição em massa.");
      }

      if (!result.updates || result.updates.length === 0) {
        setSuccessResponse({
          explanation: "Nenhum membro correspondeu aos critérios informados. Nenhuma alteração foi realizada.",
          updatedCount: 0,
          affectedNames: []
        });
        setIsLoading(false);
        return;
      }

      // Save a snapshot of current state for Undo
      setPreviousPeopleSnapshot([...people]);

      // Apply updates to existing people list
      const affectedIds = new Set<string>();
      const affectedNames: string[] = [];

      const updatedPeople = people.map(p => {
        // Safe string-based ID comparison to prevent type mismatch between numeric IDs
        const updateObj = result.updates.find((u: any) => String(u.id) === String(p.id));
        if (updateObj) {
          affectedIds.add(p.id);
          affectedNames.push(p.nome);

          // Deep merge the updates
          const merged = { ...p, ...updateObj.updates };

          // Handle special deep object nested fields like cursoPosOutorga safely even if original is missing
          if (updateObj.updates.cursoPosOutorga) {
            const existingAulas = p.cursoPosOutorga?.aulas || {
              1: 'Não iniciou',
              2: 'Não iniciou',
              3: 'Não iniciou',
              4: 'Não iniciou',
              5: 'Não iniciou'
            };
            const incomingAulas = updateObj.updates.cursoPosOutorga.aulas || {};
            merged.cursoPosOutorga = {
              aulas: {
                1: incomingAulas[1] || incomingAulas["1"] || existingAulas[1] || 'Não iniciou',
                2: incomingAulas[2] || incomingAulas["2"] || existingAulas[2] || 'Não iniciou',
                3: incomingAulas[3] || incomingAulas["3"] || existingAulas[3] || 'Não iniciou',
                4: incomingAulas[4] || incomingAulas["4"] || existingAulas[4] || 'Não iniciou',
                5: incomingAulas[5] || incomingAulas["5"] || existingAulas[5] || 'Não iniciou'
              }
            };
          }

          return merged;
        }
        return p;
      });

      // Commit changes to parent & Firebase persistence
      onUpdatePeople(updatedPeople);

      setSuccessResponse({
        explanation: result.explanation,
        updatedCount: result.updates.length,
        affectedNames
      });

      setPrompt('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocorreu um erro ao processar o comando.');
    } finally {
      setIsLoading(false);
    }
  };

  // Restore snapshot of people data to revert changes
  const handleUndo = () => {
    if (previousPeopleSnapshot) {
      onUpdatePeople(previousPeopleSnapshot);
      setPreviousPeopleSnapshot(null);
      setSuccessResponse(null);
      setError(null);
    }
  };

  // Clean success/error notification on tab switch to avoid visual pollution
  useEffect(() => {
    setSuccessResponse(null);
    setError(null);
  }, [activeTab]);

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans flex flex-col items-end">
      {/* Floating Sparkles Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer font-semibold text-xs border border-teal-500/20"
          id="btn-ai-bulk-editor"
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span>Assistente IA • Edição em Massa</span>
        </button>
      )}

      {/* Expandable Interactive Assistant Box */}
      {isOpen && (
        <div className={`w-80 sm:w-96 rounded-2xl border shadow-2xl overflow-hidden transition-all duration-300 animate-fade-in ${
          isDark 
            ? 'bg-zinc-900 border-zinc-800 text-zinc-100' 
            : 'bg-white border-slate-200 text-slate-800'
        }`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-700 to-emerald-700 px-4 py-3 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-teal-300" />
              <div>
                <h4 className="font-bold text-xs tracking-wide">Assistente de Lote (IA)</h4>
                <p className="text-[10px] text-teal-200">Filtre e edite em massa com linguagem natural</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto">
            
            {/* Context Notice Banner */}
            <div className="flex gap-2.5 p-2.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/25 border border-teal-100/40 dark:border-teal-900/40 text-[10px] leading-relaxed">
              <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <div>
                Você está na tela de <strong className="text-teal-700 dark:text-teal-400">{tabLabel}</strong>. 
                Os comandos abaixo alteram a base de membros em tempo real.
              </div>
            </div>

            {/* Quick suggestions based on Context */}
            <div className="space-y-1.5">
              <span className="block text-[9px] font-mono text-zinc-400 uppercase tracking-wider">Sugestões de comandos para {tabLabel}:</span>
              <div className="flex flex-col gap-1">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(s.text)}
                    className={`text-left text-xxs p-2 rounded-lg border text-ellipsis overflow-hidden truncate transition-all cursor-pointer ${
                      isDark 
                        ? 'border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-800' 
                        : 'border-slate-200/60 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    💡 {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Command Input Area */}
            <form onSubmit={handleExecuteAI} className="space-y-2">
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: Altere o setor para SUL para todos do bairro São Francisco..."
                  rows={3}
                  className={`w-full p-3 pr-8 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                    isDark 
                      ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500' 
                      : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !prompt.trim()}
                  className={`absolute bottom-3 right-3 p-1.5 rounded-lg text-white transition-all shadow-xs ${
                    prompt.trim() && !isLoading
                      ? 'bg-teal-600 hover:bg-teal-700 cursor-pointer'
                      : 'bg-zinc-300 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                  }`}
                  title="Executar comando inteligente"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {/* Progress / Loading Spinner */}
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-4">
                <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xxs font-medium text-zinc-400 animate-pulse font-mono">Processando com Gemini AI...</span>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-3 rounded-xl border border-red-200/60 bg-red-50 dark:bg-red-950/10 text-red-600 dark:text-red-400 text-xxs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <div>
                  <h5 className="font-bold">Ocorreu um erro</h5>
                  <p className="mt-0.5 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {/* Success Feedback Display */}
            {successResponse && (
              <div className="space-y-3">
                <div className={`p-3 rounded-xl border flex items-start gap-2 ${
                  successResponse.updatedCount > 0 
                    ? 'border-emerald-200/60 bg-emerald-50 dark:bg-emerald-950/10 text-emerald-800 dark:text-emerald-400'
                    : 'border-yellow-200/60 bg-yellow-50 dark:bg-yellow-950/10 text-yellow-800 dark:text-yellow-400'
                } text-xxs`}>
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <div>
                    <h5 className="font-bold">{successResponse.updatedCount > 0 ? 'Edição concluída!' : 'Nenhuma alteração'}</h5>
                    <p className="mt-0.5 leading-relaxed font-sans">{successResponse.explanation}</p>
                  </div>
                </div>

                {/* List of affected records */}
                {successResponse.affectedNames.length > 0 && (
                  <div className="space-y-1">
                    <span className="block text-[8px] font-mono text-zinc-400 uppercase tracking-wider">Membros Alterados ({successResponse.affectedNames.length}):</span>
                    <div className={`p-2 rounded-lg max-h-24 overflow-y-auto border font-mono text-[9px] leading-relaxed ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-slate-50 border-slate-100 text-slate-500'
                    }`}>
                      {successResponse.affectedNames.map((n, idx) => (
                        <div key={idx} className="truncate">• {n}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Undo Button */}
                {previousPeopleSnapshot && (
                  <button
                    onClick={handleUndo}
                    className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl text-xxs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-200 dark:border-zinc-700"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    Desfazer alterações (Undo)
                  </button>
                )}
              </div>
            )}

          </div>

          {/* Footer / Tip */}
          <div className={`px-4 py-2 border-t text-[8px] font-mono text-zinc-400 text-right ${
            isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-slate-100 bg-slate-50/50'
          }`}>
            Use termos claros como: "alterar", "definir", "completar", "marcar".
          </div>
        </div>
      )}
    </div>
  );
}