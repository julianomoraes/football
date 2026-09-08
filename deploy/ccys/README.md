# Deploying to ccys.com (Bluehost / WordPress) at /schedulev2/

This folder is a ready-to-upload copy of the schedule site, styled to
match ccys.com's own look (navy/red, "Fjalla One" + "Lato" fonts, logo and
hero photo pulled live from ccys.com's own media library). It's configured
to live at `ccys.com/schedulev2/` — a separate test path alongside the
existing WordPress `/schedule/` page, so you can try it out without
touching the live page. Once you're happy with it, it can be moved to
`/schedule/` (see the end of this file).

## 1. Upload the files

Using cPanel **File Manager** (or an FTP client like FileZilla with your
Bluehost credentials):

1. Go to your site's document root — usually `public_html/` (the same
   folder that already contains WordPress's `wp-config.php`, `wp-admin/`,
   etc.).
2. Create a new folder there named `schedulev2`.
3. Upload all files from this folder into `public_html/schedulev2/`:
   `index.html`, `app.js`, `config.js`, `styles.css`, `404.html`, and
   `.htaccess` (cPanel File Manager hides dotfiles by default — turn on
   "Show Hidden Files" in Settings so you can see/upload it). Don't upload
   `build.sh` or this `README.md` — they're just for maintaining this
   folder in the repo, not needed on the server.

At this point `https://ccys.com/schedulev2/` should load the site, and
picking a team should update the URL — but a hard refresh on a team's URL
will likely 404. That's what step 2 fixes.

## 2. Let WordPress skip this folder

WordPress's own `.htaccess` at the very root of `public_html/` rewrites
*any* URL that isn't a real file/folder into `index.php` so it can try to
match it as a WordPress page. Since `/schedulev2/CCW/12U` isn't a real
file, WordPress intercepts it before Apache ever gets to serve our
`404.html` — so you'll see WordPress's own "not found" page instead of the
schedule.

Fix: add two lines **above** the `# BEGIN WordPress` block in your root
`.htaccess` (`public_html/.htaccess`, not the one inside `schedulev2/`):

```apache
RewriteEngine On
RewriteRule ^schedulev2/ - [L]

# BEGIN WordPress
...
```

This tells Apache "if the URL starts with `schedulev2/`, stop rewriting
and handle it normally" — which lets the `schedulev2/.htaccess` file's
`ErrorDocument 404` rule take over for pretty URLs, instead of
WordPress's rewrite grabbing it first.

**Before editing:** download/copy your current root `.htaccess` somewhere
safe first, in case anything needs reverting. Edit it via cPanel File
Manager's built-in editor (safer than FTP for text edits).

## 3. Test

- `https://ccys.com/schedulev2/` — should load with the ccys.com-styled
  header and the club/team dropdowns.
- Pick a team, note the URL changes to e.g.
  `https://ccys.com/schedulev2/CCW/12U`.
- Hard-refresh that URL (Cmd/Ctrl+Shift+R) — should reload straight into
  that team's schedule, not a 404 or WordPress's not-found page.
- `https://ccys.com/schedulev2/nonsense-path` — should still gracefully
  show the schedule site with nothing selected, rather than erroring.

## Moving to /schedule later

Once you're happy with it and want it to replace the current WordPress
`/schedule/` page:

1. Change `window.APP_BASE_PATH` in `index.html` from `"/schedulev2"` to
   `"/schedule"`.
2. Change the path in `404.html` (both the regex and the redirect target)
   and in `.htaccess` from `schedulev2` to `schedule`.
3. Update the exclusion rule in the root `.htaccess` from
   `^schedulev2/` to `^schedule/`.
4. Upload these files into `public_html/schedule/`, replacing (or
   alongside, then deleting) whatever WordPress page/plugin currently
   serves that URL.

## Linking from WordPress

Add a normal link/menu item in WordPress pointing to `/schedulev2/` (or
`/schedule/` after the move) — no plugin needed, since it's just a folder
of static files sitting next to WordPress, not embedded inside it.

## Keeping it updated

Run `./build.sh` from this folder to re-copy `app.js`, `config.js`, and
`styles.css` from the repo root, then re-upload those three files (not
`index.html`, `404.html`, or `.htaccess` — those stay specific to this
deployment).
