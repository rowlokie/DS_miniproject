import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from ..config import VECTOR_DIR

logger = logging.getLogger(__name__)

class VectorStore:
    def __init__(self, storage_dir: Optional[Path] = None):
        self.storage_dir = storage_dir or VECTOR_DIR
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.vectors_file = self.storage_dir / "embeddings.npy"
        self.metadata_file = self.storage_dir / "metadata.json"
        
        self.vectors: np.ndarray = np.empty((0, 384), dtype=np.float32)
        self.metadata: List[Dict[str, Any]] = []
        self.load()

    def load(self):
        """Loads saved vectors and metadata from disk if available."""
        try:
            if self.vectors_file.exists() and self.metadata_file.exists():
                with open(self.metadata_file, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
                self.vectors = np.load(self.vectors_file)
                logger.info(f"Loaded {len(self.metadata)} vectors from {self.storage_dir}")
        except Exception as e:
            logger.error(f"Error loading vector store: {e}")
            self.vectors = np.empty((0, 384), dtype=np.float32)
            self.metadata = []

    def save(self):
        """Persists vectors and metadata to disk."""
        try:
            np.save(self.vectors_file, self.vectors)
            with open(self.metadata_file, "w", encoding="utf-8") as f:
                json.dump(self.metadata, f, ensure_ascii=False, indent=2)
            logger.info(f"Saved {len(self.metadata)} vectors to {self.storage_dir}")
        except Exception as e:
            logger.error(f"Error saving vector store: {e}")

    def add_documents(self, chunks: List[Dict[str, Any]], embeddings: np.ndarray):
        """
        Adds chunk metadata and corresponding normalized embeddings.
        """
        if len(chunks) == 0:
            return

        if len(self.metadata) == 0:
            self.vectors = embeddings
        else:
            # Handle dimension compatibility if model changed
            if embeddings.shape[1] != self.vectors.shape[1]:
                logger.warning(
                    f"Dimension mismatch (existing: {self.vectors.shape[1]}, new: {embeddings.shape[1]}). "
                    "Resetting vector index for consistency."
                )
                self.vectors = embeddings
                self.metadata = []
            else:
                self.vectors = np.vstack([self.vectors, embeddings])

        self.metadata.extend(chunks)
        self.save()

    def similarity_search(
        self,
        query_embedding: np.ndarray,
        top_k: int = 4,
        threshold: float = 0.25,
        website_id: Optional[int] = None
    ) -> List[Tuple[Dict[str, Any], float]]:
        """
        Calculates cosine similarity between query_embedding and all stored chunk embeddings.
        Filters by website_id if specified, applies similarity threshold, and returns top_k results.
        """
        if len(self.metadata) == 0 or len(self.vectors) == 0:
            return []

        # Ensure query is 1D normalized float32
        q = np.squeeze(query_embedding).astype(np.float32)
        q_norm = np.linalg.norm(q)
        if q_norm > 1e-6:
            q = q / q_norm

        # Filter indices by website_id if provided
        indices = []
        for i, meta in enumerate(self.metadata):
            if website_id is None or meta.get("website_id") == website_id:
                indices.append(i)

        if not indices:
            return []

        # Vector dot product gives cosine similarity since vectors are L2-normalized
        sub_vectors = self.vectors[indices]
        scores = np.dot(sub_vectors, q)

        # Pair (metadata, score)
        candidates = []
        for local_idx, score in enumerate(scores):
            score_val = float(score)
            if score_val >= threshold:
                global_idx = indices[local_idx]
                candidates.append((self.metadata[global_idx], score_val))

        # Sort descending by similarity score
        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates[:top_k]

    def delete_website_vectors(self, website_id: int):
        """Removes all vectors and metadata associated with a website."""
        new_meta = []
        keep_indices = []
        for i, meta in enumerate(self.metadata):
            if meta.get("website_id") != website_id:
                new_meta.append(meta)
                keep_indices.append(i)

        if len(keep_indices) == 0:
            self.vectors = np.empty((0, self.vectors.shape[1] if len(self.vectors) > 0 else 384), dtype=np.float32)
            self.metadata = []
        elif len(keep_indices) < len(self.metadata):
            self.vectors = self.vectors[keep_indices]
            self.metadata = new_meta

        self.save()

# Global vector store instance
_vector_store_instance = None

def get_vector_store() -> VectorStore:
    global _vector_store_instance
    if _vector_store_instance is None:
        _vector_store_instance = VectorStore()
    return _vector_store_instance
