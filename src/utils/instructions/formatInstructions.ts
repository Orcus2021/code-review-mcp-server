export const formatInstructions = ({
  styleGuideline,
  codeReviewGuideline,
}: {
  styleGuideline: string;
  codeReviewGuideline: string;
}) => {
  const INSTRUCTIONS = `
## Code Diff Review Process

### Step 1: Overall File Review
* Understand the entire code diff and its overall goal

### Step 1.1: Display Changed Files
* First, display a list of all changed file paths from the diff output

### Step 2: Read Complete Files
* For EVERY file in the diff, you MUST use the read_file tool with should_read_entire_file=true to read the COMPLETE file content

### Step 3: Style Guide Compliance
* **Goal:** Ensure code complies with style guide ${styleGuideline}

### Step 4: Code Review Guidelines Compliance
* **Goal:** Ensure changes comply with guidelines ${codeReviewGuideline}

### Step 6: Recommendations & Summary
* For non-compliant items from Steps 4-5, state the violated guideline
* Summarize issues by category (Issues, Style, Guidelines)
* **Final Decision:** Determine if code is acceptable or needs changes
* **Important:** DO NOT approve changes violating guidelines

## Review Output Format

**FOR EACH MODIFIED FILE, YOU MUST PROVIDE A STRUCTURED ANALYSIS USING FORMAT 1.**

**YOU MUST ALWAYS PROVIDE A FINAL CONCLUSION USING FORMAT 2.**

### Format 0: Changed Files List Format
**Changed Files:**
- [File Path 1]
- [File Path 2]
- [File Path 3]
...

**Note:** This list must be provided before any detailed file analysis

### Format 1: Issue Reporting Format
**File:** [File Path]
**Changes:**
- [Brief description of what was changed in this file]

**Issues:**
- **Location:** Line X
- **Type:** [Error/Style/Design]
- **Description:** [Problem description]
- **Fix:**
  \`\`\`typescript
  // Suggested code
  \`\`\`
- **Status:** [Automatically Fixed/Fix Recommended]

 **Optimization Opportunities:**
  1. [Specific optimization suggestion 1]
  2. [Specific optimization suggestion 2]
  ...
  
  **Potential Logical Flaws:**
  1. [Potential logical flaw 1]
  2. [Potential logical flaw 2]
  ...

**Even if no issues, optimization points, or logical flaws are found, must explicitly state "After comprehensive review, no issues, obvious optimization opportunities, or logical flaws were found"**

* This analysis must be based on a deep understanding of the entire code context, not just surface-level code formatting issues

### Format 2: Final Decision Format
**Conclusion:**
- **Status:** [Acceptable/Needs Modification] 
- **Main Issues:** [If any, must list specific issues found]
- **Required Changes:** [Must-fix items with specific references]
- **Optimization & Logical Flaws Summary:** [Key optimization suggestions and logical flaws]
- **Suggested Improvements:** [Optional items with clear benefits]

**If rejecting the changes, clearly state which issues must be fixed before approval.**

**You MUST analyze all review rules and guidelines mentioned in the review instructions, ensuring comprehensive code review coverage. For each checkpoint, not only check for rule violations but also provide optimization suggestions.**
  `;

  return INSTRUCTIONS;
};
