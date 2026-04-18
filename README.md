<div align="center">
  <img src="frontend/src/assets/fingo-icon.svg" alt="finGo Logo" width="120" />
</div>

<h1 align="center">finGo</h1>

<p align="center">
  <em>Transforme seus sonhos de viagem em metas reais através de inteligência financeira e conectividade global.</em>
</p>

<p align="center">
  <a href="https://usefingo.vercel.app/" target="_blank">
    <img src="https://img.shields.io/badge/Deploy-usefingo.vercel.app-00B2FF?style=for-the-badge&logo=vercel" alt="Deploy finGo">
  </a>
</p>

---

## 🎯 O Pitch: Por que o finGo?

Planejar uma viagem frequentemente envolve estimativas genéricas e planilhas estáticas, o que pode levar a frustrações e imprecisão. O **finGo** resolve essa complexidade ao substituir suposições por previsibilidade real pautada em dados. 

Mais do que um organizador, o software incorpora conectividade a dados globais dinâmicos (hospedagem, passagens aéreas e conversores cambiais) atrelados à **inteligência financeira**. O algoritmo do finGo ajuda o usuário a descobrir o custo da viagem e traça simuladores indicando quanto deve ser aportado mensalmente e qual o retorno esperado sobre as aplicações rendendo acima da poupança tradicional, transformando o "roteiro dos sonhos" em metas alcançáveis.

---

## 🎥 Demonstração Visual

Acesse o sistema por dentro e conheça a nossa interface em detalhes (Pitch Técnico):

[![finGo YouTube](https://img.shields.io/badge/YouTube-Assistir_Vídeo_do_Projeto-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://youtu.be/B1txXFHsWPs)

*(Você também pode assistir copiando e colando este link na barra de endereços: [https://youtu.be/B1txXFHsWPs](https://youtu.be/B1txXFHsWPs))*

---

## 🖼️ Galeria de Interface

Para garantir uma escalabilidade visual fluida e atraente, as interfaces foram construídas integrando Chart.js e componentes dinâmicos no Angular 18:

| | |
|:---:|:---:|
| <img src="frontend/src/assets/Captura%20de%20tela%202026-04-18%20001823.png" width="400" /><br><b>Home / Hero</b><br>Landing page com foco em conversão e manifesto do projeto. | <img src="frontend/src/assets/Captura%20de%20tela%202026-04-18%20001834.png" width="400" /><br><b>Central de Viagens</b><br>Dashboard para gerenciamento de múltiplos roteiros simultâneos. |
| <img src="frontend/src/assets/Captura%20de%20tela%202026-04-18%20001849.png" width="400" /><br><b>Busca de Destinos</b><br>Interface fluida para seleção de países via integração global. | <img src="frontend/src/assets/Captura%20de%20tela%202026-04-18%20001906.png" width="400" /><br><b>Planejador Financeiro</b><br>Projeção de metas com CDI e histórico de câmbio em tempo real. |
| <img src="frontend/src/assets/Captura%20de%20tela%202026-04-18%20001933.png" width="400" /><br><b>Hospedagem Recomendada</b><br>Listagem dinâmica de hotéis e tarifas via Booking.com. | <img src="frontend/src/assets/Captura%20de%20tela%202026-04-18%20002026.png" width="400" /><br><b>Detalhes da Estadia</b><br>Informações completas sobre as acomodações selecionadas. |
| <img src="frontend/src/assets/Captura%20de%20tela%202026-04-18%20002105.png" width="400" /><br><b>Motor de Voos</b><br>Pesquisa ativa de trechos aéreos e conexões via Kiwi API. | <img src="frontend/src/assets/Captura%20de%20tela%202026-04-18%20002147.png" width="400" /><br><b>Mapeamento de Pontos</b><br>Engine interativo (Leaflet) para exploração geográfica do destino. |
| <img src="frontend/src/assets/Captura%20de%20tela%202026-04-18%20002157.png" width="400" /><br><b>Curadoria de Experiências</b><br>Sugestões personalizadas de lazer, cultura e gastronomia. | <img src="frontend/src/assets/Captura%20de%20tela%202026-04-18%20002215.png" width="400" /><br><b>Arquitetura & Segurança</b><br>Seção informativa sobre a robustez e tecnologias do ecossistema. |

---

## ⚡ Diferenciais Técnicos

### 1. Motor de Cálculo de Investimento (Estratégia CDI)
A aplicação aplica regras avançadas de educação financeira diretamente no planejamento. O cálculo estima o rendimento através da integração ao CDI, adotando o conceito muito utilizado pelos brasileiros de "Caixinhas de Investimento". O percentual destinado pelo usuário aos aportes pode ser modificado dinamicamente alterando as projeções de quanto tempo o dinheiro irá render.

### 2. Cruzamento de Dados e Buscas Dinâmicas 
A arquitetura se diferencia por afastar-se radicalmente de dados *mockados*. Em seu núcleo há integrações contínuas de câmbios monetários (AwesomeAPI) atrelados a buscas inteligentes feitas nas APIs globais da **Booking** e da **Kiwi**, garantindo a melhor avaliação do orçamento para o roteiro traçado.

---

## 🛡️ Arquitetura e Segurança

- **Padrão Node/Express Model-View-Controller (MVC):** Aplicação separada de forma coerente e baseada em responsabilidade para manter a testabilidade em escala.
- **Camada Abstrata de Services:** Toda a pesada lógica de negócios e chamadas externas às complexas APIs não rodam nos Controllers. Estão unificadas na arquitetura através de uma camada independente de `Services` que garante alta escalabilidade.
- **Sessões Stateless e JSON Web Tokens (JWT):** Utilização de JWT a cada requisição de contexto visando entregar alto padrão de autorização, reduzindo overhead de estado salvos e garantindo acessos íntegros a rotas privadas.
- **Hashing de Alta Performance:** Medidas contra vazamento de senhas via bibliotecas criptográficas que aplicam Salt nas entradas confidenciais guardadas pelo MongoDB.

---

## 🛠️ Stack Tecnológica & API Ecosystem

| Tecnologia / API | Domínio | Aplicação do Componente no Projeto |
| :--- | :---: | :--- |
| **Angular 18** | Frontend | Alta performance alimentada por renderização híbrida e uso nativo dos recursos e atualizações dos **Signals**. |
| **Node.js & Express** | Backend | Core para o roteamento e orquestração de lógica entre os múltiplos provedores de dados. |
| **MongoDB** | Persistência | Banco NoSQL altamente flexível focado em latência baixa de Leitura/Escrita nas coleções de orçamentos e usuários. |
| **Leaflet (+ CARTO)** | Geo Maps | Engine interativo cartográfico com sistema visual de agrupamento de densidades (*Clustered Pins*). |
| **Chart.js** | Visualização| Biblioteca analítica focada em relatórios gráficos em tempo real de flutuações e metas. |
| **Kiwi & Booking API**| Motor de Viagem | Fontes reais dinâmicas que entregam disponibilidade verídica com hospedagens e voos aéreos pelo mundo. |
| **BrasilAPI / Awesome**| Financeiro | Encadeamento e atualização de moedas estrangeiras via taxa cambial e consumo da indexação interna (CDI). |
| **Geoapify & Travel** | Atrativos | Geoprocessamento para fornecer mapeamento de restaurantes comerciais, monumentos e passeios. |
| **REST Countries** | Info Global | Distribuição demográfica de precisão para uso orgânico nativo de interfaces de *Places* e Autocomplete. |

---

## 🚀 Como Rodar o finGo Localmente

Siga o passo-a-passo e prepare o ecossistema na sua máquina:

**1. Faça o Clone do Repositório**
```bash
git clone https://github.com/itsxjazz/travel-finance-planner.git
cd travel-finance-planner
```

**2. Instale o Backend e configure o `.env`**
Abra o diretório do backend, instale as dependências com NPM (ou o gestor preferido) e certifique-se de configurar suas variáveis super-globais.
```bash
cd backend
npm install
```
> **Aviso de Infraestrutura:** Cria um arquivo contendo estritamente um `.env` na raiz da pasta `backend/`. Especifique itens como sua `PORT`, a chave `MONGO_URI` em conexão de sua escolha e `JWT_SECRET`. Se não for setado, os micro-serviços não iniciarão com sucesso.

**3. Instale Dependências do Angular**
Abra uma segunda aba do seu terminal:
```bash
# Na rota base, entre no frontend
cd frontend
npm install
```

**4. Execute Tudo e Decole**
Primeiro suba os microserviços e o listener via porta local; depois empacote o frontend:
```bash
# Terminal (Backend)
npm run start # (ou npm run dev, se existir mapeamento do nodemon p/ watch)

# Terminal (Frontend)
ng serve
```