# cybersamarth.github.io

Personal site for **Sai Samarth J** — cybercrime consultant and OSINT investigator, Bengaluru.

Live at **<https://cybersamarth.github.io>**.

## How it works

Plain static HTML and CSS, served straight from GitHub Pages. `.nojekyll` tells Pages to
skip the Jekyll build, so what's in the repo is exactly what ships.

| Path | What it is |
| --- | --- |
| `index.html` | The whole site — one page |
| `assets/css/style.css` | Styles, dark by default with a light variant |
| `assets/img/` | Headshot and project screenshots |
| `scripts/update_posts.py` | Rewrites the Writing section from the Medium RSS feed |
| `.github/workflows/site.yml` | Runs that script daily and commits any change |

## Editing

Most edits are hand edits to `index.html`. The Writing section is the exception — it sits
between `<!--START_SECTION:posts-->` markers and is overwritten by the script, so edit the
feed, not the markup.

To refresh the post list locally:

```bash
python3 scripts/update_posts.py
```
