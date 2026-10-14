let bairroAtivo = "todos";
let currentIndex = 0;
let isTransitioning = false;
let autoInterval = null;

function getFiltered() {
  return kitnets.filter((k) => bairroAtivo === "todos" || k.bairro === bairroAtivo);
}

function renderNav() {
  const nav = document.getElementById("bairros-nav");
  nav.innerHTML = "";
  
  bairros.forEach(b => {
    const btn = document.createElement("button");
    btn.className = `bairro-btn ${bairroAtivo === b.id ? "active" : ""}`;
    btn.textContent = b.label;
    btn.onclick = () => {
      bairroAtivo = b.id;
      currentIndex = 0;
      renderNav();
      updateCard(true);
      resetAutoPlay();
    };
    nav.appendChild(btn);
  });
}




function updateCard() {
  const filtered = getFiltered();
  const total = filtered.length;
  const item = filtered[currentIndex] || filtered[0];
  const mainContent = document.getElementById("main-content");
  
  if (!item) {
    mainContent.style.display = "none";
    return;
  }
  mainContent.style.display = "flex";

  document.getElementById("card-img").src = item.img;
  document.getElementById("card-img").alt = item.alt;
  document.getElementById("card-destaque").textContent = item.destaque;
  document.getElementById("card-title").textContent = item.titulo;
  document.getElementById("card-address").textContent = item.endereco;
  document.getElementById("card-area").textContent = item.area;
  document.getElementById("card-price").textContent = item.valor;
  document.getElementById("counter").textContent = `${currentIndex + 1} / ${total} imóveis`;

  const dotsContainer = document.getElementById("dots-container");
  dotsContainer.innerHTML = "";
  filtered.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.className = `nav-dot ${i === currentIndex ? "active" : ""}`;
    dot.setAttribute("aria-label", `Ir para kitnet ${i + 1}`);
    dot.onclick = () => goTo(i);
    dotsContainer.appendChild(dot);
  });
}

function goTo(index) {
  if (isTransitioning) return;
  const filtered = getFiltered();
  const total = filtered.length;

  isTransitioning = true;
  const card = document.getElementById("card-container");
  card.classList.add("transitioning");

  setTimeout(() => {
    currentIndex = ((index % total) + total) % total;
    updateCard();
    card.classList.remove("transitioning");
    isTransitioning = false;
  }, 200);

  resetAutoPlay();
}

// Abertura da Tela de Detalhes (Produto)
document.getElementById("btn-interesse").addEventListener("click", () => {
  const filtered = getFiltered();
  const item = filtered[currentIndex] || filtered[0];
  if (!item) return;

  // Preenche dados da tela de detalhes
  document.getElementById("detalhe-titulo").textContent = item.titulo;
  document.getElementById("detalhe-endereco").textContent = item.endereco;
  document.getElementById("detalhe-img-principal").src = item.img;
  document.getElementById("detalhe-area").textContent = item.area;
  document.getElementById("detalhe-valor").textContent = item.valor;
  document.getElementById("detalhe-quartos").textContent = item.quartos || "1 Quarto";
  document.getElementById("detalhe-iptu").textContent = item.iptu || "Consulte";
  document.getElementById("detalhe-descricao").textContent = item.descricao || "Imóvel completo em ótima localização.";

  // Link dinâmico para WhatsApp
  const mensagem = encodeURIComponent(`Olá, tenho interesse no imóvel: ${item.titulo} (${item.endereco}), poderia me dar mais detalhes?`);
  document.getElementById("detalhe-whatsapp").href = `https://wa.me/5519981710010?text=${mensagem}`;

  // Define Localização Google Maps
  const queryMapa = encodeURIComponent(item.mapaQuery || item.endereco + " Rio Claro SP");
  const iframeMapa = document.getElementById("detalhe-mapa");
  iframeMapa.src = `https://www.google.com/maps?q=${queryMapa}&output=embed`;

  // Preenche miniaturas e gerencia o array completo de fotos do imóvel
  const galeria = document.getElementById("detalhe-galeria");
  galeria.innerHTML = "";
  
  const todasAsFotos = [item.img, ...(item.fotosExtras || [])];
  let fotoAtualIndex = 0;

  const imgPrincipal = document.getElementById("detalhe-img-principal");
  imgPrincipal.src = todasAsFotos[fotoAtualIndex];

  // Função para atualizar a foto principal ativa
  function atualizarFotoPrincipal(index) {
    fotoAtualIndex = ((index % todasAsFotos.length) + todasAsFotos.length) % todasAsFotos.length;
    imgPrincipal.src = todasAsFotos[fotoAtualIndex];
    
    // Opcional: destaca visualmente a miniatura ativa embaixo se quiser
  }

  // Preenche as miniaturas embaixo
  todasAsFotos.forEach((fotoUrl, idx) => {
    const imgMini = document.createElement("img");
    imgMini.src = fotoUrl;
    imgMini.style.width = "100px";
    imgMini.style.height = "70px";
    imgMini.style.objectFit = "cover";
    imgMini.style.borderRadius = "8px";
    imgMini.style.cursor = "pointer";
    imgMini.style.flexShrink = "0";
    
    // Clicar na miniatura muda a foto grande
    imgMini.onclick = () => {
      atualizarFotoPrincipal(idx);
    };
    
    galeria.appendChild(imgMini);
  });

  // Configura os botões da imagem grande
  const btnPrevDetalhe = document.getElementById("detalhe-prev");
  const btnNextDetalhe = document.getElementById("detalhe-next");

  // Limpa eventos anteriores clonando os botões
  const novoPrev = btnPrevDetalhe.cloneNode(true);
  const novoNext = btnNextDetalhe.cloneNode(true);
  btnPrevDetalhe.parentNode.replaceChild(novoPrev, btnPrevDetalhe);
  btnNextDetalhe.parentNode.replaceChild(novoNext, btnNextDetalhe);

  novoPrev.onclick = () => atualizarFotoPrincipal(fotoAtualIndex - 1);
  novoNext.onclick = () => atualizarFotoPrincipal(fotoAtualIndex + 1);

  // Mostra o modal
  document.getElementById("modal-detalhes").style.display = "block";
  clearInterval(autoInterval); // Pausa o carrossel automático quando abrir os detalhes
});

// Fechar tela de detalhes
document.getElementById("fechar-modal").addEventListener("click", () => {
  document.getElementById("modal-detalhes").style.display = "none";
  startAutoPlay();
});

document.getElementById("prev-btn").addEventListener("click", () => goTo(currentIndex - 1));
document.getElementById("next-btn").addEventListener("click", () => goTo(currentIndex + 1));

function startAutoPlay() {
  autoInterval = setInterval(() => {
    goTo(currentIndex + 1);
  }, 5000);
}

function resetAutoPlay() {
  clearInterval(autoInterval);
  startAutoPlay();
}

document.getElementById("current-year").textContent = new Date().getFullYear();

renderNav();
updateCard();
startAutoPlay();