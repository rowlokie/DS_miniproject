import pytest
import numpy as np
from pathlib import Path
from backend.app.vector_store.store import VectorStore
from backend.app.rag.generator import generate_extractive_answer

def test_vector_store_add_and_similarity_search(tmp_path):
    store = VectorStore(storage_dir=tmp_path)
    
    # Create sample normalized embeddings
    v1 = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32)
    v2 = np.array([0.0, 1.0, 0.0, 0.0], dtype=np.float32)
    embeddings = np.vstack([v1, v2])

    chunks = [
        {"chunk_id": 1, "website_id": 10, "title": "Doc 1", "url": "https://a.com/1", "raw_text": "Content about Python and algorithms"},
        {"chunk_id": 2, "website_id": 10, "title": "Doc 2", "url": "https://a.com/2", "raw_text": "Content about cooking and recipes"}
    ]

    store.add_documents(chunks, embeddings)
    assert len(store.metadata) == 2

    # Query matching doc 1
    query_vec = np.array([0.9, 0.1, 0.0, 0.0], dtype=np.float32)
    results = store.similarity_search(query_vec, top_k=2, threshold=0.2)
    assert len(results) >= 1
    top_meta, score = results[0]
    assert top_meta["chunk_id"] == 1
    assert score > 0.8

def test_extractive_synthesis_grounded_answer():
    retrieved = [
        (
            {
                "title": "FastAPI Guide",
                "url": "https://fastapi.tiangolo.com",
                "raw_text": "FastAPI is a modern, fast web framework for building APIs with Python 3.8+ based on standard Python type hints."
            },
            0.85
        )
    ]
    answer = generate_extractive_answer("What is FastAPI?", retrieved)
    assert "FastAPI" in answer
    assert "web framework" in answer
    assert "Based on information retrieved from" in answer

def test_extractive_synthesis_insufficient_evidence():
    answer = generate_extractive_answer("Who was the president of the moon?", [])
    assert "could not find sufficient information" in answer.lower()
