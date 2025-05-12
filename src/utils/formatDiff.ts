/**
 * Adds line numbers to the diff lines that start with + or -
 * @param diffContent The raw diff content from git diff command
 * @returns Formatted diff with line numbers
 */
export function formatDiffWithLineNumbers(diffContent: string): string {
  const lines = diffContent.split('\n');
  let lineNumberOld = 0;
  let lineNumberNew = 0;

  // Extract file headers and line numbers from the diff header
  const headerRegex = /^@@ -(\d+),\d+ \+(\d+),\d+ @@/;

  const formattedLines = lines.map((line) => {
    // If this is a diff header line, reset line counters
    const headerMatch = line.match(headerRegex);
    if (headerMatch) {
      lineNumberOld = parseInt(headerMatch[1], 10) - 1;
      lineNumberNew = parseInt(headerMatch[2], 10) - 1;
      return line;
    }

    // Handle normal diff lines
    if (line.startsWith('-')) {
      lineNumberOld++;
      return `Line: ${lineNumberOld} ${line}`;
    } else if (line.startsWith('+')) {
      lineNumberNew++;
      return `Line: ${lineNumberNew} ${line}`;
    } else if (line.startsWith(' ')) {
      // Context lines (unchanged)
      lineNumberOld++;
      lineNumberNew++;
      return line;
    }

    // Keep other lines unchanged (like file headers)
    return line;
  });

  return formattedLines.join('\n');
}

export function formatGitDiffOutput(filePath: string, patch: string): string {
  let formattedDiff = `diff --git a/${filePath} b/${filePath}\n`;
  formattedDiff += patch;
  if (!patch.endsWith('\n')) {
    formattedDiff += '\n';
  }
  return formattedDiff;
}
