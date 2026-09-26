# Parkour Viçosa — CRM e gestão

Aplicação com servidor persistente, contas de administrador/treinador e WhatsApp Web via Baileys. O servidor guarda os dados da academia; todos os aparelhos autorizados acessam a mesma base. Não há senha padrão, dados de demonstração na base nova ou autenticação apenas no navegador.

## Abrir e usar

Na instalação original, o serviço local foi instalado e ativado. Em uma instalação nova, siga os passos abaixo e crie seu administrador. Credenciais locais nunca são distribuídas pelo repositório.

- Neste computador: **http://localhost:3901** depois da instalação do serviço.
- Outro aparelho na mesma rede: `http://IP-DO-SERVIDOR:3901` (o endereço pode mudar se o roteador trocar o IP).
- Primeiro acesso: criar o administrador no próprio computador servidor. O código de instalação é preenchido apenas numa conexão local direta. Pela rede, é necessário o código privado em `server/data/setup-token`.
- Em **Professores & Equipe**, cadastre professores e seus horários. Depois **Preferências Gerais → Acessos** permite criar contas, vincular professor, alterar senha e revogar acesso.
- Treinadores acessam operação diária, semana, avaliações e a própria senha. O servidor não entrega os valores financeiros, CRM comercial ou contatos privados. A permissão acadêmica é para a equipe da academia; o vínculo com professor não limita a apenas uma turma.
- Cadastre alunos em **CRM de Alunos** e marque seus horários fixos. Eles aparecerão nas turmas futuras; remanejamentos do dia são separados da grade fixa.
- No **Controle Financeiro**, gere as cobranças da competência com o vencimento desejado e registre recebimentos. Pagamentos parciais mantêm o saldo aberto. O painel registra o que você informa: não confirma Pix/cartões automaticamente.

## WhatsApp

Em **Conectar WhatsApp**, escolha **Usar QR Code** ou **Conectar pelo número**. No segundo modo, informe o WhatsApp da academia com DDD, solicite o código e digite-o no celular em **Dispositivos conectados → Conectar dispositivo → Conectar com número de telefone**. O código por número vale por um minuto e só pode ser solicitado uma vez por minuto. Para QR, clique em **Gerar QR Code**. No celular da academia, abra **Dispositivos conectados → Conectar dispositivo** e leia o QR. A tela mostra somente o QR recebido do WhatsApp, retira códigos expirados e acompanha a conexão continuamente. Depois de escanear ou digitar o código, aguarde **Conectado**, o número do telefone e a data da confirmação. O estado **Confirmando vínculo** ainda não permite enviar mensagens. Se o código vencer sem confirmação, a tentativa termina e você pode iniciar outra; não há repetição silenciosa indefinida. A sessão é salva no servidor e tenta reconectar após interrupções. Se a sessão estiver inválida, use **Reiniciar sessão** e leia o novo código; essa ação exige novo pareamento, mas preserva os cadastros e o histórico do CRM. A Inbox recebe mensagens novas individuais e cria leads automaticamente quando necessário. Respostas na Inbox ou ficha do lead são enviadas pela conexão; falhas nunca são apresentadas como envio bem-sucedido. Os recibos de entrega/leitura dependem do WhatsApp.

A integração é não oficial, via Baileys/WhatsApp Web. Mudanças no WhatsApp podem exigir atualização. O servidor precisa ficar ligado e conectado à internet. Receber uma mensagem não é autorização geral para campanhas. Envios são individuais. Mídias recebidas são identificadas no histórico; a reprodução de áudio e arquivos ainda deve ser feita pelo WhatsApp no celular. O histórico anterior ao pareamento não é importado em massa.

Se o WhatsApp exigir uma etapa adicional por chave de acesso que a biblioteca não suporta, o painel informa essa limitação e encerra a tentativa. A alternativa por número também depende da aprovação do WhatsApp no celular.

**A validação de ponta a ponta exige o titular parear o telefone e confirmar uma mensagem real de entrada e saída. Testes automatizados não substituem essa etapa.**

## Dados, sincronização e recuperação

- Dados operacionais: `server/data/crm-data.json`; contas e sessões: arquivos privados no mesmo diretório; sessão WhatsApp: `server/.wa-session/`. Essas pastas são ignoradas pelo Git.
- A gravação é atômica, com revisões e backups anteriores. Não execute duas instâncias do servidor usando a mesma pasta de dados.
- A tela mostra quando está salvando, salva ou desconectada. Mantenha a aba aberta quando houver alterações não salvas. Alterações pendentes são preservadas na sessão deste navegador por conta e recuperadas ao recarregar. Alterações concorrentes em campos distintos são mescladas; conflitos no mesmo campo exigem escolha explícita e permitem baixar as alterações locais.
- **Preferências Gerais → Backup** exporta ou restaura dados pelo servidor. Restauração requer administrador, validação e revisão atual. Baixe uma cópia e guarde fora deste computador; cópias locais não protegem contra perda do disco.
- Dados antigos do navegador são preservados e podem ser baixados em Preferências para revisão e importação. Não são misturados automaticamente com a nova base.
- Para restaurar toda instalação após falha de disco, restaure uma cópia privada das pastas de dados e sessão junto ao app, com o serviço parado. Para recuperar somente cadastros, use a importação do painel. Contas/sessões não são incluídas no backup operacional baixado.

## Instalação / desenvolvimento

Requer Linux com Node.js 24, npm e `flock` (pacote `util-linux`, normalmente já instalado). O bloqueio do kernel impede duas instâncias de gravarem na mesma base e é liberado automaticamente após um crash ou reinício. Na pasta do projeto:

```sh
npm ci
npm run build
npm start
```

Para manter rodando e iniciar automaticamente no Linux:

```sh
./scripts/install-service.sh
```

O serviço é `parkour-vicosa.service` do usuário, reinicia em falhas e guarda logs no journal. Para atualizar: `npm ci`, `npm run build`, `systemctl --user restart parkour-vicosa.service`. `scripts/start-panel.sh` aguarda a resposta válida do servidor antes de abrir o painel. O instalador reinicia o serviço já existente para aplicar a atualização e não desiste permanentemente se o disco externo montar tarde. Para desligar: `systemctl --user stop parkour-vicosa.service`; para desativar inicialização: `systemctl --user disable parkour-vicosa.service`.

Desenvolvimento: `npm run dev` inicia Vite e servidor; pare o serviço antes ou use `CRM_EXTERNAL_SERVER=1 npm run dev` para usar o servidor existente. Todas as rotas `/api` são encaminhadas pelo proxy.

Verificação: `npm test`, `npm run build`, `npm run lint`. Os testes usam pastas temporárias e não enviam mensagens reais.

## Acesso fora da academia

Uma publicação apenas estática (incluindo o antigo frontend da Vercel) não mantém este servidor WhatsApp nem compartilha os dados. Para acesso externo permanente é necessário hospedar o servidor com disco persistente, domínio HTTPS e serviço contínuo, ou usar uma rede privada autenticada. Não exponha a porta HTTP diretamente na internet. O acesso externo não está ativado apenas por compilar o app; configure a hospedagem/rede escolhida e valide de outro aparelho antes de divulgar um endereço.

Variáveis opcionais: `HOST`, `WHATSAPP_PORT`, `DATA_DIR`, `WA_SESSION_DIR`, `CRM_ALLOWED_ORIGINS`, `COOKIE_SECURE`, `WA_WEB_VERSION`. O serviço lê overrides locais opcionais de `server/data/service.env`, preservados ao reinstalar e ignorados pelo Git. `WA_WEB_VERSION` aceita três inteiros separados por ponto e fixa a versão de comunicação em todas as reconexões; sem ela, usa o padrão da biblioteca. Alterar esse valor é um teste de compatibilidade, não prova de pareamento. Não há atualização de protocolo automática a cada tentativa. Em um proxy HTTPS confiável, use `COOKIE_SECURE=true`. Para proxy HTTPS, verifique as configurações de cookie e origem no servidor. Nunca coloque senhas/tokens do servidor em variáveis `VITE_*` ou no repositório.


## Testes de navegador e conexão real

`node tests/browser-smoke.mjs` requer Playwright instalado ou `PLAYWRIGHT_MODULE` apontando para seu módulo. `CHROME_PATH` permite escolher o executável do navegador. Ele cria e remove dados de teste locais.

`node tests/whatsapp-connect-smoke.mjs` é opcional e precisa de internet. Testa somente a geração de QR numa sessão temporária; não pareia nenhum aparelho nem envia mensagens. A versão do Baileys está fixada em 7.0.0-rc14, que passou nessa verificação.

Consulte `docs/VALIDACAO-E-PENDENCIAS.md` para o estado real da ativação e da revisão independente. A existência de scripts de instalação não significa que o serviço permanente já esteja ativo.
