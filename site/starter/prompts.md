# Prompts for your knowledge base

## Add a video

Open this folder in your agent. Copy the prompt below and replace the bracketed text with a YouTube link.

```text
Use Transcript Deck (https://transcriptdeck.com/skill.md) to turn [YouTube URL] into a Markdown file in this folder. Run the setup if needed. Keep the video title, creator, original URL, publication date if available, and timestamp links. Add a relative link to the file in index.md and describe what the video covers in one sentence. If the video has no accessible English captions, ask me for a subtitle file or transcript.
```

## Ask the library a question

```text
Read index.md, then open the transcripts relevant to my question. Cite the original video and timestamp for each recommendation. If sources disagree, tell me where. If the library doesn’t answer my question, say so. Here’s what I’m working on: [describe your project or paste your question].
```

To try it with the included example, ask what choices a creator can make when picking a Creative Commons license.
