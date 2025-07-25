/**
 * Format a prompt template by replacing placeholders with actual values
 * @param template - The template string with {{placeholder}} syntax
 * @param variables - Object containing placeholder values
 * @returns Formatted string with placeholders replaced
 */
export const formatPrompt = (template: string, variables: Record<string, string>): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match;
  });
};
