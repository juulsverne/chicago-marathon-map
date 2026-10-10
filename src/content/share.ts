// Sharing. Only the lazily loaded street card imports this module.

export const SHARE_COPY = {
  button: "Share",
  copied: "Link copied",
  failed: "Couldn't copy it. Here is the link:",
  /** The title a system share sheet shows. */
  title: (street: string, time: string) => `${street} at ${time} CT · Chicago Marathon closures`,
} as const;
