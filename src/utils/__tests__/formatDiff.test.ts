import { describe, it, expect } from '@jest/globals';
import { formatDiffWithLineNumbers, formatGitDiffOutput } from '../formatDiff';

describe('formatDiffWithLineNumbers', () => {
  it('should add line numbers to added lines', () => {
    const diffContent = `diff --git a/test.txt b/test.txt
--- a/test.txt
+++ b/test.txt
@@ -1,3 +1,4 @@
 line1
+line2
 line3
 line4`;

    const result = formatDiffWithLineNumbers(diffContent);

    expect(result).toContain('Line: 2 +line2');
  });

  it('should add line numbers to removed lines', () => {
    const diffContent = `diff --git a/test.txt b/test.txt
--- a/test.txt
+++ b/test.txt
@@ -1,4 +1,3 @@
 line1
-line2
 line3
 line4`;

    const result = formatDiffWithLineNumbers(diffContent);

    expect(result).toContain('Line: 2 -line2');
  });

  it('should handle both added and removed lines', () => {
    const diffContent = `diff --git a/test.txt b/test.txt
--- a/test.txt
+++ b/test.txt
@@ -1,4 +1,4 @@
 line1
-old line
+new line
 line3
 line4`;

    const result = formatDiffWithLineNumbers(diffContent);

    expect(result).toContain('Line: 2 -old line');
    expect(result).toContain('Line: 2 +new line');
  });

  it('should preserve context lines without line numbers', () => {
    const diffContent = `diff --git a/test.txt b/test.txt
--- a/test.txt
+++ b/test.txt
@@ -1,3 +1,3 @@
 context line
-removed line
+added line`;

    const result = formatDiffWithLineNumbers(diffContent);

    expect(result).toContain(' context line');
    expect(result).not.toContain('Line: 1  context line');
  });

  it('should handle multiple file diffs', () => {
    const diffContent = `diff --git a/file1.txt b/file1.txt
--- a/file1.txt
+++ b/file1.txt
@@ -1,2 +1,2 @@
-old content
+new content
diff --git a/file2.txt b/file2.txt
--- a/file2.txt
+++ b/file2.txt
@@ -1,2 +1,2 @@
-another old
+another new`;

    const result = formatDiffWithLineNumbers(diffContent);

    expect(result).toContain('Line: 1 -old content');
    expect(result).toContain('Line: 1 +new content');
    expect(result).toContain('Line: 1 -another old');
    expect(result).toContain('Line: 1 +another new');
  });

  it('should preserve file headers unchanged', () => {
    const diffContent = `diff --git a/test.txt b/test.txt
--- a/test.txt
+++ b/test.txt
@@ -1,2 +1,2 @@
-old
+new`;

    const result = formatDiffWithLineNumbers(diffContent);

    expect(result).toContain('diff --git a/test.txt b/test.txt');
    expect(result).toContain('--- a/test.txt');
    expect(result).toContain('+++ b/test.txt');
    expect(result).toContain('@@ -1,2 +1,2 @@');
  });

  it('should handle empty diff content', () => {
    const diffContent = '';
    const result = formatDiffWithLineNumbers(diffContent);
    expect(result).toBe('');
  });

  it('should handle diff without changes', () => {
    const diffContent = `diff --git a/test.txt b/test.txt
--- a/test.txt
+++ b/test.txt
@@ -1,3 +1,3 @@
 line1
 line2
 line3`;

    const result = formatDiffWithLineNumbers(diffContent);

    expect(result).toContain(' line1');
    expect(result).toContain(' line2');
    expect(result).toContain(' line3');
    expect(result).not.toContain('Line:');
  });
});

describe('formatGitDiffOutput', () => {
  it('should format git diff output with file path', () => {
    const filePath = 'src/test.js';
    const patch = `--- a/src/test.js
+++ b/src/test.js
@@ -1,3 +1,3 @@
-old line
+new line
 context`;

    const result = formatGitDiffOutput(filePath, patch);

    expect(result).toMatch(/^diff --git a\/src\/test\.js b\/src\/test\.js\n/);
    expect(result).toContain(patch);
  });

  it('should add newline if patch does not end with one', () => {
    const filePath = 'test.txt';
    const patch = 'some patch content';

    const result = formatGitDiffOutput(filePath, patch);

    expect(result).toBe('diff --git a/test.txt b/test.txt\nsome patch content\n');
  });

  it('should not add extra newline if patch already ends with one', () => {
    const filePath = 'test.txt';
    const patch = 'some patch content\n';

    const result = formatGitDiffOutput(filePath, patch);

    expect(result).toBe('diff --git a/test.txt b/test.txt\nsome patch content\n');
  });

  it('should handle empty patch', () => {
    const filePath = 'empty.txt';
    const patch = '';

    const result = formatGitDiffOutput(filePath, patch);

    expect(result).toBe('diff --git a/empty.txt b/empty.txt\n\n');
  });

  it('should handle file paths with special characters', () => {
    const filePath = 'src/components/my-component.vue';
    const patch = 'some changes';

    const result = formatGitDiffOutput(filePath, patch);

    expect(result).toMatch(
      /^diff --git a\/src\/components\/my-component\.vue b\/src\/components\/my-component\.vue\n/,
    );
  });
});
