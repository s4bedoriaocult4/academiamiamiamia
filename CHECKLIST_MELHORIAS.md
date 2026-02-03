# ✅ CHECKLIST DE MELHORIAS TÉCNICAS

**Priorização:** 🔴 Crítica | 🟡 Importante | 🟢 Desejável

---

## 🔴 MELHORIAS CRÍTICAS (Implementar Antes do Lançamento)

### 1. Validação de CPF
- [ ] Criar função `validateCPF(cpf: string): boolean`
- [ ] Implementar algoritmo de validação (dígitos verificadores)
- [ ] Adicionar validação no `StudentModal.tsx`
- [ ] Mostrar mensagem de erro se CPF inválido
- [ ] Testar com CPFs válidos e inválidos

**Arquivo:** `src/components/students/StudentModal.tsx`

**Código Sugerido:**
```typescript
function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false; // Todos iguais
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCPF.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
}
```

---

### 2. Hash de Senha
- [ ] Instalar biblioteca de hash (crypto-js ou bcryptjs)
- [ ] Criar função `hashPassword(password: string): string`
- [ ] Atualizar `LoginPage.tsx` para usar hash
- [ ] Migrar senhas existentes (se houver)
- [ ] Testar login com senha antiga e nova

**Arquivo:** `src/components/auth/LoginPage.tsx`

**Comando:**
```bash
npm install crypto-js
npm install --save-dev @types/crypto-js
```

**Código Sugerido:**
```typescript
import CryptoJS from 'crypto-js';

function hashPassword(password: string): string {
  return CryptoJS.SHA256(password).toString();
}

// Ao salvar:
await db.settings.put({ 
  key: 'appPassword', 
  value: hashPassword(password) 
});

// Ao verificar:
const savedHash = savedPassword.value;
if (hashPassword(password) !== savedHash) {
  setError('Senha incorreta');
}
```

---

### 3. Opção de Substituição Total no Backup
- [ ] Adicionar checkbox "Substituir todos os dados" no modal de importação
- [ ] Criar função `replaceAllData()` vs `mergeData()`
- [ ] Limpar banco antes de importar se "substituir" estiver marcado
- [ ] Adicionar confirmação dupla para substituição
- [ ] Testar ambos os modos

**Arquivo:** `src/components/settings/Settings.tsx`

**Código Sugerido:**
```typescript
const [replaceMode, setReplaceMode] = useState(false);

// No handleImport:
if (replaceMode) {
  // Limpar tudo primeiro
  await db.students.clear();
  await db.payments.clear();
  // ... outros clears
}

// Depois importar normalmente
```

---

### 4. Validação de Email Robusta
- [ ] Criar função `validateEmail(email: string): boolean`
- [ ] Adicionar validação no `StudentModal.tsx`
- [ ] Mostrar mensagem de erro se email inválido
- [ ] Testar com emails válidos e inválidos

**Arquivo:** `src/components/students/StudentModal.tsx`

**Código Sugerido:**
```typescript
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

---

## 🟡 MELHORIAS IMPORTANTES (Implementar Após Lançamento)

### 5. Relatórios em PDF
- [ ] Instalar biblioteca de PDF (jsPDF ou pdfmake)
- [ ] Criar componente `ReportGenerator.tsx`
- [ ] Implementar relatório de inadimplência
- [ ] Implementar relatório financeiro mensal
- [ ] Adicionar botões de exportação no Dashboard

**Biblioteca Sugerida:**
```bash
npm install jspdf
```

---

### 6. Exportação em CSV
- [ ] Criar função `exportToCSV(data: any[], filename: string)`
- [ ] Adicionar botão "Exportar CSV" em:
  - Lista de alunos
  - Lista de pagamentos
  - Lista de despesas
- [ ] Testar abertura no Excel

**Código Sugerido:**
```typescript
function exportToCSV(data: any[], filename: string) {
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => `"${row[header] || ''}"`).join(',')
    )
  ].join('\n');
  
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
```

---

### 7. Busca Avançada
- [ ] Adicionar filtros múltiplos na lista de alunos:
  - Status (Ativo/Inativo)
  - Plano
  - Graduação
- [ ] Adicionar busca por CPF
- [ ] Adicionar busca por email
- [ ] Salvar filtros no localStorage

**Arquivo:** `src/components/students/StudentList.tsx`

---

### 8. Notificações do Navegador
- [ ] Solicitar permissão de notificações
- [ ] Implementar alertas de vencimento
- [ ] Implementar lembrete de aniversários
- [ ] Configurar horários de notificação

**Código Sugerido:**
```typescript
if ('Notification' in window && Notification.permission === 'granted') {
  new Notification('Alerta de Vencimento', {
    body: `${student.name} tem pagamento vencendo hoje!`,
    icon: '/icon.png'
  });
}
```

---

## 🟢 MELHORIAS DESEJÁVEIS (Futuro)

### 9. PWA (Progressive Web App)
- [ ] Criar `manifest.json`
- [ ] Adicionar service worker
- [ ] Criar ícones para diferentes tamanhos
- [ ] Configurar cache offline
- [ ] Testar instalação no mobile

**Arquivo:** `public/manifest.json`

---

### 10. Histórico de Alterações
- [ ] Criar tabela `auditLog` no banco
- [ ] Registrar mudanças em alunos
- [ ] Registrar mudanças em pagamentos
- [ ] Criar tela de visualização de histórico
- [ ] Adicionar filtros por data/tipo

---

### 11. Dashboard Personalizado
- [ ] Criar sistema de widgets arrastáveis
- [ ] Salvar layout no localStorage
- [ ] Permitir adicionar/remover widgets
- [ ] Criar novos widgets (ex: gráfico de frequência mensal)

---

### 12. Sincronização Opcional (Nuvem)
- [ ] Criar API backend (opcional)
- [ ] Implementar criptografia end-to-end
- [ ] Adicionar opção de sincronização nas configurações
- [ ] Sincronizar em background
- [ ] Resolver conflitos de dados

**⚠️ Nota:** Isso muda o modelo de negócio (dados saem do dispositivo)

---

## 📋 CHECKLIST DE TESTES

### Testes Funcionais
- [ ] Cadastro de aluno completo
- [ ] Edição de aluno
- [ ] Exclusão de aluno (com cascade)
- [ ] Registro de pagamento
- [ ] Marcação de presença
- [ ] Registro de despesa
- [ ] Backup e restauração
- [ ] Importação com dados antigos
- [ ] Migração LocalStorage → IndexedDB

### Testes de Validação
- [ ] CPF inválido rejeitado
- [ ] Email inválido rejeitado
- [ ] Telefone formatado corretamente
- [ ] CEP busca endereço
- [ ] Menor de idade exige responsável

### Testes de Segurança
- [ ] Senha não aparece em texto plano
- [ ] Dados não saem do navegador
- [ ] Backup contém todos os dados
- [ ] Importação valida estrutura

### Testes de Performance
- [ ] Sistema funciona com 100+ alunos
- [ ] Sistema funciona com 1000+ pagamentos
- [ ] Gráficos carregam rapidamente
- [ ] Busca é instantânea

### Testes de Compatibilidade
- [ ] Chrome (últimas 2 versões)
- [ ] Firefox (últimas 2 versões)
- [ ] Edge (últimas 2 versões)
- [ ] Safari (últimas 2 versões)
- [ ] Mobile (Chrome, Safari)

---

## 🎯 PRIORIZAÇÃO PARA LANÇAMENTO

**Fase 1 - Antes do Lançamento (1-2 semanas):**
1. ✅ Validação de CPF
2. ✅ Hash de Senha
3. ✅ Opção de Substituição no Backup
4. ✅ Validação de Email
5. ✅ Testes completos

**Fase 2 - Pós-Lançamento (1-2 meses):**
1. ✅ Relatórios em PDF
2. ✅ Exportação CSV
3. ✅ Busca Avançada
4. ✅ Notificações

**Fase 3 - Futuro (3-6 meses):**
1. ✅ PWA
2. ✅ Histórico de Alterações
3. ✅ Dashboard Personalizado
4. ✅ Sincronização (se houver demanda)

---

## 📝 NOTAS DE IMPLEMENTAÇÃO

**Ordem Recomendada:**
1. Começar pelas melhorias críticas
2. Testar cada melhoria isoladamente
3. Fazer commit após cada melhoria
4. Documentar mudanças no CHANGELOG.md
5. Atualizar versão do sistema

**Versionamento:**
- Melhorias críticas: v5.1
- Melhorias importantes: v5.2
- Melhorias desejáveis: v6.0

---

**Última Atualização:** 2024
