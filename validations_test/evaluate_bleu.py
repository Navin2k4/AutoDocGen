import json
import re
import string
from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction
from rouge_score import rouge_scorer
from transformers import logging
from nltk.stem import WordNetLemmatizer
from sentence_transformers import SentenceTransformer, util

logging.set_verbosity_error()

# --------------------------
# Helper functions
# --------------------------
lemmatizer = WordNetLemmatizer()

def normalize_text(text):
    """Normalize text for semantic comparison."""
    text = text.lower().strip()
    text = re.sub(r"@param.*", "", text)
    text = re.sub(r"@returns.*", "", text)
    text = re.sub(r"\s+", " ", text)
    tokens = re.findall(r'\w+|\S', text)
    return " ".join(tokens)

def sentence_split(text):
    """Split candidate text into sentences."""
    return [s.strip() for s in re.split(r'[.!?]\s*', text) if s.strip()]

def soft_containment(reference, candidate):
    """Fraction of reference words present in candidate, order-insensitive."""
    ref_words = set(reference.split())
    cand_words = set(candidate.split())
    if not ref_words:
        return 0.0
    return len(ref_words & cand_words) / len(ref_words)

def parameter_coverage(candidate_doc, parameters, has_return=True):
    """Check if all parameters and return are documented."""
    candidate_doc = candidate_doc.lower()
    param_hits = sum(1 for p in parameters if p.lower() in candidate_doc)
    return_hit = 1 if (not has_return) or ("return" in candidate_doc) else 0
    total = len(parameters) + (1 if has_return else 0)
    return (param_hits + return_hit) / total if total > 0 else 1.0

def extract_parameters_from_code(code):
    """Extract parameter names and check for return statement."""
    match = re.search(r'\((.*?)\)', code)
    if not match:
        return [], False
    params = match.group(1).split(",")
    param_list = [p.strip().split(":")[0] for p in params if p.strip()]
    has_return = "return" in code.lower()
    return param_list, has_return

def postprocess_candidate(candidate_doc):
    """Align terminology for better semantic match."""
    keywords_map = {"list": "array", "sequence": "array", "string input": "input string"}
    for k, v in keywords_map.items():
        candidate_doc = candidate_doc.replace(k, v)
    return candidate_doc

def usefulness_score(candidate_doc, ref_doc, semantic_sim):
    """
    Estimate human-usefulness of the documentation.
    Combines semantic similarity (0-1) and keyword coverage.
    """
    candidate_doc = candidate_doc.lower()
    ref_doc = ref_doc.lower()
    score = 0.0
    if any(word in candidate_doc for word in ["example", "returns", "input", "output"]):
        score += 0.5
    # Use semantic similarity from SBERT
    score += 0.5 * semantic_sim
    return min(score, 1.0)

# --------------------------
# Load dataset
# --------------------------
with open('dataset.json') as f:
    data = json.load(f)["dataset"]

# --------------------------
# Initialize scorers
# --------------------------
scorer = rouge_scorer.RougeScorer(['rougeL'], use_stemmer=True)
smooth_fn = SmoothingFunction().method1

# Load SBERT model
sbert_model = SentenceTransformer('all-MiniLM-L6-v2')

# --------------------------
# Corpus-level storage
# --------------------------
all_references = []
all_candidates = []
containment_scores = []
parameter_scores = []
return_scores = []
usefulness_scores = []
semantic_sims = []
rouge_scores = []
bleu_scores = []

print("Function-Level Metrics:")
print("Index | ParamCov | ReturnCov | Containment | Usefulness | SBERT-Sim | ROUGE-L")
print("-"*90)

# --------------------------
# Evaluate each function
# --------------------------
for i, entry in enumerate(data, 1):
    ref_raw = entry["reference"]
    cand_raw = postprocess_candidate(entry["candidate"])
    code = entry.get("source_code", "")

    # Normalize
    ref_norm = normalize_text(ref_raw)
    cand_norm = normalize_text(cand_raw)

    # Extract parameters
    param_list, has_return = extract_parameters_from_code(code)

    # Sentence splitting for containment / ROUGE
    cand_sentences = [s for s in sentence_split(cand_raw) if normalize_text(s)]

    max_contain = 0.0
    max_rouge = 0.0
    for s in cand_sentences:
        s_norm = normalize_text(s)
        rouge_l = scorer.score(ref_norm, s_norm)['rougeL'].fmeasure
        max_rouge = max(max_rouge, rouge_l)
        max_contain = max(max_contain, soft_containment(ref_norm, s_norm))

    # Parameter and return coverage
    param_cov = parameter_coverage(cand_raw, param_list, has_return)
    return_cov = 1.0 if (not has_return) or ("return" in cand_raw.lower()) else 0.0

    # Semantic similarity using SBERT
    ref_emb = sbert_model.encode(ref_norm, convert_to_tensor=True)
    cand_emb = sbert_model.encode(cand_norm, convert_to_tensor=True)
    semantic_sim = util.pytorch_cos_sim(ref_emb, cand_emb).item()

    # Usefulness
    usef_score = usefulness_score(cand_raw, ref_raw, semantic_sim)

    # Store metrics
    all_references.append([ref_norm.split()])
    all_candidates.append(cand_norm.split())
    containment_scores.append(max_contain)
    parameter_scores.append(param_cov)
    return_scores.append(return_cov)
    usefulness_scores.append(usef_score)
    semantic_sims.append(semantic_sim)
    rouge_scores.append(max_rouge)
    bleu_scores.append(sentence_bleu([ref_norm.split()], cand_norm.split(), smoothing_function=smooth_fn))

    print(f"{i:<5d} | {param_cov:.3f}     | {return_cov:.3f}      | {max_contain:.3f}       | {usef_score:.3f}     | {semantic_sim:.3f}     | {max_rouge:.3f}")

# --------------------------
# Corpus-level metrics
# --------------------------
avg_paramcov = sum(parameter_scores) / len(parameter_scores)
avg_returncov = sum(return_scores) / len(return_scores)
avg_containment = sum(containment_scores) / len(containment_scores)
avg_usefulness = sum(usefulness_scores) / len(usefulness_scores)
avg_semantic_sim = sum(semantic_sims) / len(semantic_sims)
avg_rouge = sum(rouge_scores) / len(rouge_scores)
avg_bleu = sum(bleu_scores) / len(bleu_scores)

print("\nCorpus-level Metrics:")
print(f"Average Parameter Coverage : {avg_paramcov:.3f}")
print(f"Average Return Coverage    : {avg_returncov:.3f}")
print(f"Average Containment       : {avg_containment:.3f}")
print(f"Average Usefulness        : {avg_usefulness:.3f}")
print(f"Average SBERT Similarity  : {avg_semantic_sim:.3f}")
print(f"Average ROUGE-L           : {avg_rouge:.3f}")
print(f"BLEU                      : {avg_bleu:.3f}")
