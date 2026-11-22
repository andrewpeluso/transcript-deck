# Transcript Deck

Turn a YouTube link into a Markdown transcript with topic headings and links to the source timestamps. A personal project by [Andrew Peluso](https://andrewpeluso.com/).

[Try Transcript Deck](https://transcriptdeck.com/) · [Download the sample transcript](site/sample.md).

[Build a YouTube knowledge base](https://transcriptdeck.com/guides/youtube-knowledge-base/) or [download the Markdown starter kit](https://transcriptdeck.com/youtube-knowledge-base-starter.zip).

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

The build needs Node and the `zip` command. Only the generated `dist/` folder is public. To redeploy, authenticate the Netlify CLI to the account that owns the `transcript-deck` project and run these commands.

```sh
TRANSCRIPT_DECK_ORIGIN=https://transcriptdeck.com npm run build
npx netlify-cli deploy --dir dist --site transcript-deck --prod
```

For rollback, open **Deploys** in [the Netlify project](https://app.netlify.com/projects/transcript-deck), select the last verified production deploy, and choose **Publish Deploy**. You can also check out a known-good release in a separate worktree, then rebuild and redeploy using the commands above.

## Search and analytics

The build publishes `/robots.txt` and `/sitemap.xml`. Verify the domain property in Google Search Console with a DNS TXT record and submit `https://transcriptdeck.com/sitemap.xml`.

Set `TRANSCRIPT_DECK_GA4_ID` at build time to the web stream ID from the dedicated Transcript Deck GA4 property. The build omits the tag when the ID is unset. Turn off enhanced measurement for the stream. Register `button_position` as an event-scoped custom dimension to compare the hero and setup buttons. In Realtime or DebugView, verify that a successful starter prompt copy sends one `starter_prompt_copy` event with the canonical page URL and button position. Clipboard errors, manual selection, other copy buttons, and the ZIP download do not send this event.

After the first full 28 days of data, check Search Console impressions, clicks, and queries for each page. Compare organic landing-page sessions with starter prompt copies in GA4. A copy measures interest in trying the skill. It cannot establish that the agent returned a transcript.

For periodic search and AI answer spot checks, use the same queries, search surface, country, and language. Record the date, where the site appeared, and which URL was linked or cited.

- YouTube transcript AI skill
- Claude Code YouTube transcript skill
- Codex YouTube transcript skill
- YouTube transcripts for AI knowledge base
- How to build a YouTube knowledge base

## License

MIT. This edition is based on the upstream `yt-structure` skill, with the original copyright and license retained. The *Wanna Work Together?* sample is credited in the document and licensed separately under CC BY 2.5.
