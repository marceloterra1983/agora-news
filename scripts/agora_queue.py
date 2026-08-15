#!/usr/bin/env python3
"""
Fila assíncrona da AGORA_FEED (Python).

Espelha o Apps Script: enfileira coletas horárias, drena em lotes,
grava só post novo na planilha central.

  python3 scripts/agora_queue.py              # drena o que a API listar
  python3 scripts/agora_queue.py --dry-run    # lê a AGORA_FEED, não grava
  python3 scripts/agora_queue.py ID1 ID2      # enfileira estes ids

Credencial opcional (gravação e lista da pasta):
  export GOOGLE_ACCESS_TOKEN='ya29....'
Sem token: só lê CSV público e imprime o que faria.
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import io
import json
import logging
import os
import random
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Iterable

NEWS_AI_FOLDER_ID = "1mScOd7oDx8cTG_aDvdHnlnwwVN8kLMGE"
FEED_ID = "1TAgoz8uXEQy8jHU5Vm7rgkXPc0oxpIzn2C_0jG2THHk"
FEED_NAME = "AGORA_FEED"
HOURLY_NAME = re.compile(r"^\d{4}-\d{2}-\d{2}_")
BATCH = 5
WORKERS = 3
MAX_TRIES = 3
BACKOFF_BASE = 0.5
BACKOFF_CAP = 16.0
RETRY_STATUSES = {429, 500, 502, 503, 504}
HEADERS = [
    "#",
    "Conta de origem",
    "Data/Hora (UTC)",
    "Data/Hora (São Paulo)",
    "ID do Post",
    "Conteúdo",
    "Tradução (PT-BR)",
    "Síntese (1 linha)",
    "Link do Post",
    "Mídia",
    "Categoria",
    "Imagem",
]
ID_COL = "ID do Post"

log = logging.getLogger("agora")


class AgoraError(Exception):
    """Falha da fila — a execução pode seguir ou encerrar com código."""


class HttpError(AgoraError):
    def __init__(self, status: int, url: str, detail: str = ""):
        self.status = status
        self.url = url
        self.retryable = status in RETRY_STATUSES or status == 0
        super().__init__(f"HTTP {status} {url} {detail}".strip())


class SheetReadError(AgoraError):
    pass


class SheetWriteError(AgoraError):
    pass


class DriveListError(AgoraError):
    pass


class ParseError(AgoraError):
    pass


@dataclass
class Job:
    file_id: str
    name: str = ""
    tries: int = 0


@dataclass
class Post:
    post_id: str
    row: list[str]


@dataclass
class QueueState:
    seen: set[str] = field(default_factory=set)
    fresh: list[Post] = field(default_factory=list)
    failed: list[tuple[Job, str]] = field(default_factory=list)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


def token() -> str:
    return os.environ.get("GOOGLE_ACCESS_TOKEN", "").strip()


def backoff_seconds(attempt: int) -> float:
    """Full jitter: 0.5×–1× de min(16s, 0.5 × 2^n)."""
    ceiling = min(BACKOFF_CAP, BACKOFF_BASE * (2**attempt))
    return random.uniform(ceiling / 2, ceiling)


def setup_logging(verbose: bool) -> None:
    if log.handlers:
        return
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s", "%H:%M:%S"))
    log.addHandler(handler)
    log.setLevel(logging.DEBUG if verbose else logging.INFO)
    log.propagate = False


async def sleep_backoff(attempt: int) -> None:
    delay = backoff_seconds(attempt)
    log.warning("retry em %.1fs (tentativa %s)", delay, attempt + 1)
    await asyncio.sleep(delay)


def _request(method: str, url: str, body: dict | None = None) -> tuple[int, str]:
    try:
        data = None if body is None else json.dumps(body).encode()
    except (TypeError, ValueError) as err:
        raise SheetWriteError(f"payload inválido: {err}") from err
    headers = {"Accept": "application/json,text/csv,text/plain,*/*"}
    if token():
        headers["Authorization"] = f"Bearer {token()}"
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            return res.getcode() or 200, res.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as err:
        try:
            detail = err.read().decode("utf-8", "replace")[:240]
        except OSError:
            detail = ""
        raise HttpError(err.code, url, detail) from err
    except urllib.error.URLError as err:
        raise HttpError(0, url, str(err.reason)) from err
    except (TimeoutError, OSError) as err:
        raise HttpError(0, url, str(err)) from err


async def http_json(method: str, url: str, body: dict | None = None) -> dict:
    last: HttpError | None = None
    for attempt in range(MAX_TRIES):
        try:
            _status, raw = await asyncio.to_thread(_request, method, url, body)
            if not raw:
                return {}
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError as err:
                raise SheetReadError(f"JSON inválido em {url}") from err
            if isinstance(payload, dict) and payload.get("error"):
                raise SheetReadError(str(payload["error"]))
            if not isinstance(payload, dict):
                raise SheetReadError(f"resposta inesperada em {url}")
            return payload
        except HttpError as err:
            last = err
            if not err.retryable:
                raise
            if attempt + 1 < MAX_TRIES:
                await sleep_backoff(attempt)
        except SheetWriteError:
            raise
    if last is None:
        raise HttpError(0, url, "sem resposta")
    raise last


async def http_text(url: str) -> str:
    last: HttpError | None = None
    for attempt in range(MAX_TRIES):
        try:
            _status, text = await asyncio.to_thread(_request, "GET", url, None)
            if text.lstrip().startswith("<"):
                raise SheetReadError(f"HTML em vez de CSV: {url}")
            return text
        except HttpError as err:
            last = err
            if err.status in {401, 403, 404} or not err.retryable:
                raise
            if attempt + 1 < MAX_TRIES:
                await sleep_backoff(attempt)
    if last is None:
        raise HttpError(0, url, "sem resposta")
    raise last


def csv_url(file_id: str) -> str:
    return (
        "https://docs.google.com/spreadsheets/d/"
        f"{file_id}/export?format=csv"
    )


def values_url(file_id: str) -> str:
    rng = urllib.parse.quote("A:L", safe="")
    return f"https://sheets.googleapis.com/v4/spreadsheets/{file_id}/values/{rng}"


def parse_posts(text: str) -> list[Post]:
    if not text or "," not in text:
        return []
    try:
        reader = csv.reader(io.StringIO(text))
        header = [h.strip() for h in next(reader)]
    except (StopIteration, csv.Error, UnicodeError) as err:
        raise ParseError(f"cabeçalho CSV: {err}") from err
    idx = {name: i for i, name in enumerate(header)}
    id_at = idx.get(ID_COL, 4 if len(header) > 4 else 0)
    out: list[Post] = []
    for raw in reader:
        try:
            if id_at >= len(raw):
                continue
            post_id = re.sub(r"\D", "", raw[id_at])
            if not post_id:
                continue
            row = [(raw[idx[h]] if h in idx and idx[h] < len(raw) else "") for h in HEADERS]
            if not row[10]:
                row[10] = "ai"
            out.append(Post(post_id, row))
        except (IndexError, TypeError, re.error):
            continue
    return out


def values_to_csv(payload: dict) -> str:
    rows = payload.get("values") or []
    if not isinstance(rows, list):
        raise ParseError("values não é lista")
    buf = io.StringIO()
    try:
        csv.writer(buf).writerows(rows)
    except csv.Error as err:
        raise ParseError(f"values CSV: {err}") from err
    return buf.getvalue()


async def read_sheet(file_id: str) -> list[Post]:
    errors: list[Exception] = []
    if token():
        try:
            payload = await http_json("GET", values_url(file_id))
            return parse_posts(values_to_csv(payload))
        except (HttpError, SheetReadError, ParseError) as err:
            errors.append(err)
    try:
        return parse_posts(await http_text(csv_url(file_id)))
    except (HttpError, SheetReadError, ParseError) as err:
        errors.append(err)
    raise SheetReadError(f"não leu {file_id}: {errors[-1]}") from errors[-1]


async def list_hourly() -> list[Job]:
    if not token():
        return []
    q = (
        f"'{NEWS_AI_FOLDER_ID}' in parents and "
        "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false"
    )
    url = "https://www.googleapis.com/drive/v3/files?" + urllib.parse.urlencode(
        {"q": q, "fields": "files(id,name)", "pageSize": 200, "supportsAllDrives": "true"}
    )
    try:
        payload = await http_json("GET", url)
    except (HttpError, SheetReadError) as err:
        raise DriveListError(f"Drive não listou NEWS/AI: {err}") from err
    files = payload.get("files")
    if not isinstance(files, list):
        raise DriveListError("Drive devolveu lista inválida")
    jobs = []
    for item in files:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "")
        fid = str(item.get("id") or "")
        if not fid or name == FEED_NAME or fid == FEED_ID:
            continue
        if not HOURLY_NAME.match(name):
            continue
        jobs.append(Job(fid, name))
    return jobs


async def prepend_rows(rows: list[list[str]]) -> None:
    if not rows or not token():
        return
    try:
        meta = await http_json(
            "GET",
            f"https://sheets.googleapis.com/v4/spreadsheets/{FEED_ID}?fields=sheets.properties(sheetId,title)",
        )
        props = meta["sheets"][0]["properties"]
        gid, title = props["sheetId"], props["title"]
    except (HttpError, SheetReadError, KeyError, IndexError, TypeError) as err:
        raise SheetWriteError(f"meta AGORA_FEED: {err}") from err
    try:
        await http_json(
            "POST",
            f"https://sheets.googleapis.com/v4/spreadsheets/{FEED_ID}:batchUpdate",
            {
                "requests": [
                    {
                        "insertDimension": {
                            "range": {
                                "sheetId": gid,
                                "dimension": "ROWS",
                                "startIndex": 1,
                                "endIndex": 1 + len(rows),
                            },
                            "inheritFromBefore": False,
                        }
                    }
                ]
            },
        )
        end = 1 + len(rows)
        rng = f"{title}!A2:L{end}"
        await http_json(
            "PUT",
            "https://sheets.googleapis.com/v4/spreadsheets/"
            f"{FEED_ID}/values/{urllib.parse.quote(rng)}?valueInputOption=RAW",
            {"range": rng, "majorDimension": "ROWS", "values": rows},
        )
    except (HttpError, SheetReadError, SheetWriteError) as err:
        raise SheetWriteError(f"gravação AGORA_FEED: {err}") from err


async def worker(name: str, queue: asyncio.Queue[Job | None], state: QueueState) -> None:
    while True:
        job = await queue.get()
        try:
            if job is None:
                return
            posts = await read_sheet(job.file_id)
            async with state.lock:
                for post in posts:
                    if post.post_id in state.seen:
                        continue
                    state.seen.add(post.post_id)
                    state.fresh.append(post)
            log.info("%s: %s → %s linhas", name, job.name or job.file_id, len(posts))
        except asyncio.CancelledError:
            raise
        except AgoraError as err:
            job.tries += 1
            label = job.name or job.file_id
            log.error("%s: %s (%s/%s) %s", name, label, job.tries, MAX_TRIES, err)
            if job.tries < MAX_TRIES:
                await sleep_backoff(job.tries - 1)
                await queue.put(job)
            else:
                async with state.lock:
                    state.failed.append((job, str(err)))
        finally:
            queue.task_done()


async def drain(jobs: Iterable[Job], known: set[str], dry_run: bool) -> int:
    state = QueueState(seen=set(known))
    queue: asyncio.Queue[Job | None] = asyncio.Queue()
    workers = [
        asyncio.create_task(worker(f"w{i + 1}", queue, state)) for i in range(WORKERS)
    ]
    pending = list(jobs)
    while pending:
        batch, pending = pending[:BATCH], pending[BATCH:]
        for job in batch:
            await queue.put(job)
        await queue.join()
    for _ in workers:
        await queue.put(None)
    results = await asyncio.gather(*workers, return_exceptions=True)
    for item in results:
        if isinstance(item, asyncio.CancelledError):
            raise item
        if isinstance(item, Exception) and not isinstance(item, AgoraError):
            log.exception("worker morreu", exc_info=item)

    fresh = state.fresh
    for i, post in enumerate(fresh):
        post.row[0] = str(i + 1)
    log.info("fila: %s posts novos / %s ids conhecidos", len(fresh), len(state.seen))
    if state.failed:
        for job, msg in state.failed:
            log.error("falhou: %s — %s", job.name or job.file_id, msg)
    if dry_run or not fresh:
        return len(fresh)
    await prepend_rows([p.row for p in fresh])
    return len(fresh)


async def run(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Fila assíncrona AGORA_FEED")
    parser.add_argument("ids", nargs="*", help="IDs de planilhas horárias")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args(argv)
    setup_logging(args.verbose)

    try:
        feed_posts = await read_sheet(FEED_ID)
    except AgoraError as err:
        log.error("AGORA_FEED indisponível: %s", err)
        return 2
    known = {p.post_id for p in feed_posts}
    log.info("AGORA_FEED %s: %s ids", FEED_ID, len(known))

    try:
        jobs = [Job(i, i[:8]) for i in args.ids] if args.ids else await list_hourly()
    except AgoraError as err:
        log.error("%s", err)
        return 2
    if not jobs:
        log.info("nenhuma horária na fila (passe IDs ou GOOGLE_ACCESS_TOKEN)")
        return 0

    log.info("enfileiradas: %s  workers=%s  lote=%s", len(jobs), WORKERS, BATCH)
    try:
        added = await drain(jobs, known, args.dry_run)
    except SheetWriteError as err:
        log.error("gravação falhou (posts não confirmados): %s", err)
        return 1
    except AgoraError as err:
        log.error("fila: %s", err)
        return 1
    log.info("ok +%s", added)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(asyncio.run(run(sys.argv[1:])))
    except KeyboardInterrupt:
        raise SystemExit(130)
    except AgoraError as err:
        logging.getLogger("agora").error("%s", err)
        raise SystemExit(1)
