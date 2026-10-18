# CI and PLONK notes

The workflow compiles `circuits/cold_chain.circom`, generates a witness from the sample input, creates a local Powers of Tau file when needed, and verifies a PLONK proof. The workflow intentionally fails when circuit tooling or proof generation fails so invalid artifacts are not published as successful CI output.

The generated proof artifacts are uploaded for inspection and are not committed to source control.
