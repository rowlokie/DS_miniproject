import re
from typing import List, Dict, Any
from .cleaner import clean_text

def split_text_into_chunks(
    text: str,
    chunk_size: int = 600,
    chunk_overlap: int = 120,
    min_chunk_length: int = 60
) -> List[str]:
    """
    Splits text recursively or by sliding window into overlapping semantic chunks.
    Prioritizes splitting on paragraph boundaries (\n\n), then sentences (. ! ?),
    then whitespace, before falling back to character slicing.
    """
    cleaned = clean_text(text)
    if not cleaned:
        return []

    if len(cleaned) <= chunk_size:
        return [cleaned]

    chunks: List[str] = []
    start = 0
    text_len = len(cleaned)

    while start < text_len:
        end = start + chunk_size

        if end >= text_len:
            final_chunk = cleaned[start:].strip()
            if len(final_chunk) >= min_chunk_length:
                chunks.append(final_chunk)
            elif chunks:
                # Append remainder to previous chunk if too small
                chunks[-1] = chunks[-1] + "\n" + final_chunk
            else:
                chunks.append(final_chunk)
            break

        # Look for natural split point within overlap window
        lookback_window = cleaned[max(start, end - chunk_overlap):end]
        
        # Priority 1: Double newline (paragraph break)
        split_idx = lookback_window.rfind("\n\n")
        if split_idx != -1:
            actual_split = max(start, end - chunk_overlap) + split_idx + 2
        else:
            # Priority 2: Sentence boundary (. or ! or ? followed by space)
            sentence_matches = list(re.finditer(r'[\.\?!]\s+', lookback_window))
            if sentence_matches:
                match = sentence_matches[-1]
                actual_split = max(start, end - chunk_overlap) + match.end()
            else:
                # Priority 3: Single newline or space
                space_idx = lookback_window.rfind(" ")
                if space_idx != -1:
                    actual_split = max(start, end - chunk_overlap) + space_idx + 1
                else:
                    actual_split = end

        chunk_str = cleaned[start:actual_split].strip()
        if len(chunk_str) >= min_chunk_length:
            chunks.append(chunk_str)

        # Move forward, stepping back by overlap
        step = max(actual_split - chunk_overlap, start + min_chunk_length)
        if step <= start:
            step = actual_split
        start = step

    return chunks


def create_page_chunks(
    page_id: int,
    website_id: int,
    url: str,
    title: str,
    text: str,
    chunk_size: int = 600,
    chunk_overlap: int = 120
) -> List[Dict[str, Any]]:
    """
    Breaks page text into metadata-augmented chunks.
    Prepends contextual document header to improve dense retrieval accuracy.
    """
    raw_chunks = split_text_into_chunks(text, chunk_size, chunk_overlap)
    page_title = title or url
    
    formatted_chunks = []
    for idx, chunk_text in enumerate(raw_chunks):
        # Calculate approximate token count (~4 characters per token in English)
        token_count = max(1, len(chunk_text) // 4)
        
        # Embed with contextual title & source provenance
        enriched_text = f"Title: {page_title}\nSource: {url}\n\n{chunk_text}"
        
        formatted_chunks.append({
            "chunk_index": idx,
            "page_id": page_id,
            "website_id": website_id,
            "url": url,
            "title": page_title,
            "raw_text": chunk_text,
            "enriched_text": enriched_text,
            "token_count": token_count
        })

    return formatted_chunks
