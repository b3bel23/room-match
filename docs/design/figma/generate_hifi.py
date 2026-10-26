#!/usr/bin/env python3
"""RoomMatch MVP — high-fidelity web mockups (1440×900) for Figma import."""

from pathlib import Path

OUT = Path(__file__).parent

PROPERTIES = [
    {
        "title": "Quarto em república · Barão Geraldo",
        "type": "República",
        "bairro": "Barão Geraldo, Campinas",
        "price": 850,
        "breakdown": [("Aluguel", 600), ("Cond.", 120), ("IPTU", 45), ("Contas", 85)],
        "pct": 92,
        "route": "28 min · PUC-Campinas",
        "dist": "3,8 km",
        "tags": ["Pet Friendly", "Silêncio Noturno", "Home Office"],
        "gradient": "linear-gradient(135deg,#5EA38F 0%,#3d7a6a 40%,#141D22 100%)",
        "rooms": 1,
        "size": "12 m²",
    },
    {
        "title": "Kitnet mobiliada · Cambuí",
        "type": "Kitnet",
        "bairro": "Cambuí, Campinas",
        "price": 1200,
        "breakdown": [("Aluguel", 980), ("Cond.", 140), ("IPTU", 40), ("Contas", 40)],
        "pct": 78,
        "route": "18 min · UNICAMP",
        "dist": "2,1 km",
        "tags": ["LGBTQIA+ Safe", "Vegetariano", "Home Office"],
        "gradient": "linear-gradient(135deg,#FBB050 0%,#e8953a 50%,#5EA38F 100%)",
        "rooms": 1,
        "size": "28 m²",
    },
    {
        "title": "Quarto casa compartilhada · Sousas",
        "type": "Casa",
        "bairro": "Sousas, Campinas",
        "price": 720,
        "breakdown": [("Aluguel", 520), ("Cond.", 0), ("IPTU", 80), ("Contas", 120)],
        "pct": 88,
        "route": "35 min · PUC-Campinas",
        "dist": "5,4 km",
        "tags": ["Pet Friendly", "Sem Festas", "420 Friendly"],
        "gradient": "linear-gradient(160deg,#F08070 0%,#c45a4d 45%,#141D22 100%)",
        "rooms": 1,
        "size": "14 m²",
    },
    {
        "title": "Quarto suite · Taquaral",
        "type": "Apart.",
        "bairro": "Taquaral, Campinas",
        "price": 980,
        "breakdown": [("Aluguel", 750), ("Cond.", 160), ("IPTU", 35), ("Contas", 35)],
        "pct": 81,
        "route": "22 min · PUCC",
        "dist": "2,9 km",
        "tags": ["Silêncio Noturno", "Home Office", "LGBTQIA+ Safe"],
        "gradient": "linear-gradient(120deg,#667eea 0%,#764ba2 60%,#141D22 100%)",
        "rooms": 1,
        "size": "16 m²",
    },
    {
        "title": "Vaga república estudantil · Guanabara",
        "type": "República",
        "bairro": "Guanabara, Campinas",
        "price": 650,
        "breakdown": [("Aluguel", 480), ("Cond.", 90), ("IPTU", 30), ("Contas", 50)],
        "pct": 95,
        "route": "15 min · UNICAMP",
        "dist": "1,6 km",
        "tags": ["Vegetariano", "Silêncio Noturno", "Home Office"],
        "gradient": "linear-gradient(145deg,#11998e 0%,#38ef7d 50%,#141D22 100%)",
        "rooms": 1,
        "size": "11 m²",
    },
    {
        "title": "Quarto amplo · Nova Campinas",
        "type": "Apart.",
        "bairro": "Nova Campinas, Campinas",
        "price": 1100,
        "breakdown": [("Aluguel", 880), ("Cond.", 150), ("IPTU", 40), ("Contas", 30)],
        "pct": 74,
        "route": "25 min · PUC-Campinas",
        "dist": "4,0 km",
        "tags": ["Pet Friendly", "Social Moderado"],
        "gradient": "linear-gradient(135deg,#fa709a 0%,#fee140 50%,#5EA38F 100%)",
        "rooms": 1,
        "size": "18 m²",
    },
]

MORADORES = [
    ("JS", "João Santos", "Eng. Software · 28 anos", "#5EA38F"),
    ("AC", "Ana Costa", "Med. Veterinária · 24 anos", "#F08070"),
    ("PL", "Pedro Lima", "Estudante Econ. · 22 anos", "#FBB050"),
]

CHATS = [
    ("JS", "João Santos", "Oi Maria! Vi que você curtiu o quarto em Barão Geraldo. Posso te mostrar o imóvel amanhã às 18h?", False, "14:32"),
    ("MS", "Maria Silva", "Oi João! Pode sim, funciona perfeito. O condomínio aceita pet pequeno mesmo?", True, "14:38"),
    ("JS", "João Santos", "Sim! Temos um gato e o condomínio é pet friendly. Te mando fotos do quarto por aqui.", False, "14:41"),
    ("MS", "Maria Silva", "Ótimo! E sobre o rateio das contas, a estimativa de R$ 85 inclui internet?", True, "14:45"),
]

ICON = {
    "logo": '<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="10" cy="14" r="8" stroke="#5EA38F" stroke-width="2.5"/><circle cx="18" cy="14" r="8" stroke="#FBB050" stroke-width="2.5"/></svg>',
    "search": '<svg width="16" height="16" fill="none" stroke="#94A3AD" stroke-width="2"><circle cx="7" cy="7" r="5"/><path d="M11 11l4 4"/></svg>',
    "heart": '<svg width="18" height="18" fill="#F08070" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
    "pin": '<svg width="14" height="14" fill="none" stroke="#5EA38F" stroke-width="2"><path d="M12 6c0 4-6 10-6 10S0 10 0 6a6 6 0 1112 0z"/><circle cx="6" cy="6" r="2"/></svg>',
    "bus": '<svg width="16" height="16" fill="none" stroke="#5EA38F" stroke-width="1.5"><rect x="1" y="4" width="14" height="9" rx="2"/><circle cx="4" cy="14" r="1.5"/><circle cx="12" cy="14" r="1.5"/></svg>',
    "send": '<svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>',
}


def money(v: int) -> str:
    return "R$ {:,}".format(v).replace(",", ".")


CSS = """
@import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@600;700&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
:root {
  --menthe:#5EA38F; --nectarine:#FBB050; --salmon:#F08070;
  --slate:#141D22; --white:#fff; --g100:#F4F6F7; --g200:#E2E8EB;
  --g400:#94A3AD; --g600:#4A5568;
  --shadow:0 4px 24px rgba(20,29,34,.08);
  --shadow-lg:0 12px 40px rgba(20,29,34,.12);
  --r:12px; --r-sm:8px;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0d1117;font-family:'DM Sans',sans-serif;padding:56px}
.canvas{position:relative}
.badge-fixed{position:fixed;top:16px;right:16px;background:var(--menthe);color:#fff;padding:10px 18px;border-radius:10px;font-size:12px;font-weight:600;z-index:99;box-shadow:var(--shadow)}

.screen{position:absolute;width:1440px;height:900px;background:var(--g100);overflow:hidden;border-radius:12px;box-shadow:0 0 0 1px #333}
.screen-label{position:absolute;top:-30px;left:0;font-size:11px;color:#888;font-weight:600;letter-spacing:.3px}

/* Header */
.hdr{display:flex;align-items:center;justify-content:space-between;height:64px;padding:0 32px;background:var(--white);border-bottom:1px solid var(--g200)}
.hdr-logo{display:flex;align-items:center;gap:10px;font-family:Comfortaa,sans-serif;font-size:20px;font-weight:700;color:var(--menthe)}
.hdr-nav{display:flex;align-items:center;gap:20px}
.hdr-link{font-size:13px;color:var(--g600);font-weight:500}
.hdr-link.active{color:var(--menthe);font-weight:600}
.hdr-user{display:flex;align-items:center;gap:10px;padding:6px 12px 6px 6px;background:var(--g100);border-radius:24px}
.avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0}
.avatar-sm{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff}

/* Buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:11px 22px;border-radius:10px;font-size:13px;font-weight:600;border:none;font-family:inherit;cursor:pointer}
.btn-primary{background:var(--menthe);color:#fff}
.btn-secondary{background:var(--white);color:var(--slate);border:1px solid var(--g200)}
.btn-salmon{background:var(--salmon);color:#fff}
.btn-ghost{background:transparent;color:var(--g600);border:1px dashed var(--g200)}
.btn-sm{padding:8px 16px;font-size:12px}
.btn-lg{padding:14px 28px;font-size:14px}

/* Tags */
.tag{display:inline-flex;align-items:center;padding:5px 12px;border-radius:16px;font-size:11px;font-weight:500;border:1px solid var(--g200);background:var(--white);color:var(--slate)}
.tag-on{background:var(--salmon);color:#fff;border-color:var(--salmon)}
.tag-menthe{background:rgba(94,163,143,.12);color:var(--menthe);border-color:rgba(94,163,143,.3)}
.badge-pct{background:var(--menthe);color:#fff;padding:5px 12px;border-radius:16px;font-size:12px;font-weight:700}
.badge-pct-high{background:linear-gradient(135deg,var(--menthe),#4a8a78)}

/* Cards */
.card{background:var(--white);border-radius:var(--r);overflow:hidden;box-shadow:var(--shadow);border:1px solid rgba(226,232,235,.6);transition:transform .2s}
.card-img{height:180px;position:relative;background-size:cover;background-position:center}
.card-img::after{content:'';position:absolute;inset:0;background:linear-gradient(to top,rgba(20,29,34,.5) 0%,transparent 50%)}
.card-body{padding:16px}
.card-title{font-family:Comfortaa,sans-serif;font-size:14px;font-weight:700;color:var(--slate);margin-bottom:4px;line-height:1.3}
.card-loc{font-size:11px;color:var(--g600);display:flex;align-items:center;gap:4px;margin-bottom:10px}
.card-price{font-size:18px;font-weight:700;color:var(--menthe)}
.card-price small{font-size:11px;font-weight:400;color:var(--g600)}
.card-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:10px}
.card-meta{display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:10px;border-top:1px solid var(--g200)}
.card-route{font-size:11px;color:var(--g600);display:flex;align-items:center;gap:4px}

/* Sidebar */
.layout{display:flex;height:calc(900px - 64px)}
.sidebar{width:240px;background:var(--white);border-right:1px solid var(--g200);padding:20px 12px;display:flex;flex-direction:column}
.sidebar-label{font-size:9px;letter-spacing:2px;color:var(--g400);padding:0 12px 12px}
.sidebar-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:13px;color:var(--slate);margin-bottom:2px;font-weight:500}
.sidebar-item.on{background:rgba(94,163,143,.1);color:var(--menthe);font-weight:600;border-left:3px solid var(--menthe);margin-left:-3px}
.sidebar-item.dim{opacity:.45}
.content{flex:1;padding:28px 32px;overflow:hidden}

/* Forms */
.form-title{font-family:Comfortaa,sans-serif;font-size:22px;font-weight:700;color:var(--slate);margin-bottom:4px}
.form-sub{font-size:13px;color:var(--g600);margin-bottom:24px}
.field{margin-bottom:18px}
.field label{display:block;font-size:12px;font-weight:500;color:var(--g600);margin-bottom:6px}
.field input,.field select{width:100%;height:44px;padding:0 14px;border:1px solid var(--g200);border-radius:var(--r-sm);font-size:14px;font-family:inherit;color:var(--slate);background:var(--white)}
.field input::placeholder{color:var(--g400)}
.stepper{display:flex;align-items:center;gap:8px;margin-bottom:28px}
.step{width:48px;height:5px;border-radius:3px;background:var(--g200)}
.step.done{background:var(--menthe)}
.step-label{font-size:12px;color:var(--g600);margin-left:8px}

/* Hero strip */
.hero{background:linear-gradient(135deg,var(--slate) 0%,#1e2d35 50%,var(--menthe) 100%);padding:28px 32px;color:#fff}
.hero h1{font-family:Comfortaa,sans-serif;font-size:26px;font-weight:700;margin-bottom:6px}
.hero p{font-size:14px;opacity:.85;max-width:520px;line-height:1.5}
.hero-stats{display:flex;gap:32px;margin-top:20px}
.hero-stat strong{display:block;font-size:22px;font-weight:700;color:var(--nectarine)}
.hero-stat span{font-size:11px;opacity:.7}

/* Filters */
.filters{display:flex;gap:10px;align-items:center;padding:16px 32px;background:var(--white);border-bottom:1px solid var(--g200);flex-wrap:wrap}
.chip{padding:8px 16px;border-radius:20px;font-size:12px;font-weight:500;border:1px solid var(--g200);background:var(--white);color:var(--slate)}
.chip.on{background:var(--slate);color:#fff;border-color:var(--slate)}
.filter-input{display:flex;align-items:center;gap:8px;padding:8px 14px;border:1px solid var(--g200);border-radius:var(--r-sm);font-size:12px;color:var(--g400);background:var(--g100);min-width:160px}

/* Grid */
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;padding:24px 32px}
.grid-2{grid-template-columns:repeat(2,1fr)}

/* Detail page */
.detail{display:flex;gap:28px;padding:24px 32px;height:calc(900px - 64px - 120px)}
.detail-gallery{flex:1.2;border-radius:var(--r);overflow:hidden;position:relative;background:var(--g200)}
.detail-main{height:320px;background-size:cover;background-position:center;position:relative}
.detail-thumbs{display:flex;gap:8px;padding:12px;background:var(--white)}
.detail-thumb{width:72px;height:52px;border-radius:6px;background-size:cover;background-position:center;border:2px solid transparent}
.detail-thumb.on{border-color:var(--menthe)}
.detail-info{flex:1;max-width:420px}
.detail-info h2{font-family:Comfortaa,sans-serif;font-size:22px;font-weight:700;color:var(--slate);margin-bottom:6px}
.rateio{background:var(--white);border-radius:var(--r);padding:18px;box-shadow:var(--shadow);margin:16px 0}
.rateio h3{font-size:12px;font-weight:600;color:var(--g600);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px}
.rateio-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid var(--g100)}
.rateio-row:last-child{border:none;font-weight:700;color:var(--menthe);font-size:16px;padding-top:10px}
.morador{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--g100)}
.morador:last-child{border:none}
.morador-info strong{display:block;font-size:13px;color:var(--slate)}
.morador-info span{font-size:11px;color:var(--g600)}

/* Chat */
.chat-wrap{display:flex;height:calc(900px - 64px)}
.chat-list{width:300px;background:var(--white);border-right:1px solid var(--g200);display:flex;flex-direction:column}
.chat-list-hdr{padding:16px 16px 12px;font-size:15px;font-weight:600;color:var(--slate);display:flex;justify-content:space-between;align-items:center}
.chat-search{margin:0 12px 12px;padding:10px 14px;background:var(--g100);border-radius:20px;font-size:12px;color:var(--g400);display:flex;align-items:center;gap:8px}
.chat-item{display:flex;gap:10px;padding:12px 16px;cursor:pointer;border-left:3px solid transparent}
.chat-item.on{background:rgba(94,163,143,.08);border-left-color:var(--menthe)}
.chat-item-body{flex:1;min-width:0}
.chat-item-name{font-size:13px;font-weight:600;color:var(--slate)}
.chat-item-preview{font-size:11px;color:var(--g600);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.chat-item-meta{text-align:right;font-size:10px;color:var(--g400)}
.chat-unread{background:var(--salmon);color:#fff;font-size:10px;font-weight:700;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-top:4px;margin-left:auto}
.chat-main{flex:1;display:flex;flex-direction:column;background:var(--g100)}
.chat-main-hdr{padding:14px 20px;background:var(--white);border-bottom:1px solid var(--g200);display:flex;align-items:center;gap:12px}
.chat-msgs{flex:1;padding:20px;overflow:hidden;display:flex;flex-direction:column;gap:12px}
.msg{max-width:65%;padding:12px 16px;border-radius:14px;font-size:13px;line-height:1.45}
.msg-in{background:var(--white);color:var(--slate);align-self:flex-start;border-bottom-left-radius:4px;box-shadow:var(--shadow)}
.msg-out{background:var(--menthe);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
.msg-time{font-size:10px;color:var(--g400);margin-top:4px}
.msg-out .msg-time{color:rgba(255,255,255,.7);text-align:right}
.chat-input-bar{padding:14px 20px;background:var(--white);border-top:1px solid var(--g200);display:flex;gap:10px;align-items:center}
.chat-input{flex:1;height:44px;padding:0 18px;border:1px solid var(--g200);border-radius:22px;font-size:13px;font-family:inherit;color:var(--g400)}
.chat-info{width:340px;background:var(--white);border-left:1px solid var(--g200);padding:20px;overflow:hidden}
.chat-info-img{height:120px;border-radius:var(--r-sm);background-size:cover;margin-bottom:14px}

/* Auth */
.auth-center{display:flex;align-items:center;justify-content:center;height:calc(900px - 64px);background:linear-gradient(135deg,var(--g100) 0%,rgba(94,163,143,.08) 100%)}
.auth-card{width:440px;background:var(--white);border-radius:20px;padding:40px;box-shadow:var(--shadow-lg)}
.auth-visual{width:440px;background:linear-gradient(145deg,var(--menthe),var(--slate));border-radius:20px;padding:40px;color:#fff;display:flex;flex-direction:column;justify-content:center}
.auth-visual h2{font-family:Comfortaa,sans-serif;font-size:28px;font-weight:700;margin-bottom:12px;line-height:1.2}
.auth-visual p{font-size:14px;opacity:.9;line-height:1.6}
.auth-visual-stats{margin-top:32px;display:flex;gap:24px}
.auth-visual-stats div strong{display:block;font-size:20px;color:var(--nectarine)}

/* Blur overlay */
.blur-layer{position:absolute;inset:64px 0 0;background:rgba(20,29,34,.88);display:flex;align-items:center;justify-content:center;z-index:10;backdrop-filter:blur(8px)}
.blur-box{text-align:center;color:#fff;max-width:400px}
.blur-box h2{font-family:Comfortaa,sans-serif;font-size:28px;margin-bottom:10px}
.blur-box p{font-size:14px;opacity:.8;margin-bottom:28px;line-height:1.5}
.blur-box .btn{margin:0 6px}

/* Page title bar */
.page-bar{padding:14px 32px;background:var(--white);border-bottom:1px solid var(--g200);display:flex;justify-content:space-between;align-items:center}
.page-bar h1{font-family:Comfortaa,sans-serif;font-size:18px;font-weight:700;color:var(--slate)}
.page-bar span{font-size:12px;color:var(--g600)}

/* Favoritos list */
.fav-row{display:flex;gap:16px;padding:16px;background:var(--white);border-radius:var(--r);margin-bottom:12px;box-shadow:var(--shadow);align-items:center;border:1px solid var(--g200)}
.fav-img{width:100px;height:80px;border-radius:var(--r-sm);background-size:cover;flex-shrink:0}
.fav-body{flex:1}
.fav-body h3{font-size:14px;font-weight:600;color:var(--slate);margin-bottom:4px}
.fav-body p{font-size:12px;color:var(--g600)}

/* Publish form */
.publish-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:24px 32px}
.publish-photos{grid-column:1/-1;background:var(--white);border-radius:var(--r);padding:24px;border:2px dashed var(--g200);text-align:center}
.photo-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:16px}
.photo-slot{height:100px;border-radius:var(--r-sm);background-size:cover;position:relative}
.photo-slot.add{background:var(--g100);display:flex;align-items:center;justify-content:center;color:var(--g400);font-size:24px;border:1px dashed var(--g200)}

.section-title{font-family:Comfortaa,sans-serif;font-size:18px;font-weight:700;color:var(--slate);margin-bottom:4px}
.section-sub{font-size:12px;color:var(--g600);margin-bottom:20px}
.tag-grid{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}
.tag-grid .tag{cursor:pointer}
.tag-grid .tag-on{cursor:pointer}
.plus-note{font-size:10px;color:var(--g400);font-style:italic;margin-top:8px}
"""


def hdr(active: str = "mural", user: str = "Maria Silva", initials: str = "MS",
        color: str = "#5EA38F", logged: bool = True) -> str:
    if not logged:
        return (
            f'<header class="hdr">'
            f'<div class="hdr-logo">{ICON["logo"]} RoomMatch</div>'
            f'<div class="hdr-nav">'
            f'<span class="hdr-link">Como funciona</span>'
            f'<span class="btn btn-secondary btn-sm">Entrar</span>'
            f'<span class="btn btn-primary btn-sm">Cadastrar</span>'
            f'</div></header>'
        )
    links = [("mural", "Explorar"), ("favoritos", "Favoritos"), ("chat", "Mensagens")]
    nav = "".join(
        f'<span class="hdr-link{" active" if k == active else ""}">{l}</span>'
        for k, l in links
    )
    return (
        f'<header class="hdr">'
        f'<div class="hdr-logo">{ICON["logo"]} RoomMatch</div>'
        f'<div class="hdr-nav">{nav}'
        f'<div class="hdr-user">'
        f'<div class="avatar" style="background:{color}">{initials}</div>'
        f'<span style="font-size:13px;font-weight:500;color:var(--slate)">{user}</span>'
        f'</div></div></header>'
    )


def prop_card(p: dict, featured: bool = False) -> str:
    pct_cls = "badge-pct badge-pct-high" if p["pct"] >= 85 else "badge-pct"
    tags = "".join(
        f'<span class="tag{" tag-on" if i == 0 else ""}">{t}</span>'
        for i, t in enumerate(p["tags"][:3])
    )
    return (
        f'<article class="card">'
        f'<div class="card-img" style="background:{p["gradient"]}">'
        f'<span class="{pct_cls}" style="position:absolute;top:12px;right:12px;z-index:2">'
        f'{p["pct"]}% match</span>'
        f'<span class="tag tag-menthe" style="position:absolute;top:12px;left:12px;z-index:2">'
        f'{p["type"]}</span></div>'
        f'<div class="card-body">'
        f'<div class="card-title">{p["title"]}</div>'
        f'<div class="card-loc">{ICON["pin"]} {p["bairro"]}</div>'
        f'<div class="card-price">{money(p["price"])}<small>/mês total</small></div>'
        f'<div class="card-tags">{tags}</div>'
        f'<div class="card-meta">'
        f'<span class="card-route">{ICON["bus"]} {p["route"]}</span>'
        f'<span style="font-size:11px;color:var(--g400)">{p["size"]}</span>'
        f'</div></div></article>'
    )


def sidebar(active: str) -> str:
    items = [
        ("perfil", "Perfil", "👤"),
        ("pref", "Preferências", "🏷"),
        ("fav", "Favoritos", "♥"),
        ("seg", "Segurança", "🔒"),
        ("termos", "Termos", "📄"),
    ]
    rows = ""
    for k, label, _ in items:
        cls = "sidebar-item on" if k == active else "sidebar-item"
        rows += f'<div class="{cls}">{label}</div>'
    return (
        f'<aside class="sidebar"><div class="sidebar-label">MENU</div>'
        f'{rows}'
        f'<div style="flex:1"></div>'
        f'<div class="sidebar-item dim" style="color:var(--salmon)">Sair da conta</div>'
        f'</aside>'
    )


def stepper(step: int, total: int = 3) -> str:
    steps = "".join(
        f'<div class="step{" done" if i < step else ""}"></div>'
        for i in range(total)
    )
    return f'<div class="stepper">{steps}<span class="step-label">Etapa {step} de {total}</span></div>'


def screen_mural() -> str:
    cards = "".join(prop_card(p) for p in PROPERTIES[:6])
    return f"""
    {hdr("mural")}
    <div class="hero">
      <h1>Encontre moradia compatível na RMC</h1>
      <p>Matching por convivência, rateio transparente e tempo até sua faculdade ou trabalho.</p>
      <div class="hero-stats">
        <div class="hero-stat"><strong>847</strong><span>imóveis ativos</span></div>
        <div class="hero-stat"><strong>92%</strong><span>match médio</span></div>
        <div class="hero-stat"><strong>32 min</strong><span>desloc. médio GTFS</span></div>
      </div>
    </div>
    <div class="filters">
      <span class="chip on">Todos</span>
      <span class="chip">Apart.</span>
      <span class="chip">Kitnet</span>
      <span class="chip">Casa</span>
      <span class="chip">República</span>
      <span class="filter-input">{ICON["search"]} Barão Geraldo, Campinas</span>
      <span class="filter-input">Até R$ 1.200</span>
      <span class="filter-input">Pet Friendly</span>
      <span class="btn btn-primary btn-sm">Buscar match</span>
    </div>
    <div class="grid">{cards}</div>
    """


def screen_detail(logged: bool = True) -> str:
    p = PROPERTIES[0]
    thumbs = "".join(
        f'<div class="detail-thumb{" on" if i == 0 else ""}" '
        f'style="background:{p["gradient"]}"></div>'
        for i in range(4)
    )
    rateio = "".join(
        f'<div class="rateio-row"><span>{k}</span><span>{money(v)}</span></div>'
        for k, v in p["breakdown"]
    )
    rateio += f'<div class="rateio-row"><span>Total mensal</span><span>{money(p["price"])}</span></div>'
    moradores = "".join(
        f'<div class="morador"><div class="avatar" style="background:{c}">{ini}</div>'
        f'<div class="morador-info"><strong>{nome}</strong><span>{info}</span></div></div>'
        for ini, nome, info, c in MORADORES
    )
    tags = "".join(f'<span class="tag tag-on">{t}</span>' for t in p["tags"])
    blur = ""
    if not logged:
        blur = (
            f'<div class="blur-layer"><div class="blur-box">'
            f'<h2>Cadastre-se para ver o rateio completo</h2>'
            f'<p>Transparência total: aluguel, condomínio, IPTU e contas estimadas — sem taxas ocultas.</p>'
            f'<span class="btn btn-primary btn-lg">Criar conta grátis</span>'
            f'<span class="btn btn-secondary btn-lg">Já tenho conta</span>'
            f'</div></div>'
        )
    return f"""
    {hdr("mural", logged=logged)}
    <div class="page-bar"><h1>Detalhes do imóvel</h1>
      <span>{ICON["pin"]} {p["bairro"]}</span></div>
    <div class="detail" style="position:relative">
      <div class="detail-gallery">
        <div class="detail-main" style="background:{p["gradient"]}">
          <span class="badge-pct badge-pct-high" style="position:absolute;top:16px;left:16px">{p["pct"]}% afinidade</span>
        </div>
        <div class="detail-thumbs">{thumbs}</div>
      </div>
      <div class="detail-info">
        <h2>{p["title"]}</h2>
        <div style="display:flex;gap:8px;margin-bottom:12px">{tags}</div>
        <div class="rateio"><h3>Rateio transparente</h3>{rateio}</div>
        <div style="display:flex;align-items:center;gap:8px;padding:12px;background:var(--white);border-radius:var(--r-sm);margin-bottom:16px;box-shadow:var(--shadow)">
          {ICON["bus"]}<div><strong style="font-size:13px;color:var(--slate)">{p["route"]}</strong>
          <div style="font-size:11px;color:var(--g600)">{p["dist"]} · EMDEC/EMTU GTFS</div></div></div>
        <div style="margin-bottom:16px"><strong style="font-size:13px;color:var(--slate)">Moradores atuais</strong>{moradores}</div>
        {"<div style='display:flex;gap:10px'><span class='btn btn-secondary'>♥ Favoritar</span><span class='btn btn-primary'>Conversar com locador</span></div>" if logged else ""}
      </div>
      {blur}
    </div>
    """


def screen_auth(login: bool = False) -> str:
    if login:
        form = """
        <div class="form-title">Bem-vinda de volta</div>
        <div class="form-sub">Entre na sua conta RoomMatch</div>
        <div class="field"><label>E-mail</label><input value="maria.silva@puc.br"/></div>
        <div class="field"><label>Senha</label><input type="password" value="••••••••"/></div>
        <div style="text-align:right;margin-bottom:20px"><span style="font-size:12px;color:var(--menthe);font-weight:500">Esqueci minha senha</span></div>
        <span class="btn btn-primary btn-lg" style="width:100%">Entrar</span>
        <p style="text-align:center;margin-top:16px;font-size:13px;color:var(--g600)">Não tem conta? <strong style="color:var(--menthe)">Cadastre-se</strong></p>
        """
    else:
        form = """
        <div class="form-title">Comece agora</div>
        <div class="form-sub">Cadastro gratuito · leva menos de 5 min</div>
        <span class="btn btn-primary btn-lg" style="width:100%;margin-bottom:12px">Sou locatário — busco moradia</span>
        <span class="btn btn-secondary btn-lg" style="width:100%;margin-bottom:20px">Sou locador — tenho vaga</span>
        <p style="text-align:center;font-size:13px;color:var(--g600)">Já tem conta? <strong style="color:var(--menthe)">Entrar</strong></p>
        """
    return f"""
    {hdr(logged=False)}
    <div class="auth-center" style="gap:0;padding:40px">
      <div style="display:flex;gap:0;box-shadow:var(--shadow-lg);border-radius:20px;overflow:hidden">
        <div class="auth-visual">
          <h2>Moradia compatível na Região de Campinas</h2>
          <p>Matching por convivência, custo transparente e rota GTFS até sua faculdade ou trabalho.</p>
          <div class="auth-visual-stats">
            <div><strong>3</strong><span>ODS impactados</span></div>
            <div><strong>847</strong><span>imóveis na RMC</span></div>
            <div><strong>0</strong><span>taxas ocultas</span></div>
          </div>
        </div>
        <div class="auth-card">{form}</div>
      </div>
    </div>
    """


def screen_cadastro(title: str, subtitle: str, step: int, fields: list,
                    role: str) -> str:
    flds = "".join(
        f'<div class="field"><label>{l}</label><input value="{v}"/></div>'
        for l, v in fields
    )
    extra = ""
    if "Preferências" in title:
        tags = ["Pet Friendly", "Silêncio Noturno", "Home Office",
                "LGBTQIA+ Safe", "Vegetariano", "Sem Festas"]
        extra = '<div class="tag-grid">' + "".join(
            f'<span class="tag{" tag-on" if i < 3 else ""}">{t}</span>'
            for i, t in enumerate(tags)
        ) + '</div><p style="font-size:11px;color:var(--g600);margin-bottom:16px">5 de 12 tags selecionadas</p>'
    if "Termos" in title:
        extra = """
        <div style="background:var(--g100);border-radius:var(--r-sm);padding:16px;height:200px;overflow:hidden;font-size:11px;color:var(--g600);line-height:1.6;margin-bottom:16px">
          Ao utilizar o RoomMatch, você concorda com o tratamento de dados pessoais conforme a LGPD...
          O simulador de auxílios possui caráter orientativo. A plataforma não atua como imobiliária...
        </div>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--slate)">
          <input type="checkbox" checked style="width:18px;height:18px;accent-color:var(--menthe)"/>
          Li e aceito os termos de uso e política de privacidade
        </label>"""
    btn = "Finalizar cadastro" if step == 3 else "Continuar"
    return f"""
    {hdr(logged=False)}
    <div class="auth-center">
      <div class="auth-card" style="width:520px">
        {stepper(step)}
        <div class="form-title">{title}</div>
        <div class="form-sub">{subtitle} · {role}</div>
        {extra}{flds}
        <div style="display:flex;gap:10px;margin-top:8px">
          {"<span class='btn btn-secondary'>Voltar</span>" if step > 1 else ""}
          <span class="btn btn-primary" style="flex:1">{btn}</span>
        </div>
      </div>
    </div>
    """


def screen_config(active: str, body: str) -> str:
    return f"""
    {hdr("favoritos" if active == "fav" else "mural")}
    <div class="page-bar"><h1>Configurações</h1><span>Gerencie sua conta</span></div>
    <div class="layout">{sidebar(active)}<div class="content">{body}</div></div>
    """


def body_perfil() -> str:
    return """
    <div class="section-title">Perfil</div>
    <div class="section-sub">Dados da sua conta</div>
    <div style="display:flex;gap:20px;align-items:center;margin-bottom:28px">
      <div class="avatar" style="width:72px;height:72px;font-size:22px;background:#5EA38F">MS</div>
      <div><strong style="font-size:18px;color:var(--slate)">Maria Silva</strong>
      <div style="font-size:13px;color:var(--g600)">maria.silva@puc.br · Locatária</div>
      <div style="font-size:12px;color:var(--menthe);margin-top:4px">Estudante · PUC-Campinas</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:640px">
      <div class="field"><label>Nome completo</label><input value="Maria Silva"/></div>
      <div class="field"><label>Telefone</label><input value="(19) 99876-5432"/></div>
      <div class="field"><label>Instituição</label><input value="PUC-Campinas"/></div>
      <div class="field"><label>Ocupação</label><input value="Estudante de Ciência de Dados"/></div>
      <div class="field"><label>Renda / Orçamento</label><input value="R$ 900/mês"/></div>
    </div>
    <div style="margin-top:24px;display:flex;gap:10px;justify-content:flex-end;max-width:640px">
      <span class="btn btn-secondary">Cancelar</span><span class="btn btn-primary">Salvar alterações</span>
    </div>"""


def body_preferencias() -> str:
    tags_active = ["Pet Friendly", "Silêncio Noturno", "Home Office", "LGBTQIA+ Safe", "Vegetariano"]
    tags_trend = ["420 Friendly", "Sem Festas", "Pet Friendly", "Vegano", "Social Moderado"]
    active = "".join(f'<span class="tag tag-on">{t} ✕</span>' for t in tags_active)
    trend = "".join(f'<span class="tag">{t} +</span>' for t in tags_trend)
    return f"""
    <div class="section-title">Preferências</div>
    <div class="section-sub">Suas tags de convivência · 5/12</div>
    <p style="font-size:13px;font-weight:600;color:var(--slate);margin-bottom:10px">Suas tags</p>
    <div class="tag-grid">{active}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:560px;margin-bottom:24px">
      <div class="field"><label>Orçamento máximo mensal</label><input value="R$ 900"/></div>
      <div class="field"><label>Limiar de compatibilidade</label><input value="70%"/></div>
    </div>
    <p style="font-size:13px;font-weight:600;color:var(--slate);margin-bottom:10px">Em alta na sua região</p>
    <div class="tag-grid">{trend}</div>
    <div style="display:flex;justify-content:flex-end;max-width:640px;margin-top:16px">
      <span class="btn btn-primary">Salvar preferências</span>
    </div>"""


def body_favoritos() -> str:
    rows = ""
    for p in PROPERTIES[:4]:
        rows += f"""
        <div class="fav-row">
          <div class="fav-img" style="background:{p["gradient"]}"></div>
          <div class="fav-body">
            <h3>{p["title"]}</h3>
            <p>{ICON["pin"]} {p["bairro"]} · {money(p["price"])}/mês · <strong style="color:var(--menthe)">{p["pct"]}% match</strong></p>
            <div class="card-tags" style="margin-top:6px">{"".join(f'<span class="tag{" tag-on" if i==0 else ""}">{t}</span>' for i,t in enumerate(p["tags"][:2]))}</div>
          </div>
          <span class="btn btn-secondary btn-sm">Ver detalhes</span>
          <span style="padding:8px">{ICON["heart"]}</span>
        </div>"""
    return f"""
    <div class="section-title">Favoritos</div>
    <div class="section-sub">4 imóveis salvos</div>
    <div style="display:flex;gap:12px;margin-bottom:20px">
      <div class="filter-input" style="flex:1">{ICON["search"]} Buscar nos favoritos</div>
      <div class="filter-input">Mais recentes ▾</div>
    </div>
    {rows}
    <p class="plus-note">[Plus v2] Comparador lado a lado — até 3 imóveis (RF37)</p>"""


def body_seguranca() -> str:
    return """
    <div class="section-title">Segurança</div>
    <div class="section-sub">Senha e privacidade · LGPD</div>
    <div style="max-width:400px">
      <div class="field"><label>Senha atual</label><input type="password" value="••••••••"/></div>
      <div class="field"><label>Nova senha</label><input type="password" value="••••••••"/></div>
      <div class="field"><label>Confirmar nova senha</label><input type="password" value="••••••••"/></div>
      <span class="btn btn-primary">Alterar senha</span>
    </div>
    <div style="margin-top:40px;padding:20px;background:rgba(240,128,112,.08);border-radius:var(--r);max-width:480px;border:1px solid rgba(240,128,112,.2)">
      <strong style="font-size:13px;color:var(--salmon)">Excluir minha conta</strong>
      <p style="font-size:12px;color:var(--g600);margin-top:6px;line-height:1.5">Remove permanentemente seus dados conforme a LGPD. Esta ação não pode ser desfeita.</p>
      <span class="btn btn-salmon btn-sm" style="margin-top:12px">Excluir conta</span>
    </div>"""


def screen_chat(role: str) -> str:
    user = "João Santos" if role == "Locatário" else "Maria Silva"
    initials = "JS" if role == "Locatário" else "MS"
    p = PROPERTIES[0]
    items = ""
    for i, (ini, name, pct) in enumerate([
        ("JS", "João Santos", "92%"), ("AC", "Ana Costa", "78%"),
        ("PL", "Pedro Lima", "85%"), ("RF", "Rita Ferreira", "71%"),
    ]):
        items += f"""
        <div class="chat-item{" on" if i == 0 else ""}">
          <div class="avatar-sm" style="background:{"#5EA38F" if i==0 else "#FBB050"}">{ini}</div>
          <div class="chat-item-body">
            <div class="chat-item-name">{name} · {pct}</div>
            <div class="chat-item-preview">{"Posso te mostrar o imóvel amanhã..." if i==0 else "Olá! Vi seu anúncio..."}</div>
          </div>
          <div class="chat-item-meta">{"14:45" if i==0 else "ontem"}
          {"<div class='chat-unread'>2</div>" if i==0 else ""}</div>
        </div>"""
    msgs = ""
    for ini, name, text, out, time in CHATS:
        cls = "msg msg-out" if out else "msg msg-in"
        msgs += f'<div class="{cls}">{text}<div class="msg-time">{time}</div></div>'
    rateio = "".join(
        f'<div class="rateio-row"><span>{k}</span><span style="font-weight:600">{money(v)}</span></div>'
        for k, v in p["breakdown"][:3]
    )
    return f"""
    {hdr("chat", user="Maria Silva" if role == "Locatário" else "João Santos",
         initials="MS" if role == "Locatário" else "JS",
         color="#5EA38F" if role == "Locatário" else "#FBB050")}
    <div class="chat-wrap">
      <div class="chat-list">
        <div class="chat-list-hdr">Mensagens <span style="font-size:18px;color:var(--menthe)">+</span></div>
        <div class="chat-search">{ICON["search"]} buscar conversa</div>
        <div style="font-size:9px;letter-spacing:1px;color:var(--g400);padding:0 16px 8px">FIXADAS</div>
        {items}
      </div>
      <div class="chat-main">
        <div class="chat-main-hdr">
          <div class="avatar-sm" style="background:#FBB050">JS</div>
          <div><strong style="font-size:14px;color:var(--slate)">{user}</strong>
          <div style="font-size:11px;color:var(--menthe)">online · 92% afinidade</div></div>
        </div>
        <div class="chat-msgs"><div style="text-align:center;font-size:10px;color:var(--g400);margin-bottom:8px">HOJE</div>{msgs}</div>
        <div class="chat-input-bar">
          <input class="chat-input" value="Escreva uma mensagem..." readonly/>
          <span class="btn btn-primary" style="width:44px;height:44px;border-radius:50%;padding:0">{ICON["send"]}</span>
        </div>
      </div>
      <div class="chat-info">
        <div style="font-size:13px;font-weight:600;color:var(--slate);margin-bottom:12px">Info do imóvel</div>
        <div class="chat-info-img" style="background:{p["gradient"]}"></div>
        <strong style="font-size:14px;color:var(--slate)">{p["title"]}</strong>
        <div style="font-size:12px;color:var(--g600);margin:6px 0 14px">{ICON["pin"]} {p["bairro"]}</div>
        <div class="rateio" style="padding:12px;margin:0 0 14px"><h3 style="margin-bottom:8px">Rateio</h3>{rateio}
        <div class="rateio-row"><span>Total</span><span style="color:var(--menthe)">{money(p["price"])}</span></div></div>
        <p style="font-size:11px;font-weight:600;color:var(--slate);margin-bottom:8px">TAGS EM COMUM</p>
        <div class="tag-grid" style="margin-bottom:16px">
          <span class="tag tag-on">Pet Friendly</span><span class="tag tag-on">Silêncio</span>
        </div>
        <span class="btn btn-primary" style="width:100%">Ver imóvel</span>
        <p class="plus-note">[Plus] Compartilhar WhatsApp (RF36)</p>
      </div>
    </div>
    """


def screen_meus_anuncios() -> str:
    rows = ""
    for i, p in enumerate(PROPERTIES[:3]):
        rows += f"""
        <div class="fav-row">
          <div class="fav-img" style="background:{p["gradient"]};width:120px;height:96px"></div>
          <div class="fav-body">
            <h3>{p["title"]}</h3>
            <p>{money(p["price"])}/mês · <span style="color:var(--menthe);font-weight:600">Ativo</span> · {3 - i} candidatos · {p["pct"]}% match médio</p>
            <div class="card-tags" style="margin-top:6px">{"".join(f'<span class="tag">{t}</span>' for t in p["tags"][:2])}</div>
          </div>
          <span class="btn btn-secondary btn-sm">Editar</span>
          <span class="btn btn-primary btn-sm">Ver candidatos</span>
        </div>"""
    return f"""
    {hdr("mural", user="João Santos", initials="JS", color="#FBB050")}
    <div class="page-bar">
      <h1>Meus Anúncios</h1>
      <span class="btn btn-primary btn-sm">+ Publicar novo anúncio</span>
    </div>
    <div style="padding:24px 32px">
      <div style="display:flex;gap:16px;margin-bottom:24px">
        <div style="flex:1;background:var(--white);padding:16px 20px;border-radius:var(--r);box-shadow:var(--shadow)">
          <strong style="font-size:22px;color:var(--menthe)">3</strong><span style="font-size:12px;color:var(--g600);display:block">anúncios ativos</span></div>
        <div style="flex:1;background:var(--white);padding:16px 20px;border-radius:var(--r);box-shadow:var(--shadow)">
          <strong style="font-size:22px;color:var(--salmon)">7</strong><span style="font-size:12px;color:var(--g600);display:block">candidatos esta semana</span></div>
        <div style="flex:1;background:var(--white);padding:16px 20px;border-radius:var(--r);box-shadow:var(--shadow)">
          <strong style="font-size:22px;color:var(--nectarine)">88%</strong><span style="font-size:12px;color:var(--g600);display:block">afinidade média</span></div>
      </div>
      {rows}
    </div>
    """


def screen_publicar() -> str:
    p = PROPERTIES[0]
    return f"""
    {hdr("mural", user="João Santos", initials="JS", color="#FBB050")}
    <div class="page-bar"><h1>Publicar Anúncio</h1><span>Preencha os dados com transparência total</span></div>
    <div class="publish-grid">
      <div class="field"><label>Título do anúncio</label><input value="Quarto em república · Barão Geraldo"/></div>
      <div class="field"><label>Tipo</label><input value="República · Quarto individual"/></div>
      <div class="field"><label>Endereço / Bairro</label><input value="R. Benedito Alves Aranha, 450 · Barão Geraldo"/></div>
      <div class="field"><label>CEP</label><input value="13085-000"/></div>
      <div class="field"><label>Aluguel (R$)</label><input value="600"/></div>
      <div class="field"><label>Condomínio (R$)</label><input value="120"/></div>
      <div class="field"><label>IPTU (R$)</label><input value="45"/></div>
      <div class="field"><label>Estimativa contas (R$)</label><input value="85"/></div>
      <div class="publish-photos">
        <strong style="color:var(--slate)">Fotos do imóvel</strong>
        <p style="font-size:12px;color:var(--g600);margin-top:4px">Mínimo 3 fotos · arraste ou clique para adicionar</p>
        <div class="photo-grid">
          <div class="photo-slot" style="background:{p["gradient"]}"></div>
          <div class="photo-slot" style="background:{PROPERTIES[2]["gradient"]}"></div>
          <div class="photo-slot" style="background:{PROPERTIES[1]["gradient"]}"></div>
          <div class="photo-slot add">+</div>
        </div>
      </div>
      <div style="grid-column:1/-1">
        <label style="font-size:12px;font-weight:500;color:var(--g600)">Tags de convivência do imóvel</label>
        <div class="tag-grid" style="margin-top:8px">
          <span class="tag tag-on">Pet Friendly</span><span class="tag tag-on">Silêncio Noturno</span>
          <span class="tag tag-on">Home Office</span><span class="tag">420 Friendly</span>
          <span class="tag">Sem Festas</span><span class="tag">+ adicionar</span>
        </div>
      </div>
      <div style="grid-column:1/-1;display:flex;gap:12px">
        <span class="btn btn-secondary">Salvar rascunho</span>
        <span class="btn btn-primary">Publicar anúncio</span>
      </div>
    </div>
    """


SCREENS = [
    ("01-locatario-mural", "Locatário · Mural", screen_mural),
    ("02-locatario-imovel-logado", "Locatário · Imóvel (logado)", lambda: screen_detail(True)),
    ("03-locatario-imovel-blur", "Locatário · Imóvel (blur)", lambda: screen_detail(False)),
    ("04-auth-gate", "Auth · Entrar ou cadastrar", lambda: screen_auth(False)),
    ("05-login", "Auth · Login", lambda: screen_auth(True)),
    ("06-locatario-cadastro-dados", "Locatário · Cadastro dados", lambda: screen_cadastro(
        "Dados pessoais", "Nome e contato", 1, [
            ("Nome completo", "Maria Silva"),
            ("E-mail", "maria.silva@puc.br"),
            ("Telefone", "(19) 99876-5432"),
            ("Ocupação / Instituição", "Estudante · PUC-Campinas"),
        ], "Locatário")),
    ("07-locatario-cadastro-preferencias", "Locatário · Cadastro preferências", lambda: screen_cadastro(
        "Preferências de convivência", "Tags, orçamento e limiar", 2, [
            ("Orçamento máximo (R$)", "900"),
            ("Limiar de compatibilidade (%)", "70"),
        ], "Locatário")),
    ("08-locatario-cadastro-termos", "Locatário · Cadastro termos", lambda: screen_cadastro(
        "Termos e privacidade", "Consentimento LGPD", 3, [], "Locatário")),
    ("09-locador-cadastro-dados", "Locador · Cadastro dados", lambda: screen_cadastro(
        "Dados pessoais", "Nome e contato", 1, [
            ("Nome completo", "João Santos"),
            ("E-mail", "joao.santos@gmail.com"),
            ("Telefone", "(19) 98765-4321"),
        ], "Locador")),
    ("10-locador-cadastro-imovel", "Locador · Cadastro imóvel", lambda: screen_cadastro(
        "Dados do imóvel", "Endereço e rateio inicial", 2, [
            ("Endereço / Bairro", "Barão Geraldo, Campinas"),
            ("Tipo de imóvel", "República · Quarto"),
            ("Aluguel (R$)", "600"),
            ("Condomínio + IPTU (R$)", "165"),
        ], "Locador")),
    ("11-locador-cadastro-termos", "Locador · Cadastro termos", lambda: screen_cadastro(
        "Termos e privacidade", "Consentimento LGPD", 3, [], "Locador")),
    ("12-config-perfil", "Config · Perfil", lambda: screen_config("perfil", body_perfil())),
    ("13-config-preferencias", "Config · Preferências", lambda: screen_config("pref", body_preferencias())),
    ("14-config-favoritos", "Config · Favoritos", lambda: screen_config("fav", body_favoritos())),
    ("15-config-seguranca", "Config · Segurança", lambda: screen_config("seg", body_seguranca())),
    ("16-locatario-chat", "Locatário · Chat", lambda: screen_chat("Locatário")),
    ("17-locador-meus-anuncios", "Locador · Meus Anúncios", screen_meus_anuncios),
    ("18-locador-publicar", "Locador · Publicar", screen_publicar),
    ("19-locador-chat", "Locador · Chat candidatos", lambda: screen_chat("Locador")),
]


def build_html() -> str:
    cols = 2
    gap_x, gap_y = 64, 72
    fw, fh = 1440, 900
    frames = []
    for i, (fid, label, builder) in enumerate(SCREENS):
        col = i % cols
        row = i // cols
        x = col * (fw + gap_x)
        y = row * (fh + gap_y)
        body = builder()
        frames.append(
            f'<section class="screen" data-name="{label}" '
            f'style="left:{x}px;top:{y}px">'
            f'<span class="screen-label">{label}</span>{body}</section>'
        )
    rows = (len(SCREENS) + cols - 1) // cols
    canvas_h = rows * (fh + gap_y)
    canvas_w = cols * (fw + gap_x)
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>RoomMatch MVP Hi-Fi · Web 1440×900</title>
<style>{CSS}</style>
</head>
<body>
<div class="badge-fixed">RoomMatch Hi-Fi · {len(SCREENS)} telas · 1440×900 · html.to.design</div>
<div class="canvas" style="width:{canvas_w}px;height:{canvas_h}px">
{"".join(frames)}
</div>
</body>
</html>"""


if __name__ == "__main__":
    html = build_html()
    out = OUT / "roommatch-mvp-canvas.html"
    out.write_text(html, encoding="utf-8")
    # Also write standalone copy
    (OUT / "roommatch-mvp-hifi.html").write_text(html, encoding="utf-8")
    print("Hi-Fi kit: {n} screens → {p}".format(n=len(SCREENS), p=out))
