import { useRef, useState, useEffect } from 'react';
import { Download, Upload, Trash2, ShieldCheck, Info, KeyRound, Lock, Eye, EyeOff } from 'lucide-react';
import { db } from '../../services/db';
import { AppData } from '../../types';
import { PlanManager } from './PlanManager';
import { PersonalPlanManager } from './PersonalPlanManager';

export function Settings() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const logoFileInputRef = useRef<HTMLInputElement>(null);

    // Identidade da Academia State
    const [nameInput, setNameInput] = useState('RESISTÊNCIA MUAY THAI');
    const [logoPreview, setLogoPreview] = useState('🥊');
    const [logoError, setLogoError] = useState('');

    // Senha State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        const loadIdentity = async () => {
            const savedName = await db.settings.get('gymName');
            const savedLogo = await db.settings.get('gymLogo');
            if (savedName?.value) {
                setNameInput(savedName.value);
            }
            if (savedLogo?.value) {
                setLogoPreview(savedLogo.value);
            }
        };
        loadIdentity();
    }, []);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLogoError('');

        // Validação de tamanho: máximo 1MB
        const MAX_SIZE = 1024 * 1024;
        if (file.size > MAX_SIZE) {
            setLogoError('A logo deve ter no máximo 1MB.');
            if (logoFileInputRef.current) logoFileInputRef.current.value = '';
            return;
        }

        // Validação de tipo de arquivo
        if (!file.type.startsWith('image/')) {
            setLogoError('Por favor, selecione um arquivo de imagem válido.');
            if (logoFileInputRef.current) logoFileInputRef.current.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64Content = event.target?.result as string;

            const img = new Image();
            img.onload = () => {
                const maxDim = 800;
                if (img.width > maxDim || img.height > maxDim) {
                    setLogoError(`Dimensões recomendadas: máx 800x800px (Sua imagem: ${img.width}x${img.height}px). O upload foi bloqueado para evitar distorções no menu.`);
                    if (logoFileInputRef.current) logoFileInputRef.current.value = '';
                    return;
                }
                setLogoPreview(base64Content);
            };
            img.onerror = () => {
                setLogoError('Erro ao processar imagem.');
            };
            img.src = base64Content;
        };
        reader.readAsDataURL(file);
    };

    const handleSaveIdentity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nameInput.trim()) {
            alert('O nome da academia não pode ficar em branco.');
            return;
        }
        try {
            await db.settings.put({ key: 'gymName', value: nameInput.trim() });
            await db.settings.put({ key: 'gymLogo', value: logoPreview });
            alert('Identidade da academia atualizada com sucesso!');
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar identidade.');
        }
    };

    const handleResetIdentity = async () => {
        if (confirm('Deseja resetar o nome e a logo para o padrão?')) {
            try {
                await db.settings.put({ key: 'gymName', value: 'RESISTÊNCIA MUAY THAI' });
                await db.settings.put({ key: 'gymLogo', value: '🥊' });
                setNameInput('RESISTÊNCIA MUAY THAI');
                setLogoPreview('🥊');
                setLogoError('');
                if (logoFileInputRef.current) logoFileInputRef.current.value = '';
                alert('Identidade restaurada para o padrão.');
            } catch (err) {
                console.error(err);
                alert('Erro ao resetar identidade.');
            }
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage(null);

        if (!newPassword || newPassword.length < 4) {
            setPasswordMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 4 caracteres.' });
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setPasswordMessage({ type: 'error', text: 'A confirmação de senha não coincide.' });
            return;
        }

        try {
            const savedPassword = await db.settings.get('appPassword');
            // Se já existia senha salva, exigir a senha atual correta
            if (savedPassword?.value && savedPassword.value !== currentPassword) {
                setPasswordMessage({ type: 'error', text: 'A senha atual informada está incorreta.' });
                return;
            }

            await db.settings.put({ key: 'appPassword', value: newPassword });
            setPasswordMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (error) {
            console.error('Erro ao trocar senha:', error);
            setPasswordMessage({ type: 'error', text: 'Erro ao salvar nova senha.' });
        }
    };

    const handleExport = async () => {
        try {
            const students = await db.students.toArray();
            const payments = await db.payments.toArray();
            const attendance = await db.attendance.toArray();
            const expenses = await db.expenses.toArray();
            const dailyNotes = await db.dailyNotes.toArray();
            const plans = await db.plans.toArray();
            const personalPlans = await db.personalPlans.toArray();
            const monthlySnapshots = await db.monthlySnapshots.toArray();
            const settingsPairs = await db.settings.toArray();

            const savedName = settingsPairs.find(s => s.key === 'gymName')?.value || nameInput;
            const savedLogo = settingsPairs.find(s => s.key === 'gymLogo')?.value || logoPreview;

            const backupData: AppData = {
                students,
                payments,
                attendance,
                expenses,
                dailyNotes,
                plans,
                personalPlans,
                monthlySnapshots,
                settings: settingsPairs,
                gymName: savedName,
                gymLogo: savedLogo,
                lastBackup: new Date().toISOString(),
                darkMode: settingsPairs.find(s => s.key === 'darkMode')?.value || false,
                version: 3,
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

            alert('Backup exportado com sucesso! Guarde este arquivo em local seguro.');
        } catch (error) {
            console.error(error);
            alert('Erro ao exportar backup.');
        }
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            alert('Arquivo muito grande! O tamanho máximo é 10MB.');
            e.target.value = '';
            return;
        }

        if (!file.name.endsWith('.json')) {
            alert('Por favor, selecione um arquivo JSON válido.');
            e.target.value = '';
            return;
        }

        if (confirm('ATENÇÃO: Importar um backup irá SUBSTITUIR ou MESCLAR com os dados atuais.\n\nIMPORTANTE: Apenas importe backups confiáveis. Deseja continuar?')) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const json = event.target?.result as string;

                    if (!json || json.trim().length === 0) {
                        throw new Error('Arquivo vazio ou inválido');
                    }

                    let data: AppData;
                    try {
                        data = JSON.parse(json) as AppData;
                    } catch {
                        throw new Error('Arquivo JSON corrompido');
                    }

                    if (!data || typeof data !== 'object') {
                        throw new Error('Estrutura de dados inválida');
                    }

                    const requiredArrays = ['students', 'payments', 'attendance', 'expenses', 'dailyNotes'];
                    for (const key of requiredArrays) {
                        if (!Array.isArray(data[key as keyof AppData])) {
                            throw new Error(`Campo '${key}' deve ser um array`);
                        }
                    }

                    const sanitizedData: AppData = {
                        students: data.students || [],
                        payments: data.payments || [],
                        attendance: data.attendance || [],
                        expenses: data.expenses || [],
                        dailyNotes: data.dailyNotes || [],
                        plans: data.plans || [],
                        personalPlans: data.personalPlans || [],
                        monthlySnapshots: data.monthlySnapshots || [],
                        settings: data.settings || [],
                        gymName: data.gymName,
                        gymLogo: data.gymLogo,
                        darkMode: Boolean(data.darkMode),
                        version: Number(data.version) || 1,
                        lastModified: data.lastModified || new Date().toISOString(),
                        lastBackup: data.lastBackup
                    };

                    await db.transaction('rw', [db.students, db.payments, db.attendance, db.expenses, db.dailyNotes, db.plans, db.personalPlans, db.monthlySnapshots, db.settings], async () => {
                        if (sanitizedData.students.length > 0) await db.students.bulkPut(sanitizedData.students);
                        if (sanitizedData.payments.length > 0) await db.payments.bulkPut(sanitizedData.payments);
                        if (sanitizedData.attendance.length > 0) await db.attendance.bulkPut(sanitizedData.attendance);
                        if (sanitizedData.expenses.length > 0) await db.expenses.bulkPut(sanitizedData.expenses);
                        if (sanitizedData.dailyNotes.length > 0) await db.dailyNotes.bulkPut(sanitizedData.dailyNotes);
                        if (sanitizedData.plans && sanitizedData.plans.length > 0) await db.plans.bulkPut(sanitizedData.plans);
                        if (sanitizedData.personalPlans && sanitizedData.personalPlans.length > 0) await db.personalPlans.bulkPut(sanitizedData.personalPlans);
                        if (sanitizedData.monthlySnapshots && sanitizedData.monthlySnapshots.length > 0) await db.monthlySnapshots.bulkPut(sanitizedData.monthlySnapshots);

                        // Restaura configurações e identidade
                        if (sanitizedData.settings && sanitizedData.settings.length > 0) {
                            await db.settings.bulkPut(sanitizedData.settings);
                        } else {
                            if (sanitizedData.gymName) await db.settings.put({ key: 'gymName', value: sanitizedData.gymName });
                            if (sanitizedData.gymLogo) await db.settings.put({ key: 'gymLogo', value: sanitizedData.gymLogo });
                        }
                    });

                    alert('Dados importados com sucesso! A página será recarregada.');
                    window.location.reload();
                } catch (error: any) {
                    console.error(error);
                    alert(`Erro ao importar arquivo: ${error.message || 'Erro desconhecido'}`);
                }
            };
            reader.readAsText(file);
        }

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
                {/* Gym Identity Section */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="flex items-center gap-2 font-bold">
                            <ShieldCheck size={20} /> Identidade da Academia
                        </h3>
                    </div>
                    <form onSubmit={handleSaveIdentity} className="card-body space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Personalize o nome e a logomarca da sua academia no cabeçalho e login.
                        </p>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500">Nome da Academia</label>
                            <input
                                type="text"
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                className="form-input w-full"
                                placeholder="Nome da Academia"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500">Logomarca (Logo)</label>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center overflow-hidden">
                                    {logoPreview.startsWith('data:image') ? (
                                        <img src={logoPreview} className="w-full h-full object-contain" alt="Preview Logo" />
                                    ) : (
                                        <span className="text-3xl">{logoPreview}</span>
                                    )}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <input
                                        type="file"
                                        ref={logoFileInputRef}
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => logoFileInputRef.current?.click()}
                                        className="btn btn-outline btn-sm w-full justify-center"
                                    >
                                        Escolher Imagem
                                    </button>
                                    <p className="text-[10px] text-gray-400">
                                        PNG/JPG, Máx 1MB, Recomendado até 800x800px.
                                    </p>
                                </div>
                            </div>
                            {logoError && (
                                <p className="text-xs text-red-500 font-semibold bg-red-50 dark:bg-red-950/20 p-2 rounded-lg border border-red-100 dark:border-red-900/30">
                                    ⚠️ {logoError}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button type="submit" className="btn btn-primary flex-1 justify-center">
                                Salvar Identidade
                            </button>
                            <button
                                type="button"
                                onClick={handleResetIdentity}
                                className="btn btn-outline btn-sm"
                                title="Resetar para o padrão"
                            >
                                Restaurar Padrão
                            </button>
                        </div>
                    </form>
                </div>

                {/* Alterar Senha */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="flex items-center gap-2 font-bold">
                            <KeyRound size={20} /> Alterar Senha de Acesso
                        </h3>
                    </div>
                    <form onSubmit={handleChangePassword} className="card-body space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Atualize a senha de bloqueio do sistema (mínimo de 4 dígitos).
                        </p>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500">Senha Atual</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="form-input w-full pr-10"
                                    placeholder="Digite a senha atual"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label className="text-xs font-semibold text-gray-500">Nova Senha</label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="form-input w-full"
                                    placeholder="Mín. 4 caracteres"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500">Confirmar Nova</label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    className="form-input w-full"
                                    placeholder="Repita a nova senha"
                                    required
                                />
                            </div>
                        </div>

                        {passwordMessage && (
                            <div className={`p-2.5 rounded-lg text-xs font-medium border ${passwordMessage.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                                {passwordMessage.text}
                            </div>
                        )}

                        <button type="submit" className="btn btn-primary w-full justify-center">
                            <Lock size={16} /> Atualizar Senha
                        </button>
                    </form>
                </div>

                {/* Backup Section */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="flex items-center gap-2 font-bold">
                            <Download size={20} /> Backup e Restauração
                        </h3>
                    </div>
                    <div className="card-body space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Faça backups regulares. O arquivo contém todos os alunos, pagamentos, histórico e logo da academia.
                        </p>
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-800 dark:text-yellow-300 text-xs">
                            <strong>⚠️ Segurança:</strong> Guarde o arquivo em local seguro (pen drive ou nuvem).
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
                            <ShieldCheck size={20} /> Privacidade e Armazenamento
                        </h3>
                    </div>
                    <div className="card-body space-y-4">
                        <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
                            <h4 className="font-bold flex items-center gap-2 mb-2">
                                <Info size={16} /> Onde estão meus dados?
                            </h4>
                            <p className="leading-relaxed">
                                Seus dados estão salvos <strong>SOMENTE no navegador deste computador (IndexedDB)</strong>. Nenhum dado de aluno ou financeiro é enviado para servidores externos.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Plan Managers */}
                <div className="md:col-span-2 grid md:grid-cols-2 gap-6">
                    <PlanManager />
                    <PersonalPlanManager />
                </div>

                {/* Danger Zone */}
                <div className="card border-red-200 md:col-span-2">
                    <div className="card-header bg-red-50 border-red-100">
                        <h3 className="flex items-center gap-2 font-bold text-red-700">
                            <Trash2 size={20} /> Zona de Perigo
                        </h3>
                    </div>
                    <div className="card-body">
                        <button onClick={handleReset} className="btn btn-danger w-full justify-center">
                            Resetar Banco de Dados (Apagar Tudo)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
