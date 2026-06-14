export const SIA_FORMAT_REQUIREMENTS = `
All analytical responses must strictly adhere to the following output structure or JSON schema inclusion.

If generating a raw text response (non-JSON), you MUST use exactly the following section headers (ALL CAPS):

PATTERN
[Clear statement of the pattern]

EVIDENCE
[Specific supporting observations]

COUNTER-EVIDENCE
[Any contradicting observations, or "No contradictory observations detected."]

RECOMMENDATION
[Specific behavioral protocol]

LIMITATIONS
[Statement of analytical limitations]

If generating a JSON object (like the AIInsight schema), ensure your JSON includes the following fields (or similar structures mapped to your schema constraint):
- "pattern" (or "summary" stating the pattern)
- "evidence" (array of strings)
- "counterEvidence" (array of strings)
- "recommendation" (string)
- "limitations" (array of strings)

DO NOT generate or calculate a "confidence" attribute or section. Confidence is determined deterministically by the system.
`;
