import re
import html

def clean_text(text: str) -> str:
    """
    Cleans raw extracted webpage text by decoding HTML entities,
    removing non-printable characters, stripping extra spaces per line,
    and normalizing paragraph spacing.
    """
    if not text:
        return ""

    # Decode HTML entities like &amp;, &quot;, &#39;
    text = html.unescape(text)

    # Remove non-printable control characters (except newline and tab)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text)

    # Normalize unicode spaces
    text = re.sub(r'[\u2000-\u200b\u202f\u205f\u3000]', ' ', text)

    # Clean lines individually
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in text.splitlines()]
    text = "\n".join(lines)

    # Collapse excessive newlines (more than two consecutive)
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()
