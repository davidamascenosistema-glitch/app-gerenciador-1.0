# Plano de Implementação: Funcionalidade "Enviar Feedback"

Este plano define a arquitetura, fluxo de dados e interface para permitir que os usuários enviem feedbacks (Bugs, Sugestões e Elogios) diretamente da tela inicial, com envio automatizado para um serviço de formulários gratuito (Formspree) e fallback de suporte.

---

## 1. Visão Geral da Arquitetura

1. **Gatilho de Abertura:**
   - Conectar o botão existente **"Enviar Feedback"** no cabeçalho da `HomeScreen.tsx` para abrir o modal de feedback (atualmente exibe toast "EM BREVE").

2. **Interface do Modal de Feedback (`FeedbackModal.tsx` ou integrado em `HomeScreen`):**
   - **Seleção de Categoria (Tabs/Pílulas com ícones visuais):**
     - 🐞 **Bug / Problema** (vermelho/âmbar com ícone de alerta)
     - 💡 **Sugestão de Melhoria** (azul/índigo com ícone de lâmpada)
     - ⭐ **Elogio** (esmeralda/dourado com ícone de estrela/coração)
   - **Campo de Mensagem:** Textarea com contador de caracteres, validação de preenchimento mínimo e placeholder contextual conforme a categoria selecionada.
   - **Identificação do Usuário:** Inclusão automática do e-mail/nome do usuário logado (Supabase auth) para que o desenvolvedor possa responder.
   - **Feedback Visual:** Estado de carregamento com spinner (`Loader2`), mensagem de sucesso animada com check e fechamento suave.

3. **Destino e Mecanismo de Envio:**
   - **Rota no Backend (`/api/feedback` em `server.ts`):**
     - Recebe a requisição POST com `{ category, message, email, name, metadata }`.
     - Encaminha para o endpoint de formulário gratuito (**Formspree** via ID/URL configurável ou default de serviço).
     - Inclui timestamp, informações da sessão e versão da aplicação.
     - Fallback resiliente: caso o serviço externo falhe ou não tenha chave configurada em desenvolvimento, registra em log seguro do servidor e retorna sucesso com confirmação, com opção de acionar `mailto:davidamascenosistema@gmail.com` pré-preenchido se o usuário preferir envio direto por e-mail.

---

## 2. Etapas de Execução

- [ ] **Etapa 1: Endpoint de API `/api/feedback` no `server.ts`**
  - Criar rota `POST /api/feedback` com validação de payload (categoria e mensagem não vazias).
  - Integrar envio HTTP para Formspree (`https://formspree.io/f/...`) ou envio direto com cabeçalhos apropriados.
  - Implementar resposta com tratamento de erros amigável e logs estruturados.

- [ ] **Etapa 2: Componente e Formulário de Feedback (`FeedbackModal`)**
  - Refatorar o modal de feedback na `HomeScreen.tsx` (ou componente modular dedicado):
    - Seletor de Categoria interativo (Bug, Sugestão, Elogio).
    - Campo de texto estilizado no padrão Tailwind do app.
    - Exibição do e-mail de resposta vinculado à conta do usuário.
    - Estados visuais: Normal, Enviando (Loading), Sucesso e Erro com tentativa alternativa.

- [ ] **Etapa 3: Integração no Botão da Tela Inicial**
  - Atualizar o botão existente no cabeçalho da `HomeScreen.tsx` para abrir o modal via `setIsFeedbackModalOpen(true)`.

- [ ] **Etapa 4: Validação e Compilação**
  - Executar `compile_applet` e testar a abertura, seleção de categorias e envio do feedback.
