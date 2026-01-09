# RESISTENCIA MUAY THAI - Sistema de Gestao

## Sobre o Sistema

Sistema completo de gestao para academias de artes marciais, desenvolvido para funcionar 100% offline com armazenamento local seguro (IndexedDB). Nenhum dado e enviado para servidores externos.

---

## Principais Funcionalidades

### 1. Gestao de Alunos
- Cadastro completo com nome, telefone, email, CPF, CEP e endereco
- Preenchimento automatico de endereco via CEP (ViaCEP)
- Data de nascimento e nome do responsavel (obrigatorio para menores)
- Sistema de graduacoes do Muay Thai
- Status ativo/inativo
- Visualizacao detalhada do cadastro

### 2. Controle Financeiro
- Registro de pagamentos com multiplos metodos (PIX, Dinheiro, Cartao, Link)
- Venda de itens avulsos
- Controle de despesas por categoria (Aluguel, Luz, Agua, Equipamentos, etc.)
- Calculo automatico de lucro mensal
- Graficos de receita vs despesas (6 meses)

### 3. Controle de Presencas
- Marcacao rapida com um clique
- Selecao de data para registros retroativos
- Grafico de frequencia semanal
- Historico completo de presencas por aluno

### 4. Dashboard Inteligente
- Visao geral com estatisticas em tempo real
- Alunos ativos, receita do mes, inadimplentes
- Aniversariantes do mes com destaque para o dia atual
- Alertas de vencimentos na semana
- Lista de alunos com pagamento atrasado
- Distribuicao de alunos por plano

### 5. Sistema de Planos
- Planos pre-configurados (1x, 2x, 3x, Livre, Plus)
- Editor de planos personalizado
- Preco e frequencia configuraveis
- Calculo automatico de receita esperada

### 6. Backup e Seguranca
- Exportacao completa em JSON
- Importacao com validacao e sanitizacao de dados
- Protecao por senha na entrada do sistema
- Dados armazenados apenas localmente

---

## Requisitos Tecnicos

- Navegador moderno (Chrome, Firefox, Edge, Safari)
- JavaScript habilitado
- Armazenamento local disponivel (IndexedDB)

---

## Seguranca dos Dados

- Todos os dados sao armazenados no navegador do usuario
- Nenhuma informacao e transmitida para servidores externos
- Sistema funciona 100% offline apos carregamento inicial
- Backup manual recomendado periodicamente

---
## RECOMENDAÇÕES:

-- BBackups regulares (semanal ou apos grandes cadastros)
-- Nao limpar dados do navegador sem fazer backup antes

---

## Versao

v5 (IndexedDB)

---

Feito por MTZ, Antigravity e Cursor

"De trabalhadores, para trabalhadores."
