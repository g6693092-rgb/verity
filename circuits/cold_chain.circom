pragma circom 2.0.0;

include "circomlib/less_than.circom";

// Proves that every active temperature sample is below threshold.
template ColdChain(n) {
    signal input samples[n];
    signal input threshold;
    signal input sampleCount;
    signal output ok;

    component ltSample[n];
    component ltIndex[n];
    signal accumulator[n + 1];

    accumulator[0] <== 1;
    for (var i = 0; i < n; i++) {
        ltSample[i] = LessThan(32);
        ltSample[i].in[0] <== samples[i];
        ltSample[i].in[1] <== threshold;

        ltIndex[i] = LessThan(32);
        ltIndex[i].in[0] <== i;
        ltIndex[i].in[1] <== sampleCount;

        accumulator[i + 1] <== accumulator[i] * (1 - ltIndex[i].out + ltIndex[i].out * ltSample[i].out);
    }

    ok <== accumulator[n];
}

component main = ColdChain(16);
