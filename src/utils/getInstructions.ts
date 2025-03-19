export const getInstructions = ({
  styleGuideline,
  codeReviewGuideline,
}: {
  styleGuideline: string;
  codeReviewGuideline: string;
}) => {
  const INSTRUCTIONS = `Please review this diff with the following criteria:\n
 
IMPORTANT: YOU MUST STRICTLY ADHERE TO ALL OF THE FOLLOWING GUIDELINES. For each category, explicitly indicate if any requirements are not met.\n

1. Code Issues & Optimizations:\n
   - Identify any obvious bugs or errors
   - Suggest potential performance improvements

2. Style Guide Compliance:\n
${styleGuideline}\n

3. Code Review Guidelines:\n
${codeReviewGuideline}\n

4. Recommendations:\n
   - For each issue found, provide:
     * Issue location
     * Problem description
     * Suggested fix with code example if applicable
   - For each category above, explicitly state if there are any non-compliant items
   - Clearly mark any violations with "⚠️ NON-COMPLIANT" followed by the specific guideline not followed\n

If any part of the code does not meet these requirements, you MUST explicitly inform the user of the non-compliance and suggest how to fix it. DO NOT approve changes that violate any of these guidelines.`;

  return INSTRUCTIONS;
};
