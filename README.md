# Narrativas Inovadoras: Mobilidade Urbana

[English Version Below]

Este projeto é uma aplicação de **"Scrollytelling"** focada em mobilidade urbana, utilizando mapas interativos para contar uma história imersiva. Construído com **React**, **Vite**, **Mapbox GL JS** e **Framer Motion**.

---

### Visão Geral & Idiosincrasias do Projeto

O projeto usou varias ferramentas personalizadas para ajudar na iteração durante o desenvolvimento. Ao contrário de templates comuns, ele possui características únicas. 

**Nota Importante**: Todo o código fonte da aplicação reside no diretório `mobilidade/`.

1.  **Narrativa Baseada em Markdown (`mobilidade/src/narrative.md`)**:
    Todo o conteúdo textual e a estrutura da história são gerados dinamicamente a partir de um único arquivo Markdown (`mobilidade/src/narrative.md`). Isso permite que escritores alterem a história diretamente sem precisar saber programar.

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

#### 1. O Parser de Narrativa (`mobilidade/src/narrativeParser.js`)

Este utilitário lê o arquivo `mobilidade/src/narrative.md` e o converte em componentes React. Ele suporta sintaxes especiais:

*   **Cards de Texto**: Blocos de texto que flutuam sobre o mapa.
    *   Sintaxe: `[card:meu-id-unico]` (Opcional: se omitido, gera ID automático).
    *   Alinhamento: Alterna automaticamente entre esquerda e direita.
*   **Timestamp**: Adiciona um relógio digital ao card.
    *   Sintaxe: `[10:30]` no início do bloco de texto.
*   **Componentes React**: Injeta componentes complexos no meio da narrativa.
    *   Sintaxe: `[component:nome-do-componente]`
    *   Argumentos opcionais: Adcionando (), é possivel adiconar uma lista de argumentos de texto. Cada paragrafo markdown é um argumento, ou seja, os argumentos são separados com `\n\n`
    *   Exemplos: `[component:title](Mobilidade)`, `
    ```[component:moto-accident-simulation](
        Texto 1

        Texto 2

        Texto 3
    )```.
*   **Imagens**:
    *   Sintaxe: `@[caminho/para/imagem.png]`.

#### 2. Configuração da História (`mobilidade/src/storyConfig.js`)

Arquivo central que mapeia os **Capítulos** às **Coordenadas de Câmera**.
Cada chave é um ID de vista (ex: `'est-recife'`).
*   `camera`: Define `center`, `zoom`, `pitch`, `bearing`.
*   `triggers`: Lista de IDs de cards (do Markdown) que ativam esta vista.

#### 3. HUD de Desenvolvimento

Para ativá-lo, certifique-se de estar em ambiente de desenvolvimento (`npm run dev`). Ele aparece no canto superior da tela, permitindo copiar as coordenadas atuais para colar no `storyConfig.js`.

### Exemplos de Uso

**Adicionando um novo trecho à história:**

1.  Abra `mobilidade/src/narrative.md`.
2.  Escreva:
    ```markdown
    [card:minha-nova-cena]
    [08:00]
    Chegamos ao destino. A vista é impressionante.
    ```
3.  Vá para o navegador, posicione a câmera do mapa onde deseja.
4.  Copie os dados do HUD.
5.  Abra `mobilidade/src/storyConfig.js` e adicione:
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
