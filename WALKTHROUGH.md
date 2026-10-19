# Walkthrough script

Use this as a short Loom-style handoff.

1. Start with `npm install && npm run dev`, open `http://localhost:3000`, and let the `SS / PORTFOLIO` loader reach 100%.
2. In the hero, point at the CRT. The screen begins with the SS handshake, then types Shivang's role. Move across the CRT to see the gaze spring toward the screen-space pointer; press Enter or click to advance the screen.
3. Click a channel below the CRT. `Terminal` mirrors the Ask stream; `Beats`, `Scope`, `Signal` and `Reel` are intentionally designed channels. Because no personal media was supplied, Reel explains that it is a no-media design rather than pretending a stock photo is personal.
4. Toggle Settings. Sound is off initially. Dark canvas and Low/High motion detail persist in local storage. Turn on reduced motion in system settings to see the calm static alternative.
5. Scroll chapters 02–06. Origin shows the five real lines and a pending artifact slot. Capabilities is sourced from `content/capabilities.json`. The startup case file is only HOLO✦PAD. Research separates one article from focus areas. Impact shows only the two current owner-reported rows and marks source confirmation pending.
6. Hover or focus a project row in the work section. MEG switches to the project preview channel. Open a row for the deep-linkable case study; placeholder media and unconfirmed URLs remain explicit.
7. In Ask MEG, press one of the five chips. With no API key, the saved grounded answer streams into the transcript and CRT Terminal. With a configured key, Anthropic only selects allowed sources/tools; the server still writes the final answer from `/content`.
8. Switch to Recruiter brief, add a company/role/need, and send a question. The response is framed as a starting point rather than a promise.
9. End at Contact. Since exact contact facts are still pending from intake, the UI deliberately shows the confirmation state instead of making a guessed email clickable.
10. To make the portfolio publishable, fill `CONTENT_TODO.md`, then rerun `npx vue-tsc --noEmit` and `npm run build`.
