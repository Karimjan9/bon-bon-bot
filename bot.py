from __future__ import annotations

import runpy
import sys
from os import chdir
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent


def start_bot() -> int:
    chdir(PROJECT_ROOT)

    try:
        runpy.run_module("app.bot.main", run_name="__main__")
    except KeyboardInterrupt:
        print("\nBot to'xtatildi.")
        return 0

    return 0


def print_help() -> int:
    print("Ishlatish:")
    print("  python bot.py bot:start")
    print()
    print("To'xtatish:")
    print("  Ctrl+C")
    return 0


def main() -> int:
    command = sys.argv[1] if len(sys.argv) > 1 else "help"

    if command in {"bot:start", "start"}:
        return start_bot()

    if command in {"help", "-h", "--help"}:
        return print_help()

    print(f"Noma'lum command: {command}")
    print()
    return print_help() or 1


if __name__ == "__main__":
    raise SystemExit(main())
