#!/usr/bin/env python3
"""Silent, Python 3.6-compatible deployment contract validation."""

import json
import ipaddress
import re
import sys
from decimal import Decimal, InvalidOperation
from urllib.parse import urlsplit


ANALYZE_PATH = "/api/open-sna/analyze"
MAX_UPLOAD_SECONDS = Decimal("5")
DNS_LABEL_PATTERN = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$")
ENV_KEY_PATTERN = re.compile(br"^[A-Za-z_][A-Za-z0-9_]*$")


def reject():
    raise ValueError("invalid deployment contract")


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            reject()
        result[key] = value
    return result


def load_json_object(file_path):
    with open(file_path, "r", encoding="utf-8") as handle:
        payload = json.load(handle, object_pairs_hook=unique_object)
    if type(payload) is not dict:
        reject()
    return payload


def load_final_headers(file_path):
    with open(file_path, "rb") as handle:
        raw_headers = handle.read().decode("iso-8859-1")

    blocks = re.split(r"\r?\n\r?\n", raw_headers)
    final_block = None
    for block in reversed(blocks):
        if block.upper().startswith("HTTP/"):
            final_block = block
            break
    if final_block is None:
        reject()

    lines = final_block.splitlines()
    if not lines or not lines[0].upper().startswith("HTTP/"):
        reject()

    headers = {}
    for line in lines[1:]:
        if not line or line[0].isspace() or ":" not in line:
            reject()
        name, value = line.split(":", 1)
        normalized_name = name.strip().lower()
        if not normalized_name:
            reject()
        headers.setdefault(normalized_name, []).append(value.lstrip(" \t"))
    return headers


def header_directives(headers, name):
    directives = []
    for value in headers.get(name, []):
        for directive in value.split(","):
            normalized = directive.strip().lower()
            if normalized:
                directives.append(normalized)
    return directives


def validate_hostname(parsed):
    if "%" in parsed.netloc:
        reject()
    hostname = parsed.hostname
    if not hostname:
        reject()

    if parsed.netloc.startswith("["):
        closing_bracket = parsed.netloc.find("]")
        if closing_bracket < 0:
            reject()
        raw_hostname = parsed.netloc[1:closing_bracket]
        remainder = parsed.netloc[closing_bracket + 1:]
        if remainder and not re.match(r"^:[0-9]+$", remainder):
            reject()
        try:
            ipaddress.IPv6Address(raw_hostname)
        except ValueError:
            reject()
        return

    if "[" in parsed.netloc or "]" in parsed.netloc or parsed.netloc.count(":") > 1:
        reject()
    raw_hostname = parsed.netloc.split(":", 1)[0]
    try:
        raw_hostname.encode("ascii")
    except UnicodeEncodeError:
        reject()

    if re.match(r"^[0-9.]+$", raw_hostname):
        try:
            address = ipaddress.IPv4Address(raw_hostname)
        except ValueError:
            reject()
        if str(address) != raw_hostname:
            reject()
        return

    if len(raw_hostname) > 253:
        reject()
    labels = raw_hostname.split(".")
    if not labels or any(not label or not DNS_LABEL_PATTERN.match(label) for label in labels):
        reject()


def validate_https_url(value, allowed_paths):
    if value != value.strip():
        reject()
    if not value or any(character.isspace() for character in value):
        reject()

    raw_authority = value[len("https://"):].split("/", 1)[0] if value.startswith("https://") else ""
    if not raw_authority or raw_authority.endswith(":"):
        reject()

    parsed = urlsplit(value)
    try:
        parsed_port = parsed.port
    except ValueError:
        reject()

    if parsed.scheme != "https" or not parsed.netloc or not parsed.hostname:
        reject()
    if parsed.username is not None or parsed.password is not None:
        reject()
    if parsed.query or parsed.fragment:
        reject()
    if parsed.path not in allowed_paths:
        reject()
    if parsed_port is not None and not 1 <= parsed_port <= 65535:
        reject()
    validate_hostname(parsed)


def load_env_assignments(file_path):
    with open(file_path, "rb") as handle:
        raw_content = handle.read()
    if b"\r" in raw_content:
        reject()

    assignments = {}
    for raw_line in raw_content.split(b"\n"):
        if not raw_line.strip():
            continue
        line = raw_line.lstrip(b" \t")
        if line.startswith(b"#"):
            continue
        if b"=" not in line:
            reject()
        key, value = line.split(b"=", 1)
        if not ENV_KEY_PATTERN.match(key):
            reject()
        assignments.setdefault(key.decode("ascii"), []).append(value)
    return assignments


def validate_visible_ascii_token(token):
    if len(token) < 32 or not all(33 <= byte_value <= 126 for byte_value in token):
        reject()


def normalize_placeholder_token(token):
    normalized = token.lower()
    if len(normalized) >= 2 and normalized[:1] == normalized[-1:] and normalized[:1] in (b'"', b"'"):
        normalized = normalized[1:-1]
    return normalized


def is_example_placeholder(token):
    normalized = normalize_placeholder_token(token)
    if normalized.startswith(b"<") and normalized.endswith(b">"):
        return True
    return (
        normalized.startswith(b"replace-with-") or
        normalized.startswith(b"change-me-") or
        normalized.startswith(b"example-") or
        b"placeholder" in normalized
    )


def validate_token_files(web_env_path, worker_env_path):
    web_assignments = load_env_assignments(web_env_path)
    worker_assignments = load_env_assignments(worker_env_path)
    worker_tokens = worker_assignments.get("OPEN_SNA_R_WORKER_TOKEN", [])
    web_tokens = web_assignments.get("OPEN_SNA_R_API_TOKEN", [])

    if len(worker_tokens) != 1 or len(web_tokens) > 1:
        reject()
    worker_token = worker_tokens[0]
    validate_visible_ascii_token(worker_token)
    if is_example_placeholder(worker_token):
        reject()

    if web_tokens:
        web_token = web_tokens[0]
        validate_visible_ascii_token(web_token)
        if is_example_placeholder(web_token):
            reject()
        if web_token != worker_token:
            reject()


def validate_health_json(file_path, expected_release_sha):
    payload = load_json_object(file_path)
    if payload.get("status") != "ok":
        reject()
    if payload.get("releaseSha") != expected_release_sha:
        reject()
    if payload.get("deploymentRole") != "aliyun-primary":
        reject()
    if payload.get("rAnalysis") != "disabled":
        reject()


def validate_upload_json(file_path):
    payload = load_json_object(file_path)
    if payload.get("code") != "R_ENGINE_DISABLED":
        reject()


def validate_no_store_headers(file_path):
    headers = load_final_headers(file_path)
    if "no-store" not in header_directives(headers, "cache-control"):
        reject()


def validate_root_headers(file_path):
    headers = load_final_headers(file_path)
    locations = headers.get("location", [])
    if locations != ["/en"]:
        reject()
    robots = set(header_directives(headers, "x-robots-tag"))
    if robots != {"noindex", "nofollow"}:
        reject()


def validate_upload_metrics(file_path):
    with open(file_path, "r", encoding="ascii") as handle:
        lines = handle.read().splitlines()
    if len(lines) != 2 or lines[0] != "503" or not lines[1]:
        reject()
    try:
        elapsed_seconds = Decimal(lines[1])
    except InvalidOperation:
        reject()
    if not elapsed_seconds.is_finite():
        reject()
    if elapsed_seconds < 0 or elapsed_seconds > MAX_UPLOAD_SECONDS:
        reject()


def main(arguments):
    if len(arguments) < 2:
        reject()
    mode = arguments[1]

    if mode == "origin-url" and len(arguments) == 2:
        validate_https_url(sys.stdin.read(), {"", "/"})
    elif mode == "worker-url" and len(arguments) == 2:
        validate_https_url(sys.stdin.read(), {ANALYZE_PATH})
    elif mode == "token-files" and len(arguments) == 4:
        validate_token_files(arguments[2], arguments[3])
    elif mode == "health-json" and len(arguments) == 4:
        validate_health_json(arguments[2], arguments[3])
    elif mode == "upload-json" and len(arguments) == 3:
        validate_upload_json(arguments[2])
    elif mode == "no-store-headers" and len(arguments) == 3:
        validate_no_store_headers(arguments[2])
    elif mode == "root-headers" and len(arguments) == 3:
        validate_root_headers(arguments[2])
    elif mode == "upload-metrics" and len(arguments) == 3:
        validate_upload_metrics(arguments[2])
    else:
        reject()
    return 0


if __name__ == "__main__":
    try:
        exit_code = main(sys.argv)
    except Exception:
        exit_code = 1
    sys.exit(exit_code)
