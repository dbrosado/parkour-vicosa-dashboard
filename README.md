# Parkour Viçosa CRM & Gestão

Dashboard operacional e comercial da Parkour Viçosa. Funciona **100% local**:
sem Supabase, sem serviços externos — todos os dados ficam no navegador deste
computador (`localStorage`) e as fontes são auto-hospedadas, então o painel
abre até sem internet.

## Acesso

O painel tem uma tela de login local (sem servidor):

- **Usuário:** `danilo`
- **Senha:** `parkour2026`

A senha pode ser alterada em **Configurações → Conta Local**. Marque
"Manter conectado" no login para não precisar entrar de novo a cada sessão.

> Atenção: como o app é totalmente local, o login é uma trava de conveniência
> contra uso casual do computador — não é criptografia dos dados.

## Dados iniciais

O repositório público vem apenas com dados fictícios de demonstração. Cadastros
reais de alunos, responsáveis e leads devem ser feitos no navegador local ou
restaurados por backup JSON em **Configurações → Backup dos Dados**.

## Backup dos dados

Como tudo fica no `localStorage` do navegador, limpar os dados de navegação
apaga o painel. Em **Configurações → Backup dos Dados** você pode:

- **Exportar backup (.json)** — baixa um arquivo com alunos, leads, presenças,
  finanças e todo o CRM. Faça isso regularmente.
- **Importar backup** — restaura um arquivo exportado (substitui os dados atuais).
- **Zerar dados** — volta ao estado inicial de demonstração.

## CRM disponível

- Central comercial com prioridades, métricas e funil.
- Cadastro completo de leads com consentimento LGPD e bloqueio de contato.
- Pipeline Kanban com histórico e tarefas automáticas por etapa.
- Ficha individual com mensagens, notas, tarefas, experimentais e recomendação.
- Aulas experimentais com presença, feedback, plano e pedido de matrícula.
- Conversão de lead em aluno com checklist de onboarding.
- Inbox manual, templates de WhatsApp e abertura da conversa por `wa.me`.
- Relatórios de conversão, origens e disciplina comercial.

## Operação da academia

- Visão diária com check-in e remanejamento de turmas em drag-and-drop.
- Visão semanal de ocupação e grade de horários.
- Cadastro de alunos, professores e escala da equipe.
- Check-up do traceur: avaliação física, Big Six e árvore de habilidades.
- Pipeline de eventos, controle financeiro e relatórios em PDF.
- Aniversariantes do mês.

## WhatsApp conectado ao painel

O painel tem um servidor local de WhatsApp (`server/whatsapp-server.mjs`) que
usa o mesmo mecanismo do WhatsApp Web — roda inteiro neste computador, sem
serviços de terceiros.

Para conectar:

1. Rode `npm run whatsapp` em um terminal (ou `npm run dev:full` para subir
   painel + WhatsApp juntos).
2. No painel, abra **Conectar WhatsApp** e clique em **Gerar QR Code**.
3. No celular: WhatsApp → Configurações → Dispositivos conectados → Conectar
   dispositivo, e escaneie o QR.

A sessão fica salva em `server/.wa-session/` (fora do git) — nas próximas
vezes conecta sozinho. Com a sessão ativa, a Inbox envia mensagens direto pelo
painel; sem ela, continua o modo manual com histórico, templates e `wa.me`.

> Evite envios em massa: o WhatsApp pode restringir números com comportamento
> de spam. Use para responder leads que iniciaram contato.

## Desenvolvimento

```bash
npm install
npm run dev        # só o painel
npm run dev:full   # painel + servidor do WhatsApp
```

Para gerar a versão de produção (pasta `dist/`, pode ser servida por qualquer
servidor de arquivos estáticos, ou aberta com `npm run preview`):

```bash
npm run build
```
