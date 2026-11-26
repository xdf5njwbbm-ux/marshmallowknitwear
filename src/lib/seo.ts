import { useEffect } from "react";

export const SITE_NAME = "Marshmallow Knitwear";
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? `https://xdf5njwbbm-ux.github.io${import.meta.env.BASE_URL}`).replace(/\/$/, "");
const DEFAULT_DESC = "Handmade knitted cardigans for women and men — cozy, artistic and made with love, one stitch at a time.";

function setMeta(attr: "name" | "property", key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = value;
}

/** Page title, description, social cards, canonical URL and optional structured data. */
export function useMeta(o: { title?: string; description?: string; image?: string; path?: string; jsonLd?: object | null; noindex?: boolean }) {
  const key = JSON.stringify(o);
  useEffect(() => {
    const title = o.title ? `${o.title} | ${SITE_NAME}` : `${SITE_NAME} — Handmade Cardigans, Knitted With Love`;
    document.title = title;
    const desc = o.description ?? DEFAULT_DESC;
    setMeta("name", "description", desc);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:type", o.jsonLd ? "product" : "website");
    if (o.image) setMeta("property", "og:image", o.image);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "robots", o.noindex ? "noindex" : "index,follow");
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = `${SITE_URL}${o.path ?? location.pathname.replace(import.meta.env.BASE_URL.replace(/\/$/, ""), "")}`;
    document.head.querySelectorAll("script[data-mk-ld]").forEach((s) => s.remove());
    if (o.jsonLd) {
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.dataset.mkLd = "1";
      s.textContent = JSON.stringify(o.jsonLd);
      document.head.appendChild(s);
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}
