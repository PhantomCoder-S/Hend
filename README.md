# Hend's birthday gift

A mobile-first surprise site: lock screen with a button that runs away twice,
an animated heart with "Happy Birthday", a heart made of "I love you" in many
languages, and a final screen where your message is typed out.

No build step, no dependencies. Plain HTML, CSS and JS.

## Make it yours
Everything lives in `config.js`:
- `name`: her name
- `music`: path to your song (default `assets/song.mp3`)
- `letter`: your message for the last screen

## Add a song
Copy an mp3 to `assets/song.mp3`. It starts on her first tap, and a small
speaker button lets her mute it. No file means no music and no button.

## Preview on your computer
```bash
python3 -m http.server 8000
```
Open http://localhost:8000. On your phone, use `http://<your-pc-ip>:8000`
while both are on the same Wi-Fi.

## Put it online (GitHub Pages)
```bash
git init -b main
git add .
git commit -m "Birthday gift"
gh repo create hend-birthday --public --source=. --push
```
Then on GitHub: Settings > Pages > Deploy from a branch > `main` / root.
Your link will be `https://<your-username>.github.io/hend-birthday/`.
The page has `noindex`, so search engines are asked to skip it, but anyone
with the link can open it.
