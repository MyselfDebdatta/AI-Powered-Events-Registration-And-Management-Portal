"""
Face detection and embedding extraction using InsightFace / ArcFace.
All processing runs locally — no data leaves the machine.
"""

import logging
from dataclasses import dataclass
from typing import Optional

import numpy as np

from config import config

logger = logging.getLogger(__name__)


@dataclass
class DetectedFace:
    """A face detected in a frame."""

    bbox: np.ndarray  # [x1, y1, x2, y2]
    embedding: np.ndarray  # 512-dim normalised vector
    score: float  # detection confidence
    landmark: Optional[np.ndarray] = None  # 5-point landmarks


class FaceDetector:
    """Wrapper around InsightFace's FaceAnalysis for detection + embedding."""

    def __init__(self, model_name: Optional[str] = None, ctx_id: int = 0) -> None:
        """Initialise the detector.

        Args:
            model_name: InsightFace model pack name (e.g. 'buffalo_l').
            ctx_id: 0 = CPU, positive int = GPU id.
        """
        self.model_name = model_name or config.MODEL_NAME
        self.ctx_id = ctx_id
        self._app = None

    # ------------------------------------------------------------------ #
    #  Lazy init — model download happens on first use                    #
    # ------------------------------------------------------------------ #

    def _ensure_loaded(self) -> None:
        if self._app is not None:
            return
        try:
            import insightface  # noqa: delayed import for startup speed
            self._app = insightface.app.FaceAnalysis(
                name=self.model_name,
                providers=(
                    ["CUDAExecutionProvider", "CPUExecutionProvider"]
                    if self.ctx_id > 0
                    else ["CPUExecutionProvider"]
                ),
            )
            self._app.prepare(ctx_id=self.ctx_id, det_size=(640, 640))
            logger.info(
                "InsightFace model '%s' loaded (ctx_id=%d)",
                self.model_name,
                self.ctx_id,
            )
        except Exception as exc:
            logger.error("Failed to load InsightFace model: %s", exc)
            raise RuntimeError(
                f"Could not load InsightFace model '{self.model_name}'. "
                "Make sure insightface and onnxruntime are installed. "
                f"Error: {exc}"
            ) from exc

    # ------------------------------------------------------------------ #
    #  Public API                                                         #
    # ------------------------------------------------------------------ #

    def detect_faces(self, frame: np.ndarray) -> list[DetectedFace]:
        """Detect all faces in *frame* and return their embeddings.

        Args:
            frame: BGR image as a numpy array (from cv2.VideoCapture).

        Returns:
            List of DetectedFace objects, each with bbox, embedding, and score.
        """
        self._ensure_loaded()
        assert self._app is not None

        faces = self._app.get(frame)
        results: list[DetectedFace] = []
        for face in faces:
            embedding = face.embedding
            # Normalise to unit vector
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm
            results.append(
                DetectedFace(
                    bbox=face.bbox.astype(int),
                    embedding=embedding,
                    score=float(face.det_score),
                    landmark=getattr(face, "landmark_2d_106", None)
                    or getattr(face, "kps", None),
                )
            )
        return results

    def get_embedding(self, face: DetectedFace) -> np.ndarray:
        """Return the 512-dim normalised embedding for a detected face."""
        return face.embedding

    @property
    def is_loaded(self) -> bool:
        return self._app is not None
