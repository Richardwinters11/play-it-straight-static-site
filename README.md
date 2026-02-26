# Advanced Drama Promotional Site

Static promotional website for a stage play, built for college and junior college theater programs.

## Tech Stack

- HTML
- CSS
- JavaScript

## View Locally

Because this is a static site, you can run a simple local web server from the project root.

### Option 1: Python

```bash
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000`

### Option 2: Node (if installed)

```bash
npx serve .
```

Then open the URL shown in terminal (typically `http://localhost:3000`).

## Project Structure

- `index.html` - Home page
- `about.html` - About the play
- `gallery.html` - Production gallery
- `testimonials.html` - Reactions and testimonials
- `excerpt.html` - Script excerpt
- `licensing.html` - Licensing and booking
- `contact.html` - Contact form
- `thank-you.html` - Post-submit confirmation page
- `css/styles.css` - Global styles
- `js/main.js` - Small client-side utilities

## Deployment

Configured for static hosting (for example Netlify) and versioned in GitHub.
