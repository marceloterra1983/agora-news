import re
import sys

from prometheus_client import multiprocess


def child_exit(server, worker):
    multiprocess.mark_process_dead(worker.pid)

def on_starting(server):
    # Parse command line arguments
    proc_name = server.cfg.default_proc_name
    kwargs = {}
    if proc_name.startswith("wsgi:app"):
        str_args = re.sub(r'wsgi:app\s*\(\s*(.*)\s*\)', '\\1', proc_name).strip().split(",")
        for a in str_args:
            if "=" in a:
                k,v = a.split("=")
                k = k.strip()
                v = v.strip()

                if v.lower() in ["true", "false"]:
                    v = v.lower() == "true"
                    if not v:
                        continue
                elif v[0] == '"':
                    v = v[1:-1]
                kwargs[k] = v

    from libretranslate.main import get_args
    sys.argv = ['--wsgi']

    for k in kwargs:
        ck = k.replace("_", "-")
        if isinstance(kwargs[k], bool) and kwargs[k]:
            sys.argv.append("--" + ck)
        else:
            sys.argv.append("--" + ck)
            sys.argv.append(kwargs[k])

    args = get_args()

    from libretranslate import flood, scheduler, secret, storage, cache
    storage.setup(args.shared_storage)
    cache.setup(args.translation_cache)
    scheduler.setup(args)
    flood.setup(args)
    secret.setup(args)

# --- agora-news (2026-09-22) ---------------------------------------------------
# Cópia do scripts/gunicorn_conf.py da imagem (sha256:7e7b72b0…) montada por cima
# do original em compose.override.yml. Único acréscimo: sair sem finalizar o
# interpretador. ctranslate2 4.8.2 + libgomp segfaultam no teardown do worker
# (gunicorn loga "Worker exiting" e 1 s depois "was sent code 139") a cada
# --max-requests 250, gerando um coredump por reciclagem e alarme do crash-watch.
import os


def worker_exit(server, worker):
    os._exit(0)
