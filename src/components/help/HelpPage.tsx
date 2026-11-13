import {
    BookOpen,
    Users,
    CalendarCheck,
    DollarSign,
    Sparkles,
    Dumbbell,
    MessageCircle,
    Cloud,
    Database,
    Smartphone,
} from 'lucide-react';

export function HelpPage() {
    const sections = [
        {
            icon: <BookOpen className="w-5 h-5 text-rose-600" />,
            title: '1. Rotina Diária Simples',
            items: [
                'Para matricular: clique em "Novo Aluno" no Painel ou em Alunos, escolha a duração (Mensal, Trimestral ou Semestral), o plano e salve.',
                'Para dar presença: abra a aba "Presença" (barra inferior no celular) e clique em "Marcar" no nome do aluno.',
                'Para receber mensalidade: clique em "Receber" na linha do aluno atrasado no Painel, confirme o valor e envie o comprovante no WhatsApp com 1 clique.',
            ],
        },
        {
            icon: <Sparkles className="w-5 h-5 text-violet-600" />,
            title: '2. Planos Mensal, Trimestral e Semestral',
            items: [
                'Agora os planos são separados em abas por categoria no cadastro para evitar selecionar o plano errado por engano.',
                'Mensal: sem fidelidade, cobrança todo mês no dia escolhido (5, 10, 15 ou 20).',
                'Trimestral (3 meses) e Semestral (6 meses): o pagamento continua sendo mensal (com desconto do contrato), e o sistema mostra o progresso das parcelas pagas na ficha do aluno (ex: 2/3 meses).',
                'Sempre que você registra uma mensalidade, o próximo vencimento é calculado mantendo exatamente o dia escolhido pelo aluno.',
            ],
        },
        {
            icon: <Dumbbell className="w-5 h-5 text-sky-600" />,
            title: '3. Controle de Personal (Saldo de Aulas)',
            items: [
                'Alunos "Só Personal" ou "Turma + Personal" possuem um saldo de aulas (ex: 4, 8 ou 12 créditos).',
                'Na aba "Personal", clique em "Dar Baixa (-1 aula)" cada vez que o treino acontecer. Se clicar errado, use "Desfazer".',
                'Ao vender um novo pacote em Recebimento -> Personal, os novos créditos são somados automaticamente ao saldo atual.',
            ],
        },
        {
            icon: <MessageCircle className="w-5 h-5 text-emerald-600" />,
            title: '4. Cobrança e Comprovantes no WhatsApp',
            items: [
                'Em "Atrasados", "Vencem em 5 dias" e "Aniversariantes", há um botão verde de WhatsApp com a mensagem pronta para enviar.',
                'Logo após confirmar um pagamento, aparece a opção "Enviar Comprovante no WhatsApp" com valor, data e mês de referência já preenchidos.',
            ],
        },
        {
            icon: <Cloud className="w-5 h-5 text-indigo-600" />,
            title: '5. Sincronização PC ↔ Celular e App Instalável (PWA)',
            items: [
                'Quando conectado ao Supabase (Configurações > Nuvem & Celular), tudo que você lançar no computador aparece no celular em segundos.',
                'Funciona mesmo se a internet cair: os dados ficam salvos com segurança no aparelho e sincronizam assim que a conexão voltar.',
                'No celular (Chrome Android ou Safari iPhone), você pode usar "Adicionar à Tela Inicial" para abrir o sistema como aplicativo em tela cheia.',
            ],
        },
        {
            icon: <Database className="w-5 h-5 text-amber-600" />,
            title: '6. Backup e Importação Inteligente',
            items: [
                'Em Configurações > Backup & Limpeza você baixa uma cópia completa (.json) a qualquer momento.',
                'Ao importar um backup antigo, o assistente identifica e corrige automaticamente vencimentos com erro de fuso horário, espaços extras nos nomes, possíveis duplicados e histórico de meses fechados.',
            ],
        },
    ];

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Ajuda &amp; Manual Rápido
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Tudo o que você precisa saber para operar a academia com tranquilidade
                </p>
            </div>

            {/* Resumo visual rápido */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { icon: <Users className="w-4 h-4" />, title: '1. Cadastre', sub: 'Plano separado por categoria' },
                    { icon: <CalendarCheck className="w-4 h-4" />, title: '2. Marque', sub: 'Presença em 1 toque' },
                    { icon: <DollarSign className="w-4 h-4" />, title: '3. Receba', sub: 'Comprovante no WhatsApp' },
                    { icon: <Smartphone className="w-4 h-4" />, title: '4. Sincronize', sub: 'PC e celular juntos' },
                ].map((card) => (
                    <div key={card.title} className="card p-4 space-y-1">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                            {card.icon}
                        </div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white pt-1">
                            {card.title}
                        </div>
                        <div className="text-xs text-slate-500">{card.sub}</div>
                    </div>
                ))}
            </div>

            <div className="space-y-4">
                {sections.map((sec) => (
                    <div key={sec.title} className="card p-5 space-y-3">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                                {sec.icon}
                            </div>
                            <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                                {sec.title}
                            </h2>
                        </div>
                        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300 pl-2">
                            {sec.items.map((item) => (
                                <li key={item} className="flex items-start gap-2.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}
