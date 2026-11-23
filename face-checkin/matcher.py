"""
Cosine-similarity matching of face embeddings against a database.
"""

import logging
from dataclasses import dataclass
from typing import Optional

import numpy as np

from config import config

logger = logging.getLogger(__name__)


@dataclass
class MatchResult:
    """Result of a face match lookup."""

    participant_id: int
    name: str
    similarity: float
    photo_url: Optional[str] = None
    institution: Optional[str] = None
    category: Optional[str] = None


class EmbeddingMatcher:
    """Maintains a database of participant embeddings and performs matching."""

    def __init__(self, threshold: Optional[float] = None) -> None:
        self.threshold = threshold or config.MATCH_THRESHOLD
        # Parallel arrays — kept in sync
        self._ids: list[int] = []
        self._names: list[str] = []
        self._photo_urls: list[Optional[str]] = []
        self._institutions: list[Optional[str]] = []
        self._categories: list[Optional[str]] = []
        self._embeddings: Optional[np.ndarray] = None  # (N, 512)

    # ------------------------------------------------------------------ #
    #  Database management                                                #
    # ------------------------------------------------------------------ #

    def load_embeddings(self, records: list[dict]) -> int:
        """Load participant embedding records (from API or cache).

        Each record: {participant_id, name, embedding, photo_url, ...}
        Returns the number of embeddings loaded.
        """
        if not records:
            logger.warning("No embedding records to load")
            return 0

        ids, names, photo_urls, institutions, categories, embs = [], [], [], [], [], []
        for rec in records:
            emb = rec.get("embedding")
            if emb is None or len(emb) == 0:
                continue
            ids.append(int(rec["participant_id"]))
            names.append(rec.get("name", "Unknown"))
            photo_urls.append(rec.get("photo_url"))
            institutions.append(rec.get("institution"))
            categories.append(rec.get("category"))
            embs.append(np.array(emb, dtype=np.float32))

        if not embs:
            logger.warning("No valid embeddings in records")
            return 0

        self._ids = ids
        self._names = names
        self._photo_urls = photo_urls
        self._institutions = institutions
        self._categories = categories

        mat = np.stack(embs)  # (N, 512)
        # Normalise rows for fast cosine similarity via dot product
        norms = np.linalg.norm(mat, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        self._embeddings = mat / norms

        logger.info("Loaded %d embeddings", len(self._ids))
        return len(self._ids)

    @property
    def count(self) -> int:
        return len(self._ids)

    # ------------------------------------------------------------------ #
    #  Matching                                                           #
    # ------------------------------------------------------------------ #

    def find_match(self, query_embedding: np.ndarray) -> Optional[MatchResult]:
        """Find the best matching participant for *query_embedding*.

        Args:
            query_embedding: 512-dim numpy array (should be normalised).

        Returns:
            MatchResult if the best similarity >= threshold, else None.
        """
        if self._embeddings is None or len(self._ids) == 0:
            return None

        query = query_embedding.astype(np.float32).flatten()
        norm = np.linalg.norm(query)
        if norm > 0:
            query = query / norm

        # Batch cosine similarity (dot product of normalised vectors)
        similarities = self._embeddings @ query  # (N,)
        best_idx = int(np.argmax(similarities))
        best_sim = float(similarities[best_idx])

        if best_sim < self.threshold:
            return None

        return MatchResult(
            participant_id=self._ids[best_idx],
            name=self._names[best_idx],
            similarity=best_sim,
            photo_url=self._photo_urls[best_idx],
            institution=self._institutions[best_idx],
            category=self._categories[best_idx],
        )

    def find_top_k(self, query_embedding: np.ndarray, k: int = 5) -> list[MatchResult]:
        """Return the top-*k* matches regardless of threshold."""
        if self._embeddings is None or len(self._ids) == 0:
            return []

        query = query_embedding.astype(np.float32).flatten()
        norm = np.linalg.norm(query)
        if norm > 0:
            query = query / norm

        similarities = self._embeddings @ query
        top_indices = np.argsort(similarities)[::-1][:k]

        results = []
        for idx in top_indices:
            idx = int(idx)
            results.append(
                MatchResult(
                    participant_id=self._ids[idx],
                    name=self._names[idx],
                    similarity=float(similarities[idx]),
                    photo_url=self._photo_urls[idx],
                    institution=self._institutions[idx],
                    category=self._categories[idx],
                )
            )
        return results
