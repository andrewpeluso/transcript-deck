# Transcript Deck

Turn a YouTube link into a Markdown transcript with topic headings and links to the source timestamps. A personal project by [Andrew Peluso](https://andrewpeluso.com/).

[Try Transcript Deck](https://transcriptdeck.com/) · [Download the sample transcript](site/sample.md).

## Install the skill

Use Node.js 22.20 or newer and a current [yt-dlp](https://github.com/yt-dlp/yt-dlp#installation) on macOS or Linux. For macOS, use `brew install yt-dlp`. On Linux, use `pipx install "yt-dlp[default]"`.

**Codex**

```sh
npx skills add andrewpeluso/transcript-deck --skill yt-structure -g -a codex
```

**Claude Code**

```sh
npx skills add andrewpeluso/transcript-deck --skill yt-structure -g -a claude-code
```

Open a new session in your agent and paste this prompt.

> Use the yt-structure skill to turn https://www.youtube.com/watch?v=eRsGyueVLvQ into a Markdown transcript and link me to the file.

Use your own link after the first run. The skill works with accessible English caption tracks. Supply a VTT, SRT, or pasted transcript if YouTube captions are unavailable. This identifier is shared with the upstream `yt-structure` release. Installing this edition in the same agent and scope replaces the previous edition.

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

MIT. This edition is based on the upstream `yt-structure` skill, with the original copyright and license retained. The *Sintel* sample is credited in the document and licensed separately under CC BY 3.0.
