/**
 * Adds line numbers to the diff lines that start with + or -
 * @param diffContent The raw diff content from git diff command
 * @returns Formatted diff with line numbers
 */
export function formatDiffWithLineNumbers(diffContent: string): string {
  const lines = diffContent.split('\n');
  let lineNumberOld = 0;
  let lineNumberNew = 0;
  let isDiffContent = false;

  // Extract file headers and line numbers from the diff header
  const headerRegex = /^@@ -(\d+),\d+ \+(\d+),\d+ @@/;

  const formattedLines = lines.map((line) => {
    // Reset flags when a new file diff starts
    if (line.startsWith('diff --git')) {
      isDiffContent = false;
      lineNumberOld = 0;
      lineNumberNew = 0;
      return line;
    }

    // If this is a file header line (---, +++), keep it unchanged
    if (line.startsWith('---') || line.startsWith('+++')) {
      return line;
    }

    // If this is a diff header line, reset line counters and start adding line numbers
    const headerMatch = line.match(headerRegex);
    if (headerMatch) {
      lineNumberOld = parseInt(headerMatch[1], 10) - 1;
      lineNumberNew = parseInt(headerMatch[2], 10) - 1;
      isDiffContent = true;
      return line;
    }

    // Only add line numbers after we've seen the @@ marker
    if (!isDiffContent) {
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

    // Keep other lines unchanged
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
