# 📄 Tech Papers

Interactive, annotated walkthroughs of classic computer-science papers — rendered as standalone HTML pages.

## ▶️ View the pages

**[Open the live viewer →](https://buildersnk.github.io/tech-papers/)**

The viewer has a **dropdown** listing every `.html` page in this repo. Pick one and it loads
right there, embedded. It discovers files automatically through the GitHub API, so **anything you
add in the future shows up on its own — no edits needed here.**

> ℹ️ Why not embed the dropdown directly in this README? GitHub strips `<script>`, `<select>`,
> and `<iframe>` when it renders Markdown, so a live picker can't run inside a README. The viewer
> page ([`index.html`](index.html)) does the job instead, served via GitHub Pages.

## 📚 Current pages

<!-- This list is just for convenience; the viewer's dropdown is always the source of truth. -->

- [Annotated Transformer](https://buildersnk.github.io/tech-papers/annotated-transformer.html)
- [Annotated Transformer (interactive)](https://buildersnk.github.io/tech-papers/interactive/annotated-transformer.html)
- [Google MapReduce](https://buildersnk.github.io/tech-papers/interactive/google-mapreduce.html)
- [Google Spanner](https://buildersnk.github.io/tech-papers/interactive/google-spanner.html)

## ➕ Adding a new page

1. Drop a new `.html` file anywhere in the repo.
2. Commit and push.

That's it. The dropdown in the [live viewer](https://buildersnk.github.io/tech-papers/) picks it up
automatically on the next load.
