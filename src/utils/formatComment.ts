export function addPrefixForComment(comment: string) {
  return `🤖AI Review:\n\n${comment}`;
}

/**
 * Escape special characters for shell arguments
 * This is used for any string that needs to be passed as a shell argument
 */
export function escapeShellArg(arg: string) {
  return arg.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

export function escapeComment(comment: string) {
  return escapeShellArg(comment);
}

export function formatComment(comment: string) {
  const escapedComment = escapeComment(comment);

  return addPrefixForComment(escapedComment);
}
