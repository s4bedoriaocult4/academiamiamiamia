-- ============================================================================
-- SCHEMA SUPABASE - SISTEMA DE GESTÃO DA ACADEMIA
-- Execute este script no SQL Editor do seu projeto Supabase
-- ============================================================================

-- Função utilitária para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    -- Preserva updated_at explicitamente enviado em sincronizações offline,
    -- ou usa NOW() quando não informado/igual ao antigo
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$;

-- 1. Planos regulares / Fidelidade
CREATE TABLE IF NOT EXISTS public.plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'mensal',
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    frequency INTEGER NOT NULL DEFAULT 1,
    duration_months INTEGER NOT NULL DEFAULT 1,
    commitment_months INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 2. Pacotes Personal
CREATE TABLE IF NOT EXISTS public.personal_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_classes INTEGER NOT NULL DEFAULT 4,
    frequency_per_week INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 3. Alunos
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    cpf TEXT,
    cep TEXT,
    address TEXT,
    plan TEXT NOT NULL,
    due_day INTEGER NOT NULL DEFAULT 5,
    start_date TEXT NOT NULL,
    next_due TEXT NOT NULL,
    graduation TEXT NOT NULL DEFAULT 'Sem graduação',
    status TEXT NOT NULL DEFAULT 'ativo',
    birth_date TEXT,
    responsible_name TEXT,
    notes TEXT,
    plan_type TEXT DEFAULT 'normal',
    personal_plan_id TEXT,
    personal_classes_remaining INTEGER NOT NULL DEFAULT 0,
    personal_start_date TEXT,
    commitment_start_date TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 4. Pagamentos e Entradas
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    student_name TEXT,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    late_fee NUMERIC(10, 2),
    method TEXT NOT NULL DEFAULT 'PIX',
    date TEXT NOT NULL,
    reference_month TEXT,
    type TEXT NOT NULL DEFAULT 'pagamento',
    item_description TEXT,
    personal_plan_id TEXT,
    classes_added INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 5. Presenças
CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    date TEXT NOT NULL,
    attendance_type TEXT NOT NULL DEFAULT 'normal',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 6. Despesas
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Outros',
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    date TEXT NOT NULL,
    recurring BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 7. Anotações Diárias
CREATE TABLE IF NOT EXISTS public.daily_notes (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 8. Histórico / Fechamento Mensal
CREATE TABLE IF NOT EXISTS public.monthly_snapshots (
    id TEXT PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
    expenses NUMERIC(12, 2) NOT NULL DEFAULT 0,
    profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
    active_students INTEGER NOT NULL DEFAULT 0,
    overdue_count INTEGER NOT NULL DEFAULT 0,
    attendance_count INTEGER NOT NULL DEFAULT 0,
    closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 9. Configurações Compartilhadas (Nome, Logo, Tema)
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Índices para performance em sincronização incremental e filtros
CREATE INDEX IF NOT EXISTS idx_students_updated_at ON public.students(updated_at);
CREATE INDEX IF NOT EXISTS idx_payments_updated_at ON public.payments(updated_at);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_updated_at ON public.attendance(updated_at);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_expenses_updated_at ON public.expenses(updated_at);
CREATE INDEX IF NOT EXISTS idx_plans_updated_at ON public.plans(updated_at);
CREATE INDEX IF NOT EXISTS idx_personal_plans_updated_at ON public.personal_plans(updated_at);
CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_updated_at ON public.monthly_snapshots(updated_at);
CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON public.settings(updated_at);

-- ============================================================================
-- SEGURANÇA (RLS - Row Level Security)
-- Apenas usuários autenticados no Supabase Auth podem ler e gravar dados.
-- ============================================================================
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'plans', 'personal_plans', 'students', 'payments',
        'attendance', 'expenses', 'daily_notes', 'monthly_snapshots', 'settings'
    ]
    LOOP
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon;', tbl);
        EXECUTE format('GRANT ALL ON TABLE public.%I TO authenticated;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Authenticated users full access" ON public.%I;', tbl);
        EXECUTE format(
            'CREATE POLICY "Authenticated users access" ON public.%I FOR ALL TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);',
            tbl
        );
    END LOOP;
END $$;

-- ============================================================================
-- REALTIME (Atualização automática entre PC e Celular)
-- ============================================================================
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'plans', 'personal_plans', 'students', 'payments',
        'attendance', 'expenses', 'daily_notes', 'monthly_snapshots', 'settings'
    ]
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
    END LOOP;
END $$;
