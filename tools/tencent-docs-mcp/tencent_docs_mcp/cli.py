"""命令行入口，用来在接进 MCP 之前先验证凭证和接口是否通。

    python -m tencent_docs_mcp.cli check
    python -m tencent_docs_mcp.cli import ~/report.docx --title 季度报告
    python -m tencent_docs_mcp.cli list
"""

from __future__ import annotations

import argparse
import json
import sys

from .client import TencentDocsClient, TencentDocsError


def _print(value: object) -> None:
    print(json.dumps(value, ensure_ascii=False, indent=2))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="tencent_docs_mcp.cli")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("check", help="检查凭证是否有效")

    imp = sub.add_parser("import", help="导入本地文件到腾讯文档")
    imp.add_argument("file")
    imp.add_argument("--title", default=None)
    imp.add_argument("--folder", default=None, help="目标文件夹 ID")

    lst = sub.add_parser("list", help="列出文件")
    lst.add_argument("--folder", default=None, help="文件夹 ID，不传则列根目录")
    lst.add_argument("--limit", type=int, default=20)

    args = parser.parse_args(argv)

    try:
        with TencentDocsClient() as client:
            if args.command == "check":
                client.list_files(limit=1)
                print("凭证有效")
            elif args.command == "import":
                result = client.import_file(
                    args.file, title=args.title, parent_folder_id=args.folder
                )
                _print(result)
                print(f"\n打开：{result['url']}")
            elif args.command == "list":
                _print(client.list_files(args.folder, limit=args.limit))
    except (TencentDocsError, FileNotFoundError, ValueError) as exc:
        print(f"失败：{exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
