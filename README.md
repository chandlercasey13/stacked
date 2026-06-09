# Stacked

A redesign of **Stacked** — done-for-you websites for contractors that load
fast, rank on Google, and send every new lead straight to your phone by text.
Built with [Astro](https://astro.build). Content is sourced from the live
client site [stacked.site](https://stacked.site/) and uses their brand colors
(primary blue `#2563eb`). Built by SWE Contracting.

## Pages

| Route            | Description                                                  |
| ---------------- | ----------------------------------------------------------- |
| `/`              | Home — hero, SMS-leads demo, features, process, reviews, CTA |
| `/features`      | Detailed breakdown of each feature                          |
| `/pricing`       | Launch ($99/mo) & Max ($250/mo) plans + pricing FAQ         |
| `/testimonials`  | Real Trustpilot reviews and stats                          |
| `/about`         | Story, values, and the numbers                              |
| `/contact`       | SMS demo widget + lead/free-trial form                      |

## Getting started

```bash
npm install
npm run dev      # start dev server at http://localhost:4321
```

## Commands

| Command           | Action                                       |
| ----------------- | -------------------------------------------- |
| `npm run dev`     | Start local dev server                       |
| `npm run build`   | Build the production site to `./dist/`       |
| `npm run preview` | Preview the production build locally         |

## Project structure

```
src/
  components/   Header, Footer, CtaBand
  layouts/      Layout.astro (shared shell)
  pages/        One .astro file per route
  styles/       global.css (design system / tokens)
public/         Static assets (favicon)
```

## Notes

- The contact form and SMS demo widget are front-end demos. Wire them to your
  CRM / SMS provider to start collecting and texting real leads.
- Copy, pricing, and testimonials are sourced from the live client site
  ([stacked.site](https://stacked.site/)) for the redesign.
# stacked
