# Ficha da Play Store e Segurança dos dados (rascunho)

Rascunho para o Johny revisar antes de preencher o Play Console. O que está entre colchetes
`[...]` é decisão dele. Se o app mudar o que coleta, atualize este arquivo, a política
(`quadra-landing/public/privacidade.html`) e o formulário no Console juntos.

## Ficha

| Campo | Rascunho |
| --- | --- |
| Nome do app (30) | Quadra: partidas de vôlei |
| Descrição curta (80) | Organize partidas de vôlei, monte times equilibrados e suba no ranking. |
| Categoria | Esportes |
| Tags | Vôlei, esportes, partidas |
| E-mail de contato | contact@quadra-volei.app |
| Site | https://quadra-volei.app |
| Política de privacidade | https://quadra-volei.app/privacidade |
| Anúncios | Não tem |
| Compras no app | Não tem |

### Descrição completa

> Chega de lista no WhatsApp. O Quadra organiza o seu vôlei do começo ao fim.
>
> **Organize** partidas avulsas ou recorrentes, com local no mapa, horário, vagas e preço.
> Os jogadores confirmam presença pelo app, a lista de espera anda sozinha e você convida
> quem quiser por link.
>
> **Times equilibrados** montados pelo nível de cada jogador, sem discussão.
>
> **Jogo ao vivo**: placar por set, que todo mundo acompanha em tempo real.
>
> **Sua carta de jogador**: cada partida conta. Presença, vitórias e votos de MVP viram
> pontos, nível e ranking. Compartilhe sua carta com os amigos.
>
> **Encontre jogo perto de você**: veja no mapa as partidas abertas por perto e entre nas
> que têm vaga.
>
> **Rede**: siga amigos, veja quem jogou e quem foi MVP, poste fotos dos jogos.
>
> Grátis e sem anúncios.

### Material gráfico (falta fazer)

- Ícone 512 × 512 (a partir de `assets/icon.png`).
- Imagem de destaque 1024 × 500.
- Pelo menos 2 capturas de tela de celular (sugestão: Home, partida com times, placar ao
  vivo, carta, mapa).

## Classificação de conteúdo (questionário IARC)

- Categoria: app de referência/social, não é jogo.
- Usuários interagem entre si: **sim** (posts, comentários, perfis públicos).
- Conteúdo gerado pelo usuário: **sim**, com denúncia, bloqueio e filtro automático de
  fotos impróprias (API DECISIONS do item 2.6).
- Compartilha localização com outros usuários: **não** (só o local das partidas que o
  organizador publica).
- Violência, sexo, linguagem, drogas, apostas: **não**.

## Público-alvo

[Idade mínima a definir; a política e os termos também dependem disso.] Se for 18+, marcar
só a faixa 18+. Se aceitar menores, a Play exige cumprir a política de Famílias.

## Acesso para a revisão do app

O login é por celular (SMS) ou Google. Para a revisão, cadastrar no Firebase um número de
teste com código fixo e informar no Console em "Acesso ao app" (o revisor não recebe SMS).
[Johny: criar o número de teste do revisor.]

## Segurança dos dados

Respostas gerais:

| Pergunta | Resposta |
| --- | --- |
| Coleta ou compartilha algum dado do tipo exigido? | Sim |
| Todos os dados são criptografados em trânsito? | Sim (HTTPS) |
| O usuário pode pedir a exclusão dos dados? | Sim: no app (Configurações → Excluir conta) e em https://quadra-volei.app/excluir-conta |
| Compartilha dados com terceiros? | Não. Os provedores (Render, Neon, Cloudflare, Google/Firebase, Expo) processam em nome do Quadra, o que a Play não conta como compartilhamento. |

Dados coletados (nenhum é usado para publicidade ou vendido):

| Tipo na Play | O que é no Quadra | Obrigatório? | Finalidade |
| --- | --- | --- | --- |
| Local → Local exato | Posição do aparelho para buscar partidas perto (processada na hora, não fica guardada) | Opcional | Funcionalidade do app |
| Informações pessoais → Nome | Nome, sobrenome, @usuário | Obrigatório | Funcionalidade do app, Gerenciamento da conta |
| Informações pessoais → Endereço de e-mail | E-mail da conta Google (só no login com Google) | Opcional | Gerenciamento da conta |
| Informações pessoais → Número de telefone | Celular do login por SMS | Opcional | Gerenciamento da conta, Prevenção de fraudes e segurança |
| Informações pessoais → IDs do usuário | ID da conta | Obrigatório | Funcionalidade do app, Gerenciamento da conta |
| Informações pessoais → Outras informações | Data de nascimento, posição, modalidade, nível declarado | [Confirmar quais são obrigatórios no onboarding] | Funcionalidade do app |
| Fotos e vídeos → Fotos | Foto de perfil, capa da partida, fotos de posts | Opcional | Funcionalidade do app |
| Atividade no app → Interações no app | Presenças, times, placar, votos de MVP, curtidas, quem segue | Obrigatório | Funcionalidade do app |
| Atividade no app → Outro conteúdo gerado pelo usuário | Posts, comentários, denúncias, feedback | Opcional | Funcionalidade do app, Prevenção de fraudes e segurança |
| Informações e desempenho do app → Diagnósticos | Versão do app e do sistema enviadas no feedback; [relatórios de erro, se o Sentry for ligado] | Opcional | Análise, Funcionalidade do app |
| IDs do dispositivo ou outros IDs | Token de notificação e identificador do aparelho usado na sessão | Obrigatório | Funcionalidade do app, Prevenção de fraudes e segurança |

Não coletados: dados financeiros, de saúde, contatos, agenda, mensagens SMS, arquivos,
áudio, histórico de navegação, apps instalados.

## Permissões do Android e por quê

Para a declaração de permissões e para responder a revisão (DECISIONS #136):

| Permissão | Por quê |
| --- | --- |
| Localização (exata e aproximada) | Mostrar partidas perto e as distâncias; pedida com explicação na entrada do app |
| Notificações | Avisos das partidas |
| Internet / estado da rede | Falar com a API |
| `RECEIVE_BOOT_COMPLETED`, `VIBRATE`, `WAKE_LOCK`, `FOREGROUND_SERVICE` | Entrega das notificações (Firebase / expo-notifications) |

Câmera, microfone, biometria e sobreposição de tela foram removidas: o app não usa.
