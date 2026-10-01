import { useState } from 'react';
import {
    HelpCircle, Calendar, Dumbbell, Shield, BookOpen,
    DollarSign, Users, Clock, Lock, ChevronDown, ChevronUp,
    Info, Sparkles
} from 'lucide-react';

export function HelpPage() {
    const [openSection, setOpenSection] = useState<string | null>('fluxo');

    const toggleSection = (section: string) => {
        setOpenSection(openSection === section ? null : section);
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-xl text-primary flex items-center justify-center">
                    <HelpCircle size={32} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold">Central de Ajuda e Manual do Sistema</h2>
                    <p className="text-sm text-gray-500">
                        Guia completo, regras de funcionamento e boas práticas para o dia a dia da academia.
                    </p>
                </div>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-4 bg-blue-50/60 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30">
                    <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300 text-sm mb-1">
                        <Users size={18} className="text-blue-600" /> 1. Alunos
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                        Matrícula com 1º pagamento, dia fixo de vencimento e alertas em tempo real.
                    </p>
                </div>

                <div className="card p-4 bg-green-50/60 dark:bg-green-950/20 border-green-100 dark:border-green-900/30">
                    <div className="flex items-center gap-2 font-bold text-green-900 dark:text-green-300 text-sm mb-1">
                        <DollarSign size={18} className="text-green-600" /> 2. Financeiro
                    </div>
                    <p className="text-xs text-green-700 dark:text-green-400">
                        Mensalidades por competência, vendas de itens, pacotes personal e despesas.
                    </p>
                </div>

                <div className="card p-4 bg-purple-50/60 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30">
                    <div className="flex items-center gap-2 font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">
                        <Clock size={18} className="text-purple-600" /> 3. Presenças
                    </div>
                    <p className="text-xs text-purple-700 dark:text-purple-400">
                        Check-in de treinos com aviso de pendência financeira e baixa de aulas.
                    </p>
                </div>

                <div className="card p-4 bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30">
                    <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300 text-sm mb-1">
                        <Shield size={18} className="text-amber-600" /> 4. Offline & Backup
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                        100% offline, dados salvos no computador e exportação de segurança.
                    </p>
                </div>
            </div>

            {/* Accordion / Detailed Sections */}
            <div className="space-y-4">

                {/* 1. FLUXO OPERACIONAL DO DIA A DIA */}
                <div className="card overflow-hidden">
                    <div
                        className="card-header cursor-pointer flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100/80 transition-colors"
                        onClick={() => toggleSection('fluxo')}
                    >
                        <h3 className="flex items-center gap-2 font-bold text-base text-gray-800 dark:text-gray-200">
                            <BookOpen size={20} className="text-primary" />
                            1. Fluxo de Trabalho Recomendado no Dia a Dia
                        </h3>
                        {openSection === 'fluxo' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>

                    {openSection === 'fluxo' && (
                        <div className="card-body space-y-4 text-sm text-gray-600 dark:text-gray-300">
                            <p>
                                Para manter a academia organizada e o financeiro sempre exato, siga este fluxo diário:
                            </p>

                            <div className="grid sm:grid-cols-2 gap-3">
                                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/30 space-y-1">
                                    <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                                        <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center">1</span>
                                        Chegada do Aluno / Check-in
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Abra a aba <strong>Presenças</strong> e marque o check-in do aluno. Se ele estiver com a mensalidade vencida, o sistema exibirá uma tag de aviso vermelha com os dias de atraso.
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/30 space-y-1">
                                    <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                                        <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center">2</span>
                                        Cobrança / Recebimento
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Na aba <strong>Alunos</strong>, use o botão verde 💵 <strong>Receber</strong> ao lado do nome do aluno. O sistema já seleciona o aluno e sugere a competência devida automaticamente.
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/30 space-y-1">
                                    <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                                        <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center">3</span>
                                        Vendas Avulsas e Despesas
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Registrou venda de água, luva ou taxa avulsa? Lance como <strong>Entrada</strong> em Pagamentos. Pagou conta de luz ou material de limpeza? Lance em <strong>Despesas</strong>.
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/30 space-y-1">
                                    <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                                        <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center">4</span>
                                        Acompanhamento no Dashboard
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        O <strong>Dashboard</strong> consolida instantaneamente o faturamento do mês, total de despesas, lucro líquido, lista de inadimplentes e aniversariantes do mês.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. CADASTRO DE ALUNOS & REGRAS DE MATRÍCULA */}
                <div className="card overflow-hidden">
                    <div
                        className="card-header cursor-pointer flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100/80 transition-colors"
                        onClick={() => toggleSection('alunos')}
                    >
                        <h3 className="flex items-center gap-2 font-bold text-base text-gray-800 dark:text-gray-200">
                            <Users size={20} className="text-primary" />
                            2. Cadastro de Alunos, Matrícula e Status Financeiro
                        </h3>
                        {openSection === 'alunos' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>

                    {openSection === 'alunos' && (
                        <div className="card-body space-y-4 text-sm text-gray-600 dark:text-gray-300">
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-1.5">
                                    <Sparkles size={16} className="text-primary" /> Opção: "Registrar pagamento da 1ª mensalidade no caixa agora"
                                </h4>
                                <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                                    Ao cadastrar um novo aluno, você pode escolher se ele está pagando a mensalidade no ato da matrícula:
                                </p>
                                <div className="mt-2 grid sm:grid-cols-2 gap-2 text-xs">
                                    <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 rounded-lg">
                                        <strong className="text-green-900 dark:text-green-300">✅ Caixa Marcado (Pagou na entrada):</strong>
                                        <p className="mt-1 text-green-800 dark:text-green-400">
                                            Lança o valor recebido imediatamente no financeiro e agenda o <strong>próximo vencimento para o mês seguinte</strong> no dia escolhido. O aluno inicia com status "Em dia".
                                        </p>
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-lg">
                                        <strong className="text-gray-900 dark:text-gray-200">⬜ Caixa Desmarcado (Vai pagar depois):</strong>
                                        <p className="mt-1 text-gray-600 dark:text-gray-400">
                                            Não lança dinheiro no caixa e agenda o <strong>primeiro vencimento para o dia escolhido mais próximo</strong>.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 dark:border-gray-700/50 pt-3">
                                <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                                    Entendendo os Badges de Status do Aluno
                                </h4>
                                <div className="grid sm:grid-cols-3 gap-2 text-xs">
                                    <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg">
                                        <span className="inline-block px-2 py-0.5 rounded font-bold bg-green-600 text-white mb-1">
                                            🟢 Em dia
                                        </span>
                                        <p className="text-green-800">
                                            A mensalidade do aluno está quitada e o próximo vencimento está no futuro.
                                        </p>
                                    </div>

                                    <div className="p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <span className="inline-block px-2 py-0.5 rounded font-bold bg-yellow-600 text-white mb-1">
                                            🟡 Vence em Xd / Hoje
                                        </span>
                                        <p className="text-yellow-800">
                                            Alerta preventivo nos 5 dias que antecedem o vencimento.
                                        </p>
                                    </div>

                                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg">
                                        <span className="inline-block px-2 py-0.5 rounded font-bold bg-red-600 text-white mb-1">
                                            🔴 X dias atrasado
                                        </span>
                                        <p className="text-red-800">
                                            Vencimento já passou. Exibe o número exato de dias em atraso.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 dark:border-gray-700/50 pt-3">
                                <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                                    Dia Fixo de Vencimento
                                </h4>
                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                    Cada aluno tem um <strong>Dia de Vencimento fixo</strong> (ex: Todo dia 05, 10 ou 15). O sistema ajusta automaticamente meses com menos dias (como fevereiro de 28 dias), garantindo que vencimentos em dias como 31 nunca estourem para o mês seguinte.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. FINANCEIRO & PAGAMENTOS */}
                <div className="card overflow-hidden">
                    <div
                        className="card-header cursor-pointer flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100/80 transition-colors"
                        onClick={() => toggleSection('financeiro')}
                    >
                        <h3 className="flex items-center gap-2 font-bold text-base text-gray-800 dark:text-gray-200">
                            <DollarSign size={20} className="text-primary" />
                            3. Financeiro, Mensalidades, Vendas Avulsas e Despesas
                        </h3>
                        {openSection === 'financeiro' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>

                    {openSection === 'financeiro' && (
                        <div className="card-body space-y-4 text-sm text-gray-600 dark:text-gray-300">
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                                    Tipos de Lançamento no Caixa
                                </h4>
                                <div className="space-y-2 text-xs">
                                    <div className="p-3 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-lg">
                                        <p className="font-bold text-primary flex items-center gap-1">
                                            📌 Mensalidade (Pagamento Regular)
                                        </p>
                                        <p className="mt-1 text-gray-600 dark:text-gray-300">
                                            Exige a seleção de um <strong>Aluno</strong> e do <strong>Mês de Referência (Competência)</strong>.
                                            Ao salvar, o sistema soma o valor na receita do mês e <strong>avança a data do próximo vencimento do aluno</strong> conforme o plano (1 mês no mensal, 3 meses no trimestral, etc.).
                                        </p>
                                    </div>

                                    <div className="p-3 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-lg">
                                        <p className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                            🥊 Pacote Personal
                                        </p>
                                        <p className="mt-1 text-gray-600 dark:text-gray-300">
                                            Utilizado para venda de pacotes de aulas particulares. Ao confirmar o pagamento, o número de aulas do pacote é <strong>adicionado automaticamente ao saldo de créditos</strong> do aluno.
                                        </p>
                                    </div>

                                    <div className="p-3 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-lg">
                                        <p className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                            🛒 Entrada / Venda Avulsa
                                        </p>
                                        <p className="mt-1 text-gray-600 dark:text-gray-300">
                                            Venda de itens da academia (garrafa d'água, luvas, caneleiras, bandagens, taxas avulsas). Entra na receita do caixa <strong>sem alterar a data de vencimento da mensalidade</strong> de nenhum aluno.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 dark:border-gray-700/50 pt-3">
                                <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                                    Mês de Referência (Competência) & Alerta de Duplicidade
                                </h4>
                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                    O <strong>Mês de Referência</strong> indica qual mês está sendo quitado (ex: `10/2026`). O sistema calcula automaticamente qual é o próximo mês que o aluno deve. Caso você selecione um mês que já foi pago anteriormente, um aviso amarelo alertará na tela com a data e valor do pagamento existente.
                                </p>
                            </div>

                            <div className="border-t border-gray-100 dark:border-gray-700/50 pt-3">
                                <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                                    Exclusão Segura de Pagamentos
                                </h4>
                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                    Se um pagamento for registrado por engano e for excluído na lista de pagamentos, o sistema <strong>recalcula e regride o vencimento do aluno</strong> para o mês devido anterior, garantindo que o status de cobrança permaneça correto.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. CONTROLE DE PERSONAL & SALDO DE AULAS */}
                <div className="card overflow-hidden">
                    <div
                        className="card-header cursor-pointer flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100/80 transition-colors"
                        onClick={() => toggleSection('personal')}
                    >
                        <h3 className="flex items-center gap-2 font-bold text-base text-gray-800 dark:text-gray-200">
                            <Dumbbell size={20} className="text-primary" />
                            4. Controle de Personal Training & Saldo de Aulas
                        </h3>
                        {openSection === 'personal' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>

                    {openSection === 'personal' && (
                        <div className="card-body space-y-3 text-sm text-gray-600 dark:text-gray-300">
                            <p>
                                O sistema possui um módulo completo dedicado a alunos que fazem aulas particulares:
                            </p>
                            <ul className="space-y-2 text-xs">
                                <li className="flex items-start gap-2">
                                    <span className="text-primary font-bold">•</span>
                                    <span><strong>Configuração de Pacotes:</strong> Em <em>Configurações &gt; Gerenciar Pacotes Personal</em>, cadastre os pacotes oferecidos (ex: 8 aulas, 12 aulas) com valor e quantidade.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary font-bold">•</span>
                                    <span><strong>Compra de Créditos:</strong> Na tela de Pagamentos, selecione o tipo <em>Pacote Personal</em> e o pacote desejado. O saldo de aulas do aluno aumentará automaticamente.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary font-bold">•</span>
                                    <span><strong>Consumo de Aulas:</strong> No <strong>Painel Personal</strong> ou na tela de <strong>Presenças</strong>, ao marcar presença para o aluno de personal, 1 crédito é debitado do saldo.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary font-bold">•</span>
                                    <span><strong>Alunos Híbridos:</strong> Um mesmo aluno pode ter plano de turma normal e também saldo de aulas de personal simultaneamente.</span>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>

                {/* 5. FECHAMENTO MENSAL AUTOMÁTICO */}
                <div className="card overflow-hidden">
                    <div
                        className="card-header cursor-pointer flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100/80 transition-colors"
                        onClick={() => toggleSection('fechamento')}
                    >
                        <h3 className="flex items-center gap-2 font-bold text-base text-gray-800 dark:text-gray-200">
                            <Calendar size={20} className="text-primary" />
                            5. Fechamento Automático de Mês & Histórico
                        </h3>
                        {openSection === 'fechamento' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>

                    {openSection === 'fechamento' && (
                        <div className="card-body space-y-3 text-sm text-gray-600 dark:text-gray-300">
                            <p className="text-xs leading-relaxed">
                                Você não precisa se preocupar em fechar o caixa do mês manualmente. O sistema faz isso de forma 100% transparente:
                            </p>
                            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-lg text-xs space-y-2">
                                <p className="font-bold text-blue-900 dark:text-blue-300">
                                    📅 Como funciona a virada de mês:
                                </p>
                                <p className="text-blue-800 dark:text-blue-400">
                                    Ao abrir o sistema no primeiro dia de um novo mês (ex: 01 de Novembro), o sistema detecta a virada e cria automaticamente um <strong>Snapshot de Fechamento</strong> consolidando a receita, despesas, lucro e quantidade de alunos do mês anterior (Outubro).
                                </p>
                                <p className="text-blue-800 dark:text-blue-400">
                                    No <strong>Dashboard</strong>, use o seletor de mês no topo da tela para alternar entre o mês atual em andamento e qualquer mês fechado do histórico.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* 6. SEGURANÇA, BACKUP & PRIVACIDADE */}
                <div className="card overflow-hidden">
                    <div
                        className="card-header cursor-pointer flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100/80 transition-colors"
                        onClick={() => toggleSection('backup')}
                    >
                        <h3 className="flex items-center gap-2 font-bold text-base text-gray-800 dark:text-gray-200">
                            <Shield size={20} className="text-primary" />
                            6. Backup, Segurança e Modo Offline
                        </h3>
                        {openSection === 'backup' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>

                    {openSection === 'backup' && (
                        <div className="card-body space-y-4 text-sm text-gray-600 dark:text-gray-300">
                            <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 rounded-lg text-xs space-y-1">
                                <p className="font-bold text-green-900 dark:text-green-300 flex items-center gap-1.5">
                                    <Lock size={15} /> 100% Offline e Privado
                                </p>
                                <p className="text-green-800 dark:text-green-400 leading-relaxed">
                                    Todos os dados (alunos, pagamentos, fotos/logo e despesas) ficam salvos <strong>exclusivamente na memória deste computador (IndexedDB)</strong>. O sistema não precisa de internet para funcionar e nenhum dado é enviado para servidores externos.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-bold text-gray-900 dark:text-white">
                                    Como fazer Backup (Muito Importante):
                                </h4>
                                <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600 dark:text-gray-300">
                                    <li>Acesse a aba <strong>Configurações</strong>.</li>
                                    <li>Na seção <em>Backup e Restauração</em>, clique em <strong>Exportar Dados (Backup)</strong>.</li>
                                    <li>Um arquivo `.json` com a data de hoje será baixado no computador.</li>
                                    <li><strong>Recomendação:</strong> Salve uma cópia desse arquivo semanalmente em um Pen Drive ou envie para o seu WhatsApp/Google Drive.</li>
                                </ol>
                            </div>

                            <div className="space-y-2 border-t border-gray-100 dark:border-gray-700/50 pt-3">
                                <h4 className="font-bold text-gray-900 dark:text-white">
                                    Como Restaurar o Backup (Troca de Computador ou Formatação):
                                </h4>
                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                    Caso precise trocar de computador, basta abrir o sistema no novo computador, ir em <strong>Configurações</strong> e clicar em <strong>Importar Dados</strong> selecionando o arquivo `.json` de backup. Todos os alunos, pagamentos, histórico e logo serão restaurados instantaneamente.
                                </p>
                            </div>

                            <div className="space-y-2 border-t border-gray-100 dark:border-gray-700/50 pt-3">
                                <h4 className="font-bold text-gray-900 dark:text-white">
                                    Alteração de Senha de Acesso:
                                </h4>
                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                    Em <strong>Configurações &gt; Alterar Senha de Acesso</strong>, você pode definir uma nova senha para a tela de bloqueio do sistema a qualquer momento.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* 7. PERGUNTAS FREQUENTES (FAQ) */}
                <div className="card overflow-hidden">
                    <div
                        className="card-header cursor-pointer flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100/80 transition-colors"
                        onClick={() => toggleSection('faq')}
                    >
                        <h3 className="flex items-center gap-2 font-bold text-base text-gray-800 dark:text-gray-200">
                            <Info size={20} className="text-primary" />
                            7. Perguntas Frequentes (Dúvidas Rápidas)
                        </h3>
                        {openSection === 'faq' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>

                    {openSection === 'faq' && (
                        <div className="card-body space-y-3 text-sm text-gray-600 dark:text-gray-300">
                            <div className="space-y-2 text-xs">
                                <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg">
                                    <p className="font-bold text-gray-900 dark:text-white">
                                        ❓ O que fazer quando um aluno pagar 2 ou mais meses adiantados?
                                    </p>
                                    <p className="mt-1 text-gray-600 dark:text-gray-300">
                                        Registre o primeiro pagamento selecionando o primeiro mês de competência. Em seguida, registre o segundo pagamento selecionando o mês seguinte. A receita entrará no caixa de hoje e o vencimento do aluno será empurrado para frente corretamente.
                                    </p>
                                </div>

                                <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg">
                                    <p className="font-bold text-gray-900 dark:text-white">
                                        ❓ O que fazer quando um aluno pagar mensalidades atrasadas?
                                    </p>
                                    <p className="mt-1 text-gray-600 dark:text-gray-300">
                                        Basta abrir o modal de pagamento. O sistema sugerirá automaticamente a competência mais antiga que está em aberto. Você também pode preencher o campo opcional <em>Multa / Juros</em> se houver cobrança adicional.
                                    </p>
                                </div>

                                <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg">
                                    <p className="font-bold text-gray-900 dark:text-white">
                                        ❓ Como inativar um aluno que parou de treinar?
                                    </p>
                                    <p className="mt-1 text-gray-600 dark:text-gray-300">
                                        Na aba <strong>Alunos</strong>, clique em <em>Editar</em> no aluno e mude o status de <em>Ativo</em> para <em>Inativo</em>. Ele não aparecerá mais como cobrança pendente e você não perde o histórico de treinos dele.
                                    </p>
                                </div>

                                <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg">
                                    <p className="font-bold text-gray-900 dark:text-white">
                                        ❓ Como imprimir um relatório do mês?
                                    </p>
                                    <p className="mt-1 text-gray-600 dark:text-gray-300">
                                        No <strong>Dashboard</strong>, clique no botão <strong>🖨️ Imprimir Relatório</strong> no canto superior direito. A página é formatada automaticamente para impressão ou salvamento em PDF.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
