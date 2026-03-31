"""
Spam / expired deal classifier.

Uses a combination of rule-based filters and a lightweight
scikit-learn TF-IDF + Logistic Regression model (trained on labeled data).
"""
import re
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# ── Rule-based spam signals ───────────────────────────────────────────────────

SPAM_PATTERNS = [
    r'\b(?:click here|join now|subscribe|forward this|share this)\b',
    r'(?:http[s]?://\S+){3,}',          # Too many links
    r'\b(?:earn \$\d+|make money|work from home|passive income)\b',
    r'\b(?:mlm|network marketing|downline|upline)\b',
    r'[\U0001F600-\U0001F64F]{5,}',     # Excessive emojis
    r'(?:[!?]){3,}',                    # Excessive punctuation
    r'\b(?:guaranteed|100% legit|no risk)\b',
    r'\b(?:lottery|prize|winner|congratulations you won)\b',
]

SPAM_KEYWORDS = [
    "pyramid scheme", "get rich", "easy money", "infinite income",
    "recruit members", "join my team", "downline", "binary system",
]

NOT_A_DEAL_PATTERNS = [
    r'^\s*(?:hi|hello|hey|good morning|good evening|thanks|thank you)\b',
    r'^\s*[😊😍❤️👍🙏]+\s*$',
]


def is_spam(text: str) -> bool:
    """Return True if the text looks like spam or not a deal."""
    text_lower = text.lower()

    # Rule-based checks
    for pattern in SPAM_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True

    for kw in SPAM_KEYWORDS:
        if kw in text_lower:
            return True

    for pattern in NOT_A_DEAL_PATTERNS:
        if re.search(pattern, text.strip()):
            return True

    # Length check: too short or just emojis
    clean = re.sub(r'[^\w\s]', '', text).strip()
    if len(clean) < 20:
        return True

    # ML model check (if trained model exists)
    score = _ml_score(text)
    if score is not None and score < 0.3:
        return True

    return False


def _ml_score(text: str) -> Optional[float]:
    """
    Returns probability [0,1] that the text is a real deal (not spam).
    Returns None if model is not loaded.
    """
    model = _load_model()
    if model is None:
        return None
    try:
        vectorizer, clf = model
        vec = vectorizer.transform([text])
        proba = clf.predict_proba(vec)[0]
        # Class 1 = real deal
        return float(proba[1])
    except Exception as e:
        logger.debug(f"ML score error: {e}")
        return None


_model_cache = None


def _load_model():
    global _model_cache
    if _model_cache is not None:
        return _model_cache

    model_path = os.path.join(os.path.dirname(__file__), "models", "spam_classifier.joblib")
    if not os.path.exists(model_path):
        return None

    try:
        import joblib
        _model_cache = joblib.load(model_path)
        logger.info("[classifier] loaded spam model")
        return _model_cache
    except Exception as e:
        logger.warning(f"[classifier] failed to load model: {e}")
        return None


def train_model(texts: list[str], labels: list[int], save_path: Optional[str] = None):
    """
    Train the spam classifier.

    texts: list of deal texts
    labels: 1 = real deal, 0 = spam
    """
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import Pipeline
    import joblib

    vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2), min_df=2)
    clf = LogisticRegression(max_iter=500, class_weight="balanced")

    X = vectorizer.fit_transform(texts)
    clf.fit(X, labels)

    if save_path is None:
        os.makedirs(os.path.join(os.path.dirname(__file__), "models"), exist_ok=True)
        save_path = os.path.join(os.path.dirname(__file__), "models", "spam_classifier.joblib")

    joblib.dump((vectorizer, clf), save_path)
    logger.info(f"[classifier] model saved to {save_path}")
    return vectorizer, clf
