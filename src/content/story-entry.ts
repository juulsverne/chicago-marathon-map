// The entry to "How it was built": tiny on purpose, because the panel
// tabs render it on the server. The story's own copy (src/content/story.ts) loads only
// when it opens.

export const STORY_ENTRY = {
  eyebrow: "How it was built",
  title: "From an elevator flyer to a live map",
  button: "How it was built",
} as const;
