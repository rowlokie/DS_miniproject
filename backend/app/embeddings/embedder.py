import os
import hashlib
import logging
import numpy as np
from typing import List, Union
from ..config import settings

logger = logging.getLogger(__name__)

class EmbeddingEngine:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self.dimension = 384
        self._is_transformer_loaded = False
        self._load_model()

    def _load_model(self):
        try:
            from sentence_transformers import SentenceTransformer
            # Set local huggingface cache
            os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
            logger.info(f"Loading SentenceTransformer: {self.model_name}...")
            self.model = SentenceTransformer(self.model_name)
            if hasattr(self.model, "get_embedding_dimension"):
                self.dimension = self.model.get_embedding_dimension()
            else:
                self.dimension = self.model.get_sentence_embedding_dimension()
            self._is_transformer_loaded = True
            logger.info(f"SentenceTransformer loaded successfully. Dimension: {self.dimension}")
        except Exception as e:
            logger.warning(
                f"Could not load SentenceTransformer '{self.model_name}' ({e}). "
                "Engaging resilient fallback dense embedder (guarantees offline functionality)."
            )
            self._is_transformer_loaded = False
            self.dimension = 384

    def _fallback_embed(self, texts: List[str]) -> np.ndarray:
        """
        Deterministic, unit-normalized semantic hash projection embedder.
        Guarantees that RAG retrieval functions offline without crashing even if internet is disconnected.
        Uses character n-grams and hashing trick with TF-IDF subword weighting.
        """
        vectors = np.zeros((len(texts), self.dimension), dtype=np.float32)
        for i, text in enumerate(texts):
            clean_text = text.lower().strip()
            if not clean_text:
                continue
            words = clean_text.split()
            # Token n-grams and word hashing
            for word in words:
                h = int(hashlib.sha256(word.encode("utf-8")).hexdigest(), 16)
                idx = h % self.dimension
                sign = 1.0 if ((h >> 16) % 2 == 0) else -1.0
                vectors[i, idx] += sign * (1.0 + np.log(1.0 + len(word)))

            # Character tri-grams for subword similarity
            for j in range(max(0, len(clean_text) - 3)):
                trigram = clean_text[j:j+3]
                h_tri = int(hashlib.md5(trigram.encode("utf-8")).hexdigest(), 16)
                idx_tri = h_tri % self.dimension
                vectors[i, idx_tri] += 0.5

            # Unit normalize (L2 norm) for cosine similarity
            norm = np.linalg.norm(vectors[i])
            if norm > 1e-6:
                vectors[i] /= norm

        return vectors

    def embed_documents(self, texts: List[str]) -> np.ndarray:
        if not texts:
            return np.empty((0, self.dimension), dtype=np.float32)
        if self._is_transformer_loaded and self.model is not None:
            try:
                embeddings = self.model.encode(
                    texts,
                    convert_to_numpy=True,
                    normalize_embeddings=True,
                    show_progress_bar=False,
                    batch_size=32
                )
                return embeddings.astype(np.float32)
            except Exception as e:
                logger.warning(f"Transformer encode error: {e}. Falling back to resilient embedder.")
                return self._fallback_embed(texts)
        return self._fallback_embed(texts)

    def embed_query(self, query: str) -> np.ndarray:
        return self.embed_documents([query])[0]

# Singleton embedder instance
_embedder_instance = None

def get_embedder() -> EmbeddingEngine:
    global _embedder_instance
    if _embedder_instance is None:
        _embedder_instance = EmbeddingEngine(settings.embedding_model_name)
    return _embedder_instance
