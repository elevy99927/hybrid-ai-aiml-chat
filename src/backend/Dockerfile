# Stage 1: Builder
FROM python:3.9-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install dependencies to /install directory
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Runtime
FROM python:3.9-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application files
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

# Clean up pip cache and unnecessary files
RUN find /usr/local -type d -name __pycache__ -exec rm -r {} + 2>/dev/null || true && \
    find /usr/local -type f -name '*.pyc' -delete && \
    find /usr/local -type f -name '*.pyo' -delete && \
    find /usr/local -name "*.dist-info" -type d -exec rm -rf {} + 2>/dev/null || true

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3011

# Run the application
CMD ["python", "app.py"]
