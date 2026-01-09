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

        if (confirm('ATENÇÃO: Importar um backup irá SUBSTITUIR ou MESCLAR com os dados atuais. Recomendamos limpar os dados antes se quiser uma restauração completa. Deseja continuar?')) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const json = event.target?.result as string;
                    const data = JSON.parse(json) as AppData;

                    await db.transaction('rw', [db.students, db.payments, db.attendance, db.expenses, db.dailyNotes], async () => {
                        // Bulk put (upsert)
                        if (data.students?.length) await db.students.bulkPut(data.students);
                        if (data.payments?.length) await db.payments.bulkPut(data.payments);
                        if (data.attendance?.length) await db.attendance.bulkPut(data.attendance);
                        if (data.expenses?.length) await db.expenses.bulkPut(data.expenses);
                        if (data.dailyNotes?.length) await db.dailyNotes.bulkPut(data.dailyNotes);
                    });

                    alert('Dados importados com sucesso! A página será recarregada.');
                    window.location.reload();
                } catch (error) {
                    console.error(error);
                    alert('Erro ao importar arquivo. Verifique se é um backup válido.');
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
