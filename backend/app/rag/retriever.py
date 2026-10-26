import logging
from typing import List, Dict, Any, Optional, Tuple
from ..embeddings.embedder import get_embedder
from ..vector_store.store import get_vector_store
from ..config import settings

logger = logging.getLogger(__name__)

class Retriever:
    def __init__(self):
        self.embedder = get_embedder()
        self.vector_store = get_vector_store()

    def retrieve(
        self,
        query: str,
        website_id: Optional[int] = None,
        top_k: Optional[int] = None,
        threshold: Optional[float] = None
    ) -> List[Tuple[Dict[str, Any], float]]:
        """
        Embeds query and retrieves top-k matching chunks exceeding the similarity threshold.
        """
        k = top_k if top_k is not None else settings.top_k
        thresh = threshold if threshold is not None else settings.similarity_threshold

        query_vector = self.embedder.embed_query(query)
        results = self.vector_store.similarity_search(
            query_embedding=query_vector,
            top_k=k,
            threshold=thresh,
            website_id=website_id
        )

        return results
