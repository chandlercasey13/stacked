#!/usr/bin/env python3
"""Fetch each contractor site's homepage, find its logo, and download it to logos/."""
import os
import re
import sys
import ssl
import urllib.request
from urllib.parse import urljoin, urlparse

SITES = [
    "jy-painting.com", "inthewoodstreecare.com", "paradisepropertymgmtllc.com",
    "seamlessguttersminnesota.com", "mattilacompanies.com", "arcelectrichouston.com",
    "guardianprohome.com", "powervalleyconstruction.com", "whsonsfinishingsolutionsllc.com",
    "bostboyselectric.com", "zakfixes.com", "ortizlawnscaping.com",
    "redemptionroofingllc.com", "starsstripesconstruction.com", "axiomcon.com",
    "almunacs.com", "triplejconstructionms.com", "jrroofingslc.com",
    "zamoraroofingmadisonwi.com", "lakesareasurfacing.com",
    "aguilarroofingandconstructionllc.com", "hgcroofing.com",
    "duranconstructionllc.org", "amariyahsillustriouslawncare.com",
]

OUT = os.path.join(os.path.dirname(__file__), "..", "logos")
os.makedirs(OUT, exist_ok=True)

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"


def get(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    return urllib.request.urlopen(req, timeout=timeout, context=CTX)


def fetch_html(domain):
    for scheme in ("https://", "http://"):
        for host in (domain, "www." + domain):
            try:
                r = get(scheme + host)
                base = r.geturl()
                html = r.read().decode("utf-8", "ignore")
                return base, html
            except Exception:
                continue
    return None, None


def candidates(html, base):
    """Return ordered list of likely logo URLs (best first)."""
    out = []

    def add(u):
        if not u:
            return
        u = urljoin(base, u.strip())
        if u.startswith("data:"):
            return
        if u not in out:
            out.append(u)

    # 1) <img> tags whose attributes mention "logo"
    for tag in re.findall(r"<img[^>]+>", html, re.I):
        attrs = tag.lower()
        if "logo" in attrs:
            m = re.search(r'(?:data-src|src)\s*=\s*["\']([^"\']+)["\']', tag, re.I)
            if m:
                add(m.group(1))

    # 2) <link rel=*logo*> or schema logo
    for m in re.finditer(r'<link[^>]+rel=["\'][^"\']*logo[^"\']*["\'][^>]*>', html, re.I):
        s = re.search(r'href=["\']([^"\']+)["\']', m.group(0), re.I)
        if s:
            add(s.group(1))

    # 3) og:image
    for m in re.finditer(r'<meta[^>]+property=["\']og:image["\'][^>]*>', html, re.I):
        s = re.search(r'content=["\']([^"\']+)["\']', m.group(0), re.I)
        if s:
            add(s.group(1))

    # 4) apple-touch-icon
    for m in re.finditer(r'<link[^>]+rel=["\'][^"\']*apple-touch-icon[^"\']*["\'][^>]*>', html, re.I):
        s = re.search(r'href=["\']([^"\']+)["\']', m.group(0), re.I)
        if s:
            add(s.group(1))

    # 5) any svg/png in header with "logo" in the path
    for m in re.finditer(r'["\']([^"\']+(?:logo)[^"\']*\.(?:svg|png|webp|jpg|jpeg))["\']', html, re.I):
        add(m.group(1))

    # 6) favicon fallback
    for m in re.finditer(r'<link[^>]+rel=["\'][^"\']*icon[^"\']*["\'][^>]*>', html, re.I):
        s = re.search(r'href=["\']([^"\']+)["\']', m.group(0), re.I)
        if s:
            add(s.group(1))

    return out


def download(url, stem):
    try:
        r = get(url)
        data = r.read()
    except Exception as e:
        return None, str(e)
    if len(data) < 100:
        return None, "too small"
    ctype = r.headers.get("Content-Type", "")
    path = urlparse(url).path
    ext = os.path.splitext(path)[1].lower().lstrip(".")
    if ext not in ("svg", "png", "webp", "jpg", "jpeg", "ico", "gif"):
        ext = {"image/svg+xml": "svg", "image/png": "png", "image/webp": "webp",
               "image/jpeg": "jpg", "image/x-icon": "ico", "image/gif": "gif"}.get(ctype.split(";")[0].strip(), "img")
    fn = os.path.join(OUT, f"{stem}.{ext}")
    with open(fn, "wb") as f:
        f.write(data)
    return os.path.basename(fn), f"{len(data)} bytes"


def main():
    for domain in SITES:
        stem = domain.replace(".", "_")
        base, html = fetch_html(domain)
        if not html:
            print(f"✗ {domain:42s} — could not reach site")
            continue
        cands = candidates(html, base)
        if not cands:
            print(f"⚠ {domain:42s} — no logo candidates found")
            continue
        saved = None
        for u in cands[:5]:
            name, info = download(u, stem)
            if name:
                saved = (name, info, u)
                break
        if saved:
            print(f"✓ {domain:42s} → {saved[0]:28s} ({saved[1]})")
        else:
            print(f"⚠ {domain:42s} — found {len(cands)} candidates but none downloaded")


if __name__ == "__main__":
    main()
