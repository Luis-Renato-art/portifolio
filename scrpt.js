// CONFIGURAÇÃO DO SEU WHATSAPP
const numeroWhats = "71987643203";

// LINK DA SUA API GOOGLE SHEETS
const URL_PLANILHA_API = "https://script.google.com/macros/s/AKfycbzD9Ka8Veqz9YtNJKGDDbzxLm2mtSQanwKvtOnJT91aVoxgYX_HwTkhIEXP2uPHR9lEQA/exec";

// BANCO DE DADOS FIXO 
const produtosDados = [
    { id: 1, preco: "49.90", cores: ["Azul", "Branco"], fotos: ["https://down-br.img.susercontent.com/file/662d3d803589a525655e5b039319a3d6"], secao: "terços", descricao: "Lindo terço artesanal." },
    { id: 2, preco: "25.00", cores: ["Preto", "Marrom"], fotos: ["https://assets.sistemawbuy.com.br/arquivos/746ff15a790569ad5de06b459a31b54e/produtos/66d07059f374e/pulseira-verde-esmeralda-66d0705a6db52.webp"], secao: "adereços", descricao: "Pulseira regulável." },
    { id: 4, preco: "0.00", cores: [], fotos: ["https://cdn.awsli.com.br/2500x2500/1922/1922834/produto/397891950/81fb71f3899692c7f78ee27749ac228b-2r2o42jzlx.jpg"], secao: "galeria", descricao: "Modelo de inspiração da galeria." },
    // ID 999: Mapeia o estoque do Personalizado vindo da sua planilha
    { id: 999, preco: "0.00", cores: [], fotos: [], secao: "personalizado", descricao: "Configurador" }
];

// VARIÁVEIS DE CONTROLE GLOBAL
let produtosComEstoque = []; 
let carrinho = JSON.parse(localStorage.getItem('carrinho_peixin')) || [];
let produtoSelecionadoAtual = null;
let corSelecionadaAtual = "";
let indexDestaqueAtual = 0;
let etapaAtualConfig = 0;
let escolhasUsuarioCustom = {};

// INICIALIZAÇÃO AUTOMÁTICA AO ABRIR O SITE
window.onload = function() {
    atualizarContadorCarrinho();
    carregarDadosDaPlanilha();
};

// FUNÇÃO MÁGICA QUE LÊ O ESTOQUE DO GOOGLE SHEETS EM TEMPO REAL
async function carregarDadosDaPlanilha() {
    try {
        const resposta = await fetch(URL_PLANILHA_API, { method: "GET", redirect: "follow" });
        const rows = await resposta.json();
        
        produtosComEstoque = produtosDados.map(infoLocal => {
            const linhaPlanilha = rows.find(p => p.id == infoLocal.id);
            return {
                ...infoLocal,
                nome: linhaPlanilha ? linhaPlanilha.nome : "Produto #" + infoLocal.id,
                estoque: linhaPlanilha ? Math.floor(linhaPlanilha.estoque) : 0
            };
        });
    } catch (erro) {
        console.log("Erro na planilha, ativando modo simulação de segurança.");
        produtosComEstoque = produtosDados.map(p => ({ 
            ...p, 
            nome: p.id === 999 ? "Terço Personalizado" : `Produto Exemplo #${p.id}`, 
            estoque: p.id === 4 ? 0 : 15 
        }));
    }
    renderizarVitrine(produtosComEstoque);
    gerarCarrosselDestaques();
}

function renderizarVitrine(lista) {
    const vitrine = document.getElementById('vitrine');
    vitrine.innerHTML = "";
    // Esconde a galeria e o ID de controle do personalizado da busca comum
    const itensVisiveis = lista.filter(p => p.secao !== 'galeria' && p.id !== 999);

    if(itensVisiveis.length === 0) {
        vitrine.innerHTML = "<p>Nenhum produto encontrado.</p>";
        return;
    }

    itensVisiveis.forEach(p => {
        const semEstoque = p.estoque <= 0;
        const card = document.createElement('div');
        card.className = 'produto-card';
        card.onclick = () => abrirDetalhesProduto(p.id);
        
        const txtEstoque = semEstoque ? 
            `<span class="sem-estoque">Esgotado</span>` : 
            `<span style="color:var(--texto-mutado); font-size:12px; display:block;">Disponível: <b>${p.estoque} un.</b></span>`;

        card.innerHTML = `
            <img src="${p.fotos}" alt="${p.nome}" loading="lazy">
            <h3>${p.nome}</h3>
            <p class="preco ${semEstoque ? 'sem-estoque' : ''}">${semEstoque ? '' : 'R$ ' + parseFloat(p.preco).toFixed(2)}</p>
            ${txtEstoque}
        `;
        vitrine.appendChild(card);
    });
}

function gerarCarrosselDestaques() {
    const carrossel = document.getElementById('carrossel-destaques');
    const destaques = produtosComEstoque.filter(p => p.secao !== 'galeria' && p.id !== 999 && p.estoque > 0).slice(0, 3);
    
    if(destaques.length === 0) { carrossel.style.display = 'none'; return; }
    carrossel.innerHTML = "";

    destaques.forEach((p, idx) => {
        const slide = document.createElement('div');
        slide.className = `slide-destaque ${idx === 0 ? 'ativo' : ''}`;
        slide.innerHTML = `
            <div class="slide-conteudo">
                <h2>${p.nome}</h2>
                <p>Confira os detalhes exclusivos</p><br>
                <button class="btn-cor" onclick="event.stopPropagation(); abrirDetalhesProduto(${p.id})">Ver Produto</button>
            </div>
            <img src="${p.fotos}" alt="${p.nome}">
        `;
        carrossel.appendChild(slide);
    });

    setInterval(() => {
        const slides = document.querySelectorAll('.slide-destaque');
        if(slides.length <= 1) return;
        slides[indexDestaqueAtual].classList.remove('ativo');
        indexDestaqueAtual = (indexDestaqueAtual + 1) % slides.length;
        slides[indexDestaqueAtual].classList.add('ativo');
    }, 4000);
}

function filtrarPorSecao(secao) {
    document.getElementById('tela-configurador').classList.add('oculto');
    irParaHome();
    
    if (secao === 'personalizado') {
        const checkEstoque = produtosComEstoque.find(p => p.id === 999);
        if (checkEstoque && checkEstoque.estoque <= 0) {
            alert("A produção de peças personalizadas está pausada no momento por falta de materiais.");
            return;
        }
        abrirConfigurador();
        return;
    }

    const titulo = document.getElementById('titulo-vitrine');
    const carrossel = document.getElementById('carrossel-destaques');
    carrossel.style.display = secao === 'todos' ? 'block' : 'none';
    titulo.innerText = secao === 'todos' ? "Nossos Produtos" : secao.toUpperCase();

    const filtrados = produtosComEstoque.filter(p => secao === 'todos' ? (p.secao !== 'galeria' && p.id !== 999) : p.secao === secao);
    const vitrine = document.getElementById('vitrine');
    vitrine.innerHTML = "";
    
    filtrados.forEach(p => {
        const card = document.createElement('div');
        card.className = 'produto-card';
        card.onclick = () => abrirDetalhesProduto(p.id);
        card.innerHTML = `
            <img src="${p.fotos}" alt="${p.nome}">
            <h3>${p.nome}</h3>
            <p class="preco">${secao === 'galeria' ? 'Inspiração' : 'R$ ' + parseFloat(p.preco).toFixed(2)}</p>
        `;
        vitrine.appendChild(card);
    });
}

function filtrarProdutos() {
    const termo = document.getElementById('campo-busca').value.toLowerCase();
    const filtrados = produtosComEstoque.filter(p => p.nome.toLowerCase().includes(termo));
    renderizarVitrine(filtrados);
}

function abrirDetalhesProduto(id) {
    const produto = produtosComEstoque.find(p => p.id === id);
    if(!produto) return;
    produtoSelecionadoAtual = produto;
    corSelecionadaAtual = produto.cores[0] || "Padrão";

    document.getElementById('tela-home').classList.add('oculto');
    document.getElementById('container-busca-principal').classList.add('oculto');
    document.getElementById('tela-produto').classList.remove('oculto');
    window.scrollTo(0,0);

    document.getElementById('detalhe-nome').innerText = produto.nome;
    document.getElementById('detalhe-preco-valor').innerText = parseFloat(produto.preco).toFixed(2);
    document.getElementById('detalhe-descricao').innerText = produto.descricao;
    
    const txtEst = document.getElementById('detalhe-estoque-texto');
    txtEst.innerHTML = produto.estoque <= 0 ? `<span style="color:#ef4444">❌ Produto Esgotado</span>` : `<span style="color:#25d366">✔️ Estoque Disponível: ${produto.estoque} un.</span>`;
    
    document.getElementById('detalhe-foto-principal').src = produto.fotos;
    gerarProdutosSemelhantes(produto.secao, produto.id);
}

function gerarProdutosSemelhantes(secao, idAtual) {
    const grid = document.getElementById('produtos-semelhantes-grid');
    grid.innerHTML = "";
    const semelhantes = produtosComEstoque.filter(p => p.secao === secao && p.id !== idAtual && p.id !== 999).slice(0, 4);
    semelhantes.forEach(p => {
        const card = document.createElement('div');
        card.className = 'produto-card';
        card.onclick = () => abrirDetalhesProduto(p.id);
        card.innerHTML = `<img src="${p.fotos}" alt="${p.nome}"><h3>${p.nome}</h3><p class="preco">R$ ${parseFloat(p.preco).toFixed(2)}</p>`;
        grid.appendChild(card);
    });
}

function irParaHome() {
    document.getElementById('tela-produto').classList.add('oculto');
    document.getElementById('tela-configurador').classList.add('oculto');
    document.getElementById('tela-home').classList.remove('oculto');
    document.getElementById('container-busca-principal').classList.remove('oculto');
}

// MAPA VISUAL DO CONFIGURADOR DE PEÇAS
const etapasConfigurador = [
    {
        chave: "modelo", titulo: "Passo 1: Selecione o Modelo Inicial", fotoFoco: "https://picsum.photos", legenda: "Selecione o tipo base da peça",
        opcoes: [
            { nome: "Terço de Mão", preco: 30.00, img: "https://picsum.photos" },
            { nome: "Terço de Pescoço", preco: 45.00, img: "https://picsum.photos" },
            { nome: "Pulseira", preco: 20.00, img: "https://picsum.photos" },
            { nome: "Dezena", preco: 15.00, img: "https://picsum.photos" },
            { nome: "Adorno de Carro", preco: 35.00, img: "https://picsum.photos" },
            { nome: "Terço de Noiva", preco: 120.00, img: "https://picsum.photos" },
            { nome: "Strapfone", preco: 18.00, img: "https://picsum.photos" }
        ]
    },
    {
        chave: "entremeio", titulo: "Passo 2: Escolha o Entremeio e Cruz", fotoFoco: "https://picsum.photos", legenda: "💡 O metal e a cruz ganham destaque aqui!",
        opcoes: [
            { nome: "Clássico Prateado", preco: 0.00, img: "https://picsum.photos" },
            { nome: "Clássico Dourado", preco: 4.50, img: "https://picsum.photos" },
            { nome: "Ouro Velho Rústico", preco: 6.00, img: "https://picsum.photos" },
            { nome: "Brilhante com Strass", preco: 15.00, img: "https://picsum.photos" }
        ]
    },
    {
        chave: "avemaria", titulo: "Passo 3: Contas das Ave Marias", fotoFoco: "https://picsum.photos", legenda: "💡 Foque nas contas principais que mudaram!",
        opcoes: [
            { nome: "Madeira / Pérola Tradicional", preco: 5.00, img: "https://picsum.photos" },
            { nome: "Cristal Lapidado Nobre", preco: 18.00, img: "https://picsum.photos" },
            { nome: "Conta Adornada / Trabalhada", preco: 25.00, img: "https://picsum.photos" }
        ]
    },
    {
        chave: "painosso", titulo: "Passo 4: Contas do Pai Nosso (Opcional)", fotoFoco: "https://picsum.photos", legenda: "💡 Foque na conta de separação do Pai Nosso!",
        opcoes: [
            { nome: "Igual às Ave Marias (Padrão)", preco: 0.00, img: "https://picsum.photos" },
            { nome: "Cristal em Destaque", preco: 5.00, img: "https://picsum.photos" },
            { nome: "Conta Especial Adornada", preco: 9.00, img: "https://picsum.photos" }
        ]
    },
    {
        chave: "cordao", titulo: "Passo 5: Tipo de Cordão / Linha", fotoFoco: "https://picsum.photos", legenda: "💡 Veja o caimento e o material do fio",
        opcoes: [
            { nome: "Cordão de Nylon Forte", preco: 0.00, img: "https://picsum.photos" },
            { nome: "Corrente de Metal Prata", preco: 8.00, img: "https://picsum.photos" },
            { nome: "Corrente de Metal Ouro", preco: 10.00, img: "https://picsum.photos" }
        ]
    },
    {
        chave: "adicionais", titulo: "Passo 6: Mimos e Extras Adicionais", fotoFoco: "https://picsum.photos", legenda: "💡 Itens opcionais reunidos em um único lugar",
        opcoes: [
            { nome: "Nenhum Item Extra", preco: 0.00, img: "https://picsum.photos" },
            { nome: "Caixinha de Presente Luxo", preco: 7.00, img: "https://picsum.photos" },
            { nome: "Pingente / Relíquia Extra", preco: 8.50, img: "https://picsum.photos" }
        ]
    },
    {
        chave: "consideracoes", titulo: "Passo 7: Nomes e Detalhes da sua Arte", fotoFoco: "https://picsum.photos", legenda: "Fase final da sua peça personalizada!", opcoes: []
    }
];

function abrirConfigurador() {
    document.getElementById('tela-home').classList.add('oculto');
    document.getElementById('tela-produto').classList.add('oculto');
    document.getElementById('container-busca-principal').classList.add('oculto');
    document.getElementById('tela-configurador').classList.remove('oculto');
    etapaAtualConfig = 0;
    escolhasUsuarioCustom = {};
    renderizarEtapaConfigurador();
}

function renderizarEtapaConfigurador() {
    const etapa = etapasConfigurador[etapaAtualConfig];
    document.getElementById('img-foco-etapa').src = etapa.fotoFoco;
    document.getElementById('legenda-foco-etapa').innerText = etapa.legenda;
    document.getElementById('titulo-etapa').innerText = etapa.titulo;
    
    const grid = document.getElementById('opcoes-etapa-grid');
    grid.innerHTML = "";

    const btn = document.getElementById('btn-avancar-etapa');
    btn.innerText = etapaAtualConfig === etapasConfigurador.length - 1 ? "Adicionar ao Carrinho 🛒" : "Avançar Passo →";

    if (etapa.chave === "consideracoes") {
        grid.innerHTML = `
            <div style="width:100%; padding:10px;">
                <label style="font-weight:bold; display:block; margin-bottom:10px;">Escreva livremente os nomes para gravar ou pedidos bem específicos:</label>
                <textarea id="texto-custom-final" placeholder="Ex: Nome no terço: 'Maria e João'. Desejo a medalha de São Bento no entremeio..." style="width:100%; height:100px; border-radius:8px; background:#272a3d; color:white; padding:10px; border:1px solid #374151; resize:none; outline:none;"></textarea>
            </div>
        `;
        return;
    }

    etapa.opcoes.forEach(op => {
        const card = document.createElement('div');
        const checkSel = escolhasUsuarioCustom[etapa.chave]?.nome === op.nome;
        card.className = `opcao-card-peca ${checkSel ? 'selecionado' : ''}`;
        card.onclick = () => { escolhasUsuarioCustom[etapa.chave] = op; renderizarEtapaConfigurador(); };
        card.innerHTML = `
            <img src="${op.img}" alt="${op.nome}">
            <h4>${op.nome}</h4>
            <span style="color:var(--secundaria); font-size:12px;">${op.preco === 0 ? 'Incluso' : '+ R$ ' + op.preco.toFixed(2)}</span>
        `;
        grid.appendChild(card);
    });
    calcularPrecoParcialCustom();
}

function calcularPrecoParcialCustom() {
    let total = 0;
    Object.values(escolhasUsuarioCustom).forEach(op => total += op.preco);
    document.getElementById('preco-custom-total').innerText = total.toFixed(2);
    return total;
}

function avancarConfigurador() {
    const etapa = etapasConfigurador[etapaAtualConfig];
    if (etapa.chave !== "consideracoes" && !escolhasUsuarioCustom[etapa.chave]) {
        alert("Por favor, clique em um card de opção antes de avançar!"); return;
    }

    if (etapaAtualConfig === etapasConfigurador.length - 1) {
        const textoObsLivre = document.getElementById('texto-custom-final').value.trim();
        const prcFinal = calcularPrecoParcialCustom();
        const tituloPeca = `✨ Custom: ${escolhasUsuarioCustom['modelo'].nome}`;
        
        let resumoMontagem = `Montagem Personalizada:\n` +
            `- Cruz: ${escolhasUsuarioCustom['entremeio'].nome}\n` +
            `- Ave Marias: ${escolhasUsuarioCustom['avemaria'].nome}\n` +
            `- Pai Nosso: ${escolhasUsuarioCustom['painosso'].nome}\n` +
            `- Linha: ${escolhasUsuarioCustom['cordao'].nome}\n` +
            `- Mimos: ${escolhasUsuarioCustom['adicionais'].nome}\n` +
            `- Notas/Nomes: ${textoObsLivre || 'Nenhum'}`;

        carrinho.push({ id: 999, nome: tituloPeca, preco: prcFinal, cor: "Personalizada", obsCustomizada: resumoMontagem });
        localStorage.setItem('carrinho_peixin', JSON.stringify(carrinho));
        atualizarContadorCarrinho(); irParaHome(); abrirModalCarrinho(); return;
    }
    etapaAtualConfig++; renderizarEtapaConfigurador();
}

function adicionarDoDetalheAoCarrinho() {
    carrinho.push({ id: produtoSelecionadoAtual.id, nome: produtoSelecionadoAtual.nome, preco: produtoSelecionadoAtual.preco, cor: corSelecionadaAtual });
    localStorage.setItem('carrinho_peixin', JSON.stringify(carrinho));
    atualizarContadorCarrinho(); abrirModalCarrinho();
}

function removerItemCarrinho(idx) {
    carrinho.splice(idx, 1); localStorage.setItem('carrinho_peixin', JSON.stringify(carrinho));
    atualizarContadorCarrinho(); renderizarItensCarrinho();
}

function atualizarContadorCarrinho() { document.getElementById('contador-carrinho').innerText = carrinho.length; }
function abrirModalCarrinho() { document.getElementById('modal-carrinho').classList.remove('oculto'); renderizarItensCarrinho(); }
function fecharModalCarrinho() { document.getElementById('modal-carrinho').classList.add('oculto'); }

function renderizarItensCarrinho() {
    const container = document.getElementById('itens-carrinho'); container.innerHTML = ""; let tot = 0;
    carrinho.forEach((item, idx) => {
        tot += parseFloat(item.preco);
        container.innerHTML += `<div class="item-carrinho"><div><h4>${item.nome}</h4><small>Preço: R$ ${parseFloat(item.preco).toFixed(2)}</small></div><button class="btn-remover" onclick="removerItemCarrinho(${idx})">❌</button></div>`;
    });
    document.getElementById('valor-total-carrinho').innerText = tot.toFixed(2);
}

function finalizarPedidoWhatsApp() {
    if(carrinho.length === 0) { alert("Carrinho vazio!"); return; }
    let textoMsg = "Olá Peixin! Gostaria de encomendar:\n\n"; let totalGeral = 0;
    
    carrinho.forEach((item, idx) => {
        textoMsg += `${idx+1}. *${item.nome}* - R$ ${parseFloat(item.preco).toFixed(2)}\n`;
        if(item.obsCustomizada) textoMsg += `   _${item.obsCustomizada}_\n`;
        totalGeral += parseFloat(item.preco);
    });
    
    textoMsg += `\n*Observações Gerais:* ${document.getElementById('observacao-pedido').value}\n*Total:* R$ ${totalGeral.toFixed(2)}`;
    const urlWhatsApp = `https://wa.me/${numeroWhats}?text=${encodeURIComponent(textoMsg)}`;
    window.open(urlWhatsApp, '_blank');
}