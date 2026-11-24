"""Fluxos do site no navegador, com o front em modo `live` falando com a API.

Requer: pip install playwright pillow; um Chrome/Chromium (CHROME=/caminho, ou
`playwright install chromium`); a API rodando com o seed (senha demo12345) e o site
servido por HTTP:

    cd backend && uvicorn app.main:app --port 8000
    python3 -m http.server 8765 --bind 127.0.0.1      # na raiz do repositório
    python3 tests/e2e/fluxos_navegador.py

Variáveis: E2E_WEB (padrão http://127.0.0.1:8765/frontend/pages), E2E_API
(http://127.0.0.1:8000), CHROME, E2E_SAIDA (pasta das capturas). O CORS da API precisa
liberar a origem do site (CORS_ORIGINS no .env).

A verificação de rosto do cadastro usa uma CDN; aqui ela é trocada por um stub que aceita a
foto, porque o teste é do cadastro e não do detector.
Imprime OK/FALHOU por passo e termina com código 1 se algo falhar.
"""

import json
import os
import sys
import tempfile
import time
import urllib.request

from PIL import Image
from playwright.sync_api import sync_playwright

WEB = os.environ.get("E2E_WEB", "http://127.0.0.1:8765/frontend/pages").rstrip("/")
API = os.environ.get("E2E_API", "http://127.0.0.1:8000").rstrip("/")
CHROME = os.environ.get("CHROME") or None
SAIDA = os.environ.get("E2E_SAIDA") or tempfile.mkdtemp(prefix="e2e-roommatch-")
os.makedirs(SAIDA, exist_ok=True)

FOTOS = []
for i, cor in enumerate([(200, 120, 90), (90, 160, 140), (240, 180, 80)]):
    caminho = os.path.join(SAIDA, f"foto{i}.jpg")
    Image.new("RGB", (1600, 1200), cor).save(caminho, "JPEG")
    FOTOS.append(caminho)
FOTO_ROSTO = os.path.join(SAIDA, "rosto.jpg")
Image.new("RGB", (400, 400), (120, 90, 200)).save(FOTO_ROSTO, "JPEG")
log = []

STUB = """
window.RoomMatchFaceCheck = {
  aquecer() {}, ligarTodos() {}, exigirRosto: async () => true, processarArquivo: async () => true,
  ligarEntrada(input, hooks) {
    input.addEventListener('change', () => {
      const leitor = new FileReader();
      leitor.onload = () => hooks.onAceita && hooks.onAceita(String(leitor.result));
      leitor.readAsDataURL(input.files[0]);
    });
  }
};
"""

def api(path, token):
    req = urllib.request.Request(API + "/api/v1" + path, headers={"Authorization": f"Bearer {token}"})
    return json.loads(urllib.request.urlopen(req).read())


def novo_contexto(nav, email):
    ctx = nav.new_context(viewport={"width": 1280, "height": 900})
    pg = ctx.new_page()
    pg.erros = []
    pg.on("pageerror", lambda e: pg.erros.append(("pageerror", str(e)[:200])))
    pg.on("response", lambda r: r.status >= 400 and API in r.url and pg.erros.append(("http", r.status, r.request.method, r.url.replace(API, ""))))
    pg.on("dialog", lambda d: (log.append(("dialog", d.message)), d.accept()))
    pg.goto(f"{WEB}/login.html")
    pg.evaluate(f"""localStorage.setItem('roommatch-api-mode','live');
        localStorage.setItem('roommatch-api-base','{API}');
        localStorage.setItem('roommatch-cookie-consent', JSON.stringify({{v: 1, essenciais: true}}));""")
    pg.goto(f"{WEB}/login.html")
    pg.fill("#login-email", email); pg.fill("#login-senha", "demo12345")
    pg.click("button[type=submit]"); pg.wait_for_load_state("networkidle")
    pg.token = pg.evaluate("localStorage.getItem('roommatch-token')")
    return ctx, pg


def ok(nome, cond, extra=""):
    log.append(("OK " if cond else "FALHOU ") + nome + (f" — {extra}" if extra else ""))


with sync_playwright() as p:
    nav = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])

    # ---------------- Morador ----------------
    ctx, pg = novo_contexto(nav, "morador@demo.com")
    ok("morador logado", pg.url.endswith("home.html"), pg.url)
    cards = pg.locator(".card").count()
    ok("mural com cards", cards >= 4, str(cards))
    pg.goto(f"{WEB}/detalhe.html?id=3"); pg.wait_for_load_state("networkidle")
    antes = pg.locator("#favoritar").inner_text()
    pg.click("#favoritar"); pg.wait_for_timeout(800)
    depois = pg.locator("#favoritar").inner_text()
    ok("favoritar alterna", antes != depois, f"{antes!r} -> {depois!r}")
    favs = api("/favoritos", pg.token)["ids"]
    ok("favorito gravado no banco", 3 in favs or 3 not in favs and "Favoritado" not in depois, str(favs))
    pg.goto(f"{WEB}/detalhe.html?id=1"); pg.wait_for_load_state("networkidle")
    pg.click("a.btn-conversar"); pg.wait_for_url("**/mensagens.html?id=*", timeout=8000); pg.wait_for_load_state("networkidle")
    ok("conversar abre o chat", "mensagens.html?id=" in pg.url, pg.url)
    pg.fill("#chat-texto", "Posso visitar no sábado? <b>teste</b>"); pg.press("#chat-texto", "Enter"); pg.wait_for_timeout(800)
    bolhas = pg.locator(".bolha").all_inner_texts()
    ok("mensagem enviada e escapada", any("<b>teste</b>" in b for b in bolhas), bolhas[-1:] )
    pg.goto(f"{WEB}/favoritos.html"); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(400)
    pg.screenshot(path=f"{SAIDA}/fluxo_favoritos.png")
    pg.goto(f"{WEB}/preferencias.html"); pg.wait_for_load_state("networkidle")
    pg.screenshot(path=f"{SAIDA}/fluxo_preferencias.png")
    pg.click("#pref-form button[type=submit]"); pg.wait_for_timeout(800)
    ok("preferências salvas", not pg.locator("#pref-retorno").is_hidden(), pg.locator("#pref-retorno").inner_text())
    log.append(("erros morador", pg.erros))
    ctx.close()

    # ---------------- Locador ----------------
    ctx, pg = novo_contexto(nav, "locador@demo.com")
    ok("locador logado", pg.url.endswith("meus-imoveis.html"), pg.url)
    pg.goto(f"{WEB}/mensagens.html"); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(500)
    bolhas = pg.locator(".bolha").all_inner_texts()
    ok("locador vê a mensagem do morador", any("sábado" in b for b in bolhas), str(bolhas[-1:]))
    pg.fill("#chat-texto", "Pode sim!"); pg.press("#chat-texto", "Enter"); pg.wait_for_timeout(700)
    pg.screenshot(path=f"{SAIDA}/fluxo_chat_locador.png")

    pg.goto(f"{WEB}/publicar-imovel.html"); pg.wait_for_load_state("networkidle")
    titulo_novo = f"Quarto teste E2E {int(time.time())} · Centro"
    pg.fill("#titulo", titulo_novo)
    pg.select_option("#tipo", index=1)
    pg.fill("#cep", "13010-001"); pg.fill("#rua", "Rua Barão de Jaguara"); pg.fill("#numero", "100")
    pg.fill("#bairro", "Centro"); pg.fill("#cidade", "Campinas"); pg.fill("#estado", "SP")
    pg.fill("#aluguel", "700"); pg.fill("#condominio", "0"); pg.fill("#iptu", "0"); pg.fill("#contas", "100")
    pg.locator("label.pilula:has(input[name=classificacao][value=Feminina])").click()
    for t in ["Pet Friendly", "Home Office", "Silêncio Noturno"]:
        pg.locator(f"label.pilula:has(input[name=tag][value='{t}'])").first.click()
    pg.set_input_files("#fotos-entrada", FOTOS)
    pg.wait_for_function("document.querySelectorAll('#fotos-grade .foto-slot img').length >= 3", timeout=10000)
    ok("3 fotos na grade do publicar", pg.locator("#fotos-grade .foto-slot img").count() == 3)
    pg.click("#publicar-form button[type=submit]")
    try:
        pg.wait_for_url("**/meus-imoveis.html*", timeout=8000)
    except Exception:
        log.append(("retorno publicar", pg.locator("#publicar-retorno").inner_text()))
    meus = api("/imoveis/meus", pg.token)["items"]
    novo = next((i for i in meus if i["titulo"] == titulo_novo), None)
    ok("anúncio publicado com fotos e classificação", bool(novo and len(novo["fotos"]) == 3 and novo["classificacao"] == "Feminina"),
       json.dumps({k: novo[k] for k in ("id", "fotos", "classificacao", "tags", "preco")} if novo else None, ensure_ascii=False))
    if novo:
        pg.goto(f"{WEB}/editar-anuncio.html?id={novo['id']}"); pg.wait_for_load_state("networkidle")
        pg.wait_for_function("document.querySelectorAll('#fotos-grade .foto-slot img').length >= 3", timeout=10000)
        ok("editar mostra 3 fotos do servidor", pg.locator("#fotos-grade .foto-slot img").count() == 3)
        pg.locator(".foto-remover").first.click()
        pg.set_input_files("#fotos-entrada", FOTOS[:2])
        pg.wait_for_function("document.querySelectorAll('#fotos-grade .foto-slot img').length >= 4", timeout=10000)
        pg.click("#editar-form button[type=submit]")
        pg.wait_for_function("document.getElementById('editar-retorno').textContent.includes('salvas')", timeout=15000)
        depois = api(f"/imoveis/{novo['id']}", pg.token)
        ok("editar removeu 1 e enviou 2 fotos", len(depois["fotos"]) == 4, str(depois["fotos"]))
        pg.screenshot(path=f"{SAIDA}/fluxo_editar.png")
        pg.goto(f"{WEB}/detalhe.html?id={novo['id']}"); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(800)
        pg.screenshot(path=f"{SAIDA}/fluxo_detalhe_novo.png")
    log.append(("erros locador", pg.erros))
    ctx.close()


    # ---------------- Cadastro pelo site ----------------
    for papel in ("morador", "locador"):
        ctx = nav.new_context(viewport={"width": 1280, "height": 900})
        pg = ctx.new_page()
        erros = []
        pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
        pg.on("response", lambda r: r.status >= 400 and API in r.url and erros.append((r.status, r.url)))
        pg.on("dialog", lambda d: (erros.append(("dialog", d.message)), d.accept()))
        pg.route("**/js/face-check.js*", lambda rota: rota.fulfill(status=200, content_type="application/javascript", body=STUB))
        pg.goto(f"{WEB}/login.html")
        pg.evaluate(f"""localStorage.setItem('roommatch-api-mode','live'); localStorage.setItem('roommatch-api-base','{API}');
            localStorage.setItem('roommatch-cookie-consent', JSON.stringify({{v: 1, essenciais: true}}));""")
        pg.goto(f"{WEB}/cadastro.html?papel={papel}"); pg.wait_for_load_state("networkidle")
        email = f"novo-{papel}-{int(time.time())}@example.com"
        pg.fill("#nome", f"Pessoa {papel.title()} Nova")
        pg.fill("#telefone", "(19) 98123-4567")
        pg.locator("label.pilula:has(input[name=genero][value='Não-binário'])").click()
        pg.fill("#email", email)
        cpf_visivel = pg.locator("#campo-cpf").is_visible()
        if papel == "locador":
            pg.fill("#cpf-cnpj", f"{int(time.time())}")
        pg.set_input_files("#foto", FOTO_ROSTO); pg.wait_for_timeout(500)
        pg.fill("#senha", "Senha#Forte123"); pg.fill("#confirmar-senha", "Senha#Forte123")
        pg.locator("[data-acao=continuar]").first.click(); pg.wait_for_timeout(300)
        for t in ["Pet Friendly", "Home Office", "Silêncio Noturno"]:
            pg.locator(f"label:has(input[name=tag][value='{t}'])").first.click()
        pg.fill("#orcamento-valor", "1500"); pg.fill("#limiar-valor", "60")
        pg.locator("section[data-etapa='2'] [data-acao=continuar]").click(); pg.wait_for_timeout(300)
        pg.check("#aceite"); pg.click("#finalizar")
        try:
            pg.wait_for_url("**/conta-criada.html*", timeout=8000)
        except Exception:
            pass
        url = pg.url.split("/")[-1]
        user = pg.evaluate("JSON.parse(localStorage.getItem('roommatch-user') || 'null')")
        ok(f"cadastro {papel} chega em conta-criada", url.startswith("conta-criada.html"), url)
        ok(f"campo CPF só para locador ({papel})", cpf_visivel == (papel == "locador"))
        ok(f"cadastro {papel} grava papel, tags e foto",
           bool(user) and user.get("papel", "").lower() == papel and len(user.get("tags") or []) == 3
           and (user.get("foto_url") or "").startswith("data:image"))
        if papel == "morador":
            ok("cadastro morador grava orçamento e limiar",
               bool(user) and user.get("orcamento_maximo") == 1500 and user.get("limiar_compatibilidade") == 60)
        log.append((f"erros cadastro {papel}", erros))
        ctx.close()
    nav.close()

falhas = 0
for linha in log:
    print(linha)
    falhas += isinstance(linha, str) and linha.startswith("FALHOU")
print(f"capturas em {SAIDA}")
sys.exit(1 if falhas else 0)
