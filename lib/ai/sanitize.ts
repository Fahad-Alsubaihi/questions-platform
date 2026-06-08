export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/[^\w\s.,!?;:()\-'"]/g, " ") // remove special chars
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000); // cap length
}
