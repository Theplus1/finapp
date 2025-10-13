export class MarkdownUtil {
  static escapse(text: string): string {
    return text.replace(/[_\-\.\!\(\)]/g, '\\$&');
  }
}
