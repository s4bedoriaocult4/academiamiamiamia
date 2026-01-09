import { useRef } from 'react';
import { Download, Upload, Trash2, ShieldCheck, Info } from 'lucide-react';
import { db } from '../../services/db';
import { AppData } from '../../types';
import { PlanManager } from './PlanManager';

export function Settings() {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        try {
            const students = await db.students.toArray();
            const payments = await db.payments.toArray();
            const attendance = await db.attendance.toArray();
            const expenses = await db.expenses.toArray();
            const dailyNotes = await db.dailyNotes.toArray();
            const settingsPairs = await db.settings.toArray(); // returns {key, value}[]

            const backupData: AppData = {
                students,
                payments,
                attendance,
                expenses,
                dailyNotes,
                lastBackup: new Date().toISOString(),
                darkMode: settingsPairs.find(s => s.key === 'darkMode')?.value || false,
                version: 2,
                lastModified: new Date().toISOString()
            };

            const fileName = `backup_academia_${new Date().toISOString().split('T')[0]}.json`;
            const json = JSON.stringify(backupData, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const href = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = href;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Update lastBackup in DB could be good but not critical
            alert('Backup exportado com sucesso! Guarde este arquivo em local seguro.');
        } catch (error) {
            console.error(error);
            alert('Erro ao exportar backup.');
        }
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validação de tamanho (10MB máximo)
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_SIZE) {
            alert('Arquivo muito grande! O tamanho máximo é 10MB.');
            e.target.value = '';
            return;
        }

        // Validação de tipo
        if (!file.name.endsWith('.json')) {
            alert('Por favor, selecione um arquivo JSON válido.');
            e.target.value = '';
            return;
        }

        if (confirm('ATENÇÃO: Importar um backup irá SUBSTITUIR ou MESCLAR com os dados atuais. Recomendamos limpar os dados antes se quiser uma restauração completa.\n\nIMPORTANTE: Apenas importe backups que você mesmo exportou. Deseja continuar?')) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const json = event.target?.result as string;
                    
                    // Validação básica de JSON
                    if (!json || json.trim().length === 0) {
                        throw new Error('Arquivo vazio ou inválido');
                    }

                    let data: AppData;
                    try {
                        data = JSON.parse(json) as AppData;
                    } catch (parseError) {
                        throw new Error('Arquivo JSON inválido ou corrompido');
                    }

                    // Validação de estrutura
                    if (!data || typeof data !== 'object') {
                        throw new Error('Estrutura de dados inválida');
                    }

                    // Validar arrays obrigatórios
                    const requiredArrays = ['students', 'payments', 'attendance', 'expenses', 'dailyNotes'];
                    for (const key of requiredArrays) {
                        if (!Array.isArray(data[key as keyof AppData])) {
                            throw new Error(`Campo '${key}' deve ser um array`);
                        }
                    }

                    // Validação de tipos básicos e sanitização
                    const sanitizeStudents = (students: any[]) => {
                        return students.filter(s => {
                            return s && 
                                   typeof s.id === 'string' && 
                                   typeof s.name === 'string' &&
                                   typeof s.phone === 'string';
                        }).map(s => ({
                            ...s,
                            id: String(s.id),
                            name: String(s.name).substring(0, 200), // Limitar tamanho
                            phone: String(s.phone).substring(0, 20)
                        }));
                    };

                    const sanitizePayments = (payments: any[]) => {
                        return payments.filter(p => {
                            return p && 
                                   typeof p.id === 'string' && 
                                   typeof p.amount === 'number' &&
                                   p.amount >= 0;
                        }).map(p => ({
                            ...p,
                            id: String(p.id),
                            amount: Math.max(0, Number(p.amount)),
                            type: p.type || 'pagamento' // Default para backward compatibility
                        }));
                    };

                    // Sanitizar dados
                    const sanitizedData: AppData = {
                        students: sanitizeStudents(data.students || []),
                        payments: sanitizePayments(data.payments || []),
                        attendance: (data.attendance || []).filter(a => a && typeof a.id === 'string'),
                        expenses: (data.expenses || []).filter(e => e && typeof e.id === 'string'),
                        dailyNotes: (data.dailyNotes || []).filter(n => n && typeof n.id === 'string'),
                        darkMode: Boolean(data.darkMode),
                        version: Number(data.version) || 1,
                        lastModified: data.lastModified || new Date().toISOString(),
                        lastBackup: data.lastBackup
                    };

                    await db.transaction('rw', [db.students, db.payments, db.attendance, db.expenses, db.dailyNotes], async () => {
                        // Bulk put (upsert)
                        if (sanitizedData.students.length > 0) await db.students.bulkPut(sanitizedData.students);
                        if (sanitizedData.payments.length > 0) await db.payments.bulkPut(sanitizedData.payments);
                        if (sanitizedData.attendance.length > 0) await db.attendance.bulkPut(sanitizedData.attendance);
                        if (sanitizedData.expenses.length > 0) await db.expenses.bulkPut(sanitizedData.expenses);
                        if (sanitizedData.dailyNotes.length > 0) await db.dailyNotes.bulkPut(sanitizedData.dailyNotes);
                    });

                    alert('Dados importados com sucesso! A página será recarregada.');
                    window.location.reload();
                } catch (error: any) {
                    console.error(error);
                    alert(`Erro ao importar arquivo: ${error.message || 'Arquivo inválido ou corrompido'}\n\nVerifique se é um backup válido exportado por este sistema.`);
                }
            };
            reader.readAsText(file);
        }

        // Reset input
        e.target.value = '';
    };

    const handleReset = async () => {
        const confirm1 = confirm('PERIGO: Isso apagará TODOS os dados do sistema (alunos, pagamentos, etc). Você tem certeza?');
        if (confirm1) {
            const confirm2 = confirm('Absoluta certeza? Essa ação não pode ser desfeita.');
            if (confirm2) {
                await db.delete();
                alert('Sistema resetado. A página será recarregada.');
                window.location.reload();
            }
        }
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Configurações & Segurança</h2>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Backup Section */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="flex items-center gap-2 font-bold">
                            <Download size={20} /> Backup e Restauração
                        </h3>
                    </div>
                    <div className="card-body space-y-4">
                        <p className="text-sm text-gray-600">
                            Faça backups regulares dos seus dados. O arquivo baixado contém todos os alunos, pagamentos e histórico.
                        </p>
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-800 dark:text-yellow-300 text-xs">
                            <strong>⚠️ Segurança:</strong> Apenas importe backups que você mesmo exportou. Arquivos maliciosos podem comprometer seus dados.
                        </div>

                        <div className="flex flex-col gap-3">
                            <button onClick={handleExport} className="btn btn-primary justify-center">
                                <Download size={18} /> Exportar Backup (Salvar Dados)
                            </button>

                            <div className="relative">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept=".json"
                                    onChange={handleImport}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="btn btn-outline justify-center w-full"
                                >
                                    <Upload size={18} /> Importar Backup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Privacy Info */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="flex items-center gap-2 font-bold">
                            <ShieldCheck size={20} /> Privacidade e Dados
                        </h3>
                    </div>
                    <div className="card-body space-y-4">
                        <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
                            <h4 className="font-bold flex items-center gap-2 mb-2">
                                <Info size={16} /> Onde estão meus dados?
                            </h4>
                            <p>
                                Seus dados estão salvos <strong>SOMENTE no seu dispositivo</strong> (neste navegador).
                            </p>
                            <p className="mt-2">
                                Mesmo se você acessar este site pelo link da Vercel,
                                <strong> NADA é enviado para a internet.</strong>
                                O sistema funciona 100% offline e local.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Plan Manager */}
                <PlanManager />

                {/* Danger Zone */}
                <div className="card border-red-200">
                    <div className="card-header bg-red-50 border-red-100">
                        <h3 className="flex items-center gap-2 font-bold text-red-700">
                            <Trash2 size={20} /> Zona de Perigo
                        </h3>
                    </div>
                    <div className="card-body">
                        <p className="text-sm text-gray-600 mb-4">
                            Apagar todos os dados do sistema. Use isso apenas se quiser começar do zero.
                        </p>
                        <button onClick={handleReset} className="btn btn-danger w-full justify-center">
                            Resetar Fábrica (Apagar Tudo)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
