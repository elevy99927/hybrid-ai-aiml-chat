FROM python:3.7-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install llmlingua separately (requires Python 3.8+ but we'll handle gracefully)
RUN pip install --no-cache-dir llmlingua || echo "llmlingua installation failed, will be optional"

# Copy application files
COPY . .

# Expose port
EXPOSE 3011

# Run the application
CMD ["python", "app.py"]
