const $ = (id) => document.getElementById(id);

let dados = { whatsapp: "", bairros: [], kitnets: [] };
let lista = [];
const state = { bairro: "Todos", i: 0, f: 0, kitnet: null };

const zap = (msg) => `https://wa.me/${dados.whatsapp}?text=${encodeURIComponent(msg)}`;
const disponivel = (k) => k.disponivel !== false;   // sem o campo = disponível
const chave = (k) => k.slug || String(k.id);         // identificador usado no link direto

// Conta eventos (abriu imóvel, clicou no WhatsApp...) se o GoatCounter estiver instalado.
// Sem ele, não faz nada. Não usa cookies.
function registrar(nome) {
  try { window.goatcounter?.count({ path: nome, title: nome, event: true }); } catch {}
}

const foto = (k, n) => encodeURI(`Kits/${k.pasta}/${k.fotos[n]}`);
const miniaturas = (k) => k.fotos.map((_, n) =>
  `<img src="${foto(k, n)}" data-n="${n}" alt="Miniatura ${n + 1}" loading="lazy">`).join("");
const preco = (k) => k.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) + "/mês";

/* ---------- Carga de dados ---------- */
async function init() {
  try {
    const resposta = await fetch("dados.json");
    if (!resposta.ok) throw new Error(resposta.status);
    dados = await resposta.json();
  } catch {
    $("stage").innerHTML = `<p class="vazio">Erro ao carregar os imóveis. Tente novamente em instantes.</p>`;
    return;
  }
  renderBairros();
  renderCards();

  // Botão flutuante do WhatsApp (mensagem geral)
  const flutuante = $("zap-flutuante");
  flutuante.href = zap("Olá! Vi o site Kitnet Rio Claro e gostaria de mais informações.");
  flutuante.hidden = false;
  flutuante.addEventListener("click", () => registrar("whatsapp-flutuante"));

  abrirPorHash(); // se o link veio com #marrocos-2, abre direto esse imóvel
}

/* ---------- Filtro por bairro ---------- */
function renderBairros() {
  $("bairros").innerHTML = dados.bairros.map((b, n) => `
    <button class="thumb ${b.id === state.bairro ? "active" : ""}" data-id="${b.id}" style="--d:${n * 0.1}s">
      <img src="${encodeURI(b.capa)}" alt="" loading="lazy">
      <span>${b.label}</span>
    </button>`).join("");
}

$("bairros").addEventListener("click", (e) => {
  const btn = e.target.closest(".thumb");
  if (btn) selecionarBairro(btn.dataset.id);
});

function selecionarBairro(id) {
  state.bairro = id;
  document.querySelectorAll(".thumb").forEach((t) => t.classList.toggle("active", t.dataset.id === id));
  renderCards();
}

/* ---------- Carrossel ---------- */
const cardHTML = (k) => `
  <article class="card">
    <div class="card-img ${disponivel(k) ? "" : "alugado"}">
      <img src="${foto(k, 0)}" alt="${k.titulo}" loading="lazy">
      <span class="badge ${disponivel(k) ? "" : "badge-alugado"}">${disponivel(k) ? k.destaque || "Disponível" : "Alugado"}</span>
    </div>
    <div class="card-body">
      <h3>${k.titulo}</h3>
      <p class="endereco">${k.endereco}</p>
      <p class="descricao">${k.descricao}</p>
      <div class="card-footer">
        <dl class="info">
          <div><dt>Área</dt><dd>${k.area}m²</dd></div>
          <div><dt>Aluguel</dt><dd class="preco">${preco(k)}</dd></div>
        </dl>
        <button class="btn-detalhes">Detalhes</button>
      </div>
    </div>
  </article>`;

function renderCards() {
  const base = state.bairro === "Todos" ? dados.kitnets : dados.kitnets.filter((k) => k.bairro === state.bairro);
  lista = [...base].sort((a, b) => disponivel(b) - disponivel(a)); // disponíveis primeiro, alugados por último
  state.i = 0;
  $("stage").innerHTML = lista.length
    ? lista.map(cardHTML).join("")
    : `<p class="vazio">Nenhum imóvel encontrado nesta categoria.</p>`;
  posicionar();
}

// Só troca as classes (sem recriar o DOM), assim a transição CSS acontece de fato.
function posicionar() {
  const n = lista.length;
  $("counter").textContent = `${n ? state.i + 1 : 0} / ${n} imóveis`;
  if (!n) return;
  [...$("stage").children].forEach((el, idx) => {
    el.className = "card " + (
      idx === state.i ? "is-active" :
      idx === (state.i + n - 1) % n ? "is-prev" :
      idx === (state.i + 1) % n ? "is-next" : "is-hidden"
    );
  });
}

function mover(dir) {
  const n = lista.length;
  if (n < 2) return;
  state.i = (state.i + dir + n) % n;
  posicionar();
}

document.querySelectorAll("[data-mover]").forEach((b) =>
  b.addEventListener("click", () => mover(+b.dataset.mover)));

/* Arrastar (mouse/toque) e clicar */
let x0 = 0, arrastou = false;
const stage = $("stage");

stage.addEventListener("pointerdown", (e) => { x0 = e.clientX; arrastou = false; });
stage.addEventListener("pointerup", (e) => {
  const diff = e.clientX - x0;
  if (Math.abs(diff) > 50) { arrastou = true; mover(diff > 0 ? -1 : 1); }
});
stage.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (arrastou || !card) return;
  const idx = [...stage.children].indexOf(card);
  if (idx !== state.i) { state.i = idx; posicionar(); }
  else if (e.target.closest(".card-img, .btn-detalhes")) abrirModal(lista[idx]);
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const dir = e.key === "ArrowRight" ? 1 : -1;
  $("modal").open ? trocarFoto(state.f + dir) : mover(dir);
});

/* ---------- Modal de detalhes ---------- */
function abrirModal(k) {
  state.kitnet = k;
  const varias = k.fotos.length > 1;
  const specs = [
    ["Área útil", `${k.area}m²`], ["Valor", preco(k), "preco"],
    ["Dormitórios", k.quartos], ["Banheiros", k.banheiros], ["IPTU", k.iptu],
  ];

  $("modal-body").innerHTML = `
    <div class="galeria">
      <img id="foto" alt="${k.titulo}">
      ${varias ? `<button class="nav prev" data-foto="-1" aria-label="Foto anterior">&#10094;</button>
                  <button class="nav next" data-foto="1" aria-label="Próxima foto">&#10095;</button>` : ""}
      <button class="ampliar" data-ampliar>Abrir imagem completa</button>
    </div>
    ${varias ? `<div class="miniaturas">${miniaturas(k)}</div>` : ""}
    <div class="modal-info">
      <h2>${k.titulo}</h2>
      <p class="endereco">${k.endereco}</p>
      <p class="descricao">${k.descricao}</p>
      <dl class="specs">${specs.map(([l, v, c = ""]) =>
        `<div><dt>${l}</dt><dd class="${c}">${v}</dd></div>`).join("")}</dl>
      <h3 class="mapa-titulo">Localização</h3>
      <iframe class="mapa" title="Mapa de ${k.titulo}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
        src="https://www.google.com/maps?q=${encodeURIComponent(k.mapa || `${k.endereco}, Rio Claro - SP`)}&output=embed"></iframe>
      <div class="acoes">
        ${disponivel(k) ? `
          <a class="btn-whatsapp" data-evento="whatsapp" target="_blank" rel="noopener"
             href="${zap(`Olá! Tenho interesse no imóvel ${k.titulo} (${k.endereco}) anunciado, poderíamos conversar?`)}">Tenho Interesse (WhatsApp)</a>
        ` : `
          <p class="aviso-alugado">Este imóvel está alugado no momento.</p>
          <a class="btn-whatsapp" data-evento="avise-me" target="_blank" rel="noopener"
             href="${zap(`Olá! Gostaria de ser avisado quando o imóvel ${k.titulo} (${k.endereco}) ficar disponível.`)}">Avise-me quando vagar</a>
        `}
        <button class="btn-compartilhar" data-compartilhar>Compartilhar este imóvel</button>
      </div>
    </div>`;

  trocarFoto(0);
  if (!$("modal").open) $("modal").showModal();
  history.replaceState(null, "", "#" + chave(k)); // o endereço da página passa a ser o link direto do imóvel
  registrar("abriu/" + chave(k));
}

// Troca a foto atual no modal E na tela cheia (os dois ficam sempre sincronizados)
function trocarFoto(n) {
  const k = state.kitnet;
  state.f = (n + k.fotos.length) % k.fotos.length;
  const src = foto(k, state.f);
  $("foto").src = src;
  $("lightbox-img").src = src;
  document.querySelectorAll(".miniaturas img, .lb-miniaturas img").forEach((m) => {
    const ativa = +m.dataset.n === state.f;
    m.classList.toggle("active", ativa);
    if (ativa && m.offsetParent) m.scrollIntoView({ inline: "center", block: "nearest" });
  });
}

// Tela cheia com mini carrossel: monta as miniaturas do imóvel atual e abre
function abrirLightbox() {
  const k = state.kitnet;
  $("lightbox").classList.toggle("unica", k.fotos.length < 2); // 1 foto só: esconde setas e miniaturas
  $("lb-miniaturas").innerHTML = miniaturas(k);
  trocarFoto(state.f);
  $("lightbox").showModal();
}

$("modal").addEventListener("click", (e) => {
  const t = e.target;
  const evento = t.closest("[data-evento]");
  if (evento) registrar(`${evento.dataset.evento}/${chave(state.kitnet)}`); // o link do WhatsApp segue normalmente
  if (t.closest("[data-compartilhar]")) return compartilhar(t.closest("[data-compartilhar]"));
  if (t === $("modal") || t.closest("[data-fechar]")) return $("modal").close();
  if (t.closest("[data-foto]")) return trocarFoto(state.f + +t.closest("[data-foto]").dataset.foto);
  if (t.closest("[data-n]")) return trocarFoto(+t.closest("[data-n]").dataset.n);
  if (t.closest("[data-ampliar], #foto")) abrirLightbox();
});

const lightbox = $("lightbox");

lightbox.addEventListener("click", (e) => {
  const t = e.target;
  if (t.closest("[data-foto]")) return trocarFoto(state.f + +t.closest("[data-foto]").dataset.foto);
  if (t.closest("[data-n]")) return trocarFoto(+t.closest("[data-n]").dataset.n);
  // fecha no botão "Voltar" ou clicando no fundo (não na foto)
  if (t.closest(".voltar") || t === lightbox || t.classList.contains("lb-palco")) lightbox.close();
});

// Arrastar o dedo/mouse para o lado troca a foto na tela cheia
let lx = 0;
lightbox.addEventListener("pointerdown", (e) => { lx = e.clientX; });
lightbox.addEventListener("pointerup", (e) => {
  const diff = e.clientX - lx;
  if (Math.abs(diff) > 60 && e.target.closest(".lb-palco")) trocarFoto(state.f + (diff > 0 ? -1 : 1));
});

/* ---------- Link direto para cada imóvel (#slug) ---------- */
function abrirPorHash() {
  const k = dados.kitnets.find((x) => chave(x) === location.hash.slice(1));
  if (!k) return;
  if (!lista.includes(k)) selecionarBairro("Todos");
  state.i = lista.indexOf(k);
  posicionar();
  if (state.kitnet !== k || !$("modal").open) abrirModal(k);
}
window.addEventListener("hashchange", abrirPorHash);

// Ao fechar o modal, tira o #imovel do endereço
$("modal").addEventListener("close", () => history.replaceState(null, "", location.pathname + location.search));

// Compartilhar: no celular abre o menu de compartilhar; no computador copia o link
async function compartilhar(btn) {
  const k = state.kitnet;
  const url = location.href.split("#")[0] + "#" + chave(k);
  registrar("compartilhar/" + chave(k));

  if (navigator.share && matchMedia("(pointer: coarse)").matches) {
    try { await navigator.share({ title: k.titulo, text: `${k.titulo} — ${preco(k)}`, url }); } catch {}
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    btn.textContent = "✓ Link copiado!";
    setTimeout(() => (btn.textContent = "Compartilhar este imóvel"), 2000);
  } catch {
    prompt("Copie o link:", url);
  }
}

$("ano").textContent = new Date().getFullYear();
init();