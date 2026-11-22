# Transcript Deck

Turn a YouTube link into a Markdown transcript with topic headings and links to the source timestamps. A personal project by [Andrew Peluso](https://andrewpeluso.com/).

[Try Transcript Deck](https://transcriptdeck.com/) · [Download the sample transcript](site/sample.md).

## Try it in your agent

Copy the starter prompt on [Transcript Deck](https://transcriptdeck.com/) into Codex or Claude Code. Your agent can fetch the skill and run its setup in a local macOS or Linux workspace with shell and network access. The script uses compatible tools already available and caches verified copies of the tools it needs otherwise. Browsing and downloads are subject to your agent’s normal permissions.

You can also install the skill for repeat use through the Skills CLI.

```sh
npx skills add andrewpeluso/transcript-deck --skill yt-structure
```

Open a new agent session and ask, “Use yt-structure to turn this YouTube link into Markdown.” Installing this edition in the same agent and scope replaces any earlier skill with the same name.

For videos without accessible English captions, provide a VTT, SRT, or pasted transcript.

## Develop and deploy

```sh
npm test
npm run build
```

Only the generated `dist/` folder is public. To redeploy, authenticate the Netlify CLI to the account that owns the `transcript-deck` project and run:

```sh
TRANSCRIPT_DECK_ORIGIN=https://transcriptdeck.com npm run build
npx netlify-cli deploy --dir dist --site transcript-deck --prod
```

For rollback, open **Deploys** in [the Netlify project](https://app.netlify.com/projects/transcript-deck), select the last verified production deploy, and choose **Publish Deploy**. You can also check out a known-good release in a separate worktree, then rebuild and redeploy using the commands above.

## License

MIT. This edition is based on the upstream `yt-structure` skill, with the original copyright and license retained. The *Wanna Work Together?* sample is credited in the document and licensed separately under CC BY 2.5.
