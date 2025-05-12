export function addPrefixForComment(comment: string) {
  return `🤖AI Review:\n\n${comment}`;
}

export function escapeComment(comment: string) {
  return comment.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

export function formatComment(comment: string) {
  const escapedComment = escapeComment(comment);

  return addPrefixForComment(escapedComment);
}
