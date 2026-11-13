import { useEffect, useState } from 'react';
import {
    X,
    CheckCircle2,
    AlertTriangle,
    Sparkles,
    Users,
    CalendarClock,
    History,
    Upload,
} from 'lucide-react';
import { AppData } from '../../types';
import {
    analyzeBackupData,
    applyBackupImport,
    BackupAnalysisReport,
} from '../../services/backupCleaner';
import { formatCurrencyBRL } from '../../utils/dateUtils';
import { useToast } from '../../contexts/ToastContext';

interface BackupImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    rawData: AppData | null;
    filename: string;
}

export function BackupImportModal({
    isOpen,
    onClose,
    rawData,
    filename,
}: BackupImportModalProps) {
    const { showToast } = useToast();

    const [report, setReport] = useState<BackupAnalysisReport | null>(null);
    const [mode, setMode] = useState<'replace' | 'merge'>('replace');
    const [trimNames, setTrimNames] = useState(true);
    const [fixDueDayShifts, setFixDueDayShifts] = useState(true);
    const [enrichPlans, setEnrichPlans] = useState(true);
    const [recalculateSnapshots, setRecalculateSnapshots] = useState(true);
    const [removeIds, setRemoveIds] = useState<Set<string>>(new Set());
    const [isImporting, setIsImporting] = useState(false);

    useEffect(() => {
        if (!isOpen || !rawData) return;
        const analysis = analyzeBackupData(rawData);
        setReport(analysis);

        const defaultRemove = new Set<string>();
        analysis.duplicateGroups.forEach((group) => {
            group.candidates.forEach((c) => {
                if (c.recommendedAction === 'remove') defaultRemove.add(c.id);
            });
        });
        setRemoveIds(defaultRemove);
    }, [isOpen, rawData]);

    if (!isOpen || !rawData || !report) return null;

    const toggleDuplicateRemoval = (id: string) => {
        setRemoveIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleImport = async () => {
        setIsImporting(true);
        try {
            const res = await applyBackupImport(rawData, {
                mode,
                trimNames,
                fixDueDayShifts,
                enrichPlans,
                recalculateSnapshots,
                removeStudentIds: Array.from(removeIds),
            });

            showToast(
                'success',
                `Backup importado e higienizado! ${res.importedStudents} alunos, ${res.fixedDueDates} vencimentos corrigidos e ${res.repairedSnapshots} mês(es) recalculados.`
            );
            onClose();
        } catch {
            showToast('error', 'Falha ao importar o backup.');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-rose-600" />
                            Assistente de Importação &amp; Limpeza
                        </h2>
                        <p className="text-xs text-slate-500 truncate">{filename}</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="modal-body">
                    {!report.isValid ? (
                        <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
                            {report.error}
                        </div>
                    ) : (
                        <>
                            {/* Contagem */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {[
                                    { label: 'Alunos', val: report.counts.students },
                                    { label: 'Pagamentos', val: report.counts.payments },
                                    { label: 'Despesas', val: report.counts.expenses },
                                    { label: 'Planos', val: report.counts.plans },
                                ].map((c) => (
                                    <div
                                        key={c.label}
                                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center"
                                    >
                                        <div className="font-display text-xl font-bold text-slate-900 dark:text-white">
                                            {c.val}
                                        </div>
                                        <div className="text-[11px] font-semibold uppercase text-slate-500">
                                            {c.label}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Modo de Importação */}
                            <div className="space-y-1.5">
                                <span className="label">Modo de Restauração</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setMode('replace')}
                                        className={`p-3 rounded-xl border text-left text-xs ${
                                            mode === 'replace'
                                                ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30 font-bold text-rose-900 dark:text-rose-200'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-600'
                                        }`}
                                    >
                                        <div>Substituir Banco Atual (Recomendado)</div>
                                        <div className="font-normal opacity-80 mt-0.5">
                                            Restaura exatamente o arquivo corrigido
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMode('merge')}
                                        className={`p-3 rounded-xl border text-left text-xs ${
                                            mode === 'merge'
                                                ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30 font-bold text-rose-900 dark:text-rose-200'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-600'
                                        }`}
                                    >
                                        <div>Mesclar com Dados Locais</div>
                                        <div className="font-normal opacity-80 mt-0.5">
                                            Adiciona/atualiza mantendo registros extras locais
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Diagnóstico de Correções Automáticas */}
                            <div className="space-y-2.5">
                                <span className="label">Correções Automáticas Detectadas</span>

                                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={fixDueDayShifts}
                                        onChange={(e) => setFixDueDayShifts(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 rounded text-rose-600"
                                    />
                                    <div className="text-xs space-y-1 flex-1">
                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <CalendarClock className="w-4 h-4 text-amber-500" />
                                            Corrigir datas de vencimento deslocadas +1 dia ({report.dueDayShifts.length} aluno(s))
                                        </div>
                                        <p className="text-slate-500">
                                            Alinha o dia do próximo vencimento com o dia escolhido do aluno (ex: dia 11 → dia 10).
                                        </p>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={recalculateSnapshots}
                                        onChange={(e) => setRecalculateSnapshots(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 rounded text-rose-600"
                                    />
                                    <div className="text-xs space-y-1 flex-1">
                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <History className="w-4 h-4 text-sky-500" />
                                            Recalcular histórico mensal ({report.snapshotIssues.length} mês(es) com divergência)
                                        </div>
                                        <p className="text-slate-500">
                                            Corrige meses passados fechados com receita/despesa incompleta e remove meses futuros.
                                        </p>
                                        {report.snapshotIssues.length > 0 && (
                                            <div className="pt-1 flex flex-wrap gap-1.5">
                                                {report.snapshotIssues.slice(0, 6).map((s) => (
                                                    <span key={s.id} className="badge badge-warning">
                                                        {s.id}: {formatCurrencyBRL(s.recordedRevenue)} →{' '}
                                                        {s.reason === 'future'
                                                            ? 'Remover futuro'
                                                            : formatCurrencyBRL(s.actualRevenue)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={enrichPlans}
                                        onChange={(e) => setEnrichPlans(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 rounded text-rose-600"
                                    />
                                    <div className="text-xs space-y-0.5 flex-1">
                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            Categorizar planos Mensal / Trimestral / Semestral ({report.plansNeedingCategoryCount} plano(s))
                                        </div>
                                        <p className="text-slate-500">
                                            Separa visualmente planos Mensais, Trimestrais (3m) e Semestrais (6m) evitando erro no cadastro.
                                        </p>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={trimNames}
                                        onChange={(e) => setTrimNames(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 rounded text-rose-600"
                                    />
                                    <div className="text-xs space-y-0.5 flex-1">
                                        <div className="font-bold text-slate-900 dark:text-white">
                                            Limpar espaços extras em nomes ({report.trimmedNamesCount} registro(s))
                                        </div>
                                        <p className="text-slate-500">
                                            Remove espaços invisíveis no início ou final do nome para melhorar a busca.
                                        </p>
                                    </div>
                                </label>
                            </div>

                            {/* Cadastros Duplicados */}
                            {report.duplicateGroups.length > 0 && (
                                <div className="space-y-2.5">
                                    <span className="label text-amber-600 flex items-center gap-1.5">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        Possíveis Cadastros Duplicados ({report.duplicateGroups.length} grupo(s))
                                    </span>
                                    <div className="space-y-2">
                                        {report.duplicateGroups.map((group) => (
                                            <div
                                                key={group.normalizedName}
                                                className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-2"
                                            >
                                                <div className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                                                    <Users className="w-3.5 h-3.5" />
                                                    Marque abaixo os registros repetidos que deseja remover:
                                                </div>
                                                {group.candidates.map((cand) => {
                                                    const checked = removeIds.has(cand.id);
                                                    return (
                                                        <label
                                                            key={cand.id}
                                                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800 text-xs cursor-pointer"
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={() => toggleDuplicateRemoval(cand.id)}
                                                                    className="w-4 h-4 rounded text-red-600"
                                                                />
                                                                <div className="min-w-0">
                                                                    <div className="font-bold text-slate-900 dark:text-white truncate">
                                                                        {cand.name} — <span className="text-rose-600">{cand.planName}</span>
                                                                    </div>
                                                                    <div className="text-slate-500">
                                                                        {cand.paymentCount} pagamento(s) • {cand.attendanceCount} presença(s) • Tel: {cand.phone}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <span
                                                                className={`badge ${
                                                                    checked ? 'badge-danger' : 'badge-success'
                                                                }`}
                                                            >
                                                                {checked ? 'Remover' : 'Manter'}
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="modal-footer">
                    <button type="button" onClick={onClose} className="btn btn-secondary">
                        Cancelar
                    </button>
                    {report.isValid && (
                        <button
                            type="button"
                            disabled={isImporting}
                            onClick={handleImport}
                            className="btn btn-primary"
                        >
                            <Upload className="w-4 h-4" />
                            {isImporting ? 'Importando...' : 'Aplicar Limpeza e Importar'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
