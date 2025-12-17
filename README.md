# Narrativas Inovadoras: Mobilidade Urbana

[English Version Below]

Este projeto é uma aplicação de **"Scrollytelling"** focada em mobilidade urbana, utilizando mapas interativos para contar uma história imersiva. Construído com **React**, **Vite**, **Mapbox GL JS** e **Framer Motion**.

---

### Visão Geral & Idiosincrasias do Projeto

O projeto usou varias ferramentas personalizadas para ajudar na iteração durante o desenvolvimento. Ao contrário de templates comuns, ele possui características únicas. 

**Nota Importante**: Todo o código fonte da aplicação reside no diretório `mobilidade/`.

1.  **Narrativa via Google Docs**:
    Todo o conteúdo textual e a estrutura da história são gerados dinamicamente a partir de um documento Google Docs. Isso permite que escritores alterem a história diretamente sem precisar saber programar, com atualizações em tempo real.

2.  **Sistema de Gatilhos por Card**:
    A movimentação do mapa (câmera) é controlada por **Gatilhos (Triggers)**.
    - O no texto define-se o ID do card
    - O `storyConfig.js` define o ponto de vista para o qual a câmera vai transicionar quando esse ID é ativado.
    - Isso permite refinar os ângulos de câmera independentemente do texto.

3.  **Ferramenta de Desenvolvimento Interna (DevCameraHUD)**:
    Para facilitar a configuração da câmera em diferentes etapas (Latitude, Longitude, Zoom, Pitch, Bearing), desenvolvemos um HUD que mostra os dados da câmera em tempo real e permite a cópia desses dados com um clique.

4.  **Prólogo/Tela de Alarme**:
    A aplicação inicia com uma tela de "Alarme" (`AlarmScreen`), imergindo o usuário na rotina matinal antes de apresentar o mapa.

### Ferramentas Internas

#### 1. Gestão de Conteúdo (Google Docs)

A narrativa é editada diretamente em um documento do Google Docs e buscada em tempo real na versão de deploy. Isso permite ajustes no texto sem necessidade de alterar o código. A estrutura da história é definida pela **Formatação do Google Docs**, enquanto elementos específicos usam sintaxe de texto cru.

*   **Estrutura (Cards e Componentes)**:
    *   Para criar um novo Card ou Componente, use a formatação **Título 3 (Heading 3)** do Google Docs.
    *   O texto desse título será usado como o ID ou Nome do componente (ex: `card:meu-id` ou `nome-do-componente`).
    *   **Texto Corrido**: Para blocos de texto centralizados (não cards), use o título `text` (ou `text:id`).
*   **Conteúdo**:
    *   Todo texto entre um Título 3 e o próximo pertence àquele card/componente.
*   **Sintaxe Especial (Texto Cru)**:
    *   **Timestamp**: Escreva `[10:30]` diretamente no texto para adicionar o relógio.
    *   **Argumentos de Componente**: Parágrafos de texto normal funcionam como argumentos.
    *   **Imagens**: Use a sintaxe `@[caminho/para/imagem.png]`.

#### 2. Configuração da História (`mobilidade/src/storyConfig.js`)

Arquivo central que mapeia os **Capítulos** às **Coordenadas de Câmera**.
Cada chave é um ID de vista (ex: `'est-recife'`).
*   `camera`: Define `center`, `zoom`, `pitch`, `bearing`.
*   `triggers`: Lista de IDs de cards (do Markdown) que ativam esta vista.

#### 3. HUD de Desenvolvimento

Para ativá-lo, certifique-se de estar em ambiente de desenvolvimento (`npm run dev`). Ele aparece no canto superior da tela, permitindo copiar as coordenadas atuais para colar no `storyConfig.js`.

### Exemplos de Uso

**Adicionando um novo trecho à história:**

1.  Abra o **Google Doc da narrativa**.
2.  Crie uma nova linha e aplique o estilo **Título 3**.
3.  Escreva o ID do card no título: `card:minha-nova-cena`.
4.  Abaixo, em **Texto Normal**, escreva:
    ```markdown
    [08:00]
    Chegamos ao destino. A vista é impressionante.
    ```
5.  Vá para o navegador, posicione a câmera do mapa onde deseja.
6.  Copie os dados do HUD.
7.  Abra `mobilidade/src/storyConfig.js` e adicione:

    ```javascript
    'novo-capitulo': {
        camera: { center: [...], zoom: 15, pitch: 60, bearing: 0 },
        triggers: ['card-minha-nova-cena']
    }
    ```

---

## Setup & Running

1.  **Navigate to Project Directory**:
    ```bash
    cd mobilidade
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Run Development Server**:
    ```bash
    npm run dev
    ```

4.  **Build for Production**:
    ```bash
    npm run build
    ```
