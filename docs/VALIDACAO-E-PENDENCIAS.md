# Validação do dashboard e pendências de ativação

## Avaliação independente

Nota inicial: **3,0/10 de prontidão para uso real**. Os avaliadores encontraram APIs abertas, login apenas local, sincronização desconectada, envios falsamente confirmados, erros em pagamentos parciais, horários fictícios e restauração frágil. A revisão original foi interrompida pelo limite de uso. Em 19/09/2026, uma nova revisão independente do WhatsApp começou em **4/10 operacional**. As falhas e a reavaliação desta rodada estão registradas abaixo; testes de código não equivalem à operação confirmada com o telefone.

## Correções implementadas

- Contas no servidor, senha com scrypt, cookie HttpOnly, CSRF, perfis administrador/treinador, revogação e troca de senha.
- Dados centralizados, gravação atômica, backups de revisões e bloqueio de duas instâncias na mesma base.
- Sincronização entre sessões com merge de alterações independentes, conflitos explícitos, preservação de exclusões e de alterações durante requisições. Pagamentos concorrentes não são mesclados silenciosamente.
- Alterações não salvas preservadas na sessão do navegador por conta; recuperadas após recarregar. Saída aguarda salvamento.
- Atendimento real nas duas telas de CRM. IDs de envio persistentes, recibos e texto preservado em falha. Erros após tentativa são apresentados como envio não confirmado; não induzem reenvio automático.
- Baileys atualizado de 7.0.0-rc13 para 7.0.0-rc14: o teste real com rc13 falhou com 405; rc14 gerou QR válido.
- Cobranças mensais sem duplicação, pagamentos parciais com saldo e recibos, bloqueio de recebimento acima do saldo e preservação de dívidas anteriores.
- Horários fixos vinculados ao aluno, turmas sem IDs de demonstração, backup antigo/pendente compatível, cadastros sem datas de nascimento ou valores inventados.
- Treinador sem financeiro, CRM, senhas de outros usuários ou controle do WhatsApp. Escopo acadêmico é a academia toda; vínculo com professor não restringe turmas.

## Evidências executadas

1. `npm test`: 32 testes aprovados, incluindo APIs, CSRF, RBAC, gravação/backup, revogação, envio simulado idempotente, recibos, inbound, falhas, bloqueio de contato, recuperação após reinício e versões antigas de backup.
2. `npm run build` e `npm run lint`: aprovados. O build informa aviso de tamanho de um pacote, sem impedir execução.
3. `tests/browser-smoke.mjs`: aprovados setup, cadastro, horários fixos, recarregamento, pagamentos parciais, duas sessões, queda de rede/recuperação, professor/treinador, restrições de acesso e logout. As 19 seções abriram sem erros JavaScript. Desktop e celular foram inspecionados.
4. `tests/whatsapp-connect-smoke.mjs`: geração de QR real aprovada com a biblioteca rc14. Sessão temporária encerrada e removida. Nenhum telefone foi pareado; nenhuma mensagem real foi enviada.

Os testes de credenciais e ciclo da conexão usam pastas temporárias no próprio volume da instalação; os demais testes usam diretórios temporários isolados. Os dados de exemplo criados pelos testes não são cadastros da academia.

## Ativação e pendências

- Serviço permanente e conta inicial: CONCLUÍDOS após o usuário pedir para continuar e finalizar a configuração apresentada. Serviço parkour-vicosa.service habilitado e ativo; conta danilo criada com senha exclusiva em server/data/ACESSO-INICIAL.txt (privado, ignorado pelo Git). Painel verificado em http://localhost:3901. O bloqueio inicial foi resolvido com a autorização posterior; um erro de caminho com espaços na configuração do serviço também foi corrigido.
- Pareamento do celular da academia e confirmação de entrada/saída reais. Isso depende do titular.
- Acesso fora da academia: o usuário ainda não escolheu hospedagem ou rede privada. A publicação estática anterior não substitui o servidor.
- Confirmação operacional após o novo pareamento, sem aumento artificial da nota.
- Reprodução de anexos/áudios e envio de mídia ficam no WhatsApp do telefone. A Inbox atual opera texto e identifica mídias recebidas.

## Próximo passo

O titular entra no painel com a credencial privada e conecta seu telefone em Conectar WhatsApp. Confirmar mensagem de entrada e saída somente com destinatário autorizado. A reavaliação independente está registrada na seção abaixo. Não inventar pareamento, entrega de mensagem ou nota de avaliação.

Atualizações de segurança compatíveis aplicadas: a auditoria de dependências retornou zero vulnerabilidades. Build e lint aprovados depois dessas atualizações.

## Correção da falha relatada em 19/09/2026

O erro real era `ENOTEMPTY` na remoção da pasta da sessão (`rmdir`). Os registros locais mostraram um pareamento anterior que chegou a conectar, seguido de falha ao desconectar e de recusa da sessão (401). O desenho na tela de erro era um ícone estático, inadequadamente apresentado como se fosse um QR.

Correções:

- Fila única controla conectar, desconectar e reconectar; as credenciais são drenadas antes do reinício 515 após escanear.
- Armazenamento é selado, produtores antigos são removidos e gravações tardias não recriam a sessão.
- Reinício troca o nome da pasta antiga antes de removê-la, com tentativas de limpeza; pastas desativadas também são ignoradas pelo Git.
- Falhas de gravação e reinício preservam estado de erro. Um erro de QR antigo não encerra uma conexão nova.
- QR apenas em resposta a evento do WhatsApp; intervalo de renovação de 20 segundos, validade visual conservadora de 18 segundos e retirada no próprio navegador mesmo sem servidor.
- Interface acompanha todos os estados, permite cancelar durante conexão e reiniciar uma sessão inválida. Instruções não exigem comandos técnicos.

Evidência local: o serviço corrigido foi reiniciado; a sessão recusada pelo WhatsApp foi removida sem ENOTEMPTY. A interface instalada em localhost:3901 passou a exibir um QR real recebido do WhatsApp. Não se copiou um QR de teste para produção.

Os dez testes novos exercitam armazenamento no volume da instalação, flush com falha, drenagem antes de 515, callbacks antigos, cancelamento, reset concorrente, QR tardio e falha ao reiniciar. Os testes do navegador verificam atualização após conectado/erro e expiração do QR. O usuário foi solicitado a escanear o código no próprio painel. Ainda não há confirmação de novo pareamento, persistência após reiniciar com telefone pareado, nem mensagem real recebida/enviada após esta correção.

### Resultado da reavaliação independente

- Prontidão operacional do WhatsApp: **4/10 → 8/10** nesta rodada. Nota histórica do aplicativo geral: **3/10**.
- Qualidade da correção: **9/10**, dimensão separada; não é aprovação operacional.
- O avaliador confirmou independentemente os **10 testes específicos aprovados** e não encontrou outro defeito bloqueante no fluxo corrigido.
- Para chegar a 9/10 operacional: titular parear novamente, confirmar reconexão após reiniciar o serviço e troca real de mensagens. Essas evidências seguem pendentes. Não declarar 100% funcionando enquanto faltarem.
- Teste adicional do navegador aprovado: acompanhamento após conectado/erro, recuperação acessível, expiração e retirada do QR quando há falha de rede.

## Nova rodada — 26/09/2026

Relato do titular: o QR é lido, mas o WhatsApp do celular não avança. Os registros disponíveis indicavam referências de QR esgotadas (408), sem confirmação de pareamento. Isso não comprova que o QR foi inventado nem que o protocolo foi a causa. O painel local abriu a tela de login durante o diagnóstico; a conta existente e a leitura autenticada das 13 coleções responderam 200.

Correções ativadas:

- Bloqueio de instância por `flock`, recuperável após crash e reinício, com migração cautelosa do bloqueio antigo. A revisão reproduziu o bloqueio indevido causado pelo reaproveitamento de PID.
- Serviço tenta novamente após montagem tardia do disco externo; instalador reinicia a versão ativa; abertura aguarda o servidor estar pronto.
- Datas opcionais de próxima ação/follow-up podem ser apagadas sem lançar erro de JavaScript.
- Alternativa real de pareamento pelo número, acionada somente após o socket estar pronto; código é recebido da biblioteca após envio da solicitação ao WhatsApp. Código disponível, celular reconhecido e conexão confirmada são estados diferentes.
- Primeiro QR tem janela maior (55 segundos visíveis, dentro dos 60 da biblioteca); os seguintes são retirados antes de expirar. Código não confirmado encerra a tentativa em vez de iniciar um loop de reconexões.
- Detecção específica de exigência adicional por chave de acesso, sem registrar conteúdo sensível. Exibe limitação real em vez de conexão falsa.
- Configuração explícita de protocolo `WA_WEB_VERSION`, validada e estável em reconexões. Na instalação local, foi fixada `2.3000.1048570357`, obtida de WhatsApp Web em 26/09/2026. O ensaio de conexão real gerou QR; isso ainda não demonstra que o celular aceitará o vínculo. Configuração local fica fora do Git.

Validação: 46 testes automatizados aprovados; build e lint aprovados (somente aviso de tamanho de bundle). Serviço atualizado e ativo; login existente e leitura do CRM verificados novamente após a instalação. A tela de login também foi verificada no navegador do usuário.

A revisão inicial desta rodada atribuiu 7/10 à disponibilidade local. A nota operacional de WhatsApp não pode ser elevada pela presença de QR ou por testes simulados: ainda falta confirmar pareamento, reconexão com telefone vinculado e mensagens reais. O número solicitado ao titular para conduzir o ensaio por código ainda não foi informado.

Referências de compatibilidade: [documentação de conexão](https://github.com/WhiskeySockets/baileys.wiki-site/blob/main/docs/socket/connecting.md), [configuração de protocolo](https://github.com/WhiskeySockets/baileys.wiki-site/blob/main/docs/socket/configuration.md), [relato de versão/408](https://github.com/WhiskeySockets/Baileys/issues/2777), [relato de verificação por chave de acesso](https://github.com/WhiskeySockets/Baileys/issues/2672). Os relatos são hipóteses de diagnóstico, não confirmação da causa nesta instalação.

### Reavaliação final desta rodada

O avaliador independente atribuiu **7/10 → 9/10 à confiabilidade da inicialização e disponibilidade do painel**. Confirmou correções de bloqueio, retomada após falhas, atualização do serviço e datas opcionais, sem novo bloqueante identificado. Essa nota não é uma aprovação operacional do WhatsApp.

A suíte final passou com **46/46 testes**; o teste de navegador passou por cadastro, recebimentos parciais, duas sessões, recuperação de alterações, criação/login/restrições de treinador, interface de pareamento por número, retirada de códigos vencidos e todas as 19 telas, em desktop e celular. Serviço instalado mostrou ActiveState=active, SubState=running e resposta autenticada 200 para o CRM. O QR da versão de protocolo fixada também foi observado no serviço instalado, sem confirmar pareamento.

**Pendência real:** vínculo no telefone, reconexão depois de reiniciar com sessão pareada e mensagem real de entrada/saída. Não foram realizadas mensagens para clientes durante o trabalho. O ensaio por número pode ser iniciado pelo titular no painel, sem informar o número nesta conversa.
