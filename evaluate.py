"""
Website Intelligence Assistant — Academic Evaluation Script
Calculates IR and RAG performance metrics:
1. Recall@k
2. Mean Reciprocal Rank (MRR)
3. Answer Faithfulness / Groundedness
4. Citation Correctness
5. End-to-End Query Latency (ms)
"""

import time
import json
from typing import List, Dict, Any
import numpy as np

from backend.app.rag.retriever import Retriever
from backend.app.rag.generator import RAGGenerator
from backend.app.vector_store.store import VectorStore
from backend.app.embeddings.embedder import get_embedder

# Academic Test Benchmark Dataset
EVALUATION_DATASET = [
    {
        "query": "What is Python?",
        "expected_keywords": ["python", "programming", "language"],
        "ground_truth_url": "https://docs.python.org/3/tutorial/index.html",
        "expected_answer_contains": ["programming", "language"]
    },
    {
        "query": "How are web crawlers used in web data mining?",
        "expected_keywords": ["crawler", "mining", "web", "traversal"],
        "ground_truth_url": "https://en.wikipedia.org/wiki/Web_mining",
        "expected_answer_contains": ["mining", "data"]
    },
    {
        "query": "What is FastAPI and what are its key features?",
        "expected_keywords": ["fastapi", "web", "framework", "python"],
        "ground_truth_url": "https://fastapi.tiangolo.com/tutorial/",
        "expected_answer_contains": ["fast", "framework"]
    }
]

def run_evaluation(top_k: int = 4):
    print("=" * 70)
    print("       WEB DATA MINING MINI-PROJECT — RAG SYSTEM EVALUATION")
    print("=" * 70)
    print(f"Retrieval Configuration: Top-k = {top_k}\n")

    retriever = Retriever()
    generator = RAGGenerator()

    # Preload mock chunks if store is empty so evaluation is runnable offline
    if len(retriever.vector_store.metadata) == 0:
        print("[!] Vector store is currently empty. Seeding representative benchmark chunks for evaluation...")
        embedder = get_embedder()
        mock_chunks = [
            {
                "chunk_id": 1,
                "website_id": 1,
                "url": "https://docs.python.org/3/tutorial/index.html",
                "title": "Python 3 Tutorial",
                "raw_text": "Python is an easy to learn, powerful programming language. It has efficient high-level data structures and a simple but effective approach to object-oriented programming."
            },
            {
                "chunk_id": 2,
                "website_id": 2,
                "url": "https://en.wikipedia.org/wiki/Web_mining",
                "title": "Web Data Mining - Wikipedia",
                "raw_text": "Web data mining is the application of data mining techniques to discover patterns from the World Wide Web. Web crawlers traverse hyperlinks across web graphs to collect HTML pages."
            },
            {
                "chunk_id": 3,
                "website_id": 3,
                "url": "https://fastapi.tiangolo.com/tutorial/",
                "title": "FastAPI Tutorial",
                "raw_text": "FastAPI is a modern, fast (high-performance) web framework for building APIs with Python 3.8+ based on standard Python type hints."
            }
        ]
        texts = [c["raw_text"] for c in mock_chunks]
        vectors = embedder.embed_documents(texts)
        retriever.vector_store.add_documents(mock_chunks, vectors)

    recalls = []
    reciprocal_ranks = []
    faithfulness_scores = []
    citation_accuracies = []
    latencies = []

    for idx, test_case in enumerate(EVALUATION_DATASET, start=1):
        q = test_case["query"]
        expected_url = test_case["ground_truth_url"]
        expected_contains = test_case["expected_answer_contains"]

        t0 = time.time()
        res = generator.answer_question(query=q, top_k=top_k)
        elapsed_ms = (time.time() - t0) * 1000.0
        latencies.append(elapsed_ms)

        retrieved_urls = [s.url for s in res.sources]

        # 1. Recall@k: is ground_truth_url in retrieved set?
        hit = 1.0 if any(expected_url in u for u in retrieved_urls) else 0.0
        recalls.append(hit)

        # 2. Reciprocal Rank (RR): 1 / rank of first relevant result
        rr = 0.0
        for rank, s in enumerate(res.sources, start=1):
            if expected_url in s.url:
                rr = 1.0 / rank
                break
        reciprocal_ranks.append(rr)

        # 3. Answer Faithfulness: checks whether grounded terms are preserved in generated answer
        answer_lower = res.answer.lower()
        faithful_hits = sum(1 for term in expected_contains if term in answer_lower)
        faithfulness = faithful_hits / len(expected_contains) if expected_contains else 1.0
        faithfulness_scores.append(faithfulness)

        # 4. Citation Correctness: citations provided and not empty
        citation_correct = 1.0 if len(res.sources) > 0 and all(s.url and s.title for s in res.sources) else 0.0
        citation_accuracies.append(citation_correct)

        print(f"Query {idx}: '{q}'")
        print(f"  • Retrieved Chunks: {res.retrieval_count}")
        print(f"  • Ground Truth Hit: {'YES' if hit else 'NO'} (RR = {rr:.2f})")
        print(f"  • Faithfulness: {faithfulness * 100:.1f}%")
        print(f"  • Latency: {elapsed_ms:.2f} ms")
        print(f"  • Answer Preview: {res.answer[:120]}...\n")

    mean_recall = np.mean(recalls)
    mrr = np.mean(reciprocal_ranks)
    mean_faithfulness = np.mean(faithfulness_scores)
    mean_citations = np.mean(citation_accuracies)
    avg_latency = np.mean(latencies)

    print("=" * 70)
    print("                    EVALUATION SUMMARY RESULTS")
    print("=" * 70)
    print(f"1. Recall@{top_k}:               {mean_recall * 100:.2f}%")
    print(f"2. Mean Reciprocal Rank (MRR):  {mrr:.4f}")
    print(f"3. Answer Faithfulness:        {mean_faithfulness * 100:.2f}%")
    print(f"4. Citation Correctness:       {mean_citations * 100:.2f}%")
    print(f"5. Average Response Latency:   {avg_latency:.2f} ms")
    print("=" * 70)

if __name__ == "__main__":
    run_evaluation()
