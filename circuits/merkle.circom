pragma circom 2.0.0;

include "circomlib/poseidon.circom";

// Proves inclusion of a private leaf in a public Poseidon Merkle root.
template MerkleInclusion(depth) {
    signal input leaf;
    signal input pathElements[depth];
    signal input pathIndices[depth];
    signal input root;

    signal computed[depth + 1];
    computed[0] <== leaf;

    component hasher[depth];
    for (var i = 0; i < depth; i++) {
        signal left;
        signal right;

        pathIndices[i] * (pathIndices[i] - 1) === 0;
        left <== computed[i] * (1 - pathIndices[i]) + pathElements[i] * pathIndices[i];
        right <== computed[i] * pathIndices[i] + pathElements[i] * (1 - pathIndices[i]);

        hasher[i] = Poseidon(2);
        hasher[i].inputs[0] <== left;
        hasher[i].inputs[1] <== right;
        computed[i + 1] <== hasher[i].out;
    }

    computed[depth] === root;
}

component main = MerkleInclusion(16);
