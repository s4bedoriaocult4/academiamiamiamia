# RESISTENCIA MUAY THAI — Sistema de Gestão

Sistema completo de gestão para academias de artes marciais, desenvolvido para funcionar de forma local e offline. Todos os dados ficam armazenados no próprio navegador do usuário, via IndexedDB, sem depender de servidores externos ou conexão com a internet para operar no dia a dia.

A única exceção é o preenchimento automático de endereço por CEP, que consulta a API pública ViaCEP quando há conexão disponível. Se estiver offline, o preenchimento é feito manualmente sem qualquer prejuízo ao cadastro.

---

## Funcionalidades

### Gestão de Alunos

- Cadastro completo com nome, telefone, e-mail, CPF, CEP e endereço
- Preenchimento automático de endereço via CEP (API ViaCEP, opcional)
- Data de nascimento e nome do responsável (obrigatório para menores)
- Sistema de graduações do Muay Thai
- Status ativo/inativo
- Visualização detalhada do cadastro

### Controle Financeiro

- Registro de pagamentos com múltiplos métodos (PIX, Dinheiro, Cartão, Link)
- Venda de itens avulsos
- Controle de despesas por categoria (Aluguel, Luz, Água, Equipamentos, etc.)
- Cálculo automático de lucro mensal
- Gráficos de receita vs. despesas dos últimos 6 meses
- Histórico mensal imutável (snapshots automáticos ao fechar o mês)

### Controle de Presenças

- Marcação rápida com um clique
- Seleção de data para registros retroativos
- Gráfico de frequência semanal
- Histórico completo de presenças por aluno

### Dashboard Inteligente

- Visão geral com estatísticas em tempo real
- Alunos ativos, receita do mês, inadimplentes
- Aniversariantes do mês com destaque para o dia atual
- Alertas de vencimentos na semana
- Lista de alunos com pagamento atrasado
- Distribuição de alunos por plano

### Sistema de Planos

- Planos pré-configurados (1x, 2x, 3x, Livre, Plus)
- Editor de planos personalizado
- Preço e frequência configuráveis
- Cálculo automático de receita esperada

### Personalização

- Troca de logo da academia
- Edição do nome exibido no sistema
- Alteração de senha de acesso

### Backup e Recuperação

- Exportação completa em JSON
- Importação com validação de estrutura
- Dados armazenados apenas localmente

### Página de Ajuda Integrada

- Guia rápido de uso dentro do próprio sistema
- Explicações sobre fluxo diário, cadastro, financeiro, presenças e backup
- Consulta a qualquer momento, sem precisar de suporte externo

---

## Stack Técnica

- React 18
- TypeScript 5.6
- Vite 6
- Dexie 4 (IndexedDB)
- Tailwind CSS 3
- Recharts 2
- Lucide React

---

## Requisitos

- Navegador moderno (Chrome, Firefox, Edge, Safari)
- JavaScript habilitado
- Armazenamento local disponível (IndexedDB)
- Conexão com a internet apenas para a busca de CEP (opcional)

---

## Segurança e Privacidade dos Dados

- Todos os dados são armazenados no navegador do usuário
- Nenhuma informação é transmitida para servidores externos, exceto o CEP consultado na API pública ViaCEP
- Sistema funciona offline após o carregamento inicial
- A senha de acesso funciona como proteção contra acesso casual no dispositivo, não como camada de segurança criptográfica
- Backup manual recomendado periodicamente

---

## Recomendações de Uso

- Fazer backups regulares (semanalmente ou após grandes cadastros)
- Não limpar os dados do navegador sem antes exportar um backup
- Manter o navegador atualizado para garantir compatibilidade com IndexedDB

---

## Versão

v5 (IndexedDB)

---

Feito por MTZ, Antigravity e Cursor.

*"De trabalhadores, para trabalhadores."*
