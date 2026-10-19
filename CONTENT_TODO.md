# Content TODO

This list is intentionally factual. Do not replace an item with an invented claim. Every missing item is rendered as a visible placeholder in the current build.

## High priority: publishable identity and contact

- [ ] Confirm the final public email in `content/contact.json`.
- [ ] Confirm the final public domain and set `NUXT_PUBLIC_SITE_URL`.
- [ ] Confirm exact GitHub and LinkedIn URLs, then set `confirmNeeded: false`.
- [ ] Provide X profile URL or delete the X row.
- [ ] Provide a public resume/CV URL or add a real local PDF path.
- [ ] Choose a public location and availability line, or delete those fields.

## Proof and outcomes

- [ ] Add the public source for the 28/101 aeromodelling result in `content/impact.json`.
- [ ] Add the source/timeline link for the HOLO✦PAD Prototype 1.0 milestone.
- [ ] Supply source-backed outcomes for each project. Keep `owner-reported-awaiting-source` until supplied.
- [ ] Add only real MAU/WAU, revenue, retention, time saved or performance numbers. Delete empty metric templates if they are not needed.
- [ ] Confirm QVANTA role wording and frontend framework.
- [ ] Confirm Sketchify year, stack and actual user-visible outcome.
- [ ] Confirm Saathi / Samvaad role, year, deployment state and outcome.

## Media

- [ ] Add the actual `TvHeadScene.jsx`, `ScreenReel.js` or `telebot-portfolio.html` if the procedural scene should be replaced.
- [ ] Add personal photos/videos with captions and alt text in `content/media.json`.
- [ ] Add project screenshots/videos with alt text in each `content/projects.json` media array.
- [ ] Replace `public/og.svg` with a final share image if desired.

## Social proof

- [ ] Add real testimonials with name, role, company, quote and public link.
- [ ] Add the real three-word descriptors with the person/source that supplied each set.
- [ ] Add public press and talk records with links. Program records supplied through private correspondence remain owner-reported until a public personal source exists.
- [x] Add the three owner-reported song releases and public SoundCloud profile in `content/music.json`.

## Research

- [ ] Confirm the Medium publication year and exact URL for the Venn diagram article.
- [ ] Add paper/repo/demo links for focus areas only when they are real and public; focus areas must not be presented as publications.

## Before declaring content complete

- [ ] Search `content/` for `[PLACEHOLDER]` and resolve, delete, or intentionally keep every result.
- [ ] Verify every external URL manually.
- [ ] Run `npx vue-tsc --noEmit` and `npm run build` after content edits.
