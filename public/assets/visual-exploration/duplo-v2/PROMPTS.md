# Duplo: roteiro visual e prompts de producao

Status: exploracao local. Estes arquivos **nao** substituem o hero atual e nao foram publicados. Foram gerados como imagens estaticas com o ImageGen integrado, usando o Duplo existente como referencia visual. O modelo exato do gerador nao e selecionavel nesta ferramenta.

## Direcao

O efeito deve parecer uma demonstracao de produto, nao uma colagem. Um burger real domina a cena; seus ingredientes se separam em profundidade com movimento contido, revelam textura em dois closes e voltam a formar o produto. A tipografia e a interface permanecem secundarias. Nada de neon, particulas, flashes, personagens ou elementos decorativos que concorram com a comida.

**Identidade fixa para todo o lote:** Duplo BurgerC com pao brioche dourado, dois blends bovinos de 90 g com cheddar derretido, cebola caramelizada no vinho, bacon em cubos e maionese defumada com cebolinha. Foto de comida realista, camera frontal em tres quartos com um pouco da superficie superior visivel, luz principal quente do alto a esquerda, preenchimento neutro a direita e contraste controlado. A largura aparente das sete camadas deve ser calibrada antes da animacao. O fundo transparente das camadas precisa ser alfa verdadeiro.

## Roteiro de rolagem

### 1. Presenca (0 a 20%)

O Duplo inteiro aparece em primeiro plano, centralizado e nitido. O fundo grafite nao interfere na leitura do produto. Nome, preco real vindo do catalogo e um comando claro para personalizar ficam proximos, sem texto descritivo longo. A imagem [01-duplo-master.png](./01-duplo-master.png) e a referencia desta cena. A proxima secao do cardapio continua parcialmente visivel no primeiro viewport.

### 2. Abertura (20 a 55%)

O produto se separa de cima para baixo: [pao superior](./02-brioche-top.png), [maionese](./03-smoked-mayo.png), [cebola](./04-caramelized-onion.png), [bacon](./05-diced-bacon.png), [primeiro blend](./06-patty-cheddar-top.png), [segundo blend](./07-patty-cheddar-bottom.png) e [base](./08-brioche-bottom.png). Cada elemento e um objeto inteiro, nunca uma faixa recortada de uma foto. A trajetoria e curta, vertical e ligeiramente escalonada; sombras suaves entre camadas comunicam profundidade. A camera nao gira, porque imagens 2D nao oferecem faces laterais coerentes. Os rotulos aparecem apenas quando houver espaco e nao devem cobrir a comida.

### 3. Textura (55 a 75%)

Uma passagem curta revela [carne e cheddar](./09-macro-cheddar.png) e depois [bacon e cebola](./10-macro-bacon-onion.png). Cada close ocupa o quadro sem vir em um card. A interface pode mostrar uma informacao objetiva de cada ingrediente, mas nao slogans sobrepostos na imagem. No mobile, usar somente um close ou uma duracao menor para nao atrasar o cardapio.

### 4. Montagem e pedido (75 a 100%)

As camadas convergem e a imagem final faz uma transicao curta para o master. Essa transicao esconde pequenas diferencas inevitaveis entre geracoes separadas. O botao **Montar meu Duplo** abre a personalizacao que ja existe. A secao nao pode prender o scroll indefinidamente; com `prefers-reduced-motion`, mostrar a imagem inteira e o botao sem animacao.

## Prompts dos dez assets

Instrucoes comuns aos assets 02 a 08: usar `01-duplo-master.png` como **referencia de identidade**, manter a mesma perspectiva frontal em tres quartos, escala aproximada, luz e grade de cor. Produzir PNG quadrado com fundo alfa transparente, objeto inteiro dentro do quadro e margens amplas. Nao incluir prato, maos, mesa, cenario, texto, logo, marca d'agua, alimento extra, sombra de chao ou aspecto de ilustracao. Cada ingrediente deve parecer um objeto fisico independente, nao um recorte da foto master.

### 01 - Duplo completo

Arquivo: [01-duplo-master.png](./01-duplo-master.png). Referencia de entrada: foto existente do Duplo.

> Recrie um unico Duplo BurgerC completo e montado, como fotografia de produto premium. Pao brioche brilhante e dourado em cima e embaixo; dois blends bovinos separados de 90 g com uma fatia de cheddar derretido em cada um; cebola caramelizada no vinho; bacon em cubos; maionese defumada alaranjada clara com pequenos pontos de cebolinha. Camera frontal em tres quartos, com leve visao da superficie superior. Burger centralizado, silhueta vertical coerente, imperfeicoes naturais de comida real, carne suculenta e queijo com caimento credivel. Luz principal quente do alto a esquerda, preenchimento neutro a direita, leve recorte de luz. Canvas quadrado com margens transparentes em todos os lados. Nao incluir fundo, bancada, prato, maos, texto, logo, marca d'agua, ingredientes duplicados, brilho neon ou estilo cartoon.

### 02 - Pao superior

Arquivo: [02-brioche-top.png](./02-brioche-top.png).

> Gere somente a metade superior do pao brioche dourado do Duplo, completamente solta. Mostre a cupula curva inteira, a superficie brilhante com poros e pequenas irregularidades e a face inferior levemente tostada. Mesmo angulo, escala, cor e luz do master. Centralize horizontalmente; o pao ocupa cerca de 72% da largura do canvas quadrado e permanece totalmente dentro dele. Fundo alfa verdadeiro, inclusive abaixo das bordas. Nao incluir molho, cebola, bacon, queijo, carne, base do pao ou qualquer outro alimento. Nao transformar em faixa recortada do burger.

### 03 - Maionese defumada

Arquivo: [03-smoked-mayo.png](./03-smoked-mayo.png).

> Gere somente uma camada flutuante e irregular de maionese defumada alaranjada clara, espessa e brilhante, com pontos pequenos de cebolinha picada. Formato organico largo e baixo, aproximadamente da largura do burger, com pequenas gotas naturais na borda frontal e alguma profundidade visivel por cima. Ela deve parecer uma porcao real que pode ficar sob o pao superior, nao uma pincelada, disco perfeito ou icone plano. Reproduza camera e luz do master. Fundo alfa verdadeiro e margens amplas. Nao incluir pao, carne, queijo, cebola, bacon ou outros objetos.

### 04 - Cebola caramelizada

Arquivo: [04-caramelized-onion.png](./04-caramelized-onion.png).

> Gere somente um ninho horizontal de tiras de cebola caramelizada no vinho. Fios entrelacados, umidos e brilhantes, em tons de ambar escuro e castanho avermelhado, com bordas organicas. A camada deve ser larga como o blend e pouco alta, vista pela mesma camera frontal em tres quartos do master. Parece uma cobertura real solta no ar, pronta para pousar sobre a carne. Fundo alfa verdadeiro. Nao incluir bacon, maionese, queijo, pao, carne, prato ou superficie.

### 05 - Bacon em cubos

Arquivo: [05-diced-bacon.png](./05-diced-bacon.png).

> Gere somente bacon em pequenos cubos crocantes, marrom avermelhado, com gordura renderizada e bordas tostadas. Os cubos ficam espalhados de forma natural mas agrupados em uma faixa horizontal baixa, da largura aproximada do blend, com profundidade fisica sutil. Mesmo angulo e iluminacao do master, textura comestivel e realista. Fundo alfa verdadeiro e nenhum plano de apoio. Nao incluir cebola, queijo, molho, pao ou carne.

### 06 - Primeiro blend com cheddar

Arquivo: [06-patty-cheddar-top.png](./06-patty-cheddar-top.png).

> Gere somente o blend bovino superior de 90 g e sua unica fatia de cheddar derretido, juntos como uma camada destacavel. Carne espessa com borda irregular chamuscada, suculencia visivel e textura de grelha real. Cheddar sobre a superficie, escorrendo em uma dobra macia pela frente; brilhante mas nao plastico. Largura e perspectiva compativeis com o master e com o segundo blend. Camada relativamente baixa para poder empilhar. Fundo alfa verdadeiro. Nao incluir outro blend, pao, cebola, bacon ou maionese.

### 07 - Segundo blend com cheddar

Arquivo: [07-patty-cheddar-bottom.png](./07-patty-cheddar-bottom.png).

> Gere somente o blend bovino inferior de 90 g e sua unica fatia de cheddar derretido. Mesmo tamanho, camera, carne e cor do primeiro blend, mas com borda e caimento do queijo ligeiramente diferentes para nao parecer copia. Borda bem selada e irregular, textura suculenta, cheddar envolvendo a parte frontal sem cobrir toda a carne. Objeto completo e destacavel, com fundo alfa verdadeiro. Nao incluir blend superior, pao, cebola, bacon, molho ou outros elementos.

### 08 - Base do brioche

Arquivo: [08-brioche-bottom.png](./08-brioche-bottom.png).

> Gere somente a metade inferior do pao brioche, solta e inteira. Base firme e um pouco achatada, casca externa dourada e brilhante, face cortada levemente tostada visivel por cima e migalha clara na borda. Mesma largura e perspectiva do pao superior e do master. Mantenha margens transparentes amplas. Nao incluir molho, carne, queijo, bacon, cebola, pao superior ou burger montado.

### 09 - Close de carne e cheddar

Arquivo: [09-macro-cheddar.png](./09-macro-cheddar.png). Referencia de entrada: `06-patty-cheddar-top.png`.

> Fotografia macro cinematografica de um blend bovino suculento e grelhado com cheddar derretido dobrando lentamente sobre a borda irregular. Deve continuar reconhecivel como o mesmo ingrediente da referencia. Enquadramento paisagem 3:2; alimento grande e nitido no centro-direita, com espaco negativo a esquerda para texto HTML. Fundo de estudio grafite escuro e discreto. Luz quente direcional do alto a esquerda, preenchimento neutro, detalhes da selagem e do queijo, profundidade de campo rasa somente atras do assunto. Nao incluir maos, prato, pao, outras coberturas, texto, logo, marca d'agua, fumaça artificial, neon, bokeh ou flare.

### 10 - Close de bacon e cebola

Arquivo: [10-macro-bacon-onion.png](./10-macro-bacon-onion.png). Referencia de entrada: `05-diced-bacon.png`; a cebola foi especificada no prompt.

> Fotografia macro cinematografica de bacon em cubos crocantes entre tiras de cebola caramelizada no vinho. Manter textura, luz quente do alto a esquerda e cores das referencias. Enquadramento paisagem 3:2; coberturas grandes e nitidas no centro-esquerda, espaco negativo a direita para texto HTML. Fundo de estudio grafite escuro, sem elementos decorativos. Brilho natural da gordura e do glace da cebola, sem aparencia sintetica. Nao incluir pao, carne, queijo, molho, prato, maos, texto, logo, marca d'agua, fumaça, neon, bokeh ou flare.

## Portao de qualidade antes de implementar

1. Conferir transparencia real e bordas limpas em fundo claro e escuro.
2. Montar as sete camadas sem animacao e ajustar largura, perspectiva e ordem. Se nao parecer um unico Duplo, regenerar o componente divergente antes de programar.
3. Aprovar o burger inteiro e os dois closes em desktop e mobile; garantir que nenhuma imagem substitua preco ou dados do banco.
4. Converter copias aprovadas para WebP/AVIF e usar tamanhos responsivos. Guardar estes PNGs como fontes; nao servir dez PNGs grandes na primeira carga.
5. So entao animar e medir fluidez. Em conexao lenta e com movimento reduzido, a compra deve continuar imediata.

## Resultado da revisao local

A [bancada interativa](./review.html) permite comparar o master com os sete PNGs independentes e ajustar a separacao de 0 a 100%. Na abertura completa, os objetos sao legiveis e nao apresentam faixas horizontais de recorte. A composicao foi conferida em desktop e em uma largura de celular de 390 px.

**Ainda nao aprovado para o hero publico.** Em 0%, a montagem composta difere do master: a face inferior do pao superior e a face tostada da base aparecem demais, a maionese ganha muito volume e os contornos do bacon/cebola nao sao exatamente os mesmos. Uma transicao curta do master para as pecas pode disfarcar parte disso, mas nao deve ser usada para ocultar uma montagem ruim. Para um resultado cinematografico de nivel mais alto, as camadas deveriam ser produzidas a partir de um unico modelo 3D ou de uma unica sessao fotografica com camadas alinhadas, nao de geracoes independentes.

Proxima decisao de producao: aprovar a direcao visual com a bancada, depois refazer pao superior, base e maionese com proporcoes corrigidas ou encomendar um modelo 3D consistente. Nao converter estes PNGs para uso em producao antes dessa decisao.
