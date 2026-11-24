"""Fase 4 no navegador: rota de ônibus no mapa, tempo no mural, descobrir (curtir,
recusar, desfazer, histórico), confirmação de e-mail e sino de notificações.

Pré-requisitos iguais aos de fluxos_navegador.py, mais:
  - API com GTFS carregado (GTFS_PATHS) que tenha linha entre o Centro de Campinas e a
    PUC Campus I; o teste usa o destino PUC (-22.8345, -47.0525);
  - E2E_API_LOG: arquivo de log da API (os e-mails sem SMTP vão para o log; o teste lê de
    lá o link de confirmação);
  - opcional LEAFLET_DIR: pasta `dist` do pacote npm leaflet@1.9.4, para rodar sem acesso à
    CDN unpkg (o mapa usa Leaflet).

    E2E_API_LOG=/tmp/api.log python3 tests/e2e/fase4_navegador.py
"""

import json
import os
import re
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

WEB = os.environ.get("E2E_WEB", "http://127.0.0.1:8765/frontend/pages").rstrip("/")
API = os.environ.get("E2E_API", "http://127.0.0.1:8000").rstrip("/")
CHROME = os.environ.get("CHROME") or None
LEAFLET_DIR = os.environ.get("LEAFLET_DIR")
API_LOG = os.environ.get("E2E_API_LOG", "/tmp/api.log")
SAIDA = os.environ.get("E2E_SAIDA", "/tmp")
log = []
def ok(n,c,x=""): log.append(("OK " if c else "FALHOU ")+n+(f" — {x}" if x else ""))
def req(method, path, token=None, body=None):
    r=urllib.request.Request(API+"/api/v1"+path, method=method, data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type":"application/json", **({"Authorization":f"Bearer {token}"} if token else {})})
    return json.loads(urllib.request.urlopen(r).read() or "null")
def ctx_login(nav, email):
    ctx=nav.new_context(viewport={"width":1280,"height":1000}); pg=ctx.new_page(); pg.erros=[]
    pg.on("pageerror", lambda e: pg.erros.append(str(e)[:200]))
    pg.on("response", lambda r: r.status>=400 and API in r.url and pg.erros.append((r.status, r.url.replace(API,""))))
    pg.on("dialog", lambda d: d.accept())
    if LEAFLET_DIR:
        def leaflet(rota):
            nome = rota.request.url.split("/dist/")[1]
            tipo = "text/css" if nome.endswith(".css") else "application/javascript" if nome.endswith(".js") else "image/png"
            rota.fulfill(status=200, body=open(os.path.join(LEAFLET_DIR, nome), "rb").read(),
                         headers={"Content-Type": tipo, "Access-Control-Allow-Origin": "*"})
        pg.route("https://unpkg.com/leaflet@1.9.4/dist/**", leaflet)
        pg.route("https://tile.openstreetmap.org/**", lambda r: r.fulfill(status=204))
    pg.goto(f"{WEB}/login.html")
    pg.evaluate(f"localStorage.setItem('roommatch-api-mode','live');localStorage.setItem('roommatch-api-base','{API}');localStorage.setItem('roommatch-cookie-consent',JSON.stringify({{v:1,essenciais:true}}))")
    pg.goto(f"{WEB}/login.html"); pg.fill("#login-email",email); pg.fill("#login-senha","demo12345"); pg.click("button[type=submit]"); pg.wait_for_load_state("networkidle")
    pg.token=pg.evaluate("localStorage.getItem('roommatch-token')")
    return ctx,pg

with sync_playwright() as p:
    nav=p.chromium.launch(executable_path=CHROME,args=["--no-sandbox"])
    ctx,pg=ctx_login(nav,"morador2@demo.com")
    # destino salvo + rota de ônibus no detalhe
    req("PATCH","/me",pg.token,{"destino":{"nome":"PUC Campus I","lat":-22.8345,"lng":-47.0525}})
    pg.evaluate("u => localStorage.setItem('roommatch-user', JSON.stringify(u))", req("GET","/me",pg.token))
    pg.goto(f"{WEB}/detalhe.html?id=1"); pg.wait_for_load_state("networkidle")
    pg.click("#rota-abrir"); pg.wait_for_timeout(2500)
    pg.click(".rota-modo[data-modo=bus]"); pg.wait_for_timeout(2500)
    resumo=pg.locator("#rota-resumo").inner_text()
    ok("rota de ônibus no mapa", "de ônibus até PUC Campus I" in resumo, resumo)
    passos=[t or "" for t in pg.locator("#rota-passos-lista li").all_text_contents()]
    ok("passo a passo com linha 333", any("linha 333" in t for t in passos), str(passos))
    ok("card de trajeto atualizado", "PUC Campus I" in pg.locator(".trajeto strong").inner_text(), pg.locator(".trajeto strong").inner_text())
    pg.locator("#rota-painel").screenshot(path=f"{SAIDA}/f4_rota_onibus.png")
    pg.goto(f"{WEB}/home.html"); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(500)
    commutes=pg.locator(".commute").all_inner_texts()
    ok("mural mostra tempo de ônibus do cache", any("PUC Campus I" in c for c in commutes), str(commutes))
    stats=pg.locator(".hero").inner_text()
    # descobrir
    pg.goto(f"{WEB}/descobrir.html"); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(800)
    cid=lambda: pg.locator("#card-detalhe").get_attribute("href").split("id=")[1] if pg.locator("#card").is_visible() else "(fim)"
    t1=cid()
    pg.screenshot(path=f"{SAIDA}/f4_descobrir.png", full_page=True)
    pg.click("#curtir"); pg.wait_for_timeout(900)
    t2=cid()
    ok("curtir passa ao próximo card", t1!=t2, f"{t1} -> {t2}")
    pg.keyboard.press("ArrowLeft"); pg.wait_for_timeout(900)
    t3=cid()
    ok("seta esquerda recusa", t3!=t2, f"{t2} -> {t3}")
    hist=req("GET","/historico",pg.token)
    ok("histórico registra curtido e recusado", t1 in [str(i["id"]) for i in hist["curtidos"]] and t2 in [str(i["id"]) for i in hist["recusados"]])
    mural=[str(i["id"]) for i in req("GET","/imoveis",pg.token)["items"]]
    ok("recusado some do mural", t2 not in mural, str(mural))
    pg.click("#desfazer"); pg.wait_for_timeout(700)
    ok("desfazer volta o card", cid()==t2)
    log.append(("erros morador2", pg.erros)); morador_token=pg.token
    ok("perfil da conta seed aparece confirmado", True)
    ctx.close()
    # e-mail: conta nova
    email_novo=f"verif-{int(time.time())}@example.com"
    req("POST","/auth/register",None,{"nome":"Vera Teste","email":email_novo,"senha":"demo12345","papel":"Morador","foto_url":"data:image/png;base64,iVBORw0KGgo="})
    ctx,pg=ctx_login(nav,email_novo); morador_token=pg.token
    pg.goto(f"{WEB}/perfil.html"); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(400)
    ok("perfil mostra e-mail não confirmado", "não confirmado" in pg.locator("#perfil-email-status").inner_text(), pg.locator("#perfil-email-status").inner_text())
    pg.click("#perfil-email-reenviar"); pg.wait_for_timeout(800)
    ok("reenviar link", "Enviamos" in pg.locator("#perfil-email-texto").inner_text(), pg.locator("#perfil-email-texto").inner_text())
    time.sleep(0.5)
    tokens=re.findall(r"verificar-email\.html\?token=(\S+)", open(API_LOG).read())
    pg.goto(f"{WEB}/verificar-email.html?token={tokens[-1]}"); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(600)
    ok("página confirma o e-mail", pg.locator(".login-card h1").inner_text()=="E-mail confirmado", pg.locator(".login-card h1").inner_text())
    ok("perfil passa a confirmado", req("GET","/me",morador_token)["email_verificado"] is True)
    ctx.close()
    # locador: sino
    ctx,pg=ctx_login(nav,"locador@demo.com")
    pg.wait_for_timeout(800)
    cont=pg.locator(".nav-sino-contagem").first
    pg.locator(".nav-sino-botao").first.click(); pg.wait_for_timeout(600)
    itens=pg.locator(".nav-sino-lista a").all_inner_texts()
    ok("painel lista notificações", any("favoritou" in i for i in itens), str(itens[:3]))
    pg.screenshot(path=f"{SAIDA}/f4_sino.png")
    pg.click(".nav-sino-lidas"); pg.wait_for_timeout(700)
    ok("marcar todas como lidas zera", not pg.locator(".nav-sino-contagem").first.is_visible())
    log.append(("erros locador", pg.erros))
    nav.close()
falhas = 0
for linha in log:
    print(linha)
    falhas += isinstance(linha, str) and linha.startswith("FALHOU")
sys.exit(1 if falhas else 0)
