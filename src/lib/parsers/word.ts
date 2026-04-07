import mammoth from 'mammoth';

export interface ParsedSection {
  heading?: string;
  text: string;
}

export async function parseWord(buffer: Buffer): Promise<ParsedSection[]> {
  const result = await mammoth.extractRawText({ buffer });
  const fullText = result.value;

  // Split by headings (detected by common patterns)
  const lines = fullText.split('\n');
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection = { text: '' };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect headings: short lines that might be headers
    const isHeading = trimmed.length < 80 && (
      /^[一二三四五六七八九十\d]+[.、．]/.test(trimmed) ||
      /^[A-Z][A-Z\s]{2,30}$/.test(trimmed) ||
      /^#{1,3}\s/.test(trimmed) ||
      /^\d+(\.\d+)+\s/.test(trimmed)
    );

    if (isHeading && currentSection.text.trim()) {
      sections.push(currentSection);
      currentSection = { heading: trimmed, text: '' };
    } else {
      currentSection.text += trimmed + '\n';
    }
  }

  if (currentSection.text.trim()) {
    sections.push(currentSection);
  }

  return sections.length > 0 ? sections : [{ text: fullText }];
}
