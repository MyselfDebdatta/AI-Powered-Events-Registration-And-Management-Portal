"""
Embedding synchronisation and local caching.
Downloads face embeddings from the backend and persists them to disk.
"""

import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from config import config

logger = logging.getLogger(__name__)


class EmbeddingSync:
    """Download, cache, and refresh participant face embeddings."""

    def __init__(self, api_client: Any) -> None:
        """
        Args:
            api_client: An initialised APIClient instance.
        """
        self.api = api_client
        self._cache_file = config.embeddings_cache_file()
        self._last_sync: Optional[str] = None  # ISO timestamp of last sync
        self._records: list[dict] = []

    # ------------------------------------------------------------------ #
    #  Public API                                                         #
    # ------------------------------------------------------------------ #

    def initial_sync(self) -> list[dict]:
        """Perform a full sync: load cache, then fetch updates from backend.

        Returns the full list of embedding records.
        """
        # 1. Load whatever is cached on disk
        self._load_cache()

        # 2. Fetch from backend (incremental if we have a last_sync timestamp)
        new_records = self.api.sync_embeddings(since=self._last_sync)

        if new_records:
            self._merge_records(new_records)
            self._save_cache()
            # Download photos for new records
            self._download_photos(new_records)

        logger.info(
            "Sync complete: %d total embeddings (fetched %d new)",
            len(self._records),
            len(new_records),
        )
        return self._records

    def refresh(self) -> list[dict]:
        """Incremental sync — fetch only records updated since last sync."""
        new_records = self.api.sync_embeddings(since=self._last_sync)
        if new_records:
            self._merge_records(new_records)
            self._save_cache()
            self._download_photos(new_records)
            logger.info("Refreshed %d new embeddings", len(new_records))
        else:
            logger.info("No new embeddings since last sync")
        return self._records

    @property
    def records(self) -> list[dict]:
        return self._records

    @property
    def last_sync_time(self) -> Optional[str]:
        return self._last_sync

    # ------------------------------------------------------------------ #
    #  Cache persistence                                                  #
    # ------------------------------------------------------------------ #

    def _load_cache(self) -> None:
        if not self._cache_file.exists():
            logger.info("No embedding cache found — starting fresh")
            return
        try:
            with open(self._cache_file, "r") as f:
                data = json.load(f)
            self._records = data.get("records", [])
            self._last_sync = data.get("last_sync")
            logger.info(
                "Loaded %d cached embeddings (last sync: %s)",
                len(self._records),
                self._last_sync,
            )
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning("Failed to load cache, starting fresh: %s", exc)
            self._records = []
            self._last_sync = None

    def _save_cache(self) -> None:
        self._last_sync = datetime.now(timezone.utc).isoformat()
        payload = {
            "last_sync": self._last_sync,
            "records": self._records,
        }
        try:
            self._cache_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self._cache_file, "w") as f:
                json.dump(payload, f)
            logger.debug("Cache saved (%d records)", len(self._records))
        except OSError as exc:
            logger.error("Failed to save cache: %s", exc)

    # ------------------------------------------------------------------ #
    #  Merge logic                                                        #
    # ------------------------------------------------------------------ #

    def _merge_records(self, new_records: list[dict]) -> None:
        """Merge new records into the existing set, replacing duplicates by participant_id."""
        existing_map = {r["participant_id"]: r for r in self._records}
        for rec in new_records:
            existing_map[rec["participant_id"]] = rec
        self._records = list(existing_map.values())

    # ------------------------------------------------------------------ #
    #  Photo prefetch                                                     #
    # ------------------------------------------------------------------ #

    def _download_photos(self, records: list[dict]) -> None:
        """Download photos for the given records in the background."""
        for rec in records:
            try:
                self.api.download_photo(
                    rec["participant_id"],
                    rec.get("photo_url"),
                )
            except Exception as exc:
                logger.debug(
                    "Photo download failed for participant %s: %s",
                    rec.get("participant_id"),
                    exc,
                )
