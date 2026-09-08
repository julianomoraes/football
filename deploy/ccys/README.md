# Deploying to ccys.com (Bluehost / WordPress) at /schedule/

This folder is a ready-to-upload copy of the schedule site, configured to
live at `ccys.com/schedule/` alongside your existing WordPress install.

## 1. Upload the files

Using cPanel **File Manager** (or an FTP client like FileZilla with your
Bluehost credentials):

1. Go to your site's document root — usually `public_html/` (the same
   folder that already contains WordPress's `wp-config.php`, `wp-admin/`,
   etc.).
2. Create a new folder there named `schedule`.
3. Upload all 5 files from this folder into `public_html/schedule/`:
   `index.html`, `app.js`, `config.js`, `styles.css`, `404.html`, and
   `.htaccess` (that's 6 — cPanel File Manager hides dotfiles by default;
   turn on "Show Hidden Files" in Settings so you can see/upload it, or
   upload it separately and rename it after if your FTP client renames it).

At this point `https://ccys.com/schedule/` should load the site, and
picking a team should update the URL — but a hard refresh on a team's URL
will likely 404. That's what step 2 fixes.

## 2. Let WordPress skip this folder

WordPress's own `.htaccess` at the very root of `public_html/` rewrites
*any* URL that isn't a real file/folder into `index.php` so it can try to
match it as a WordPress page. Since `/schedule/CCW/12U` isn't a real file,
WordPress intercepts it before Apache ever gets to serve our `404.html` —
so you'll see WordPress's own "not found" page instead of the schedule.

Fix: add two lines **above** the `# BEGIN WordPress` block in your root
`.htaccess` (`public_html/.htaccess`, not the one inside `schedule/`):

```apache
RewriteEngine On
RewriteRule ^schedule/ - [L]

# BEGIN WordPress
...
```

This tells Apache "if the URL starts with `schedule/`, stop rewriting and
handle it normally" — which lets the `schedule/.htaccess` file's
`ErrorDocument 404` rule take over for pretty URLs, instead of WordPress's
rewrite grabbing it first.

**Before editing:** download/copy your current root `.htaccess` somewhere
safe first, in case anything needs reverting. Edit it via cPanel File
Manager's built-in editor (safer than FTP for text edits).

## 3. Test

- `https://ccys.com/schedule/` — should load and show the club/team
  dropdowns.
- Pick a team, note the URL changes to e.g. `https://ccys.com/schedule/CCW/12U`.
- Hard-refresh that URL (Cmd/Ctrl+Shift+R) — should reload straight into
  that team's schedule, not a 404 or WordPress's not-found page.
- `https://ccys.com/schedule/nonsense-path` — should still gracefully show
  the schedule site with nothing selected (rather than erroring), since an
  unrecognized path just falls through to no team picked.

## Linking from WordPress

Add a normal link/menu item in WordPress pointing to `/schedule/` — no
plugin needed, since it's just a folder of static files sitting next to
WordPress, not embedded inside it.

## Keeping it updated

`app.js`, `config.js`, and `styles.css` in this folder are plain copies of
the ones in the repo root (https://github.com/julianomoraes/football).
Whenever those are updated, re-copy the three files (not `index.html`,
`404.html`, or `.htaccess` — those stay specific to this deployment) and
re-upload.
