import re
from urllib.parse import urljoin, urlparse, urldefrag
from typing import Set, Tuple, List
from bs4 import BeautifulSoup

def clean_extracted_text(text: str) -> str:
    """Normalizes whitespace and blank lines."""
    # Replace multiple spaces/tabs with single space
    text = re.sub(r'[ \t]+', ' ', text)
    # Replace more than 2 consecutive newlines with 2
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def extract_content_and_links(html: str, base_url: str) -> Tuple[str, str, List[str]]:
    """
    Parses HTML content, strips boilerplate (nav, footer, script, style, etc.),
    extracts clean formatted text, page title, and outgoing normalized internal links.
    """
    soup = BeautifulSoup(html, "html.parser")

    # Extract title
    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()
    elif soup.find("h1"):
        title = soup.find("h1").get_text(strip=True)

    # Remove unwanted tags
    unwanted_tags = [
        "script", "style", "nav", "footer", "header", "aside",
        "noscript", "svg", "iframe", "form", "button", "input",
        "select", "textarea", "menu", "dialog"
    ]
    for tag in soup.find_all(unwanted_tags):
        tag.decompose()

    # Extract structured text preserving headings and paragraphs
    lines = []
    
    # Check for main or article tag if present to prioritize core content
    main_content = soup.find("main") or soup.find("article") or soup.find("div", {"role": "main"}) or soup.body or soup

    for elem in main_content.find_all(["h1", "h2", "h3", "h4", "p", "li", "pre", "code", "blockquote", "table"]):
        text = elem.get_text(separator=" ", strip=True)
        if not text:
            continue
        
        tag_name = elem.name.lower()
        if tag_name in ["h1", "h2"]:
            lines.append(f"\n\n## {text}\n")
        elif tag_name in ["h3", "h4"]:
            lines.append(f"\n### {text}\n")
        elif tag_name == "li":
            lines.append(f"• {text}")
        elif tag_name == "pre":
            lines.append(f"\n```\n{text}\n```\n")
        else:
            lines.append(text)

    full_text = "\n".join(lines)
    cleaned = clean_extracted_text(full_text)
    
    # If structural extraction was too sparse, fallback to general get_text
    if len(cleaned) < 50 and soup.body:
        fallback_text = soup.body.get_text(separator="\n", strip=True)
        cleaned = clean_extracted_text(fallback_text)

    # Extract valid links
    links = []
    base_domain = urlparse(base_url).netloc.lower()

    for a_tag in soup.find_all("a", href=True):
        raw_href = a_tag["href"].strip()
        if not raw_href or raw_href.startswith(("#", "javascript:", "mailto:", "tel:")):
            continue
        
        # Resolve relative URLs
        absolute_url = urljoin(base_url, raw_href)
        # Strip fragment (#section)
        defragged_url, _ = urldefrag(absolute_url)
        
        parsed = urlparse(defragged_url)
        # Ensure scheme is http/https
        if parsed.scheme in ["http", "https"]:
            # Ignore typical static binary extensions
            path_lower = parsed.path.lower()
            if any(path_lower.endswith(ext) for ext in [
                ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico",
                ".pdf", ".zip", ".tar", ".gz", ".mp4", ".mp3", ".wav",
                ".exe", ".dmg", ".apk", ".css", ".js"
            ]):
                continue
            links.append(defragged_url)

    # Deduplicate while preserving order
    seen: Set[str] = set()
    unique_links = []
    for l in links:
        if l not in seen:
            seen.add(l)
            unique_links.append(l)

    return title, cleaned, unique_links
