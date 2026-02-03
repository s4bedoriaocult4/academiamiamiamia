# 🔧 GUIA DE IMPLEMENTAÇÃO - Funcionalidades Futuras

**Foco:** Sincronização, Calendário, Mobile, Expansão

---

## 1. 🔄 SINCRONIZAÇÃO MULTI-DISPOSITIVO

### Opção Recomendada: Supabase

**Por quê Supabase?**
- ✅ Gratuito até 500MB de banco
- ✅ Fácil de integrar
- ✅ Real-time sync
- ✅ Autenticação incluída
- ✅ TypeScript support

### Passo a Passo

#### 1.1 Setup Inicial

```bash
npm install @supabase/supabase-js
```

Criar arquivo `src/services/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

#### 1.2 Estrutura de Dados

**Estratégia Híbrida:**
- IndexedDB continua sendo fonte primária (offline-first)
- Supabase como backup/sincronização
- Sincronização em background

**Tabelas no Supabase:**
```sql
-- Tabela de usuários (academias)
academias (
  id UUID PRIMARY KEY,
  nome TEXT,
  email TEXT,
  created_at TIMESTAMP
)

-- Tabelas de dados (mesma estrutura do IndexedDB)
students_sync (
  id TEXT,
  academia_id UUID,
  data JSONB, -- Todo o objeto Student
  updated_at TIMESTAMP,
  device_id TEXT
)

payments_sync (...)
attendance_sync (...)
expenses_sync (...)
```

#### 1.3 Sincronização Bidirecional

**Fluxo:**
1. Usuário faz login → Autentica no Supabase
2. Sistema baixa dados do Supabase → Popula IndexedDB
3. Usuário trabalha offline → IndexedDB
4. Em background → Sincroniza mudanças para Supabase
5. Outro dispositivo → Baixa mudanças do Supabase

**Código Base:**
```typescript
// src/services/sync.ts
export async function syncToCloud() {
  const students = await db.students.toArray();
  const { data: user } = await supabase.auth.getUser();
  
  if (!user) return;
  
  // Enviar apenas mudanças desde última sync
  const lastSync = await db.settings.get('lastSync');
  
  for (const student of students) {
    await supabase
      .from('students_sync')
      .upsert({
        id: student.id,
        academia_id: user.id,
        data: student,
        updated_at: new Date().toISOString(),
        device_id: await getDeviceId()
      });
  }
  
  await db.settings.put({ 
    key: 'lastSync', 
    value: new Date().toISOString() 
  });
}

export async function syncFromCloud() {
  const { data: user } = await supabase.auth.getUser();
  if (!user) return;
  
  // Buscar dados do Supabase
  const { data: students } = await supabase
    .from('students_sync')
    .select('*')
    .eq('academia_id', user.id);
  
  // Mesclar com IndexedDB (resolver conflitos)
  for (const student of students) {
    const local = await db.students.get(student.id);
    
    if (!local || new Date(student.updated_at) > new Date(local.updatedAt || 0)) {
      await db.students.put(student.data);
    }
  }
}
```

#### 1.4 Resolução de Conflitos

**Estratégia: Last-Write-Wins com timestamp**
- Cada mudança tem `updated_at`
- Última mudança vence
- Mostrar aviso se houver conflito

#### 1.5 Autenticação

```typescript
// src/services/auth.ts
export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  
  // Sincronizar após login
  await syncFromCloud();
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  
  if (error) throw error;
}
```

### Alternativa: Firebase

Se preferir Firebase:
```bash
npm install firebase
```

Vantagens: Mais popular, mais documentação  
Desvantagens: Mais complexo, menos "SQL-like"

---

## 2. 📅 CALENDÁRIO DE EVENTOS

### Biblioteca Recomendada: react-big-calendar

```bash
npm install react-big-calendar
npm install date-fns
```

### Estrutura de Dados

```typescript
// src/types/index.ts
export interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'treino' | 'campeonato' | 'evento' | 'observacao';
  description?: string;
  studentIds?: string[]; // Se for treino específico
  color?: string;
  createdAt: string;
}
```

### Componente de Calendário

```typescript
// src/components/calendar/Calendar.tsx
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

export function CalendarView() {
  const events = useEvents(); // Hook customizado
  
  return (
    <div style={{ height: '600px' }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        messages={{
          next: 'Próximo',
          previous: 'Anterior',
          today: 'Hoje',
          month: 'Mês',
          week: 'Semana',
          day: 'Dia'
        }}
      />
    </div>
  );
}
```

### Modal de Evento

```typescript
// src/components/calendar/EventModal.tsx
export function EventModal({ isOpen, onClose, event, date }) {
  const [formData, setFormData] = useState({
    title: '',
    type: 'treino',
    start: date || new Date(),
    end: date || new Date(),
    description: '',
    studentIds: []
  });
  
  // ... lógica de salvar
}
```

### Integração com Presenças

```typescript
// Ao marcar presença, criar evento automaticamente
export async function markAttendanceWithEvent(studentId: string, date: Date) {
  // Marcar presença normal
  await db.attendance.add({...});
  
  // Criar evento no calendário
  await db.events.add({
    id: Date.now().toString(),
    title: `Treino - ${student.name}`,
    start: date,
    end: new Date(date.getTime() + 60 * 60 * 1000), // 1 hora
    type: 'treino',
    studentIds: [studentId],
    createdAt: new Date().toISOString()
  });
}
```

### Observações de Treino

```typescript
// Expandir Attendance ou criar TrainingNote
export interface TrainingNote {
  id: string;
  attendanceId: string;
  studentId: string;
  date: string;
  notes: string;
  photos?: string[]; // URLs ou base64
  createdAt: string;
}

// Na tela de presenças, adicionar botão "Observações"
// Abrir modal para anotar
```

---

## 3. 📱 PWA (Progressive Web App)

### 3.1 Manifest

Criar `public/manifest.json`:
```json
{
  "name": "Sistema de Gestão Academia",
  "short_name": "Gestão Academia",
  "description": "Sistema completo de gestão para academias",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1e40af",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 3.2 Service Worker

Criar `public/sw.js`:
```javascript
const CACHE_NAME = 'academia-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/index.css',
  '/assets/index.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

### 3.3 Registrar Service Worker

Em `src/main.tsx`:
```typescript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}
```

### 3.4 Ícones

Gerar ícones em:
- 192x192 (Android)
- 512x512 (Android)
- 180x180 (iOS - apple-touch-icon)

Usar ferramenta: https://realfavicongenerator.net/

### 3.5 Meta Tags

Em `index.html`:
```html
<meta name="theme-color" content="#1e40af">
<link rel="manifest" href="/manifest.json">
<link rel="apple-touch-icon" href="/icon-180.png">
```

---

## 4. 🎨 MODO GENÉRICO (Música, Dança, etc.)

### 4.1 Arquivo de Configuração

Criar `src/config/businessConfig.ts`:
```typescript
export interface BusinessConfig {
  name: string;
  type: 'academia' | 'musica' | 'danca' | 'personalizado';
  graduations: string[];
  planNames: {
    [key: string]: string;
  };
  colors: {
    primary: string;
    accent: string;
  };
}

export const defaultConfig: BusinessConfig = {
  name: 'RESISTÊNCIA MUAY THAI',
  type: 'academia',
  graduations: GRADUATIONS, // Do types/index.ts
  planNames: {
    '1x': '1x por semana',
    '2x': '2x por semana',
    // ...
  },
  colors: {
    primary: '#1e40af',
    accent: '#dc2626'
  }
};

// Carregar do banco ou usar default
export async function loadConfig(): Promise<BusinessConfig> {
  const saved = await db.settings.get('businessConfig');
  return saved?.value || defaultConfig;
}
```

### 4.2 Tela de Configuração

```typescript
// src/components/settings/BusinessConfig.tsx
export function BusinessConfig() {
  const [config, setConfig] = useState<BusinessConfig>(defaultConfig);
  
  const businessTypes = [
    { value: 'academia', label: 'Academia de Artes Marciais' },
    { value: 'musica', label: 'Escola de Música' },
    { value: 'danca', label: 'Escola de Dança' },
    { value: 'personalizado', label: 'Personalizado' }
  ];
  
  // ... formulário de configuração
}
```

### 4.3 Templates por Tipo

```typescript
export const templates = {
  musica: {
    graduations: ['Iniciante', 'Básico', 'Intermediário', 'Avançado', 'Profissional'],
    planNames: {
      '1x': 'Aula Individual',
      '2x': '2x por semana',
      'livre': 'Acesso Livre'
    }
  },
  danca: {
    graduations: ['Iniciante', 'Básico', 'Intermediário', 'Avançado'],
    planNames: {
      '1x': '1x por semana',
      '2x': '2x por semana',
      'livre': 'Acesso Livre'
    }
  }
};
```

### 4.4 Aplicar Configuração

```typescript
// Usar em todo o sistema
const config = await loadConfig();

// Em vez de:
<span>{student.graduation}</span>

// Usar:
<span>{config.graduations.find(g => g === student.graduation) || student.graduation}</span>
```

---

## 5. 📊 ORDEM DE IMPLEMENTAÇÃO RECOMENDADA

### Fase 1: Sincronização (2-3 semanas)
1. Setup Supabase
2. Autenticação
3. Sincronização básica
4. Testes multi-dispositivo
5. Resolução de conflitos

### Fase 2: Calendário (1-2 semanas)
1. Instalar biblioteca
2. Criar estrutura de dados
3. Componente de calendário
4. Modal de eventos
5. Integração com presenças

### Fase 3: PWA (1 semana)
1. Manifest
2. Service Worker
3. Ícones
4. Testes de instalação
5. Modo offline completo

### Fase 4: Modo Genérico (1-2 semanas)
1. Sistema de configuração
2. Templates
3. Tela de configuração
4. Aplicar em todo sistema
5. Testes com diferentes tipos

---

## 6. 🧪 TESTES IMPORTANTES

### Sincronização
- [ ] Login em 2 dispositivos
- [ ] Criar aluno no dispositivo A
- [ ] Ver no dispositivo B
- [ ] Editar no dispositivo B
- [ ] Ver mudança no dispositivo A
- [ ] Conflito de edição simultânea

### Calendário
- [ ] Criar evento
- [ ] Editar evento
- [ ] Deletar evento
- [ ] Visualização mensal/semanal/diária
- [ ] Integração com presenças

### PWA
- [ ] Instalar no Android
- [ ] Instalar no iOS
- [ ] Funcionar offline
- [ ] Atualizar automaticamente

### Modo Genérico
- [ ] Mudar tipo de negócio
- [ ] Personalizar graduações
- [ ] Salvar e carregar configuração
- [ ] Aplicar em todas as telas

---

## 7. 📦 DEPENDÊNCIAS ADICIONAIS

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "react-big-calendar": "^1.8.0",
    "moment": "^2.30.1",
    "date-fns": "^3.0.0"
  },
  "devDependencies": {
    "@types/react-big-calendar": "^1.8.0"
  }
}
```

---

## 8. ⚠️ CUIDADOS

### Sincronização
- ⚠️ Custos do Supabase após limite gratuito
- ⚠️ Privacidade (dados na nuvem)
- ⚠️ Resolução de conflitos complexa
- ⚠️ Performance com muitos dados

### Calendário
- ⚠️ Performance com muitos eventos
- ⚠️ Timezone (importante!)
- ⚠️ Localização (pt-BR)

### PWA
- ⚠️ Service Worker pode quebrar se mal configurado
- ⚠️ Cache pode causar problemas
- ⚠️ iOS tem limitações

### Modo Genérico
- ⚠️ Testar todos os tipos
- ⚠️ Migração de dados existentes
- ⚠️ Compatibilidade com backups antigos

---

**Última Atualização:** 2024
