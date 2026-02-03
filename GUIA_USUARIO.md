# 📘 GUIA DO USUÁRIO - Sistema de Gestão Academia

**Versão:** v5 (IndexedDB)  
**Última Atualização:** 2024

---

## 🎯 ÍNDICE RÁPIDO

1. [Primeiros Passos](#primeiros-passos)
2. [Cadastro de Alunos](#cadastro-de-alunos)
3. [Controle de Pagamentos](#controle-de-pagamentos)
4. [Marcação de Presenças](#marcação-de-presenças)
5. [Gestão Financeira](#gestão-financeira)
6. [Dashboard e Relatórios](#dashboard-e-relatórios)
7. [Backup e Segurança](#backup-e-segurança)
8. [Dúvidas Frequentes](#dúvidas-frequentes)

---

## 🚀 PRIMEIROS PASSOS

### 1.1 Acessando o Sistema

1. Abra o arquivo `index.html` no seu navegador
   - **Chrome, Firefox, Edge ou Safari** (versões recentes)
   - Ou acesse via servidor local se estiver em desenvolvimento

2. **Primeira Vez?**
   - Você verá a tela de criação de senha
   - Digite uma senha (mínimo 4 caracteres)
   - Confirme a senha
   - Marque "Lembrar-me" se quiser manter a sessão ativa
   - Clique em "Criar Conta"

3. **Acessos Seguintes:**
   - Digite sua senha
   - Clique em "Entrar"

### 1.2 Conhecendo a Interface

**Menu Lateral:**
- 🏠 **Dashboard** - Visão geral do sistema
- 👥 **Alunos** - Gestão de alunos
- 🏋️ **Controle Personal** - Gestão de aulas personal
- ✅ **Presenças** - Marcação de presenças
- 💰 **Pagamentos** - Registro de pagamentos
- 💸 **Despesas** - Controle de gastos
- ⚙️ **Configurações** - Ajustes e backup

**Barra Superior:**
- 🌙/☀️ **Modo Escuro/Claro** - Alternar tema
- Versão do sistema

---

## 👥 CADASTRO DE ALUNOS

### 2.1 Cadastrar Novo Aluno

1. Clique em **"Alunos"** no menu lateral
2. Clique no botão **"Novo Aluno"** (canto superior direito)
3. Preencha o formulário:

**Campos Obrigatórios:**
- ✅ **Nome Completo** - Nome completo do aluno
- ✅ **Telefone** - Formatação automática (11) 99999-9999

**Campos Opcionais:**
- 📅 **Data de Nascimento** - Usado para calcular idade
- 🆔 **CPF** - Formatação automática 000.000.000-00
- 📮 **CEP** - Busca endereço automaticamente (ViaCEP)
- 🏠 **Endereço** - Preenchido automaticamente ou manual
- 📧 **Email** - Email de contato
- 👨‍👩‍👧 **Nome do Responsável** - **OBRIGATÓRIO se menor de 18 anos**

**Configurações do Plano:**
- 📋 **Plano Mensal** - Selecione (1x, 2x, 3x, Livre, Plus)
- 📅 **Vencimento** - Dia do mês (5, 10, 15 ou 20)
- 🏋️ **Saldo de Aulas Personal** - Se tiver pacote personal
- 🥋 **Graduação** - Graduação do Muay Thai
- 📝 **Observações** - Notas sobre o aluno

4. Clique em **"Cadastrar Aluno"**

### 2.2 Buscar Alunos

- Use a barra de busca no topo da lista
- Busca por: Nome, Telefone ou Status

### 2.3 Editar Aluno

1. Na lista de alunos, clique no ícone **✏️ (lápis)**
2. Faça as alterações necessárias
3. Clique em **"Salvar Alterações"**

**⚠️ Importante:**
- Ao alterar o nome, todos os registros (pagamentos, presenças) são atualizados automaticamente

### 2.4 Visualizar Cadastro Completo

1. Clique no ícone **👁️ (olho)** na lista
2. Veja todas as informações do aluno em um modal
3. Feche clicando no X ou fora do modal

### 2.5 Excluir Aluno

**⚠️ ATENÇÃO: Esta ação é irreversível!**

1. Clique no ícone **🗑️ (lixeira)**
2. Confirme a exclusão
3. **Isso apagará também:**
   - Todos os pagamentos do aluno
   - Todas as presenças do aluno

---

## 💰 CONTROLE DE PAGAMENTOS

### 3.1 Registrar Pagamento de Mensalidade

1. Clique em **"Pagamentos"** no menu
2. Clique em **"Nova Transação"**
3. Selecione o tipo: **"Mensalidade"**
4. Preencha:
   - **Aluno** - Selecione da lista
   - **Data** - Data do pagamento
   - **Valor** - Valor recebido
   - **Método** - PIX, Dinheiro, Cartão ou Link
   - **Referência** - Mês de referência (ex: "01/2024")
   - **Multa** - Se houver atraso (opcional)
5. Clique em **"Salvar"**

### 3.2 Vender Pacote Personal

1. Em **"Pagamentos"**, clique em **"Nova Transação"**
2. Selecione o tipo: **"Personal"**
3. Preencha:
   - **Aluno** - Selecione
   - **Plano Personal** - Escolha o pacote (4, 8, 12 ou 16 aulas)
   - **Data** - Data da venda
   - **Valor** - Valor do pacote
   - **Método** - Forma de pagamento
4. Clique em **"Salvar"**
5. O saldo de aulas será creditado automaticamente no aluno

### 3.3 Registrar Entrada Avulsa

1. Em **"Pagamentos"**, clique em **"Nova Transação"**
2. Selecione o tipo: **"Entrada"**
3. Preencha:
   - **Descrição** - O que foi vendido (ex: "Venda de luvas")
   - **Data** - Data da venda
   - **Valor** - Valor recebido
   - **Método** - Forma de pagamento
4. Clique em **"Salvar"**

### 3.4 Editar/Excluir Pagamento

- **Editar:** Clique no ícone ✏️ na lista
- **Excluir:** Clique no ícone 🗑️ e confirme

---

## ✅ MARCAÇÃO DE PRESENÇAS

### 4.1 Marcar Presença (Dia Atual)

1. Clique em **"Presenças"** no menu
2. Certifique-se que a data está como **"Hoje"** (ou selecione outra data)
3. Na aba **"Marcar Presença"**, você verá cards de todos os alunos ativos
4. **Clique no card do aluno** para marcar presença
5. O card ficará verde com ✓ quando marcado

### 4.2 Marcar Presença em Data Anterior

1. Clique no calendário no topo
2. Selecione a data desejada
3. Ou clique em **"Hoje"** para voltar à data atual
4. Marque as presenças normalmente

### 4.3 Ver Registros do Dia

1. Na aba **"Registros do Dia"**, veja todas as presenças marcadas
2. Você pode remover presenças clicando no ícone 🗑️

### 4.4 Gráfico de Frequência

- Veja a frequência dos últimos 7 dias no gráfico
- Útil para identificar padrões de frequência

---

## 💸 GESTÃO FINANCEIRA

### 5.1 Registrar Despesa

1. Clique em **"Despesas"** no menu
2. Clique em **"Nova Despesa"**
3. Preencha:
   - **Descrição** - O que foi gasto (ex: "Aluguel do mês")
   - **Categoria** - Aluguel, Luz, Água, Equipamentos, Marketing, Manutenção, Outros
   - **Valor** - Valor gasto
   - **Data** - Data da despesa
   - **Recorrente** - Marque se for despesa mensal
4. Clique em **"Salvar"**

### 5.2 Editar/Excluir Despesa

- **Editar:** Clique no ícone ✏️
- **Excluir:** Clique no ícone 🗑️ e confirme

### 5.3 Ver Total de Despesas

- No topo da tela de despesas, veja o total registrado
- Use a busca para filtrar por descrição ou categoria

---

## 📊 DASHBOARD E RELATÓRIOS

### 6.1 Visão Geral

Acesse **"Dashboard"** para ver:

**Estatísticas Principais:**
- 👥 **Alunos Ativos** - Total de alunos ativos
- 💰 **Receita do Mês** - Total recebido no mês atual
- ⚠️ **Inadimplentes** - Alunos com pagamento atrasado
- ✅ **Presenças Hoje** - Presenças marcadas hoje

**Aniversariantes:**
- 🎂 Lista de aniversariantes do mês
- Destaque especial para aniversários de hoje
- Pode minimizar/expandir

**Gráficos:**
- 📊 **Receita vs Despesas** - Últimos 6 meses
- 🥧 **Distribuição por Plano** - Quantos alunos em cada plano

**Alertas:**
- ⚠️ **Alunos com Pagamento Atrasado** - Lista dos atrasados
- 📅 **Vencimentos na Semana** - Alunos que vencem nos próximos 7 dias

### 6.2 Resumo Financeiro do Mês

No dashboard, veja:
- 💚 **Receita** - Total recebido
- ❤️ **Despesas** - Total gasto
- 💙 **Lucro** - Receita - Despesas (verde se positivo, vermelho se negativo)

### 6.3 Imprimir Relatório

1. No dashboard, clique em **"Imprimir Relatório"**
2. Use Ctrl+P (Windows) ou Cmd+P (Mac)
3. Configure a impressão e imprima

---

## 🔒 BACKUP E SEGURANÇA

### 7.1 Fazer Backup

**⚠️ MUITO IMPORTANTE: Faça backups regulares!**

1. Acesse **"Configurações"** no menu
2. Em **"Backup e Restauração"**, clique em **"Exportar Backup"**
3. O arquivo JSON será baixado automaticamente
4. **Salve em local seguro:**
   - Pendrive
   - Nuvem (Google Drive, Dropbox)
   - Email para você mesmo
   - Computador externo

**Frequência Recomendada:**
- ✅ Semanalmente
- ✅ Após grandes cadastros
- ✅ Antes de atualizar o sistema

### 7.2 Restaurar Backup

**⚠️ ATENÇÃO: Isso mesclará com dados atuais!**

1. Acesse **"Configurações"**
2. Clique em **"Importar Backup"**
3. Selecione o arquivo JSON do backup
4. Confirme a importação
5. A página será recarregada automaticamente

**Dica:** Se quiser substituir tudo, primeiro faça um reset (veja abaixo)

### 7.3 Resetar Sistema

**⚠️ PERIGO: Isso apaga TUDO!**

1. Acesse **"Configurações"**
2. Role até **"Zona de Perigo"**
3. Clique em **"Resetar Fábrica"**
4. Confirme **DUAS VEZES**
5. O sistema será resetado e a página recarregada

**Use apenas se:**
- Quiser começar do zero
- Tiver backup seguro
- Sistema corrompido (último recurso)

### 7.4 Configurar Planos

**Planos Mensais:**
1. Em **"Configurações"**, role até **"Gerenciar Planos"**
2. Edite planos existentes ou crie novos
3. Defina: Nome, Preço, Frequência

**Planos Personal:**
1. Em **"Gerenciar Planos Personal"**
2. Configure pacotes (4, 8, 12 ou 16 aulas)
3. Defina: Nome, Preço, Frequência semanal

---

## ❓ DÚVIDAS FREQUENTES

### 8.1 Dados e Segurança

**P: Meus dados estão seguros?**  
R: Sim! Todos os dados ficam apenas no seu navegador. Nada é enviado para servidores externos.

**P: E se eu limpar os dados do navegador?**  
R: ⚠️ Você perderá tudo! Por isso é importante fazer backups regulares.

**P: Posso usar em outro computador?**  
R: Sim, mas precisa importar o backup. Os dados não sincronizam automaticamente.

**P: E se eu esquecer a senha?**  
R: Você pode resetar o sistema (apaga tudo) ou limpar os dados do navegador. Por isso, anote a senha em local seguro.

### 8.2 Funcionalidades

**P: Como calcular a próxima data de vencimento?**  
R: O sistema calcula automaticamente baseado no dia de vencimento escolhido.

**P: Posso ter alunos com plano normal E personal?**  
R: Sim! Configure o saldo de aulas personal no cadastro do aluno.

**P: Como marcar presença de aula personal?**  
R: Use a tela "Controle Personal" no menu. Lá você marca presenças que descontam do saldo.

**P: Posso exportar dados para Excel?**  
R: Atualmente não, mas você pode fazer backup em JSON e converter. (Funcionalidade futura)

### 8.3 Problemas Comuns

**P: O sistema está lento**  
R: Pode ser muitos dados. Tente limpar presenças antigas ou fazer backup e resetar.

**P: Não consigo marcar presença**  
R: Verifique se o aluno está ativo. Apenas alunos ativos aparecem na lista.

**P: O gráfico não aparece**  
R: Verifique se há dados suficientes. Alguns gráficos precisam de pelo menos alguns registros.

**P: Perdi meus dados!**  
R: Se você fez backup, importe o arquivo. Se não, infelizmente os dados foram perdidos. Por isso backups são essenciais!

### 8.4 Dicas Pro

✅ **Organização:**
- Use observações nos alunos para anotar informações importantes
- Categorize bem as despesas para relatórios melhores
- Mantenha os dados atualizados

✅ **Eficiência:**
- Use a busca para encontrar alunos rapidamente
- Marque presenças no início do treino
- Faça backup toda sexta-feira (rotina)

✅ **Segurança:**
- Faça backup antes de qualquer atualização
- Guarde backups em múltiplos locais
- Teste a restauração de backup ocasionalmente

---

## 📞 SUPORTE

**Precisa de ajuda?**
- 📧 Email: [seu-email]
- 💬 WhatsApp: [seu-whatsapp]
- 📹 Vídeos: [link-youtube]

**Horário de Atendimento:**
- Segunda a Sexta: 9h às 18h
- Sábado: 9h às 13h

---

**Versão do Guia:** 1.0  
**Última Atualização:** 2024
