import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

// Ephemeral certificates are trusted by these test processes only. Nothing is
// installed in the user's/runner's system certificate store.
export function setupCustomDomainTls() {
  if (process.env.E2E_HTTPS_MODE !== "1") {
    throw new Error("Custom-domain TLS requires explicit E2E_HTTPS_MODE=1.");
  }
  const directory = path.resolve(
    process.env.E2E_HTTPS_CERT_DIR ||
      path.join(root, "test-results/custom-domain-tls"),
  );
  if (!directory.startsWith(`${path.join(root, "test-results")}${path.sep}`)) {
    throw new Error(
      "Test certificates must stay inside this repository's test-results directory.",
    );
  }
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const caPath = path.join(directory, "ca.pem");
  const certPath = path.join(directory, "server.pem");
  const keyPath = path.join(directory, "server.key");
  const run = (args, input) =>
    execFileSync("openssl", args, {
      input,
      stdio: ["pipe", "pipe", "pipe"],
    });
  let reusable = [caPath, certPath, keyPath].every((filename) =>
    fs.existsSync(filename),
  );
  if (reusable) {
    try {
      run(["x509", "-in", certPath, "-checkend", "3600", "-noout"]);
      run([
        "verify",
        "-CAfile",
        caPath,
        "-purpose",
        "sslserver",
        "-verify_hostname",
        "studio-alpha.test",
        certPath,
      ]);
    } catch {
      reusable = false;
    }
  }
  if (!reusable) {
    const config = path.join(directory, "openssl.cnf");
    const caKey = path.join(directory, "ca.key");
    const csr = path.join(directory, "server.csr");
    fs.writeFileSync(
      config,
      `[req]
distinguished_name=dn
prompt=no
[dn]
CN=Shario isolated custom-domain tests
[ca]
basicConstraints=critical,CA:TRUE
keyUsage=critical,keyCertSign,cRLSign
subjectKeyIdentifier=hash
[server]
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid,issuer
subjectAltName=DNS:studio-alpha.test,DNS:api.shario.localhost,DNS:shario.localhost,DNS:studio-alpha.shario.localhost,DNS:studio-beta.shario.localhost,DNS:localhost,IP:127.0.0.1
`,
      { mode: 0o600 },
    );
    run([
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-days",
      "2",
      "-keyout",
      caKey,
      "-out",
      caPath,
      "-config",
      config,
      "-extensions",
      "ca",
    ]);
    run([
      "req",
      "-new",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      keyPath,
      "-out",
      csr,
      "-subj",
      "/CN=studio-alpha.test",
      "-config",
      config,
    ]);
    run([
      "x509",
      "-req",
      "-in",
      csr,
      "-CA",
      caPath,
      "-CAkey",
      caKey,
      "-CAcreateserial",
      "-out",
      certPath,
      "-days",
      "2",
      "-extfile",
      config,
      "-extensions",
      "server",
    ]);
    for (const filename of [caKey, keyPath]) fs.chmodSync(filename, 0o600);
    run([
      "verify",
      "-CAfile",
      caPath,
      "-purpose",
      "sslserver",
      "-verify_hostname",
      "studio-alpha.test",
      certPath,
    ]);
  }
  const publicKey = run(["x509", "-in", certPath, "-pubkey", "-noout"]);
  const publicKeyDer = run(["pkey", "-pubin", "-outform", "DER"], publicKey);
  const spkiHash = createHash("sha256").update(publicKeyDer).digest("base64");
  return { caPath, certPath, keyPath, spkiHash };
}
