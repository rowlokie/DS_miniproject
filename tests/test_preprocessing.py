import pytest
from backend.app.preprocessing.cleaner import clean_text
from backend.app.preprocessing.chunker import split_text_into_chunks, create_page_chunks

def test_clean_text_entities_and_whitespace():
    raw = "Hello &amp; welcome to the &quot;Web Mining&quot; project! \n\n\n\n  Multiple    spaces. "
    cleaned = clean_text(raw)
    assert cleaned == 'Hello & welcome to the "Web Mining" project!\n\nMultiple spaces.'

def test_split_text_into_chunks_overlap():
    text = (
        "Paragraph 1 contains significant details about web scrapers. "
        "It discusses how spiders traverse links on web pages systematically.\n\n"
        "Paragraph 2 delves into inverted indexes and vector similarity. "
        "Cosine similarity measures the angle between dense embeddings."
    )
    chunks = split_text_into_chunks(text, chunk_size=100, chunk_overlap=30)
    assert len(chunks) > 1
    # Check that chunks have content
    for c in chunks:
        assert len(c) > 0

def test_create_page_chunks_metadata():
    chunks = create_page_chunks(
        page_id=42,
        website_id=1,
        url="https://docs.python.org/tutorial",
        title="Python Tutorial",
        text="Python is an easy to learn, powerful programming language. It has efficient high-level data structures.",
        chunk_size=500,
        chunk_overlap=50
    )
    assert len(chunks) == 1
    assert chunks[0]["page_id"] == 42
    assert chunks[0]["website_id"] == 1
    assert chunks[0]["url"] == "https://docs.python.org/tutorial"
    assert chunks[0]["title"] == "Python Tutorial"
    assert "Title: Python Tutorial" in chunks[0]["enriched_text"]
