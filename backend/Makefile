# Convenience targets for the backend baseline.
# Windows users can run the same commands with .\.venv\Scripts\python.exe.

PYTHON ?= python

.PHONY: test lint migrate-check openapi fixtures

test:
	$(PYTHON) -m pytest -q

lint:
	$(PYTHON) -m ruff check .

migrate-check:
	$(PYTHON) -m alembic upgrade head

openapi:
	$(PYTHON) -c "import json; from app.main import app; print(json.dumps(app.openapi(), indent=2))"

fixtures:
	$(PYTHON) scripts/generate_fixtures.py --count 1000
