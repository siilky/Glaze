export function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
}

export function findTopK(queryVector, candidates, k, threshold = 0) {
    const scored = candidates.map(c => {
        let maxScore = 0;
        
        // NEW: Multi-vector support with MaxSim
        if (Array.isArray(c.vectors)) {
            // Multi-vector entry: find maximum similarity across all chunks
            for (const chunk of c.vectors) {
                if (chunk && chunk.vector) {
                    const score = cosineSimilarity(queryVector, chunk.vector);
                    maxScore = Math.max(maxScore, score);
                }
            }
        } else if (c.vector) {
            // Legacy single vector support (backward compatibility)
            maxScore = cosineSimilarity(queryVector, c.vector);
        }
        
        return {
            ...c,
            score: maxScore
        };
    });

    scored.sort((a, b) => b.score - a.score);

    const filtered = threshold > 0
        ? scored.filter(c => c.score >= threshold)
        : scored;

    return filtered.slice(0, k);
}
