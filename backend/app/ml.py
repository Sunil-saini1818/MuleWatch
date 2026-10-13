"""Lightweight multilingual text classifier: character n-gram Naive Bayes.

Why char n-grams: they handle Hinglish spelling variants (kiraye/kiraya/kiraaye),
Devanagari and obfuscation (acc0unt) without a tokenizer or a GPU. The model is trained
on the labelled dataset and re-trained whenever an investigator confirms or rejects a post
(the feedback loop)."""
import json
import math
import re
import threading
from collections import Counter

from .config import DATA_DIR

MODEL_PATH = DATA_DIR / "nb_model.json"
_lock = threading.Lock()


def _grams(text: str) -> Counter:
    t = re.sub(r"\d", "0", text.lower())
    t = re.sub(r"\s+", " ", t)
    t = f" {t} "
    c = Counter()
    for n in (3, 4, 5):
        for i in range(len(t) - n + 1):
            g = t[i:i + n]
            if g.strip():
                c[g] += 1
    return c


class NBModel:
    def __init__(self):
        self.counts = {0: Counter(), 1: Counter()}
        self.totals = {0: 0, 1: 0}
        self.docs = {0: 0, 1: 0}

    @property
    def trained(self) -> bool:
        return self.docs[0] > 0 and self.docs[1] > 0

    def fit(self, samples: list[tuple[str, int]]):
        self.__init__()
        for text, y in samples:
            g = _grams(text)
            self.counts[y].update(g)
            self.totals[y] += sum(g.values())
            self.docs[y] += 1
        return self

    def predict_proba(self, text: str) -> float:
        if not self.trained:
            return 0.5
        vocab = len(set(self.counts[0]) | set(self.counts[1])) + 1
        g = _grams(text)
        logp = {}
        for y in (0, 1):
            lp = math.log(self.docs[y] / (self.docs[0] + self.docs[1]))
            for gram, n in g.items():
                lp += n * math.log((self.counts[y][gram] + 1) / (self.totals[y] + vocab))
            logp[y] = lp
        # per-gram average log-odds, temperature-scaled so it doesn't saturate to 0/1
        diff = 3.0 * (logp[1] - logp[0]) / max(1, sum(g.values()))
        diff = max(-30.0, min(30.0, diff))
        return 1 / (1 + math.exp(-diff))

    def top_features(self, text: str, k: int = 6) -> list[str]:
        if not self.trained:
            return []
        g = _grams(text)
        scored = []
        for gram in g:
            p1 = (self.counts[1][gram] + 1) / (self.totals[1] + 1)
            p0 = (self.counts[0][gram] + 1) / (self.totals[0] + 1)
            scored.append((math.log(p1 / p0), gram))
        scored.sort(reverse=True)
        out, seen = [], set()
        for s, gram in scored:
            gs = gram.strip()
            if s <= 0.5 or any(gs in x or x in gs for x in seen):
                continue
            seen.add(gs)
            out.append(gs)
            if len(out) >= k:
                break
        return out

    def save(self):
        MODEL_PATH.write_text(json.dumps({
            "counts": {str(k): dict(v) for k, v in self.counts.items()},
            "totals": self.totals, "docs": self.docs}), encoding="utf-8")

    @classmethod
    def load(cls):
        m = cls()
        if MODEL_PATH.exists():
            d = json.loads(MODEL_PATH.read_text(encoding="utf-8"))
            m.counts = {int(k): Counter(v) for k, v in d["counts"].items()}
            m.totals = {int(k): v for k, v in d["totals"].items()}
            m.docs = {int(k): v for k, v in d["docs"].items()}
        return m


_model: NBModel | None = None


def model() -> NBModel:
    global _model
    if _model is None:
        _model = NBModel.load()
    return _model


def retrain(samples: list[tuple[str, int]]):
    global _model
    with _lock:
        m = NBModel().fit(samples)
        m.save()
        _model = m
    return m
